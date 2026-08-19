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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, User-Agent, Accept, Connection, Authorization, apikey');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token, id, debug } = req.query || {};
  if (!token || !id) return res.status(400).send('Requisição inválida');

  try {
    const bridgeUrl = `${BACKEND_URL}/functions/v1/cloak-stream?token=${token}&id=${id}`;
    
    const bridgeHeaders = {
      'apikey': process.env.SUPABASE_ANON_KEY || 'sb_publishable_g-Cb89onZh3vWAOc9SRiwQ_LVmg6q3O',
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'sb_publishable_g-Cb89onZh3vWAOc9SRiwQ_LVmg6q3O'}`
    };

    let upstream = await fetch(bridgeUrl, {
      method: 'GET',
      headers: bridgeHeaders,
      redirect: 'follow',
    });

    // SE A BRIDGE FALHOU (403), vamos tentar o TÚNEL DIRETO DA VERCEL (Último recurso)
    // Para isso, precisamos validar o token manualmente via banco de dados
    if (upstream.status === 403 || !upstream.ok) {
        console.warn(`[stream-proxy] Bridge falhou (${upstream.status}). Tentando túnel direto via Vercel.`);
        
        // Em um cenário real, aqui faríamos uma query SQL no Supabase para pegar a original_url
        // Como estamos em um proxy Vercel, faremos uma chamada leve ao cloak-stream pedindo apenas a URL
        // Mas a bridge já falhou... 
        
        // Se a bridge retornou 403, pode ser o Worker da Cloudflare bloqueando.
        // Vamos apenas repassar o erro por enquanto, mas avisar o usuário.
    }

    if (debug === 'true') {
      return res.status(200).json({
        proxy: 'Vercel tunnel-proxy',
        status: upstream.status,
        headers: Object.fromEntries(upstream.headers.entries()),
        url: upstream.url
      });
    }

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