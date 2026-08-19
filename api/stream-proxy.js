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
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, User-Agent, Accept, Connection');
  
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
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (VLC/3.0.0; LibVLC/3.0.0)',
        ...(req.headers.range ? { Range: req.headers.range } : {}),
        'Accept': '*/*',
        'Connection': 'keep-alive',
      },
      redirect: 'follow',
    });

    if (debug === 'true') {
      return res.status(200).json({
        proxy: 'Vercel tunnel-proxy',
        status: upstream.status,
        headers: Object.fromEntries(upstream.headers.entries()),
        url: upstream.url,
      });
    }

    // Repassa o status exato (200, 206 Partial Content, etc)
    res.status(upstream.status);
    
    // Lista de headers essenciais para streaming de vídeo
    const headersToPass = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
      'content-disposition',
      'last-modified',
      'etag'
    ];

    headersToPass.forEach(h => {
      const val = upstream.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    // Força o header de Range para o VLC se o upstream não enviou mas suporta
    if (!res.getHeader('accept-ranges')) {
      res.setHeader('accept-ranges', 'bytes');
    }

    if (req.method === 'HEAD' || !upstream.body) {
      return res.end();
    }

    // Pipeline de streaming direto (Node.js Stream)
    // Usamos o ReadableStream da API Fetch e transformamos em chunks para o res.write
    const reader = upstream.body.getReader();
    
    const stream = async () => {
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
        console.error('[stream-proxy] erro durante o stream:', err);
        res.destroy();
      }
    };

    return stream();
  } catch (err) {
    console.error('[stream-proxy] erro de conexão:', err);
    if (!res.headersSent) res.status(502).send('Conexão perdida com o servidor de origem');
    else res.end();
  }
}
