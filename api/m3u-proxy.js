// Configuração Vercel para desabilitar limite de resposta e permitir playlists M3U grandes
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

// Permitir servidores IPTV com certificados SSL auto-assinados ou expirados
if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const COMPATIBLE_USER_AGENTS = [
  'IPTVSmartersPro/1.0.0 (Android; 9)',
  'VLC/3.0.18 LibVLC/3.0.18',
  'TiviMate/4.7.0',
  'okhttp/4.9.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

export default async function handler(req, res) {
  // CORS headers abrangentes
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, access_token, token');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Suporte tanto para POST (body) quanto para GET (query)
  let targetUrl = '';
  let fallbackUrls = [];
  let preferredUserAgent = null;
  let customTimeout = 75000; // 75s para acomodar listas IPTV grandes

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    targetUrl = body.url || '';
    fallbackUrls = Array.isArray(body.urls) ? body.urls : [];
    preferredUserAgent = body.userAgent || null;
    if (body.timeout && typeof body.timeout === 'number') {
      customTimeout = Math.min(Math.max(body.timeout, 10000), 120000);
    }
  } else if (req.method === 'GET') {
    targetUrl = req.query.url || '';
    preferredUserAgent = req.query.userAgent || null;
  } else {
    return res.status(405).json({ error: 'Método não permitido. Use GET ou POST.' });
  }

  const urlsToTry = [targetUrl, ...fallbackUrls].filter(Boolean);

  if (urlsToTry.length === 0) {
    return res.status(400).json({ error: 'URL do servidor é obrigatória' });
  }

  // Sanitizar URLs (garantir protocolo http:// se ausente)
  const sanitizedUrls = urlsToTry.map(u => {
    let clean = String(u).trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    return clean;
  });

  console.log(`[m3u-proxy] Tentando buscar lista de ${sanitizedUrls.length} URL(s) candidata(s)...`);

  let lastError = null;
  let lastStatus = 500;

  for (let uIdx = 0; uIdx < sanitizedUrls.length; uIdx++) {
    const currentUrl = sanitizedUrls[uIdx];

    // Validação de formato de URL
    try {
      new URL(currentUrl);
    } catch {
      console.warn(`[m3u-proxy] URL inválida ignorada: ${currentUrl}`);
      continue;
    }

    // Tentar com User-Agents compatíveis com servidores IPTV
    const userAgentsToTry = preferredUserAgent
      ? [preferredUserAgent, ...COMPATIBLE_USER_AGENTS.filter(ua => ua !== preferredUserAgent)]
      : COMPATIBLE_USER_AGENTS;

    for (let uaIdx = 0; uaIdx < Math.min(userAgentsToTry.length, 3); uaIdx++) {
      const ua = userAgentsToTry[uaIdx];
      console.log(`[m3u-proxy] (${uIdx + 1}/${sanitizedUrls.length}) Tentando ${currentUrl} com UA: ${ua.split(' ')[0]}`);

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), customTimeout);

        const response = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'User-Agent': ua,
            'Accept': '*/*',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': 'keep-alive',
          },
          redirect: 'follow',
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          lastStatus = response.status;
          console.warn(`[m3u-proxy] Servidor respondeu status ${response.status} para ${currentUrl}`);
          
          // Se for 401 ou 403 e ainda tiver outro User-Agent, tenta o próximo
          if ((response.status === 401 || response.status === 403) && uaIdx < 2) {
            continue;
          }
          // Se for 404, pula para a próxima URL alternativa
          lastError = new Error(`Servidor retornou status ${response.status}: ${response.statusText}`);
          break;
        }

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        const content = await response.text();

        if (!content || content.trim().length === 0) {
          lastError = new Error('Resposta vazia do servidor IPTV.');
          continue;
        }

        // Se a resposta for JSON (ex: resposta da API do Xtream player_api.php)
        if (contentType.includes('application/json') || content.trim().startsWith('{') || content.trim().startsWith('[')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          return res.status(200).send(content);
        }

        // Se for lista M3U válida
        if (content.includes('#EXTM3U') || content.includes('#EXTINF') || content.includes('http://') || content.includes('https://')) {
          console.log(`[m3u-proxy] ✅ Sucesso! Recebido ${(content.length / 1024).toFixed(1)} KB de ${currentUrl}`);
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.status(200).send(content);
        }

        // Se retornou HTML (página de erro ou bloqueio)
        if (content.toLowerCase().includes('<html') || content.toLowerCase().includes('<!doctype')) {
          console.warn(`[m3u-proxy] Servidor retornou HTML ao invés de M3U para ${currentUrl}.`);
          lastError = new Error('O servidor IPTV retornou uma página HTML em vez da lista M3U. Verifique as credenciais ou a porta.');
          continue;
        }

        // Retorna o conteúdo mesmo se não tiver cabeçalho padrão, desde que haja dados
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(content);

      } catch (err) {
        lastError = err;
        console.warn(`[m3u-proxy] Erro ao conectar em ${currentUrl} (UA: ${ua.split(' ')[0]}):`, err.message);

        // Se falhou por certificado SSL ou conexão recusada em HTTPS, tenta converter para HTTP
        if (currentUrl.startsWith('https://')) {
          const httpFallback = currentUrl.replace('https://', 'http://');
          if (!sanitizedUrls.includes(httpFallback)) {
            sanitizedUrls.push(httpFallback);
          }
        }
      }
    }
  }

  // Se todas as tentativas falharam
  console.error('[m3u-proxy] Todas as tentativas falharam. Último erro:', lastError?.message);

  if (lastError?.name === 'TimeoutError' || lastError?.name === 'AbortError') {
    return res.status(504).json({
      error: 'Tempo limite esgotado ao conectar ao servidor IPTV. O servidor demorou muito para responder ou está sobrecarregado.',
      code: 'TIMEOUT',
    });
  }

  let userFriendlyMsg = lastError?.message || 'Não foi possível conectar ao servidor IPTV.';
  if (lastStatus === 401 || lastStatus === 403) {
    userFriendlyMsg = 'Acesso recusado pelo servidor IPTV (Erro ' + lastStatus + '). Verifique se o usuário e a senha estão corretos e se a conta não está vencida.';
  } else if (lastStatus === 404) {
    userFriendlyMsg = 'Arquivo não encontrado no servidor IPTV (Erro 404). Verifique a URL do servidor ou tente outro formato de saída.';
  }

  return res.status(lastStatus >= 400 && lastStatus < 600 ? lastStatus : 500).json({
    error: userFriendlyMsg,
    lastUrl: sanitizedUrls[0],
  });
}

