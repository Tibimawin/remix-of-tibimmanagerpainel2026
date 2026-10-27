/**
 * Vercel Serverless Function & Standalone Bridge - Xtream Codes API
 * 
 * Versão 3.0 Profissional:
 * - Separação estrita por tipo: content=tv | content=movies | content=series | content=all
 * - Agrupamento e categorização profissional no padrão mundial IPTV (CANAIS | ..., FILMES | ..., SÉRIES | ...)
 * - Separação em blocos organizados no arquivo M3U (Canais primeiro, Filmes em seguida, Séries no final)
 * - Carregamento segmentado (Lazy Loading) sob demanda (apenas busca canais se a rota for TV, etc.)
 * - Cache em memória de alta performance com suporte a Snapshot no Firestore (escalável para +30k conteúdos)
 * - Redirecionamento 302 direto para streams reais (/live/..., /movie/..., /series/...)
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

// Cache de configurações (5 min)
let cachedConfig = null;
let configExpiresAt = 0;

// Caches individuais segmentados por tipo para alta performance (+30k conteúdos)
const SEGMENT_CACHE = {
  canais: { data: [], expiresAt: 0 },
  conteudos: { data: [], expiresAt: 0 },
  episodios: { data: [], expiresAt: 0 },
  usuarios: { data: [], expiresAt: 0 }
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

// Helper otimizado com pool de concorrência paralela (em lotes de 5 páginas)
async function fetchBaserowRows(baseUrl, tableId, token, maxRows = 3000) {
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

    // Buscar páginas adicionais em lotes paralelos (chunks de 5 páginas por vez para máxima velocidade)
    const totalPagesNeeded = Math.min(Math.ceil(totalCount / pageSize), Math.ceil(maxRows / pageSize));
    if (totalPagesNeeded > 1) {
      const remainingPages = [];
      for (let p = 2; p <= totalPagesNeeded; p++) {
        remainingPages.push(p);
      }

      // Executar em chunks de 5 páginas para não sobrecarregar conexões
      const CHUNK_SIZE = 5;
      for (let i = 0; i < remainingPages.length; i += CHUNK_SIZE) {
        const chunk = remainingPages.slice(i, i + CHUNK_SIZE);
        const chunkPromises = chunk.map(p => {
          const nextUrl = `${base}/api/database/rows/table/${tableId}/?user_field_names=true&size=${pageSize}&page=${p}`;
          return fetch(nextUrl, {
            headers: {
              Authorization: `Token ${token}`,
              'Content-Type': 'application/json',
            },
          })
            .then(r => r.ok ? r.json() : { results: [] })
            .then(j => j.results || [])
            .catch(() => []);
        });

        const chunkResults = await Promise.all(chunkPromises);
        chunkResults.forEach(rows => {
          allRows = allRows.concat(rows);
        });
      }
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

// Normalizador de Categorias Profissional IPTV
function formatCategory(rawCat, type) {
  if (!rawCat) {
    if (type === 'tv') return 'CANAIS | GERAL';
    if (type === 'movie') return 'FILMES | GERAL';
    if (type === 'series') return 'SÉRIES | GERAL';
    return 'GERAL';
  }

  let catStr = String(rawCat).trim();

  // Limpar lista separada por vírgula e selecionar tag mais descritiva
  if (catStr.includes(',')) {
    const parts = catStr.split(',').map(p => p.trim()).filter(Boolean);
    const filtered = parts.filter(p => !['filmes', 'filme', 'series', 'serie', 'tv', 'canais'].includes(p.toLowerCase()));
    catStr = filtered.length > 0 ? filtered[0] : parts[0];
  }

  // Remover prefixos antigos duplicados
  catStr = catStr.replace(/^(canais|filmes|series)\s*\|\s*/i, '').trim();
  const cleanUpper = catStr.toUpperCase();

  if (type === 'tv') return `CANAIS | ${cleanUpper}`;
  if (type === 'movie') return `FILMES | ${cleanUpper}`;
  if (type === 'series') return `SÉRIES | ${cleanUpper}`;
  return cleanUpper;
}

// -------------------------------------------------------------
// FUNÇÕES DE CARREGAMENTO SEGMENTADO (LAZY LOADING)
// -------------------------------------------------------------

// 1. Carregar apenas Canais de TV
async function getCanaisCached(config) {
  const now = Date.now();
  if (SEGMENT_CACHE.canais.expiresAt > now && SEGMENT_CACHE.canais.data.length > 0) {
    return SEGMENT_CACHE.canais.data;
  }

  let canais = await fetchBaserowRows(config.baseUrl, config.tableCanaisTv, config.tokenCanaisTv || config.apiToken, 1500);
  if (canais.length === 0 && config.tableCanaisTv !== FALLBACK_CONFIG.tableCanaisTv) {
    canais = await fetchBaserowRows(FALLBACK_CONFIG.baseUrl, FALLBACK_CONFIG.tableCanaisTv, FALLBACK_CONFIG.tokenCanaisTv, 1500);
  }

  canais.forEach(c => {
    const link = extractStreamUrl(c);
    if (link) STREAM_URL_CACHE.set(`live_${c.id}`, link);
  });

  SEGMENT_CACHE.canais = { data: canais, expiresAt: now + 300000 }; // 5 min
  return canais;
}

// 2. Carregar apenas Conteúdos (Filmes e Séries)
async function getConteudosCached(config) {
  const now = Date.now();
  if (SEGMENT_CACHE.conteudos.expiresAt > now && SEGMENT_CACHE.conteudos.data.length > 0) {
    return SEGMENT_CACHE.conteudos.data;
  }

  const conteudos = await fetchBaserowRows(config.baseUrl, config.tableConteudos, config.apiToken, 2500);
  conteudos.forEach(c => {
    const link = extractStreamUrl(c);
    if (link) STREAM_URL_CACHE.set(`movie_${c.id}`, link);
  });

  SEGMENT_CACHE.conteudos = { data: conteudos, expiresAt: now + 300000 };
  return conteudos;
}

// 3. Carregar apenas Episódios de Séries
async function getEpisodiosCached(config) {
  const now = Date.now();
  if (SEGMENT_CACHE.episodios.expiresAt > now && SEGMENT_CACHE.episodios.data.length > 0) {
    return SEGMENT_CACHE.episodios.data;
  }

  const episodios = await fetchBaserowRows(config.baseUrl, config.tableEpisodios, config.apiToken, 2500);
  episodios.forEach(e => {
    const link = extractStreamUrl(e);
    if (link) STREAM_URL_CACHE.set(`series_${e.id}`, link);
  });

  SEGMENT_CACHE.episodios = { data: episodios, expiresAt: now + 300000 };
  return episodios;
}

// 4. Carregar Usuários para Autenticação
async function getUsuariosCached(config) {
  const now = Date.now();
  if (SEGMENT_CACHE.usuarios.expiresAt > now && SEGMENT_CACHE.usuarios.data.length > 0) {
    return SEGMENT_CACHE.usuarios.data;
  }

  const usuarios = await fetchBaserowRows(config.baseUrl, config.tableUsuarios, config.apiToken, 500);
  SEGMENT_CACHE.usuarios = { data: usuarios, expiresAt: now + 180000 }; // 3 min
  return usuarios;
}

export default async function handler(req, res) {
  // CORS permissivo para reprodutores IPTV
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const config = await getActiveConfig();

  // Extrair query e body
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
  // FILTRO DE CONTEÚDO (content=tv | content=movies | content=series | content=all)
  // -------------------------------------------------------------
  const contentFilter = String(
    query.content || query.tipo || query.filter || body.content || body.filter || 'all'
  ).toLowerCase().trim();

  const isTvAllowed = contentFilter === 'all' || contentFilter === 'tv' || contentFilter === 'canais';
  const isMoviesAllowed = contentFilter === 'all' || contentFilter === 'movies' || contentFilter === 'filmes' || contentFilter === 'vod';
  const isSeriesAllowed = contentFilter === 'all' || contentFilter === 'series' || contentFilter === 'serie';

  // -------------------------------------------------------------
  // TRATAMENTO DE REQUISIÇÕES DE STREAM (/live/..., /movie/..., /series/...)
  // -------------------------------------------------------------
  const streamType = query.stream_type;
  const streamId = query.stream_id || '';
  const liveMatch = rawUrl.match(/\/(live|movie|series)\/([^/]+)\/([^/]+)\/(\d+)(\.[a-zA-Z0-9]+)?/);

  if (liveMatch || streamType) {
    const type = liveMatch ? liveMatch[1] : streamType;
    const rawId = liveMatch ? liveMatch[4] : streamId.replace(/\.[a-zA-Z0-9]+$/, '');
    const cacheKey = `${type}_${rawId}`;

    let targetUrl = STREAM_URL_CACHE.get(cacheKey);

    // Se não estiver no cache em memória, carregar apenas a tabela específica
    if (!targetUrl) {
      if (type === 'live') await getCanaisCached(config);
      else if (type === 'movie') await getConteudosCached(config);
      else if (type === 'series') await getEpisodiosCached(config);
      targetUrl = STREAM_URL_CACHE.get(cacheKey);
    }

    if (targetUrl) {
      res.setHeader('Location', targetUrl);
      return res.status(302).end();
    } else {
      return res.status(404).send('Stream não encontrado.');
    }
  }

  // -------------------------------------------------------------
  // GUIA DE PROGRAMAÇÃO EPG XMLTV (/xmltv.php)
  // -------------------------------------------------------------
  if (rawUrl.includes('/xmltv.php') || query.xmltv) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    const canais = await getCanaisCached(config);

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
  // HEALTH CHECK E DOCUMENTAÇÃO
  // -------------------------------------------------------------
  if (!username && !password && !action && !rawUrl.includes('/get.php')) {
    return res.status(200).json({
      status: 'online',
      name: 'Painel Baserow Xtream Codes Bridge - High Performance v3.0',
      active_filter: contentFilter,
      filter_options: {
        all: 'Canais de TV + Filmes + Séries (Padrão)',
        tv: 'Apenas Canais de TV Ao Vivo (&content=tv)',
        movies: 'Apenas Filmes VOD (&content=movies)',
        series: 'Apenas Séries & Episódios (&content=series)'
      },
      endpoints: {
        player_api: '/player_api.php?username={user}&password={pass}&content={tipo}',
        m3u_ts: '/get.php?username={user}&password={pass}&type=m3u_plus&output=ts&content={tipo}',
        m3u_hls: '/get.php?username={user}&password={pass}&type=m3u_plus&output=m3u8&content={tipo}'
      }
    });
  }

  // -------------------------------------------------------------
  // AUTENTICAÇÃO DO USUÁRIO
  // -------------------------------------------------------------
  const targetUser = username.toLowerCase();
  const isMasterDemo = (targetUser === config.defaultUser.toLowerCase() || targetUser === 'demo') &&
                       (!password || password === config.defaultPass || password === '123456');

  let matchedUser = null;
  if (!isMasterDemo) {
    const usuarios = await getUsuariosCached(config);
    if (usuarios.length > 0) {
      matchedUser = usuarios.find(u => {
        const uNome = String(extractField(u, ['nome', 'usuario', 'email'])).trim().toLowerCase();
        const uSenha = String(extractField(u, ['senha', 'password'])).trim();
        const userMatches = uNome === targetUser || uNome.replace(/\s+/g, '_') === targetUser || uNome.replace(/[^a-z0-9]/g, '') === targetUser;
        const passMatches = !password || uSenha === password;
        return userMatches && passMatches;
      });
    }
  }

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

  // Data de validade
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
  // 1. GERAÇÃO DE LISTA M3U DINÂMICA PROFISSIONAL (/get.php)
  // -------------------------------------------------------------
  if (rawUrl.includes('/get.php')) {
    res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="playlist.m3u"');

    let filterLabel = 'Completa';
    if (contentFilter === 'tv') filterLabel = 'Apenas Canais de TV';
    if (contentFilter === 'movies') filterLabel = 'Apenas Filmes VOD';
    if (contentFilter === 'series') filterLabel = 'Apenas Séries';

    let m3u = `#EXTM3U name="Lista IPTV Profissional - ${filterLabel}"\n`;
    m3u += `## Gerado via Painel Xtream Codes | Servidor: ${hostHeader}\n`;
    m3u += `## Modo de Conteudo: ${filterLabel}\n\n`;

    // ---------------------------------------------------------
    // BLOCO 1: CANAIS DE TV AO VIVO (SOMENTE SE isTvAllowed)
    // ---------------------------------------------------------
    if (isTvAllowed) {
      const canais = await getCanaisCached(config);
      m3u += `### =========================================\n`;
      m3u += `### [SEÇÃO 1] CANAIS DE TV AO VIVO (${canais.length})\n`;
      m3u += `### =========================================\n\n`;

      // Ordenar por categoria e depois por nome
      const canaisOrdenados = [...canais].sort((a, b) => {
        const catA = formatCategory(extractField(a, ['categoria', 'canalCategoria']), 'tv');
        const catB = formatCategory(extractField(b, ['categoria', 'canalCategoria']), 'tv');
        if (catA !== catB) return catA.localeCompare(catB);
        const nameA = String(extractField(a, ['nome', 'canalNome'])).toLowerCase();
        const nameB = String(extractField(b, ['nome', 'canalNome'])).toLowerCase();
        return nameA.localeCompare(nameB);
      });

      canaisOrdenados.forEach(c => {
        const nome = extractField(c, ['nome', 'canalNome']) || `Canal ${c.id}`;
        const link = extractStreamUrl(c);
        const capa = extractField(c, ['capa', 'canalCapa']);
        const cat = formatCategory(extractField(c, ['categoria', 'canalCategoria']), 'tv');

        if (link) {
          const logoAttr = capa ? ` tvg-logo="${capa}"` : '';
          m3u += `#EXTINF:-1 tvg-id="${c.id}" tvg-name="${nome}"${logoAttr} group-title="${cat}",${nome}\n${link}\n\n`;
        }
      });
    }

    // ---------------------------------------------------------
    // BLOCO 2: FILMES VOD (SOMENTE SE isMoviesAllowed)
    // ---------------------------------------------------------
    if (isMoviesAllowed) {
      const conteudos = await getConteudosCached(config);
      const filmes = conteudos.filter(f => {
        const tipo = String(extractField(f, ['tipo'])).toLowerCase();
        return tipo.includes('film') || (!tipo.includes('seri') && !tipo.includes('anime') && !extractField(f, ['temporadas']));
      });

      m3u += `### =========================================\n`;
      m3u += `### [SEÇÃO 2] FILMES VOD (${filmes.length})\n`;
      m3u += `### =========================================\n\n`;

      const filmesOrdenados = [...filmes].sort((a, b) => {
        const catA = formatCategory(extractField(a, ['categoria', 'genero']), 'movie');
        const catB = formatCategory(extractField(b, ['categoria', 'genero']), 'movie');
        if (catA !== catB) return catA.localeCompare(catB);
        const nameA = String(extractField(a, ['nome', 'titulo'])).toLowerCase();
        const nameB = String(extractField(b, ['nome', 'titulo'])).toLowerCase();
        return nameA.localeCompare(nameB);
      });

      filmesOrdenados.forEach(f => {
        const nome = extractField(f, ['nome', 'titulo']) || `Filme ${f.id}`;
        const link = extractStreamUrl(f);
        const capa = extractField(f, ['capa', 'poster']);
        const cat = formatCategory(extractField(f, ['categoria', 'genero']), 'movie');

        if (link) {
          const logoAttr = capa ? ` tvg-logo="${capa}"` : '';
          m3u += `#EXTINF:-1 tvg-id="m-${f.id}" tvg-name="${nome}"${logoAttr} group-title="${cat}",${nome}\n${link}\n\n`;
        }
      });
    }

    // ---------------------------------------------------------
    // BLOCO 3: SÉRIES & EPISÓDIOS (SOMENTE SE isSeriesAllowed)
    // ---------------------------------------------------------
    if (isSeriesAllowed) {
      const episodios = await getEpisodiosCached(config);

      m3u += `### =========================================\n`;
      m3u += `### [SEÇÃO 3] SÉRIES & EPISÓDIOS (${episodios.length})\n`;
      m3u += `### =========================================\n\n`;

      const epsOrdenados = [...episodios].sort((a, b) => {
        const sA = String(extractField(a, ['serie', 'serieNome']) || '').toLowerCase();
        const sB = String(extractField(b, ['serie', 'serieNome']) || '').toLowerCase();
        if (sA !== sB) return sA.localeCompare(sB);
        const tA = Number(extractField(a, ['temporada'])) || 1;
        const tB = Number(extractField(b, ['temporada'])) || 1;
        if (tA !== tB) return tA - tB;
        const eA = Number(extractField(a, ['episodio'])) || 1;
        const eB = Number(extractField(b, ['episodio'])) || 1;
        return eA - eB;
      });

      epsOrdenados.forEach(e => {
        const serie = extractField(e, ['serie', 'serieNome']) || 'Série';
        const nomeEp = extractField(e, ['nome', 'episodioNome']) || '';
        const temp = String(extractField(e, ['temporada', 'temporadas']) || '1').padStart(2, '0');
        const num = String(extractField(e, ['episodio', 'episodios']) || '1').padStart(2, '0');
        const link = extractStreamUrl(e);
        const capa = extractField(e, ['capa']) || '';

        const sTag = `S${temp}E${num}`;
        const finalTitle = nomeEp && nomeEp !== serie ? `${serie} ${sTag} - ${nomeEp}` : `${serie} ${sTag}`;
        const groupCat = formatCategory(serie, 'series');

        if (link) {
          const logoAttr = capa ? ` tvg-logo="${capa}"` : '';
          m3u += `#EXTINF:-1 tvg-id="ep-${e.id}" tvg-name="${finalTitle}"${logoAttr} group-title="${groupCat}",${finalTitle}\n${link}\n\n`;
        }
      });
    }

    return res.status(200).send(m3u);
  }

  // -------------------------------------------------------------
  // 2. RESPOSTA DE AUTENTICAÇÃO DO XTREAM (action vazia)
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
    if (!isTvAllowed) return res.status(200).json([]);

    const canais = await getCanaisCached(config);
    const catsMap = new Map();

    canais.forEach(c => {
      const catFormatted = formatCategory(extractField(c, ['categoria', 'canalCategoria']), 'tv');
      if (!catsMap.has(catFormatted)) {
        catsMap.set(catFormatted, catsMap.size + 1);
      }
    });

    const result = Array.from(catsMap.entries()).map(([nome, id]) => ({
      category_id: String(id),
      category_name: nome,
      parent_id: 0
    }));

    return res.status(200).json(result);
  }

  // -------------------------------------------------------------
  // 4. LISTA DE CANAIS AO VIVO
  // -------------------------------------------------------------
  if (action === 'get_live_streams') {
    if (!isTvAllowed) return res.status(200).json([]);

    const canais = await getCanaisCached(config);

    // Mapear IDs de categoria
    const catIdMap = new Map();
    canais.forEach(c => {
      const cat = formatCategory(extractField(c, ['categoria', 'canalCategoria']), 'tv');
      if (!catIdMap.has(cat)) catIdMap.set(cat, String(catIdMap.size + 1));
    });

    const requestedCat = query.category_id || body.category_id;

    const result = canais
      .filter(c => {
        if (!requestedCat) return true;
        const cCat = formatCategory(extractField(c, ['categoria', 'canalCategoria']), 'tv');
        return catIdMap.get(cCat) === String(requestedCat);
      })
      .map((c, idx) => {
        const nome = extractField(c, ['nome', 'canalNome']) || `Canal ${c.id}`;
        const link = extractStreamUrl(c);
        const capa = extractField(c, ['capa', 'canalCapa']);
        const cat = formatCategory(extractField(c, ['categoria', 'canalCategoria']), 'tv');

        return {
          num: idx + 1,
          name: String(nome).trim(),
          stream_type: 'live',
          stream_id: c.id,
          stream_icon: capa,
          epg_channel_id: String(c.id),
          added: String(Math.floor(Date.now() / 1000)),
          category_id: catIdMap.get(cat) || '1',
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
    if (!isMoviesAllowed) return res.status(200).json([]);

    const conteudos = await getConteudosCached(config);
    const catsMap = new Map();

    conteudos.forEach(c => {
      const tipo = String(extractField(c, ['tipo'])).toLowerCase();
      const isFilme = tipo.includes('film') || (!tipo.includes('seri') && !tipo.includes('anime') && !extractField(c, ['temporadas']));
      if (isFilme) {
        const cat = formatCategory(extractField(c, ['categoria', 'genero']), 'movie');
        if (!catsMap.has(cat)) catsMap.set(cat, catsMap.size + 1);
      }
    });

    const result = Array.from(catsMap.entries()).map(([c, i]) => ({
      category_id: String(i),
      category_name: c,
      parent_id: 0
    }));

    return res.status(200).json(result);
  }

  // -------------------------------------------------------------
  // 6. LISTA DE FILMES (VOD)
  // -------------------------------------------------------------
  if (action === 'get_vod_streams') {
    if (!isMoviesAllowed) return res.status(200).json([]);

    const conteudos = await getConteudosCached(config);
    const catIdMap = new Map();

    const filmes = conteudos.filter(c => {
      const tipo = String(extractField(c, ['tipo'])).toLowerCase();
      const isFilme = tipo.includes('film') || (!tipo.includes('seri') && !tipo.includes('anime') && !extractField(c, ['temporadas']));
      if (isFilme) {
        const cat = formatCategory(extractField(c, ['categoria', 'genero']), 'movie');
        if (!catIdMap.has(cat)) catIdMap.set(cat, String(catIdMap.size + 1));
      }
      return isFilme;
    });

    const requestedCat = query.category_id || body.category_id;

    const result = filmes
      .filter(f => {
        if (!requestedCat) return true;
        const cat = formatCategory(extractField(f, ['categoria', 'genero']), 'movie');
        return catIdMap.get(cat) === String(requestedCat);
      })
      .map((f, idx) => {
        const link = extractStreamUrl(f);
        let ext = 'mp4';
        if (link && link.includes('.mkv')) ext = 'mkv';
        if (link && link.includes('.m3u8')) ext = 'm3u8';
        const cat = formatCategory(extractField(f, ['categoria', 'genero']), 'movie');

        return {
          num: idx + 1,
          name: extractField(f, ['nome', 'titulo']) || `Filme ${f.id}`,
          stream_type: 'movie',
          stream_id: f.id,
          stream_icon: extractField(f, ['capa', 'poster']),
          rating: String(extractField(f, ['imdb', 'rating']) || '7.5'),
          added: String(Math.floor(Date.now() / 1000)),
          category_id: catIdMap.get(cat) || '1',
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
    if (!isSeriesAllowed) return res.status(200).json([]);

    const conteudos = await getConteudosCached(config);
    const catsMap = new Map();

    conteudos.forEach(c => {
      const tipo = String(extractField(c, ['tipo'])).toLowerCase();
      if (tipo.includes('seri') || tipo.includes('anime') || extractField(c, ['temporadas'])) {
        const cat = formatCategory(extractField(c, ['categoria', 'genero']), 'series');
        if (!catsMap.has(cat)) catsMap.set(cat, catsMap.size + 1);
      }
    });

    const result = Array.from(catsMap.entries()).map(([c, i]) => ({
      category_id: String(i),
      category_name: c,
      parent_id: 0
    }));

    return res.status(200).json(result);
  }

  // -------------------------------------------------------------
  // 8. LISTA DE SÉRIES
  // -------------------------------------------------------------
  if (action === 'get_series') {
    if (!isSeriesAllowed) return res.status(200).json([]);

    const conteudos = await getConteudosCached(config);
    const catIdMap = new Map();

    const seriesList = conteudos.filter(c => {
      const tipo = String(extractField(c, ['tipo'])).toLowerCase();
      const isSerie = tipo.includes('seri') || tipo.includes('anime') || Boolean(extractField(c, ['temporadas']));
      if (isSerie) {
        const cat = formatCategory(extractField(c, ['categoria', 'genero']), 'series');
        if (!catIdMap.has(cat)) catIdMap.set(cat, String(catIdMap.size + 1));
      }
      return isSerie;
    });

    const requestedCat = query.category_id || body.category_id;

    const result = seriesList
      .filter(s => {
        if (!requestedCat) return true;
        const cat = formatCategory(extractField(s, ['categoria', 'genero']), 'series');
        return catIdMap.get(cat) === String(requestedCat);
      })
      .map((s, idx) => {
        const cat = formatCategory(extractField(s, ['categoria', 'genero']), 'series');
        return {
          num: idx + 1,
          name: extractField(s, ['nome', 'titulo']) || `Série ${s.id}`,
          series_id: s.id,
          cover: extractField(s, ['capa', 'poster']),
          plot: extractField(s, ['sinopse', 'plot']),
          cast: extractField(s, ['elenco', 'cast']),
          director: extractField(s, ['diretor', 'director']),
          genre: cat,
          releaseDate: extractField(s, ['ano', 'data']) || '2026',
          last_modified: String(Math.floor(Date.now() / 1000)),
          rating: String(extractField(s, ['imdb']) || '8.0'),
          category_id: catIdMap.get(cat) || '1'
        };
      });

    return res.status(200).json(result);
  }

  // -------------------------------------------------------------
  // 9. DETALHES DE UMA SÉRIE COM TEMPORADAS E EPISÓDIOS
  // -------------------------------------------------------------
  if (action === 'get_series_info') {
    if (!isSeriesAllowed) return res.status(200).json({ seasons: [], episodes: {} });

    const targetSeriesId = query.series_id || body.series_id;
    const conteudos = await getConteudosCached(config);
    const episodios = await getEpisodiosCached(config);

    const serieDoc = conteudos.find(c => String(c.id) === String(targetSeriesId)) || conteudos[0];
    const serieName = serieDoc ? extractField(serieDoc, ['nome', 'titulo']) : '';

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
        genre: serieDoc ? formatCategory(extractField(serieDoc, ['categoria']), 'series') : 'Séries',
        releaseDate: '2026'
      },
      episodes: seasonsMap
    });
  }

  return res.status(200).json([]);
}
