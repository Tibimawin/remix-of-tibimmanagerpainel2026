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
    const bridgeUrl = `${BACKEND_URL}/functions/v1/cloak-stream?${params}`;
    console.log(`[stream-proxy] Validando link via bridge: ${bridgeUrl}`);
    
    // Chamada leve para a bridge apenas para validar e obter a URL do Worker
    const bridgeResponse = await fetch(bridgeUrl, {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY || 'sb_publishable_g-Cb89onZh3vWAOc9SRiwQ_LVmg6q3O',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'sb_publishable_g-Cb89onZh3vWAOc9SRiwQ_LVmg6q3O'}`
      },
      redirect: 'manual', // Importante: não seguir o 302 automaticamente aqui
    });

    console.log(`[stream-proxy] Bridge respondeu com status: ${bridgeResponse.status}`);

    // Se a bridge retornou um redirecionamento (302), repassamos ao player para economizar banda
    if (bridgeResponse.status >= 300 && bridgeResponse.status < 400) {
      const location = bridgeResponse.headers.get('location');
      if (location) {
        console.log(`[stream-proxy] Redirecionando player para Cloudflare: ${location}`);
        res.setHeader('Location', location);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.status(bridgeResponse.status).end();
      }
    }

    return handleUpstreamResponse(bridgeResponse, res, debug, bridgeResponse.url);
  } catch (err) {
    console.error('[stream-proxy] erro crítico de conexão:', err);
    if (!res.headersSent) res.status(502).send('Erro de comunicação com os servidores de streaming');
    else res.end();
  }
}

async function handleUpstreamResponse(upstream, res, debug, finalUrl) {
  if (debug === 'true') {
    return res.status(200).json({
      proxy: 'Vercel tunnel-proxy',
      status: upstream.status,
      headers: Object.fromEntries(upstream.headers.entries()),
      url: upstream.url,
      finalUrl: finalUrl
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

  if (!upstream.body) {
    return res.end();
  }

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
    console.error('[stream-proxy] erro durante o stream de dados:', err);
    res.destroy();
  }
}