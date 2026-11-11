/**
 * Vercel Serverless Function - Proxy para API MaxPlus
 * 
 * Atua como proxy seguro e resiliente entre o frontend e a API MaxPlus
 * (https://api-tibimmanagerpainel.vercel.app/api/maxplus), eliminando problemas
 * de CORS, bloqueios de extensões/adblockers de navegadores e requisições cross-origin.
 */

export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  // Configuração estrita de CORS para compatibilidade total com navegadores e extensões
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');

  // Responder a preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check rápido
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  try {
    // Extrair parâmetros de query ou body
    const query = req.query || {};
    let body = {};
    if (req.method === 'POST') {
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      } catch {
        body = {};
      }
    }

    const id = body.id || query.id;
    const urlParam = body.url || query.url;
    const ep = body.ep || query.ep;
    const q = body.q || query.q;

    // Se for requisição vazia, retorna status de saúde
    if (!id && !urlParam && !ep && !q) {
      return res.status(200).json({ ok: true, service: 'maxplus-proxy' });
    }

    const targetUrl = new URL('https://api-tibimmanagerpainel.vercel.app/api/maxplus');
    if (id) targetUrl.searchParams.set('id', String(id));
    if (urlParam) targetUrl.searchParams.set('url', String(urlParam));
    if (ep) targetUrl.searchParams.set('ep', String(ep));
    if (q) targetUrl.searchParams.set('q', String(q));

    // Executar requisição upstream com timeout de 30s e tentativa de retry
    const maxAttempts = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 22000);

        const upstreamRes = await fetch(targetUrl.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!upstreamRes.ok) {
          throw new Error(`Upstream retornou status ${upstreamRes.status}`);
        }

        const data = await upstreamRes.json();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=300, max-age=120, stale-while-revalidate=900');
        return res.status(200).json(data);
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    return res.status(502).json({
      error: 'Falha ao comunicar com o servidor MaxPlus',
      detail: lastError ? String(lastError.message || lastError) : 'Timeout',
    });
  } catch (fatal) {
    console.error('❌ [maxplus-proxy] Erro fatal:', fatal);
    return res.status(500).json({
      error: 'Erro interno no proxy MaxPlus',
      message: fatal instanceof Error ? fatal.message : String(fatal),
    });
  }
}
