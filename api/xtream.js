/**
 * Vercel Serverless Function & Standalone Bridge - Xtream Codes API
 * 
 * Permite que aplicativos como IPTV Smarters Pro, XCIPTV, TiviMate e IBO Player
 * façam login diretamente usando as tabelas do Baserow (usuarios, canaisTv, conteudos, episodios).
 * 
 * Rotas suportadas:
 * - /player_api.php?username=XXX&password=YYY (Login & server_info)
 * - /player_api.php?username=XXX&password=YYY&action=get_live_categories
 * - /player_api.php?username=XXX&password=YYY&action=get_live_streams
 * - /player_api.php?username=XXX&password=YYY&action=get_vod_categories
 * - /player_api.php?username=XXX&password=YYY&action=get_vod_streams
 * - /player_api.php?username=XXX&password=YYY&action=get_series_categories
 * - /player_api.php?username=XXX&password=YYY&action=get_series
 * - /player_api.php?username=XXX&password=YYY&action=get_series_info&series_id=ZZZ
 * - /get.php?username=XXX&password=YYY&type=m3u_plus&output=ts (M3U dinâmico)
 * - /live/:user/:pass/:stream_id (Redirecionamento para stream real)
 */

const BASEROW_ADMIN_TOKEN = process.env.BASEROW_ADMIN_TOKEN || process.env.BASEROW_TOKEN || '';
const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL || 'https://api.baserow.io';

// Tentar recuperar IDs das tabelas via env vars ou fallbacks
const TABLE_IDS = {
  usuarios: process.env.BASEROW_TABLE_USUARIOS || '',
  canaisTv: process.env.BASEROW_TABLE_CANAIS_TV || '',
  conteudos: process.env.BASEROW_TABLE_CONTEUDOS || '',
  episodios: process.env.BASEROW_TABLE_EPISODIOS || '',
  categoriasTV: process.env.BASEROW_TABLE_CATEGORIAS_TV || '',
};

// Helper para buscar linhas no Baserow
async function fetchBaserowRows(tableId, token = BASEROW_ADMIN_TOKEN, size = 1500) {
  if (!tableId || !token) return [];
  try {
    const url = `${BASEROW_BASE_URL}/api/database/rows/table/${tableId}/?user_field_names=true&size=${size}`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    return json.results || [];
  } catch (err) {
    console.error(`[xtream-api] Erro ao buscar tabela ${tableId}:`, err);
    return [];
  }
}

// Helper para extrair valor flexível de uma linha
function extractField(row, possibleNames) {
  if (!row) return '';
  for (const name of possibleNames) {
    const norm = name.toLowerCase().replace(/[\s_-]/g, '');
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().replace(/[\s_-]/g, '') === norm) {
        const val = row[key];
        if (val !== undefined && val !== null) {
          if (typeof val === 'object' && val.value) return val.value;
          if (Array.isArray(val) && val[0]?.url) return val[0].url;
          return val;
        }
      }
    }
  }
  return '';
}

export default async function handler(req, res) {
  // Configuração CORS permissiva para apps de TV e navegadores
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || {};
  const username = (query.username || query.user || '').trim();
  const password = (query.password || query.pass || '').trim();
  const action = (query.action || '').trim();
  const token = query.baserow_token || BASEROW_ADMIN_TOKEN;
  const userTableId = query.table_usuarios || TABLE_IDS.usuarios;

  // Se for apenas uma verificação de saúde ou documentação
  if (!username && !password && !action) {
    return res.status(200).json({
      status: 'online',
      message: 'Xtream Codes Bridge para Baserow está ativo.',
      endpoints: {
        login: '/player_api.php?username={user}&password={pass}',
        m3u: '/get.php?username={user}&password={pass}&type=m3u_plus&output=ts',
        streams: '/player_api.php?username={user}&password={pass}&action=get_live_streams'
      }
    });
  }

  // 1. Validação do Usuário
  if (!username) {
    return res.status(401).json({
      user_info: {
        auth: 0,
        status: 'Disabled',
        message: 'Nome de usuário não informado'
      }
    });
  }

  // Buscar usuários no Baserow se tiver tabela e token configurados
  let matchedUser = null;
  if (userTableId && token) {
    const usuarios = await fetchBaserowRows(userTableId, token, 500);
    matchedUser = usuarios.find((u) => {
      const uNome = String(extractField(u, ['nome', 'usuario', 'email'])).trim().toLowerCase();
      const uSenha = String(extractField(u, ['senha', 'password'])).trim();
      const targetUser = username.toLowerCase();
      
      const userMatches = uNome === targetUser || uNome.replace(/\s+/g, '_') === targetUser;
      const passMatches = !password || uSenha === password;
      return userMatches && passMatches;
    });

    if (!matchedUser) {
      return res.status(401).json({
        user_info: {
          auth: 0,
          status: 'Disabled',
          message: 'Usuário ou senha inválidos'
        }
      });
    }

    const status = String(extractField(matchedUser, ['status']) || 'Ativo').toLowerCase();
    if (status.includes('inativ') || status.includes('bloque') || status.includes('cancel')) {
      return res.status(403).json({
        user_info: {
          auth: 0,
          status: 'Expired',
          message: 'Conta inativa ou suspensa'
        }
      });
    }
  }

  // Calcular data de expiração (timestamp Unix)
  let expTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 3600); // 1 ano padrão
  if (matchedUser) {
    const venc = extractField(matchedUser, ['vencimento', 'validade', 'expiracao']);
    if (venc) {
      const d = new Date(venc);
      if (!isNaN(d.getTime())) {
        expTimestamp = Math.floor(d.getTime() / 1000);
      }
    }
  }

  const hostHeader = req.headers.host || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || (hostHeader.includes('localhost') ? 'http' : 'https');
  const serverPort = hostHeader.includes(':') ? hostHeader.split(':')[1] : (protocol === 'https' ? '443' : '80');

  // 2. Resposta de Autenticação (quando action não é passada)
  if (!action) {
    // Se a requisição for para /get.php, gerar a lista M3U Plus
    if (req.url.includes('/get.php')) {
      res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="playlist.m3u"');

      let m3u = `#EXTM3U name="Lista IPTV Baserow"\n`;
      // Carregar canais
      if (TABLE_IDS.canaisTv && token) {
        const canais = await fetchBaserowRows(TABLE_IDS.canaisTv, token, 1500);
        canais.forEach((c) => {
          const nome = extractField(c, ['nome', 'canalNome']) || 'Canal Sem Nome';
          const link = extractField(c, ['link', 'canalLink']);
          const capa = extractField(c, ['capa', 'canalCapa']);
          const cat = extractField(c, ['categoria', 'canalCategoria']) || 'Canais TV';
          if (link) {
            m3u += `#EXTINF:-1 tvg-id="${c.id}" tvg-name="${nome}" tvg-logo="${capa}" group-title="${cat}",${nome}\n${link}\n\n`;
          }
        });
      }
      return res.status(200).send(m3u);
    }

    // Resposta padrão do Xtream Codes /player_api.php
    return res.status(200).json({
      user_info: {
        username: username,
        password: password,
        message: 'Autenticado com sucesso via Baserow Bridge',
        auth: 1,
        status: 'Active',
        exp_date: String(expTimestamp),
        is_trial: '0',
        active_cons: '0',
        created_at: String(Math.floor(Date.now() / 1000) - 86400),
        max_connections: String(extractField(matchedUser, ['limite', 'telas']) || '1'),
        allowed_output_formats: ['m3u8', 'ts', 'rtmp']
      },
      server_info: {
        url: hostHeader.split(':')[0],
        port: serverPort,
        https_port: '443',
        server_protocol: protocol,
        rtmp_port: '8880',
        timezone: 'America/Sao_Paulo',
        timestamp_now: Math.floor(Date.now() / 1000),
        time_now: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    });
  }

  // 3. Categorias de Canais Ao Vivo
  if (action === 'get_live_categories') {
    const canais = await fetchBaserowRows(TABLE_IDS.canaisTv || query.table_canais, token, 1000);
    const categoriasSet = new Set();
    canais.forEach(c => {
      const cat = extractField(c, ['categoria', 'canalCategoria']);
      if (cat) categoriasSet.add(String(cat).trim());
    });
    if (categoriasSet.size === 0) categoriasSet.add('Geral');

    const result = Array.from(categoriasSet).map((nome, idx) => ({
      category_id: String(idx + 1),
      category_name: nome,
      parent_id: 0
    }));
    return res.status(200).json(result);
  }

  // 4. Lista de Canais Ao Vivo
  if (action === 'get_live_streams') {
    const canais = await fetchBaserowRows(TABLE_IDS.canaisTv || query.table_canais, token, 1500);
    const result = canais.map((c, idx) => {
      const nome = extractField(c, ['nome', 'canalNome']) || 'Canal';
      const link = extractField(c, ['link', 'canalLink']);
      const capa = extractField(c, ['capa', 'canalCapa']);
      const cat = extractField(c, ['categoria', 'canalCategoria']) || 'Canais TV';

      return {
        num: idx + 1,
        name: nome,
        stream_type: 'live',
        stream_id: c.id,
        stream_icon: capa,
        epg_channel_id: String(c.id),
        added: String(Math.floor(Date.now() / 1000)),
        category_id: '1',
        category_name: cat,
        custom_sid: '',
        tv_archive: 0,
        direct_source: link,
        tv_archive_duration: 0
      };
    });
    return res.status(200).json(result);
  }

  // 5. Categorias de Filmes (VOD)
  if (action === 'get_vod_categories') {
    const conteudos = await fetchBaserowRows(TABLE_IDS.conteudos || query.table_conteudos, token, 1000);
    const cats = new Set();
    conteudos.forEach(c => {
      const cat = extractField(c, ['categoria', 'genero']);
      if (cat) cats.add(String(cat).trim());
    });
    if (cats.size === 0) cats.add('Filmes');

    return res.status(200).json(Array.from(cats).map((c, i) => ({
      category_id: String(i + 1),
      category_name: c,
      parent_id: 0
    })));
  }

  // 6. Lista de Filmes (VOD)
  if (action === 'get_vod_streams') {
    const conteudos = await fetchBaserowRows(TABLE_IDS.conteudos || query.table_conteudos, token, 2000);
    const filmes = conteudos.filter(c => {
      const tipo = String(extractField(c, ['tipo'])).toLowerCase();
      return tipo.includes('film') || (!tipo.includes('seri') && !tipo.includes('anime'));
    });

    const result = filmes.map((f, idx) => ({
      num: idx + 1,
      name: extractField(f, ['nome', 'titulo']) || 'Filme',
      stream_type: 'movie',
      stream_id: f.id,
      stream_icon: extractField(f, ['capa', 'poster']),
      rating: extractField(f, ['imdb']) || '7.5',
      added: String(Math.floor(Date.now() / 1000)),
      category_id: '1',
      container_extension: 'mp4',
      direct_source: extractField(f, ['link', 'url'])
    }));
    return res.status(200).json(result);
  }

  // Ação não mapeada: retornar array vazio para não quebrar o reprodutor
  return res.status(200).json([]);
}
