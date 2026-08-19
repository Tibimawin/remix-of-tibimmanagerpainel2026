// Encaminha /api/s/<token>/<shortId> para o proxy protegido do backend.
// Este arquivo atua como um túnel direto para garantir compatibilidade com VLC/Players externos.

export const config = {
  api: { 
    responseLimit: false,
    externalResolver: true,
  },
};

const BACKEND_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://hgvctwsyxlsygtsyayek.supabase.co';

export default async function handler(req, res) {
  // Configuração global de CORS para players
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, User-Agent, Accept, Connection, Authorization, apikey');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token, id, u, sig, debug } = req.query || {};
  if (!token || !id) return res.status(400).send('Requisição inválida');

  const params = new URLSearchParams({ token: String(token), id: String(id) });
  if (u) params.set('u', String(u));
  if (sig) params.set('sig', String(sig));

  try {
    const bridgeUrl = `${BACKEND_URL}/functions/v1/cloak-stream?${params}`;
    console.log(`[stream-proxy] Tunelando via bridge: ${bridgeUrl}`);
    
    const bridgeHeaders = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (VLC/3.0.0; LibVLC/3.0.0)',
      ...(req.headers.range ? { Range: req.headers.range } : {}),
      'Accept': '*/*',
      'Connection': 'keep-alive',
      'apikey': process.env.SUPABASE_ANON_KEY || 'sb_publishable_g-Cb89onZh3vWAOc9SRiwQ_LVmg6q3O',
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'sb_publishable_g-Cb89onZh3vWAOc9SRiwQ_LVmg6q3O'}`
    };

    const upstream = await fetch(bridgeUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: bridgeHeaders,
      redirect: 'follow', // Voltamos para follow para a Vercel fazer o túnel completo
    });

    if (debug === 'true') {
      return res.status(200).json({
        proxy: 'Vercel tunnel-proxy',
        status: upstream.status,
        headers: Object.fromEntries(upstream.headers.entries()),
        url: upstream.url
      });
    }

    // Repassa o status e headers
    res.status(upstream.status);
    
    const headersToPass = [
      'content-type', 'content-length', 'content-range', 
      'accept-ranges', 'cache-control', 'content-disposition'
    ];

    headersToPass.forEach(h => {
      const val = upstream.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    if (!res.getHeader('accept-ranges')) res.setHeader('accept-ranges', 'bytes');

    if (!upstream.body) return res.end();

    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(Buffer.from(value))) {
          await new Promise((resolve) => res.once('drain', resolve));
        }
      }
      res.end();
    } catch (err) {
      console.error('[stream-proxy] erro no stream:', err);
      res.destroy();
    }
  } catch (err) {
    console.error('[stream-proxy] erro crítico:', err);
    if (!res.headersSent) res.status(502).send('Erro de conexão');
    else res.end();
  }
}