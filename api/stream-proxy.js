// Encaminha /api/s/<token>/<shortId> para o proxy protegido do backend.
// Não precisa de nenhuma chave secreta na Vercel: toda a validação
// (assinatura ativa, expiração, bloqueio, métricas) acontece no backend.

export const config = {
  api: { responseLimit: false },
};

const BACKEND_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://hgvctwsyxlsygtsyayek.supabase.co';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'range, content-type, user-agent, accept, connection');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token, id, u, sig, debug } = req.query || {};
  if (!token || !id) return res.status(400).send('Requisição inválida');

  const params = new URLSearchParams({ token: String(token), id: String(id) });
  if (u) params.set('u', String(u));
  if (sig) params.set('sig', String(sig));

  try {
    const upstream = await fetch(`${BACKEND_URL}/functions/v1/cloak-stream?${params}`, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        ...(req.headers.range ? { Range: req.headers.range } : {}),
        'Accept': req.headers['accept'] || '*/*',
        'Connection': 'keep-alive',
      },
      redirect: debug === 'true' ? 'manual' : 'follow',
    });

    if (debug === 'true') {
      const debugInfo = {
        proxy: 'Vercel stream-proxy',
        status: upstream.status,
        headers: Object.fromEntries(upstream.headers.entries()),
        url: upstream.url,
      };
      return res.status(200).json(debugInfo);
    }

    // Repassa status e cabeçalhos vitais para streaming (importante para VLC)
    res.status(upstream.status);
    
    const headersToPass = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
      'server',
      'date'
    ];

    headersToPass.forEach(h => {
      const val = upstream.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    // Garante que o CORS esteja aberto para players externos
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'HEAD' || !upstream.body) return res.end();

    // Streaming real por chunks (ideal para vídeos pesados)
    const reader = upstream.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Escreve o chunk e aguarda se o buffer de saída estiver cheio
      if (!res.write(Buffer.from(value))) {
        await new Promise((resolve) => res.once('drain', resolve));
      }
    }
    res.end();
  } catch (err) {
    console.error('[stream-proxy] erro crítico:', err);
    if (!res.headersSent) res.status(502).send('Erro de gateway ao acessar o stream');
    else res.end();
  }
}
