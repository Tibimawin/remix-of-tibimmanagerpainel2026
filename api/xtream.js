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
  apiToken: 'GdbNYJHQHQVLqiu6l4AmDIflycrcppPw',
  tableCanaisTv: '1302', // Tabela ativa configurada pelo usuário (e fallback 909)
  tokenCanaisTv: 'GdbNYJHQHQVLqiu6l4AmDIflycrcppPw',
  tableConteudos: '1295', // Tabela ativa de conteúdos (e fallback 917)
  tableEpisodios: '1296', // Tabela ativa de episódios (e fallback 911)
  tableUsuarios: '1297', // Tabela ativa de usuários (e fallback 889)
  tableCategoriasTV: '1310',
  defaultUser: 'demo',
  defaultPass: '123456'
};

// Sanitizador de texto para tags e metadados M3U
function sanitizeM3uText(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Parser universal de datas (ISO: 2026-01-24T01:07:45Z, SQL: 2026-06-11 04:23:42, YYYY-MM-DD e DD/MM/YYYY)
function parseUserDate(val) {
  if (!val) return null;
  if (typeof val === 'object' && val !== null) {
    if (val.value) val = val.value;
    else if (val.date) val = val.date;
  }
  const s = String(val).trim();
  if (!s) return null;

  // Timestamp numérico
  if (/^\d+$/.test(s)) {
    const num = Number(s);
    return new Date(num > 10000000000 ? num : num * 1000);
  }

  // DD/MM/YYYY ou DD/MM/YYYY HH:mm:ss
  const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (brMatch) {
    const dia = brMatch[1].padStart(2, '0');
    const mes = brMatch[2].padStart(2, '0');
    const ano = brMatch[3];
    const hora = (brMatch[4] || '23').padStart(2, '0');
    const min = (brMatch[5] || '59').padStart(2, '0');
    const seg = (brMatch[6] || '59').padStart(2, '0');
    return new Date(`${ano}-${mes}-${dia}T${hora}:${min}:${seg}Z`);
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T23:59:59Z`);
  }

  // YYYY-MM-DD HH:mm:ss
  const sqlMatch = s.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{1,2}(?::\d{1,2})?)/);
  if (sqlMatch) {
    return new Date(`${sqlMatch[1]}T${sqlMatch[2]}Z`);
  }

  // ISO 8601 (ex: 2026-01-24T01:07:45Z, 2026-02-14T23:04:17.151859Z)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return null;
}

// Cache de configurações (60s)
let cachedConfig = null;
let configExpiresAt = 0;

// Caches individuais segmentados por tipo para alta performance (+30k conteúdos)
const SEGMENT_CACHE = {
  canais: { data: [], expiresAt: 0 },
  conteudos: { data: [], expiresAt: 0 },
  episodios: { data: [], expiresAt: 0 },
  usuarios: { data: [], expiresAt: 0 }
};

// Cache individual por série para busca sob demanda em 290ms sem sobrecarregar Baserow
const SERIES_INFO_CACHE = new Map();

// Mapa global para redirecionamento instantâneo de stream (stream_id -> real_url)
const STREAM_URL_CACHE = new Map();

// Helper para obter configuração dinâmica do Firestore ou fallback
async function getActiveConfig() {
  const now = Date.now();
  if (cachedConfig && configExpiresAt > now) {
    return cachedConfig;
  }

  let baseCfg = { ...FALLBACK_CONFIG };

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/globalConfig/xtreamConfig?key=${FIREBASE_API_KEY}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const doc = await resp.json();
      const f = doc.fields || {};
      if (f.baseUrl?.stringValue) baseCfg.baseUrl = f.baseUrl.stringValue;
      if (f.apiToken?.stringValue) baseCfg.apiToken = f.apiToken.stringValue;
      if (f.tableCanaisTv?.stringValue) baseCfg.tableCanaisTv = f.tableCanaisTv.stringValue;
      if (f.tokenCanaisTv?.stringValue) baseCfg.tokenCanaisTv = f.tokenCanaisTv.stringValue;
      else if (f.apiToken?.stringValue) baseCfg.tokenCanaisTv = f.apiToken.stringValue;
      if (f.tableConteudos?.stringValue) baseCfg.tableConteudos = f.tableConteudos.stringValue;
      if (f.tableEpisodios?.stringValue) baseCfg.tableEpisodios = f.tableEpisodios.stringValue;
      if (f.tableUsuarios?.stringValue) baseCfg.tableUsuarios = f.tableUsuarios.stringValue;
      if (f.tableCategoriasTV?.stringValue) baseCfg.tableCategoriasTV = f.tableCategoriasTV.stringValue;
      if (f.defaultUser?.stringValue) baseCfg.defaultUser = f.defaultUser.stringValue;
      if (f.defaultPass?.stringValue) baseCfg.defaultPass = f.defaultPass.stringValue;
    }
  } catch (err) {
    console.warn('[xtream-api] Erro ao carregar xtreamConfig do Firestore:', err?.message);
  }

  // Se tableCanaisTv ainda for vazia, consultar userConfigs no Firestore
  if (!baseCfg.tableCanaisTv) {
    try {
      const uUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/userConfigs?key=${FIREBASE_API_KEY}&pageSize=10`;
      const uResp = await fetch(uUrl);
      if (uResp.ok) {
        const uData = await uResp.json();
        if (uData.documents && uData.documents.length > 0) {
          for (const uDoc of uData.documents) {
            const uFields = uDoc.fields || {};
            const tIds = uFields.tableIds?.mapValue?.fields || {};
            if (tIds.canaisTv?.stringValue) {
              baseCfg.tableCanaisTv = tIds.canaisTv.stringValue;
              if (tIds.conteudos?.stringValue) baseCfg.tableConteudos = tIds.conteudos.stringValue;
              if (tIds.episodios?.stringValue) baseCfg.tableEpisodios = tIds.episodios.stringValue;
              if (tIds.usuarios?.stringValue) baseCfg.tableUsuarios = tIds.usuarios.stringValue;
              if (uFields.baseUrl?.stringValue) baseCfg.baseUrl = uFields.baseUrl.stringValue;
              if (uFields.apiToken?.stringValue) {
                baseCfg.apiToken = uFields.apiToken.stringValue;
                baseCfg.tokenCanaisTv = uFields.apiToken.stringValue;
              }
              break;
            }
          }
        }
      }
    } catch (uErr) {
      console.warn('[xtream-api] Erro ao verificar userConfigs:', uErr?.message);
    }
  }

  cachedConfig = baseCfg;
  configExpiresAt = now + 60000; // 1 minuto de cache
  return cachedConfig;
}

// Helper otimizado com pool de concorrência paralela (em lotes de 5 páginas)
async function fetchBaserowRows(baseUrl, tableId, token, maxRows = 3000, searchTerm = '') {
  if (!tableId || !token) return [];
  try {
    const base = baseUrl.replace(/\/+$/, '');
    const pageSize = 200; // Limite estrito da API do Baserow
    const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
    const firstUrl = `${base}/api/database/rows/table/${tableId}/?user_field_names=true&size=${pageSize}&page=1${searchParam}`;
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
          const nextUrl = `${base}/api/database/rows/table/${tableId}/?user_field_names=true&size=${pageSize}&page=${p}${searchParam}`;
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

  // Carrega até 12.000 para cobrir integralmente os 5.054 filmes e 2.712 séries
  const conteudos = await fetchBaserowRows(config.baseUrl, config.tableConteudos, config.apiToken, 12000);
  conteudos.forEach(c => {
    const link = extractStreamUrl(c);
    if (link) STREAM_URL_CACHE.set(`movie_${c.id}`, link);
  });

  SEGMENT_CACHE.conteudos = { data: conteudos, expiresAt: now + 600000 }; // 10 min cache
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

// 5. Validador Centralizado de Usuário com Cálculo Rigoroso de DataCriacao, Vencimento e Limite
async function validateUser(config, username, password) {
  const targetUser = String(username || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  if (!targetUser) {
    return { ok: false, status: 'Disabled', message: 'Usuário e senha são obrigatórios' };
  }

  const isMasterDemo = (targetUser === String(config.defaultUser || 'demo').toLowerCase() || targetUser === 'demo') &&
                       (!cleanPass || cleanPass === String(config.defaultPass || '123456') || cleanPass === '123456');

  if (isMasterDemo) {
    return {
      ok: true,
      user: { Nome: 'demo', Status: 'Ativo', Limite: '1' },
      expTimestamp: Math.floor(Date.now() / 1000) + (365 * 24 * 3600),
      criacaoTimestamp: Math.floor(Date.now() / 1000) - 86400,
      maxConnections: '1',
      status: 'Active'
    };
  }

  // 1. Busca rápida por busca no Baserow
  let candidateUsers = await fetchBaserowRows(config.baseUrl, config.tableUsuarios, config.apiToken, 25, targetUser);
  if (candidateUsers.length === 0) {
    candidateUsers = await getUsuariosCached(config);
  }
  // Se ainda não encontrou e a tabela padrão for diferente de 889, tentar na tabela 889
  if (candidateUsers.length === 0 && config.tableUsuarios !== '889') {
    candidateUsers = await fetchBaserowRows(FALLBACK_CONFIG.baseUrl, '889', FALLBACK_CONFIG.tokenCanaisTv || FALLBACK_CONFIG.apiToken, 25, targetUser);
  }

  const matchedUser = candidateUsers.find(u => {
    const uNome = String(extractField(u, ['nome', 'usuario'])).trim().toLowerCase();
    const uEmail = String(extractField(u, ['email'])).trim().toLowerCase();
    return uNome === targetUser || uEmail === targetUser || uNome.replace(/\s+/g, '_') === targetUser || uNome.replace(/[^a-z0-9]/g, '') === targetUser;
  });

  if (!matchedUser) {
    return { ok: false, status: 'Disabled', message: 'Usuário não encontrado no sistema' };
  }

  // 2. Validar Senha
  const uSenha = String(extractField(matchedUser, ['senha', 'password', 'pin'])).trim();
  if (cleanPass && uSenha && cleanPass !== uSenha) {
    return { ok: false, status: 'Disabled', message: 'Senha incorreta para o usuário informado' };
  }

  // 3. Validar Status do Usuário
  const uStatus = String(extractField(matchedUser, ['status', 'ativo']) || 'Ativo').trim().toLowerCase();
  if (['inativo', 'bloqueado', 'suspenso', 'cancelado', 'desativado'].includes(uStatus)) {
    return {
      ok: false,
      status: 'Disabled',
      message: 'Sua conta está bloqueada ou inativa no sistema. Entre em contato com o suporte.'
    };
  }

  // 4. Validar DataCriacao e Vencimento (Suporta: 2026-01-24T01:07:45Z, 2026-06-11 04:23:42, YYYY-MM-DD, DD/MM/YYYY)
  const rawCriacao = extractField(matchedUser, ['datacriacao', 'data_criacao', 'criado_em', 'createdat', 'data']);
  const rawVencimento = extractField(matchedUser, ['vencimento', 'data_vencimento', 'validade', 'expiracao', 'exp_date']);

  const criacaoDate = parseUserDate(rawCriacao) || new Date(Date.now() - 86400000);
  let vencDate = parseUserDate(rawVencimento);

  // Se vencimento não foi preenchido, calcular período padrão a partir da data de criação
  if (!vencDate) {
    if (['grátis', 'gratis', 'teste'].includes(uStatus)) {
      vencDate = new Date(criacaoDate.getTime() + (30 * 24 * 3600 * 1000));
    } else {
      vencDate = new Date(criacaoDate.getTime() + (30 * 24 * 3600 * 1000));
    }
  }

  const nowMs = Date.now();

  // A. Fora da data: Se a data de criação/início for no futuro (mais de 1 min à frente)
  if (criacaoDate && nowMs < criacaoDate.getTime() - 60000) {
    const dataInicioFmt = criacaoDate.toLocaleDateString('pt-BR');
    const horaInicioFmt = criacaoDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const horaStr = (horaInicioFmt && horaInicioFmt !== '00:00' && horaInicioFmt !== '23:59') ? ` às ${horaInicioFmt}` : '';
    return {
      ok: false,
      status: 'NotActive',
      message: `Acesso ainda não iniciado. Válido a partir de ${dataInicioFmt}${horaStr}.`,
      expTimestamp: vencDate ? Math.floor(vencDate.getTime() / 1000) : 0,
      criacaoTimestamp: Math.floor(criacaoDate.getTime() / 1000)
    };
  }

  // B. Fora da data: Se a data de vencimento já expirou (Bloqueia login e encerra lista)
  if (vencDate && nowMs > vencDate.getTime()) {
    const dataVencFmt = vencDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaVencFmt = vencDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const horaStr = (horaVencFmt && horaVencFmt !== '00:00' && horaVencFmt !== '23:59') ? ` às ${horaVencFmt}` : '';
    return {
      ok: false,
      status: 'Expired',
      message: `Acesso expirado em ${dataVencFmt}${horaStr}. Renove sua assinatura para continuar assistindo.`,
      expTimestamp: Math.floor(vencDate.getTime() / 1000),
      criacaoTimestamp: Math.floor(criacaoDate.getTime() / 1000)
    };
  }

  // C. Usuário Válido e Ativo dentro do período!
  const expTimestamp = vencDate ? Math.floor(vencDate.getTime() / 1000) : Math.floor(Date.now() / 1000) + (30 * 86400);
  const criacaoTimestamp = Math.floor(criacaoDate.getTime() / 1000);
  const rawLimite = extractField(matchedUser, ['limite', 'conexoes', 'max_connections', 'telas']);
  const maxConnections = String(rawLimite && !isNaN(Number(rawLimite)) && Number(rawLimite) > 0 ? Number(rawLimite) : 1);

  return {
    ok: true,
    user: matchedUser,
    status: 'Active',
    expTimestamp,
    criacaoTimestamp,
    maxConnections,
    vencDate,
    criacaoDate
  };
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
    const streamUser = liveMatch ? decodeURIComponent(liveMatch[2]) : username;
    const streamPass = liveMatch ? decodeURIComponent(liveMatch[3]) : password;
    const rawId = liveMatch ? liveMatch[4] : streamId.replace(/\.[a-zA-Z0-9]+$/, '');

    // VALIDAÇÃO RIGOROSA DE EXPIRAÇÃO NO STREAM
    const authStream = await validateUser(config, streamUser, streamPass);
    if (!authStream.ok) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(403).send(`[ACESSO NEGADO] ${authStream.message}`);
    }

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
      channels_table: config.tableCanaisTv,
      users_table: config.tableUsuarios,
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
  // AUTENTICAÇÃO DO USUÁRIO & VALIDAÇÃO DE DATACRIACAO E VENCIMENTO
  // -------------------------------------------------------------
  const authResult = await validateUser(config, username, password);

  if (!authResult.ok) {
    if (rawUrl.includes('/get.php')) {
      res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
      return res.status(403).send(
        `#EXTM3U\n` +
        `#EXTINF:-1 tvg-id="aviso-expirado" tvg-name="[AVISO] ${authResult.status.toUpperCase()}" group-title="AVISOS",[AVISO] ${authResult.message}\n` +
        `http://painel/aviso-expirado\n`
      );
    }

    return res.status(200).json({
      user_info: {
        auth: 0,
        status: authResult.status || 'Disabled',
        message: authResult.message,
        exp_date: String(authResult.expTimestamp || 0),
        created_at: String(authResult.criacaoTimestamp || 0),
        max_connections: '0',
        is_trial: '0',
        active_cons: '0'
      }
    });
  }

  const expTimestamp = authResult.expTimestamp;
  const criacaoTimestamp = authResult.criacaoTimestamp;
  const maxConnections = authResult.maxConnections;

  const hostHeader = req.headers.host || 'tibimmanagerpainel.shop';
  const protocol = req.headers['x-forwarded-proto'] || (hostHeader.includes('localhost') ? 'http' : 'https');
  const serverPort = hostHeader.includes(':') ? hostHeader.split(':')[1] : (protocol === 'https' ? '443' : '80');

  // -------------------------------------------------------------
  // 1. GERAÇÃO DE LISTA M3U DINÂMICA PROFISSIONAL (/get.php) COM SINOPSE
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
    m3u += `## Modo de Conteudo: ${filterLabel}\n`;
    m3u += `## Cliente: ${username || 'demo'} | Validade: ${new Date(expTimestamp * 1000).toLocaleDateString('pt-BR')}\n\n`;

    // ---------------------------------------------------------
    // BLOCO 1: CANAIS DE TV AO VIVO (SOMENTE SE isTvAllowed)
    // ---------------------------------------------------------
    if (isTvAllowed) {
      const canais = await getCanaisCached(config);
      m3u += `### =========================================\n`;
      m3u += `### [SEÇÃO 1] CANAIS DE TV AO VIVO (${canais.length})\n`;
      m3u += `### =========================================\n\n`;

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
        const sinopse = extractField(c, ['sinopse', 'plot', 'descricao', 'description', 'canalSinopse']);
        const cleanSinopse = sanitizeM3uText(sinopse);

        if (link) {
          const logoAttr = capa ? ` tvg-logo="${capa}"` : '';
          const plotAttr = cleanSinopse ? ` tvg-plot="${cleanSinopse}" tvg-description="${cleanSinopse}" description="${cleanSinopse}" plot="${cleanSinopse}"` : '';

          m3u += `#EXTINF:-1 tvg-id="${c.id}" tvg-name="${nome}"${logoAttr}${plotAttr} group-title="${cat}",${nome}\n${link}\n\n`;
        }
      });
    }

    // ---------------------------------------------------------
    // BLOCO 2: FILMES VOD (SOMENTE SE isMoviesAllowed) COM SINOPSE
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
        const sinopse = extractField(f, ['sinopse', 'plot', 'descricao', 'description', 'overview']);
        const cleanSinopse = sanitizeM3uText(sinopse);

        if (link) {
          const logoAttr = capa ? ` tvg-logo="${capa}"` : '';
          const plotAttr = cleanSinopse ? ` tvg-plot="${cleanSinopse}" tvg-description="${cleanSinopse}" description="${cleanSinopse}" plot="${cleanSinopse}"` : '';

          m3u += `#EXTINF:-1 tvg-id="m-${f.id}" tvg-name="${nome}"${logoAttr}${plotAttr} group-title="${cat}",${nome}\n${link}\n\n`;
        }
      });
    }

    // ---------------------------------------------------------
    // BLOCO 3: SÉRIES & EPISÓDIOS (SOMENTE SE isSeriesAllowed) COM SINOPSE
    // ---------------------------------------------------------
    if (isSeriesAllowed) {
      // Mapear sinopse das séries para preencher nos episódios
      const conteudos = await getConteudosCached(config);
      const serieSinopseMap = new Map();
      conteudos.forEach(c => {
        const sNome = String(extractField(c, ['nome', 'titulo']) || '').trim().toLowerCase();
        const sSinopse = extractField(c, ['sinopse', 'plot', 'descricao', 'description', 'overview']);
        if (sNome && sSinopse) {
          serieSinopseMap.set(sNome, sanitizeM3uText(sSinopse));
        }
      });

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
        const epSinopse = extractField(e, ['sinopse', 'plot', 'descricao', 'description', 'overview']);
        const cleanSinopse = sanitizeM3uText(epSinopse) || serieSinopseMap.get(String(serie).trim().toLowerCase()) || '';

        const sTag = `S${temp}E${num}`;
        const finalTitle = nomeEp && nomeEp !== serie ? `${serie} ${sTag} - ${nomeEp}` : `${serie} ${sTag}`;
        const groupCat = formatCategory(serie, 'series');

        if (link) {
          const logoAttr = capa ? ` tvg-logo="${capa}"` : '';
          const plotAttr = cleanSinopse ? ` tvg-plot="${cleanSinopse}" tvg-description="${cleanSinopse}" description="${cleanSinopse}" plot="${cleanSinopse}"` : '';

          m3u += `#EXTINF:-1 tvg-id="ep-${e.id}" tvg-name="${finalTitle}"${logoAttr}${plotAttr} group-title="${groupCat}",${finalTitle}\n${link}\n\n`;
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
        created_at: String(criacaoTimestamp),
        max_connections: maxConnections,
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
  // 6.1 DETALHES DE UM FILME VOD (get_vod_info)
  // -------------------------------------------------------------
  if (action === 'get_vod_info') {
    const vodId = String(query.vod_id || body.vod_id || '').trim();
    if (!vodId) return res.status(200).json({});

    const conteudos = await getConteudosCached(config);
    const filme = conteudos.find(c => String(c.id) === vodId);
    if (!filme) return res.status(404).json({ error: 'Filme não encontrado' });

    const nome = extractField(filme, ['nome', 'titulo']) || `Filme ${filme.id}`;
    const capa = extractField(filme, ['capa', 'poster']);
    const sinopse = sanitizeM3uText(extractField(filme, ['sinopse', 'plot', 'descricao', 'description', 'overview']));
    const link = extractStreamUrl(filme);
    let ext = 'mp4';
    if (link && link.includes('.mkv')) ext = 'mkv';
    if (link && link.includes('.m3u8')) ext = 'm3u8';
    const cat = formatCategory(extractField(filme, ['categoria', 'genero']), 'movie');

    return res.status(200).json({
      info: {
        movie_image: capa,
        name: nome,
        o_name: nome,
        cover_big: capa,
        release_date: extractField(filme, ['ano', 'data']) || '2026',
        episode_run_time: 120,
        youtube_trailer: extractField(filme, ['trailer']) || '',
        director: extractField(filme, ['diretor', 'director']) || '',
        actors: extractField(filme, ['elenco', 'cast']) || '',
        cast: extractField(filme, ['elenco', 'cast']) || '',
        description: sinopse,
        plot: sinopse,
        age: '',
        mpaa_rating: '',
        rating_count_kinopoisk: 0,
        country: '',
        genre: cat,
        backdrop_path: [extractField(filme, ['capa_de_fundo', 'backdrop']) || capa],
        duration_secs: 7200,
        duration: '02:00:00',
        video: {},
        audio: {},
        bitrate: 0,
        rating: String(extractField(filme, ['imdb', 'rating']) || '7.5'),
        tmdb_id: extractField(filme, ['tmdb', 'tmdb_id']) || ''
      },
      movie_data: {
        stream_id: filme.id,
        name: nome,
        title: nome,
        year: extractField(filme, ['ano', 'data']) || '2026',
        added: String(Math.floor(Date.now() / 1000)),
        category_id: '1',
        container_extension: ext,
        custom_sid: '',
        direct_source: link
      }
    });
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
          plot: sanitizeM3uText(extractField(s, ['sinopse', 'plot', 'descricao', 'overview'])),
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

    const targetSeriesId = String(query.series_id || body.series_id || '').trim();
    if (!targetSeriesId) {
      return res.status(200).json({ seasons: [], episodes: {} });
    }

    const now = Date.now();
    // Cache em memória de episódios por série (10 minutos)
    const cachedSeries = SERIES_INFO_CACHE.get(targetSeriesId);
    if (cachedSeries && cachedSeries.expiresAt > now) {
      return res.status(200).json(cachedSeries.data);
    }

    const conteudos = await getConteudosCached(config);
    const serieDoc = conteudos.find(c => String(c.id) === targetSeriesId) || conteudos.find(c => String(c.id).toLowerCase() === targetSeriesId.toLowerCase());
    const serieName = serieDoc ? extractField(serieDoc, ['nome', 'titulo']) : '';
    const serieSinopse = serieDoc ? sanitizeM3uText(extractField(serieDoc, ['sinopse', 'plot', 'descricao', 'overview'])) : '';

    let matchingEps = [];
    if (serieName) {
      // Busca hiper-direcionada na tabela de episódios (+96.000 linhas) usando o índice de busca do Baserow em ~290ms!
      matchingEps = await fetchBaserowRows(config.baseUrl, config.tableEpisodios, config.apiToken, 1000, serieName);
    }

    // Se a busca por nome não retornou, tenta com as primeiras palavras do título da série
    if (matchingEps.length === 0 && serieName && serieName.includes(' ')) {
      const shortName = serieName.split(' ').slice(0, 2).join(' ');
      matchingEps = await fetchBaserowRows(config.baseUrl, config.tableEpisodios, config.apiToken, 1000, shortName);
    }

    // Registra links no cache global de streams
    matchingEps.forEach(e => {
      const link = extractStreamUrl(e);
      if (link) STREAM_URL_CACHE.set(`series_${e.id}`, link);
    });

    const seasonsMap = {};
    const seasonsList = [];

    matchingEps.forEach(e => {
      const sNum = String(extractField(e, ['temporada', 'temporadas']) || '1');
      const epNum = String(extractField(e, ['episodio', 'episodios']) || '1');
      const epNome = extractField(e, ['nome', 'episodioNome']) || `Episódio ${epNum}`;
      const epSinopse = sanitizeM3uText(extractField(e, ['sinopse', 'plot', 'descricao', 'overview'])) || serieSinopse;
      const link = extractStreamUrl(e);
      let ext = 'mp4';
      if (link && link.includes('.mkv')) ext = 'mkv';
      if (link && link.includes('.m3u8')) ext = 'm3u8';

      if (!seasonsMap[sNum]) {
        seasonsMap[sNum] = [];
        seasonsList.push({
          air_date: '2026',
          episode_count: 0,
          id: Number(sNum) || 1,
          name: `Temporada ${sNum}`,
          overview: serieSinopse,
          season_number: Number(sNum) || 1,
          cover: serieDoc ? extractField(serieDoc, ['capa', 'poster']) : ''
        });
      }

      seasonsMap[sNum].push({
        id: e.id,
        episode_num: Number(epNum) || 1,
        title: epNome,
        container_extension: ext,
        info: {
          duration_secs: 2700,
          duration: '45 min',
          plot: epSinopse,
          rating: '8.0'
        },
        custom_sid: '',
        added: String(Math.floor(Date.now() / 1000)),
        season: Number(sNum) || 1,
        direct_source: link
      });
    });

    seasonsList.forEach(s => {
      const sKey = String(s.season_number);
      s.episode_count = seasonsMap[sKey] ? seasonsMap[sKey].length : 0;
    });

    const responseData = {
      seasons: seasonsList.length > 0 ? seasonsList : [{ season_number: 1, name: 'Temporada 1', episode_count: 1 }],
      info: {
        name: serieName || 'Série',
        cover: serieDoc ? extractField(serieDoc, ['capa', 'poster']) : '',
        plot: serieSinopse,
        genre: serieDoc ? formatCategory(extractField(serieDoc, ['categoria', 'genero']), 'series') : 'SÉRIES',
        releaseDate: serieDoc ? extractField(serieDoc, ['ano', 'data']) || '2026' : '2026'
      },
      episodes: seasonsMap
    };

    SERIES_INFO_CACHE.set(targetSeriesId, {
      data: responseData,
      expiresAt: now + 600000 // 10 minutos
    });

    return res.status(200).json(responseData);
  }

  return res.status(200).json([]);
}
