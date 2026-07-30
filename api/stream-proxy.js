// Encaminha /api/s/<token>/<shortId> para o proxy protegido do backend.
// Não precisa de nenhuma chave secreta na Vercel: toda a validação
// (assinatura ativa, expiração, bloqueio, métricas) acontece no backend.

const BACKEND_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://hgvctwsyxlsygtsyayek.supabase.co';

module.exports = async function handler(req, res) {
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
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        ...(req.headers.range ? { Range: req.headers.range } : {}),
      },
    });

    upstream.headers.forEach((value, key) => {
      if (['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'].includes(key)) {
        res.setHeader(key, value);
      }
    });

    res.status(upstream.status);
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error('[stream-proxy] erro:', err);
    res.status(502).send('Erro ao acessar o conteúdo');
  }
};
