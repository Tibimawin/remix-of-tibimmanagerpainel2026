// Proxy de streaming com links camuflados.
// Rota: /api/s/<userToken>/<shortId>
// Valida no Postgres (Lovable Cloud) se o usuário está ativo e não expirado.

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEYS;

const rest = (path, options = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

const sign = (value) =>
  crypto.createHmac('sha256', SERVICE_KEY || 'x').update(value).digest('hex').slice(0, 24);

async function log(entry) {
  try {
    await rest('cloak_access_logs', { method: 'POST', body: JSON.stringify(entry) });
  } catch (_) { /* nunca quebrar o streaming por causa de log */ }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'range, content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).send('Proxy não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }

  const { token, id, u, sig } = req.query || {};
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || null;
  const userAgent = req.headers['user-agent'] || null;

  if (!token || !id) return res.status(400).send('Requisição inválida');

  try {
    // 1) Usuário
    const userRes = await rest(
      `cloak_users?public_token=eq.${encodeURIComponent(token)}&select=firebase_uid,expires_at,blocked`
    );
    const users = await userRes.json();
    const user = Array.isArray(users) ? users[0] : null;

    if (!user) {
      await log({ link_short_id: id, status: 'invalid_token', ip, user_agent: userAgent });
      return res.status(403).send('Acesso inválido');
    }
    if (user.blocked) {
      await log({ link_short_id: id, owner_uid: user.firebase_uid, status: 'blocked', ip, user_agent: userAgent });
      return res.status(403).send('Acesso bloqueado');
    }
    if (user.expires_at && new Date(user.expires_at) < new Date()) {
      await log({ link_short_id: id, owner_uid: user.firebase_uid, status: 'expired', ip, user_agent: userAgent });
      return res.status(403).send('Assinatura expirada');
    }

    // 2) Link
    const linkRes = await rest(
      `cloaked_links?short_id=eq.${encodeURIComponent(id)}&select=original_url,owner_uid,active,access_count,bytes_served`
    );
    const links = await linkRes.json();
    const link = Array.isArray(links) ? links[0] : null;

    if (!link || !link.active) {
      await log({ link_short_id: id, owner_uid: user.firebase_uid, status: 'not_found', ip, user_agent: userAgent });
      return res.status(404).send('Conteúdo indisponível');
    }
    if (link.owner_uid !== user.firebase_uid) {
      await log({ link_short_id: id, owner_uid: user.firebase_uid, status: 'forbidden', ip, user_agent: userAgent });
      return res.status(403).send('Acesso negado');
    }

    // 3) Alvo (link original ou segmento HLS assinado)
    let target = link.original_url;
    if (u) {
      if (!sig || sign(String(u)) !== sig) return res.status(403).send('Assinatura inválida');
      target = Buffer.from(String(u), 'base64').toString('utf8');
    }

    const upstream = await fetch(target, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        ...(req.headers.range ? { Range: req.headers.range } : {}),
      },
      redirect: 'follow',
    });

    if (!upstream.ok && upstream.status !== 206) {
      await log({ link_short_id: id, owner_uid: user.firebase_uid, status: `upstream_${upstream.status}`, ip, user_agent: userAgent });
      return res.status(upstream.status).send('Erro ao acessar o conteúdo');
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const isPlaylist =
      /mpegurl/i.test(contentType) || /\.m3u8(\?|$)/i.test(target);

    let bytes = 0;

    if (isPlaylist) {
      // Reescreve a playlist para que os segmentos também passem pelo proxy
      const text = await upstream.text();
      const base = new URL(target);
      const rewritten = text
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return line;
          const abs = new URL(trimmed, base).toString();
          const encoded = Buffer.from(abs, 'utf8').toString('base64');
          return `/api/s/${token}/${id}?u=${encodeURIComponent(encoded)}&sig=${sign(encoded)}`;
        })
        .join('\n');
      bytes = Buffer.byteLength(rewritten);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(rewritten);
    } else {
      res.setHeader('Content-Type', contentType);
      const len = upstream.headers.get('content-length');
      if (len) { res.setHeader('Content-Length', len); bytes = Number(len) || 0; }
      const range = upstream.headers.get('content-range');
      if (range) res.setHeader('Content-Range', range);
      res.setHeader('Accept-Ranges', 'bytes');
      res.status(upstream.status);
      const buffer = Buffer.from(await upstream.arrayBuffer());
      bytes = buffer.length;
      res.send(buffer);
    }

    // 4) Métricas (não bloqueia a resposta)
    await Promise.all([
      rest(`cloaked_links?short_id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          access_count: Number(link.access_count || 0) + 1,
          bytes_served: Number(link.bytes_served || 0) + bytes,
          last_access_at: new Date().toISOString(),
        }),
      }),
      log({
        link_short_id: id,
        owner_uid: user.firebase_uid,
        status: 'ok',
        ip,
        user_agent: userAgent,
        bytes_served: bytes,
      }),
    ]);
  } catch (err) {
    console.error('[stream-proxy] erro:', err);
    if (!res.headersSent) res.status(500).send('Erro interno no proxy');
  }
};
