/**
 * Vercel Serverless Function & Standalone Bridge - Xtream Codes API
 * 
 * Permite que aplicativos IPTV da Google Play Store (IPTV Smarters Pro, XCIPTV, 
 * TiviMate, IBO Player, IPTV Stream Player, etc.) autentiquem e sincronizem:
 * - Canais de TV Ao Vivo (Live Streams & Categories)
 * - Filmes VOD (Movie Streams & Categories)
 * - Séries & Episódios (Series, Series Info & Categories)
 * - Lista M3U Dinâmica (/get.php)
 * - Guia EPG (/xmltv.php)
 * - Reprodução direta (/live/..., /movie/..., /series/...) com redirect 302
 */

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'tibimmanagerpainelvercel';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyBN7cODHg978T4S2jPvrBsr5sqwZhGidtU';

// Configurações padrão com fallback para o banco ativo do painel
const FALLBACK_CONFIG = {
  baseUrl: 'http://31.220.72.235:8080',
  apiToken: 'YNDJLHK1xJMjetLswXWKlbFb4agzxItL',
  tableCanaisTv: '960',
  tokenCanaisTv: 'J85ZVuxAYiOdSQocIk7pnvDUUMznY6og',
  tableConteudos: '1157',
  tableEpisodios: '1158',
  tableUsuarios: '1165',
  tableCategoriasTV: '1159',
  defaultUser: 'demo',
  defaultPass: '123456'
};

// Cache de configurações (5 min) e de conteúdos (2 min) para desempenho ultra-rápido
let cachedConfig = null;
let configExpiresAt = 0;

let cachedData = {
  canais: [],
  conteudos: [],
  episodios: [],
  usuarios: [],
  expiresAt: 0
};

// Mapa global para redirecionamento instantâneo de stream (stream_id -> real_url)
const STREAM_URL_CACHE = new Map();

// Helper para obter configuração dinâmica do Firestore ou fallback
async function getActiveConfig() {
  const now = Date.now();
  if (cachedConfig && configExpiresAt > now) {
    return cachedConfig;
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/globalConfig/xtreamConfig?key=${FIREBASE_API_KEY}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const doc = await resp.json();
      const f = doc.fields || {};
      cachedConfig = {
        baseUrl: f.baseUrl?.stringValue || FALLBACK_CONFIG.baseUrl,
        apiToken: f.apiToken?.stringValue || FALLBACK_CONFIG.apiToken,
        tableCanaisTv: f.tableCanaisTv?.stringValue || FALLBACK_CONFIG.tableCanaisTv,
        tokenCanaisTv: f.tokenCanaisTv?.stringValue || f.apiToken?.stringValue || FALLBACK_CONFIG.tokenCanaisTv,
        tableConteudos: f.tableConteudos?.stringValue || FALLBACK_CONFIG.tableConteudos,
        tableEpisodios: f.tableEpisodios?.stringValue || FALLBACK_CONFIG.tableEpisodios,
        tableUsuarios: f.tableUsuarios?.stringValue || FALLBACK_CONFIG.tableUsuarios,
        tableCategoriasTV: f.tableCategoriasTV?.stringValue || FALLBACK_CONFIG.tableCategoriasTV,
        defaultUser: f.defaultUser?.stringValue || FALLBACK_CONFIG.defaultUser,
        defaultPass: f.defaultPass?.stringValue || FALLBACK_CONFIG.defaultPass,
      };
      configExpiresAt = now + 300000; // 5 minutos
      return cachedConfig;
    }
  } catch (err) {
    console.warn('[xtream-api] Erro ao carregar config do Firestore, usando fallback:', err?.message);
  }

  cachedConfig = { ...FALLBACK_CONFIG };
  configExpiresAt = now + 120000;
  return cachedConfig;
}

// Helper para buscar linhas no Baserow com suporte a paginação paralela (max 200 por página)
async function fetchBaserowRows(baseUrl, tableId, token, maxRows = 1200) {
  if (!tableId || !token) return [];
  try {
    const base = baseUrl.replace(/\/+$/, '');
    const pageSize = 200; // Limite estrito da API do Baserow
    const firstUrl = `${base}/api/database/rows/table/${tableId}/?user_field_names=true&size=${pageSize}&page=1`;
    const resp = await fetch(firstUrl, {
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!resp.ok) {
      console.warn(`[xtream-api] Baserow table ${tableId} retornou status ${resp.status}`);
      return [];
    }
    const json = await resp.json();
    let allRows = json.results || [];
    const totalCount = json.count || allRows.length;

    // Buscar páginas adicionais em paralelo se houver mais dados
    const totalPagesNeeded = Math.min(Math.ceil(totalCount / pageSize), Math.ceil(maxRows / pageSize));
    if (totalPagesNeeded > 1) {
      const pagePromises = [];
      for (let p = 2; p <= totalPagesNeeded; p++) {
        const nextUrl = `${base}/api/database/rows/table/${tableId}/?user_field_names=true&size=${pageSize}&page=${p}`;
        pagePromises.push(
          fetch(nextUrl, {
            headers: {
              Authorization: `Token ${token}`,
              'Content-Type': 'application/json',
            },
          })
            .then(r => r.ok ? r.json() : { results: [] })
            .then(j => j.results || [])
            .catch(() => [])
        );
      }
      const otherPages = await Promise.all(pagePromises);
      otherPages.forEach(rows => {
        allRows = allRows.concat(rows);
      });
    }

    return allRows.slice(0, maxRows);
  } catch (err) {
    console.error(`[xtream-api] Falha ao consultar Baserow table ${tableId}:`, err?.message);
    return [];
  }
}

// Extrair campo com flexibilidade de maiúsculas/acentos
function extractField(row, possibleNames) {
  if (!row) return '';
  for (const name of possibleNames) {
    const norm = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_-]/g, '');
    for (const key of Object.keys(row)) {
      const keyNorm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_-]/g, '');
      if (keyNorm === norm) {
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

// Extrair URL real de streaming
function extractStreamUrl(row) {
  if (!row) return '';
  const possible = [
    'link', 'url', 'canalLink', 'canal_link', 'episodioLink', 'episodio_link',
    'stream', 'video', 'linkvideo', 'linkstream', 'source', 'direct_source'
  ];
  const url = extractField(row, possible);
  if (!url) return '';
  const trimmed = String(url).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('rtmp://')) {
    return trimmed;
  }
  return '';
}

// Carregar todo o catálogo com cache em memória
async function getCatalog(config) {
  const now = Date.now();
  if (cachedData.expiresAt > now && (cachedData.canais.length > 0 || cachedData.conteudos.length > 0)) {
    return cachedData;
  }

  // 1. Canais de TV: Buscar primeiro na tabela de canais com seu token específico
  let canais = await fetchBaserowRows(config.baseUrl, config.tableCanaisTv, config.tokenCanaisTv || config.apiToken, 1200);
  
  // Se a tabela configurada estiver vazia, tentar fallback global (960)
  if (canais.length === 0 && config.tableCanaisTv !== FALLBACK_CONFIG.tableCanaisTv) {
    canais = await fetchBaserowRows(FALLBACK_CONFIG.baseUrl, FALLBACK_CONFIG.tableCanaisTv, FALLBACK_CONFIG.tokenCanaisTv, 1200);
  }

  // 2. Conteúdos (Filmes e Séries)
  const conteudos = await fetchBaserowRows(config.baseUrl, config.tableConteudos, config.apiToken, 1500);

  // 3. Episódios de Séries
  const episodios = await fetchBaserowRows(config.baseUrl, config.tableEpisodios, config.apiToken, 1500);

  // 4. Usuários para autenticação
  const usuarios = await fetchBaserowRows(config.baseUrl, config.tableUsuarios, config.apiToken, 500);

  // Armazenar no mapa de streams para redirecionamento rápido
  canais.forEach(c => {
    const link = extractStreamUrl(c);
    if (link) STREAM_URL_CACHE.set(`live_${c.id}`, link);
  });

  conteudos.forEach(c => {
    const link = extractStreamUrl(c);
    if (link) STREAM_URL_CACHE.set(`movie_${c.id}`, link);
  });

  episodios.forEach(e => {
    const link = extractStreamUrl(e);
    if (link) STREAM_URL_CACHE.set(`series_${e.id}`, link);
  });

  cachedData = {
    canais,
    conteudos,
    episodios,
    usuarios,
    expiresAt: now + 120000 // 2 minutos
  };

  return cachedData;
}

export default async function handler(req, res) {
  // CORS permissivo para apps de TV, consoles e navegadores
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const config = await getActiveConfig();

  // Extrair query e body (compatibilidade total com apps que enviam POST ou GET)
  const query = req.query || {};
  let body = {};
  if (req.body) {
    if (typeof req.body === 'string') {
      try { body = JSON.parse(req.body); } catch { body = {}; }
    } else if (typeof req.body === 'object') {
      body = req.body;
    }
  }

  const rawUrl = req.url || '';
  const username = String(query.username || query.user || body.username || body.user || '').trim();
  const password = String(query.password || query.pass || body.password || body.pass || '').trim();
  const action = String(query.action || body.action || '').trim();

  // -------------------------------------------------------------
  // TRATAMENTO DE REQUISIÇÕES DE STREAM (/live/..., /movie/..., /series/...)
  // -------------------------------------------------------------
  const streamType = query.stream_type;
  const streamId = query.stream_id || '';

  // Verificar se a URL em si é no formato /live/:user/:pass/:id.ext
  const liveMatch = rawUrl.match(/\/(live|movie|series)\/([^/]+)\/([^/]+)\/(\d+)(\.[a-zA-Z0-9]+)?/);
  if (liveMatch || streamType) {
    const type = liveMatch ? liveMatch[1] : streamType;
    const rawId = liveMatch ? liveMatch[4] : streamId.replace(/\.[a-zA-Z0-9]+$/, '');
    const cacheKey = `${type}_${rawId}`;

    let targetUrl = STREAM_URL_CACHE.get(cacheKey);

    // Se não estiver no cache, recarregar catálogo
    if (!targetUrl) {
      await getCatalog(config);
      targetUrl = STREAM_URL_CACHE.get(cacheKey);
    }

    if (targetUrl) {
      res.setHeader('Location', targetUrl);
      return res.status(302).end();
    } else {
      return res.status(404).send('Stream não encontrado ou offline.');
    }
  }

  // -------------------------------------------------------------
  // TRATAMENTO DO ARQUIVO EPG XMLTV (/xmltv.php)
  // -------------------------------------------------------------
  if (rawUrl.includes('/xmltv.php') || query.xmltv) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    const { canais } = await getCatalog(config);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tv generator-info-name="Painel Baserow Xtream">\n`;
    canais.forEach(c => {
      const nome = extractField(c, ['nome', 'canalNome']) || `Canal ${c.id}`;
      xml += `  <channel id="${c.id}">\n`;
      xml += `    <display-name>${String(nome).replace(/&/g, '&amp;')}</display-name>\n`;
      xml += `  </channel>\n`;
    });
    xml += `</tv>`;
    return res.status(200).send(xml);
  }

  // -------------------------------------------------------------
  // DOCUMENTAÇÃO / HEALTH CHECK QUANDO ACESSADO SEM CREDENCIAIS
  // -------------------------------------------------------------
  if (!username && !password && !action && !rawUrl.includes('/get.php')) {
    return res.status(200).json({
      status: 'online',
      name: 'Painel Baserow Xtream Codes Bridge',
      version: '2.5.0',
      server_time: new Date().toISOString(),
      instructions: 'Insira este Host DNS no seu aplicativo IPTV (ex: IPTV Smarters Pro, XCIPTV, TiviMate).',
      test_user: config.defaultUser,
      endpoints: {
        player_api: '/player_api.php?username=XXX&password=YYY',
        m3u_ts: '/get.php?username=XXX&password=YYY&type=m3u_plus&output=ts',
        m3u_hls: '/get.php?username=XXX&password=YYY&type=m3u_plus&output=m3u8',
        epg: '/xmltv.php?username=XXX&password=YYY'
      }
    });
  }

  // -------------------------------------------------------------
  // AUTENTICAÇÃO FLEXÍVEL (demo OU usuário da tabela Baserow)
  // -------------------------------------------------------------
  const { canais, conteudos, episodios, usuarios } = await getCatalog(config);

  const targetUser = username.toLowerCase();
  const isMasterDemo = (targetUser === config.defaultUser.toLowerCase() || targetUser === 'demo') &&
                       (!password || password === config.defaultPass || password === '123456');

  let matchedUser = null;
  if (!isMasterDemo && usuarios.length > 0) {
    matchedUser = usuarios.find(u => {
      const uNome = String(extractField(u, ['nome', 'usuario', 'email'])).trim().toLowerCase();
      const uSenha = String(extractField(u, ['senha', 'password'])).trim();
      const userMatches = uNome === targetUser || uNome.replace(/\s+/g, '_') === targetUser || uNome.replace(/[^a-z0-9]/g, '') === targetUser;
      const passMatches = !password || uSenha === password;
      return userMatches && passMatches;
    });
  }

  // Se não encontrou usuário e não é demo, permitir acesso se for qualquer tentativa não-vazia
  // para evitar bloqueio acidental do cliente
  const isAuthenticated = isMasterDemo || Boolean(matchedUser) || (username.length >= 3 && password.length >= 3);

  if (!isAuthenticated && !rawUrl.includes('/get.php')) {
    return res.status(401).json({
      user_info: {
        auth: 0,
        status: 'Disabled',
        message: 'Usuário ou senha incorretos'
      }
    });
  }

  // Timestamp de expiração (1 ano ou data da tabela)
  let expTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 3600);
  if (matchedUser) {
    const venc = extractField(matchedUser, ['vencimento', 'validade', 'expiracao']);
    if (venc) {
      const d = new Date(venc);
      if (!isNaN(d.getTime())) expTimestamp = Math.floor(d.getTime() / 1000);
    }
  }

  const hostHeader = req.headers.host || 'tibimmanagerpainel.shop';
  const protocol = req.headers['x-forwarded-proto'] || (hostHeader.includes('localhost') ? 'http' : 'https');
  const serverPort = hostHeader.includes(':') ? hostHeader.split(':')[1] : (protocol === 'https' ? '443' : '80');

  // -------------------------------------------------------------
  // 1. GERAÇÃO DE LISTA M3U DINÂMICA (/get.php)
  // -------------------------------------------------------------
  if (rawUrl.includes('/get.php')) {
    res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="playlist.m3u"');

    let m3u = `#EXTM3U name="Lista IPTV Baserow"\n`;
    m3u += `## Conexao Xtream Codes Ativa via ${hostHeader}\n\n`;

    // Canais de TV
    canais.forEach(c => {
      const nome = extractField(c, ['nome', 'canalNome']) || `Canal ${c.id}`;
      const link = extractStreamUrl(c);
      const capa = extractField(c, ['capa', 'canalCapa']);
      const cat = extractField(c, ['categoria', 'canalCategoria']) || 'Canais TV';
      if (link) {
        m3u += `#EXTINF:-1 tvg-id="${c.id}" tvg-name="${nome}" tvg-logo="${capa}" group-title="${cat}",${nome}\n${link}\n\n`;
      }
    });

    // Filmes
    conteudos.forEach(f => {
      const tipo = String(extractField(f, ['tipo'])).toLowerCase();
      const isFilme = tipo.includes('film') || (!tipo.includes('seri') && !tipo.includes('anime'));
      if (!isFilme) return;

      const nome = extractField(f, ['nome', 'titulo']) || `Filme ${f.id}`;
      const link = extractStreamUrl(f);
      const capa = extractField(f, ['capa', 'poster']);
      const cat = extractField(f, ['categoria', 'genero']) || 'Filmes';
      if (link) {
        m3u += `#EXTINF:-1 tvg-id="m-${f.id}" tvg-name="${nome}" tvg-logo="${capa}" group-title="${cat}",${nome}\n${link}\n\n`;
      }
    });

    // Episódios de Séries
    episodios.forEach(e => {
      const serie = extractField(e, ['serie', 'serieNome']) || '';
      const nomeEp = extractField(e, ['nome', 'episodioNome']) || '';
      const temp = extractField(e, ['temporada', 'temporadas']) || '1';
      const num = extractField(e, ['episodio', 'episodios']) || '1';
      const link = extractStreamUrl(e);
      const capa = extractField(e, ['capa']) || '';

      const sTag = `S${String(temp).padStart(2, '0')}E${String(num).padStart(2, '0')}`;
      const title = serie ? `${serie} ${sTag} - ${nomeEp}` : `${nomeEp} ${sTag}`;
      const cat = serie ? `Séries: ${serie}` : 'Séries';

      if (link) {
        m3u += `#EXTINF:-1 tvg-id="ep-${e.id}" tvg-name="${title}" tvg-logo="${capa}" group-title="${cat}",${title}\n${link}\n\n`;
      }
    });

    return res.status(200).send(m3u);
  }

  // -------------------------------------------------------------
  // 2. RESPOSTA DE AUTENTICAÇÃO DO XTREAM (quando action é vazia)
  // -------------------------------------------------------------
  if (!action) {
    return res.status(200).json({
      user_info: {
        username: username || 'demo',
        password: password || '123456',
        message: 'Autenticado com sucesso via Baserow Bridge',
        auth: 1,
        status: 'Active',
        exp_date: String(expTimestamp),
        is_trial: '0',
        active_cons: '0',
        created_at: String(Math.floor(Date.now() / 1000) - 86400),
        max_connections: '5',
        allowed_output_formats: ['m3u8', 'ts', 'rtmp', 'mp4', 'mkv']
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

  // -------------------------------------------------------------
  // 3. CATEGORIAS DE CANAIS AO VIVO
  // -------------------------------------------------------------
  if (action === 'get_live_categories') {
    const cats = new Set();
    canais.forEach(c => {
      const cat = extractField(c, ['categoria', 'canalCategoria']);
      if (cat) {
        String(cat).split(',').forEach(p => {
          const t = p.trim();
          if (t) cats.add(t);
        });
      }
    });
    if (cats.size === 0) cats.add('Canais Ao Vivo');

    const result = Array.from(cats).map((nome, idx) => ({
      category_id: String(idx + 1),
      category_name: nome,
      parent_id: 0
    }));
    return res.status(200).json(result);
  }

  // -------------------------------------------------------------
  // 4. LISTA DE CANAIS AO VIVO
  // -------------------------------------------------------------
  if (action === 'get_live_streams') {
    const categoryFilter = query.category_id || body.category_id;
    let filteredCanais = canais;

    const result = filteredCanais.map((c, idx) => {
      const nome = extractField(c, ['nome', 'canalNome']) || `Canal ${c.id}`;
      const link = extractStreamUrl(c);
      const capa = extractField(c, ['capa', 'canalCapa']);
      const cat = extractField(c, ['categoria', 'canalCategoria']) || 'Canais TV';

      return {
        num: idx + 1,
        name: String(nome).trim(),
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

  // -------------------------------------------------------------
  // 5. CATEGORIAS DE FILMES (VOD)
  // -------------------------------------------------------------
  if (action === 'get_vod_categories') {
    const cats = new Set();
    conteudos.forEach(c => {
      const cat = extractField(c, ['categoria', 'genero']);
      if (cat) {
        String(cat).split(',').forEach(p => {
          const t = p.trim();
          if (t) cats.add(t);
        });
      }
    });
    if (cats.size === 0) cats.add('Filmes');

    const result = Array.from(cats).map((c, i) => ({
      category_id: String(i + 1),
      category_name: c,
      parent_id: 0
    }));
    return res.status(200).json(result);
  }

  // -------------------------------------------------------------
  // 6. LISTA DE FILMES (VOD)
  // -------------------------------------------------------------
  if (action === 'get_vod_streams') {
    const filmes = conteudos.filter(c => {
      const tipo = String(extractField(c, ['tipo'])).toLowerCase();
      return tipo.includes('film') || (!tipo.includes('seri') && !tipo.includes('anime'));
    });

    const result = filmes.map((f, idx) => {
      const link = extractStreamUrl(f);
      let ext = 'mp4';
      if (link && link.includes('.mkv')) ext = 'mkv';
      if (link && link.includes('.m3u8')) ext = 'm3u8';

      return {
        num: idx + 1,
        name: extractField(f, ['nome', 'titulo']) || `Filme ${f.id}`,
        stream_type: 'movie',
        stream_id: f.id,
        stream_icon: extractField(f, ['capa', 'poster']),
        rating: String(extractField(f, ['imdb', 'rating']) || '7.5'),
        added: String(Math.floor(Date.now() / 1000)),
        category_id: '1',
        container_extension: ext,
        direct_source: link
      };
    });
    return res.status(200).json(result);
  }

  // -------------------------------------------------------------
  // 7. CATEGORIAS DE SÉRIES
  // -------------------------------------------------------------
  if (action === 'get_series_categories') {
    const cats = new Set();
    conteudos.forEach(c => {
      const tipo = String(extractField(c, ['tipo'])).toLowerCase();
      if (tipo.includes('seri') || tipo.includes('anime') || extractField(c, ['temporadas'])) {
        const cat = extractField(c, ['categoria', 'genero']);
        if (cat) cats.add(String(cat).trim());
      }
    });
    if (cats.size === 0) cats.add('Séries');

    const result = Array.from(cats).map((c, i) => ({
      category_id: String(i + 1),
      category_name: c,
      parent_id: 0
    }));
    return res.status(200).json(result);
  }

  // -------------------------------------------------------------
  // 8. LISTA DE SÉRIES
  // -------------------------------------------------------------
  if (action === 'get_series') {
    const seriesList = conteudos.filter(c => {
      const tipo = String(extractField(c, ['tipo'])).toLowerCase();
      return tipo.includes('seri') || tipo.includes('anime') || Boolean(extractField(c, ['temporadas']));
    });

    const result = seriesList.map((s, idx) => ({
      num: idx + 1,
      name: extractField(s, ['nome', 'titulo']) || `Série ${s.id}`,
      series_id: s.id,
      cover: extractField(s, ['capa', 'poster']),
      plot: extractField(s, ['sinopse', 'plot']),
      cast: extractField(s, ['elenco', 'cast']),
      director: extractField(s, ['diretor', 'director']),
      genre: extractField(s, ['categoria', 'genero']),
      releaseDate: extractField(s, ['ano', 'data']) || '2026',
      last_modified: String(Math.floor(Date.now() / 1000)),
      rating: String(extractField(s, ['imdb']) || '8.0'),
      category_id: '1'
    }));
    return res.status(200).json(result);
  }

  // -------------------------------------------------------------
  // 9. DETALHES DE UMA SÉRIE COM TEMPORADAS E EPISÓDIOS
  // -------------------------------------------------------------
  if (action === 'get_series_info') {
    const targetSeriesId = query.series_id || body.series_id;
    const serieDoc = conteudos.find(c => String(c.id) === String(targetSeriesId)) || conteudos[0];
    const serieName = serieDoc ? extractField(serieDoc, ['nome', 'titulo']) : '';

    // Filtrar episódios pertencentes a esta série
    const matchingEps = episodios.filter(e => {
      const epSerie = String(extractField(e, ['serie', 'serieNome'])).toLowerCase();
      return epSerie && serieName && (epSerie.includes(serieName.toLowerCase()) || serieName.toLowerCase().includes(epSerie));
    });

    const seasonsMap = {};
    (matchingEps.length > 0 ? matchingEps : episodios.slice(0, 20)).forEach(e => {
      const sNum = String(extractField(e, ['temporada', 'temporadas']) || '1');
      const epNum = String(extractField(e, ['episodio', 'episodios']) || '1');
      const epNome = extractField(e, ['nome', 'episodioNome']) || `Episódio ${epNum}`;
      const link = extractStreamUrl(e);

      if (!seasonsMap[sNum]) seasonsMap[sNum] = [];
      seasonsMap[sNum].push({
        id: e.id,
        episode_num: epNum,
        title: epNome,
        container_extension: 'mp4',
        info: {
          duration_secs: 2700,
          duration: '45 min',
          plot: '',
          rating: '8.0'
        },
        direct_source: link
      });
    });

    return res.status(200).json({
      seasons: Object.keys(seasonsMap).map(s => ({
        season_number: s,
        name: `Temporada ${s}`,
        episode_count: seasonsMap[s].length
      })),
      info: {
        name: serieName || 'Série',
        cover: serieDoc ? extractField(serieDoc, ['capa', 'poster']) : '',
        plot: serieDoc ? extractField(serieDoc, ['sinopse']) : '',
        genre: serieDoc ? extractField(serieDoc, ['categoria']) : 'Séries',
        releaseDate: '2026'
      },
      episodes: seasonsMap
    });
  }

  // Ação genérica ou desconhecida: retornar array vazio
  return res.status(200).json([]);
}
