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
  res.setHeader('Access-Control-Allow-Headers', 'range, content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token, id, u, sig } = req.query || {};
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
      },
      redirect: 'manual',
    });

    // Se o backend retornou um redirecionamento (para o Cloudflare Worker),
    // nós repassamos esse redirecionamento para o cliente (ex: VLC).
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('location');
      if (location) {
        // MUITO IMPORTANTE PARA VLC: O header Location precisa ser absoluto
        // E o CORS deve estar aberto
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Location', location);
        return res.status(upstream.status).end();
      }
    }

    for (const key of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control']) {
      const value = upstream.headers.get(key);
      if (value) res.setHeader(key, value);
    }

    res.status(upstream.status);

    if (req.method === 'HEAD' || !upstream.body) return res.end();

    // Streaming real (sem carregar o vídeo inteiro na memória)
    const reader = upstream.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(Buffer.from(value))) {
        await new Promise((resolve) => res.once('drain', resolve));
      }
    }
    res.end();
  } catch (err) {
    console.error('[stream-proxy] erro:', err);
    if (!res.headersSent) res.status(502).send('Erro ao acessar o conteúdo');
    else res.end();
  }
}
