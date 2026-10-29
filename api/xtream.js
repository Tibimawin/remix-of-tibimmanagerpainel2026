/**
 * Vercel Serverless Function & Standalone Bridge - Xtream Codes API
 * 
 * Versão 4.0 Multi-Tenant & Segurança Rigorosa:
 * - ISOLAMENTO TOTAL POR CONTA: Cada conta de usuário no painel tem suas próprias tabelas Baserow exclusivas.
 * - ZERO vazamento de conteúdo entre contas: Canais, Filmes, Séries e Usuários são rigorosamente isolados.
 * - BLOQUEIO ESTRITO DE USUÁRIOS VENCIDOS/EXPIRADOS:
 *   * Bloqueio imediato no handshake (player_api.php -> auth: 0, status: Disabled)
 *   * Bloqueio em todas as ações (get_live_streams, get_vod_streams, get_series -> HTTP 403 Forbidden)
 *   * Bloqueio em reprodução direta (/live/..., /movie/..., /series/... -> HTTP 403 Forbidden)
 *   * Bloqueio em download de listas (/get.php -> HTTP 403 Forbidden)
 * - Identificação inteligente de conta via:
 *   1. Parâmetro explícito (?account={userId} ou &acc={userId})
 *   2. Rota dedicada (/u/{userId}/player_api.php)
 *   3. Mapeamento dinâmico no Firestore (username -> accountId)
 * - Caches independentes segmentados por tabela (Map com chave por tabela/banco)
 */

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'tibimmanagerpainelvercel';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyBN7cODHg978T4S2jPvrBsr5sqwZhGidtU';

// Configurações padrão com fallback seguro
const FALLBACK_CONFIG = {
  baseUrl: 'http://31.220.72.235:8080',
  apiToken: 'GdbNYJHQHQVLqiu6l4AmDIflycrcppPw',
  tableCanaisTv: '1302',
  tokenCanaisTv: 'GdbNYJHQHQVLqiu6l4AmDIflycrcppPw',
  tableConteudos: '1295',
  tableEpisodios: '1296',
  tableUsuarios: '1297',
  tableCategoriasTV: '1310'
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

// Dicionário universal de sinônimos de colunas (Baserow)
const COLUMN_ALIASES = {
  vencimento: [
    'vencimento', 'datavencimento', 'data de vencimento', 'datadevencimento', 'data_de_vencimento',
    'data_vencimento', 'validade', 'data de validade', 'datadevalidade', 'data_validade',
    'expirydate', 'expiry_date', 'expiracao', 'expiração', 'data de expiracao', 'data de expiração',
    'data_expiracao', 'exp_date', 'data_fim', 'data final', 'prazo', 'termino', 'término'
  ],
  datacriacao: [
    'datacriacao', 'data criacao', 'data de criacao', 'data de criação', 'datadecriacao',
    'data_de_criacao', 'data_criacao', 'createdat', 'created_at', 'criado_em', 'criado em',
    'datapagamento', 'data pagamento', 'data de pagamento', 'pagamento', 'data', 'inicio', 'início'
  ],
  status: ['status', 'situacao', 'situação', 'estado', 'ativo', 'condicao', 'condição'],
  nome: ['nome', 'name', 'usuario', 'usuário', 'cliente', 'user', 'username', 'login'],
  senha: ['senha', 'password', 'pass', 'pin', 'chave', 'key'],
  limite: ['limite', 'telas', 'limitedetelas', 'limite de telas', 'conexoes', 'conexões', 'conexoes_simultaneas', 'max_connections', 'maxtelas', 'telasimultanea'],
  email: ['email', 'e-mail', 'mail', 'contato']
};

// Parser universal de datas (ISO: 2026-01-24T01:07:45Z, SQL: 2026-06-11 04:23:42, BR: 14/02/2026, 23:59:59, 14-02-2026)
function parseUserDate(val) {
  if (!val) return null;
  if (typeof val === 'object' && val !== null) {
    if (val.value) val = val.value;
    else if (val.date) val = val.date;
  }
  let s = String(val).trim();
  if (!s || s === 'null' || s === 'undefined') return null;

  // Timestamp numérico (ms ou segundos)
  if (/^\d+$/.test(s)) {
    const num = Number(s);
    return new Date(num > 10000000000 ? num : num * 1000);
  }

  // DD/MM/YYYY ou DD-MM-YYYY com ou sem vírgula e com ou sem hora
  const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (brMatch) {
    const dia = brMatch[1].padStart(2, '0');
    const mes = brMatch[2].padStart(2, '0');
    const ano = brMatch[3];
    const hasExplicitHour = Boolean(brMatch[4]);
    const rawH = brMatch[4] || '23';
    const rawM = brMatch[5] || '59';
    const rawS = brMatch[6] || '59';
    // Se não informou hora ou hora é 00:00(:00), estende para 23:59:59 para cobrir o dia inteiro de acesso
    const hora = (!hasExplicitHour || (rawH === '00' && rawM === '00' && (rawS === '00' || !brMatch[6]))) ? '23' : rawH.padStart(2, '0');
    const min = (!hasExplicitHour || (rawH === '00' && rawM === '00')) ? '59' : rawM.padStart(2, '0');
    const seg = (!hasExplicitHour || (rawH === '00' && rawM === '00')) ? '59' : rawS.padStart(2, '0');
    return new Date(`${ano}-${mes}-${dia}T${hora}:${min}:${seg}Z`);
  }

  // YYYY-MM-DD ou YYYY/MM/DD com ou sem hora
  const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    const ano = isoMatch[1];
    const mes = isoMatch[2].padStart(2, '0');
    const dia = isoMatch[3].padStart(2, '0');
    const hasExplicitHour = Boolean(isoMatch[4]);
    const rawH = isoMatch[4] || '23';
    const rawM = isoMatch[5] || '59';
    const rawS = isoMatch[6] || '59';
    const hora = (!hasExplicitHour || (rawH === '00' && rawM === '00' && (rawS === '00' || !isoMatch[6]))) ? '23' : rawH.padStart(2, '0');
    const min = (!hasExplicitHour || (rawH === '00' && rawM === '00')) ? '59' : rawM.padStart(2, '0');
    const seg = (!hasExplicitHour || (rawH === '00' && rawM === '00')) ? '59' : rawS.padStart(2, '0');
    return new Date(`${ano}-${mes}-${dia}T${hora}:${min}:${seg}Z`);
  }

  // Fallback ISO padrão
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return null;
}

// Verificador rigoroso de status bloqueado/vencido/inativo
function isStatusBlocked(statusStr) {
  if (!statusStr) return false;
  const norm = String(statusStr).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const blockedKeywords = [
    'vencid', 'expirad', 'inativ', 'bloquead', 'suspens', 'cancelad', 'desativad',
    'blocked', 'inactive', 'expired', 'disabled', 'recusad', 'rejeitad'
  ];
  return blockedKeywords.some(kw => norm.includes(kw));
}

// -------------------------------------------------------------
// CACHES ISOLADOS EM MEMÓRIA POR TABELA E CONTA (Zero vazamento)
// -------------------------------------------------------------
const ACCOUNT_CONFIG_CACHE = new Map(); // accountId -> { config, expiresAt }
const USER_TO_ACCOUNT_CACHE = new Map(); // username.toLowerCase() -> { config, expiresAt }
const SEGMENT_CACHE = new Map();        // cacheKey -> { data, expiresAt }
const SERIES_INFO_CACHE = new Map();    // cacheKey -> { data, expiresAt }
const STREAM_URL_CACHE = new Map();     // streamKey -> targetUrl

// Helper para parsear documento retornado do Firestore REST API
function parseFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const f = doc.fields;
  const res = {};
  for (const [key, val] of Object.entries(f)) {
    if (val.stringValue !== undefined) res[key] = val.stringValue;
    else if (val.booleanValue !== undefined) res[key] = val.booleanValue;
    else if (val.integerValue !== undefined) res[key] = Number(val.integerValue);
    else if (val.mapValue?.fields) {
      res[key] = {};
      for (const [mk, mv] of Object.entries(val.mapValue.fields)) {
        if (mv.stringValue !== undefined) res[key][mk] = mv.stringValue;
      }
    }
  }
  return res;
}

// -------------------------------------------------------------
// RESOLVER MULTI-TENANT DE CONFIGURAÇÃO POR CONTA INDIVIDUAL
// -------------------------------------------------------------
async function resolveAccountConfig(req, targetUsername) {
  const query = req.query || {};
  let body = {};
  if (req.body) {
    if (typeof req.body === 'string') {
      try { body = JSON.parse(req.body); } catch { body = {}; }
    } else if (typeof req.body === 'object') {
      body = req.body;
    }
  }

  // 1. Extrair ID explícito da conta na query, body, cabeçalho ou URL /u/:account/
  let explicitAccountId = String(
    query.account || query.acc || query.user_id || query.uid || body.account || body.user_id || req.headers['x-account-id'] || ''
  ).trim();

  if (!explicitAccountId && req.url) {
    const uMatch = req.url.match(/\/u\/([a-zA-Z0-9_-]+)/);
    if (uMatch) explicitAccountId = uMatch[1];
  }

  const now = Date.now();

  // Caso 1: ID da conta informado explicitamente
  if (explicitAccountId) {
    const cachedAcc = ACCOUNT_CONFIG_CACHE.get(explicitAccountId);
    if (cachedAcc && cachedAcc.expiresAt > now) {
      return cachedAcc.config;
    }

    try {
      // Buscar em userConfigs ou xtreamAccounts no Firestore
      let userDoc = null;
      const uUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/userConfigs/${encodeURIComponent(explicitAccountId)}?key=${FIREBASE_API_KEY}`;
      const uResp = await fetch(uUrl);
      if (uResp.ok) {
        userDoc = parseFirestoreDoc(await uResp.json());
      } else {
        const xUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/xtreamAccounts/${encodeURIComponent(explicitAccountId)}?key=${FIREBASE_API_KEY}`;
        const xResp = await fetch(xUrl);
        if (xResp.ok) userDoc = parseFirestoreDoc(await xResp.json());
      }

      if (userDoc) {
        const tIds = userDoc.tableIds || {};
        const cfg = {
          accountId: explicitAccountId,
          baseUrl: userDoc.baseUrl || FALLBACK_CONFIG.baseUrl,
          apiToken: userDoc.apiToken || FALLBACK_CONFIG.apiToken,
          tableCanaisTv: tIds.canaisTv || userDoc.tableCanaisTv || '',
          tokenCanaisTv: userDoc.apiToken || FALLBACK_CONFIG.tokenCanaisTv,
          tableConteudos: tIds.conteudos || userDoc.tableConteudos || '',
          tableEpisodios: tIds.episodios || userDoc.tableEpisodios || '',
          tableUsuarios: tIds.usuarios || userDoc.tableUsuarios || '',
          tableCategoriasTV: tIds.categoriasTV || userDoc.tableCategoriasTV || ''
        };
        ACCOUNT_CONFIG_CACHE.set(explicitAccountId, { config: cfg, expiresAt: now + 60000 });
        return cfg;
      }
    } catch (err) {
      console.warn(`[xtream-multi-tenant] Erro ao carregar conta ${explicitAccountId}:`, err?.message);
    }
  }

  // Caso 2: Não foi informado ID de conta na URL, tentar pelo nome do usuário (IPTV Smarters padrão)
  const cleanUsername = String(targetUsername || '').trim().toLowerCase();
  if (cleanUsername) {
    const cachedUserCfg = USER_TO_ACCOUNT_CACHE.get(cleanUsername);
    if (cachedUserCfg && cachedUserCfg.expiresAt > now) {
      return cachedUserCfg.config;
    }

    try {
      // Verificar mapeamento individual no Firestore: xtreamUserMapping/${cleanUsername}
      const mapUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/xtreamUserMapping/${encodeURIComponent(cleanUsername)}?key=${FIREBASE_API_KEY}`;
      const mapResp = await fetch(mapUrl);
      if (mapResp.ok) {
        const mapDoc = parseFirestoreDoc(await mapResp.json());
        if (mapDoc) {
          if (mapDoc.tableUsuarios || mapDoc.tableIds?.usuarios) {
            const tIds = mapDoc.tableIds || {};
            const cfg = {
              accountId: mapDoc.userId || 'mapped',
              baserowUserId: mapDoc.baserowUserId || '',
              baseUrl: mapDoc.baseUrl || FALLBACK_CONFIG.baseUrl,
              apiToken: mapDoc.apiToken || FALLBACK_CONFIG.apiToken,
              tableCanaisTv: tIds.canaisTv || mapDoc.tableCanaisTv || '',
              tokenCanaisTv: mapDoc.apiToken || FALLBACK_CONFIG.tokenCanaisTv,
              tableConteudos: tIds.conteudos || mapDoc.tableConteudos || '',
              tableEpisodios: tIds.episodios || mapDoc.tableEpisodios || '',
              tableUsuarios: tIds.usuarios || mapDoc.tableUsuarios || '',
              tableCategoriasTV: tIds.categoriasTV || mapDoc.tableCategoriasTV || ''
            };
            USER_TO_ACCOUNT_CACHE.set(cleanUsername, { config: cfg, expiresAt: now + 120000 });
            return cfg;
          } else if (mapDoc.userId) {
            // Buscar configuração da conta do usuário referenciado pelo mapeamento
            const userDocUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/userConfigs/${encodeURIComponent(mapDoc.userId)}?key=${FIREBASE_API_KEY}`;
            const userDocResp = await fetch(userDocUrl);
            if (userDocResp.ok) {
              const uDoc = parseFirestoreDoc(await userDocResp.json());
              if (uDoc) {
                const tIds = uDoc.tableIds || {};
                const cfg = {
                  accountId: mapDoc.userId,
                  baserowUserId: mapDoc.baserowUserId || '',
                  baseUrl: uDoc.baseUrl || FALLBACK_CONFIG.baseUrl,
                  apiToken: uDoc.apiToken || FALLBACK_CONFIG.apiToken,
                  tableCanaisTv: tIds.canaisTv || uDoc.tableCanaisTv || '',
                  tokenCanaisTv: uDoc.apiToken || FALLBACK_CONFIG.tokenCanaisTv,
                  tableConteudos: tIds.conteudos || uDoc.tableConteudos || '',
                  tableEpisodios: tIds.episodios || uDoc.tableEpisodios || '',
                  tableUsuarios: tIds.usuarios || uDoc.tableUsuarios || '',
                  tableCategoriasTV: tIds.categoriasTV || uDoc.tableCategoriasTV || ''
                };
                USER_TO_ACCOUNT_CACHE.set(cleanUsername, { config: cfg, expiresAt: now + 120000 });
                return cfg;
              }
            }
          }
        }
      }

      // Se não encontrou no mapeamento direto, buscar nas configurações dos usuários cadastrados no painel
      const uListUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/userConfigs?key=${FIREBASE_API_KEY}&pageSize=50`;
      const uListResp = await fetch(uListUrl);
      if (uListResp.ok) {
        const uListData = await uListResp.json();
        const docs = uListData.documents || [];
        for (const rawD of docs) {
          const parsed = parseFirestoreDoc(rawD);
          const tIds = parsed?.tableIds || {};
          const uTable = tIds.usuarios;
          const uToken = parsed?.apiToken;
          const uBase = parsed?.baseUrl;

          if (uTable && uToken && uBase) {
            // Verificar rapidamente no Baserow se o cliente existe nesta tabela de usuários específica
            const foundUsers = await fetchBaserowRows(uBase, uTable, uToken, 5, cleanUsername);
            const userMatches = foundUsers.some(u => {
              const uNome = String(extractField(u, ['nome', 'usuario', 'email'])).trim().toLowerCase();
              return uNome === cleanUsername || uNome.replace(/\s+/g, '_') === cleanUsername || uNome.replace(/[^a-z0-9]/g, '') === cleanUsername;
            });

            if (userMatches) {
              const cfg = {
                accountId: parsed.userId || rawD.name?.split('/').pop() || 'discovered',
                baseUrl: uBase,
                apiToken: uToken,
                tableCanaisTv: tIds.canaisTv || '',
                tokenCanaisTv: uToken,
                tableConteudos: tIds.conteudos || '',
                tableEpisodios: tIds.episodios || '',
                tableUsuarios: uTable,
                tableCategoriasTV: tIds.categoriasTV || ''
              };
              USER_TO_ACCOUNT_CACHE.set(cleanUsername, { config: cfg, expiresAt: now + 300000 });
              return cfg;
            }
          }
        }
      }
    } catch (searchErr) {
      console.warn(`[xtream-multi-tenant] Erro na busca de conta para ${cleanUsername}:`, searchErr?.message);
    }
  }

  // Caso 3: Fallback para xtreamConfig global se existir
  try {
    const gUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/globalConfig/xtreamConfig?key=${FIREBASE_API_KEY}`;
    const gResp = await fetch(gUrl);
    if (gResp.ok) {
      const gDoc = parseFirestoreDoc(await gResp.json());
      if (gDoc) {
        return {
          accountId: 'global',
          baseUrl: gDoc.baseUrl || FALLBACK_CONFIG.baseUrl,
          apiToken: gDoc.apiToken || FALLBACK_CONFIG.apiToken,
          tableCanaisTv: gDoc.tableCanaisTv || FALLBACK_CONFIG.tableCanaisTv,
          tokenCanaisTv: gDoc.tokenCanaisTv || gDoc.apiToken || FALLBACK_CONFIG.tokenCanaisTv,
          tableConteudos: gDoc.tableConteudos || FALLBACK_CONFIG.tableConteudos,
          tableEpisodios: gDoc.tableEpisodios || FALLBACK_CONFIG.tableEpisodios,
          tableUsuarios: gDoc.tableUsuarios || FALLBACK_CONFIG.tableUsuarios,
          tableCategoriasTV: gDoc.tableCategoriasTV || FALLBACK_CONFIG.tableCategoriasTV
        };
      }
    }
  } catch {}

  return { ...FALLBACK_CONFIG, accountId: 'default' };
}

// -------------------------------------------------------------
// HELPER PARA CONSULTA AO BASEROW COM PAGINAÇÃO CONCORRENTE
// -------------------------------------------------------------
async function fetchBaserowRows(baseUrl, tableId, token, maxRows = 3000, searchTerm = '', bypassCache = false) {
  if (!tableId || !token || !baseUrl) return [];
  try {
    const base = baseUrl.replace(/\/+$/, '');
    const pageSize = 200;
    const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
    const cacheParam = bypassCache ? `&_t=${Date.now()}` : '';
    const firstUrl = `${base}/api/database/rows/table/${tableId}/?user_field_names=true&size=${pageSize}&page=1${searchParam}${cacheParam}`;
    // Tenta até 3 vezes: falhas momentâneas (rate-limit/rede) faziam o pedido devolver
    // lista vazia, derrubando usuários válidos com "[ACESSO NEGADO]" na reprodução
    let resp = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        resp = await fetch(firstUrl, {
          cache: 'no-store',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
        });
        if (resp.ok) break;
      } catch (err) {
        resp = null;
      }
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt === 1 ? 200 : 500));
    }
    if (!resp || !resp.ok) {
      console.warn(`[xtream-api] Baserow table ${tableId} retornou status ${resp ? resp.status : 'sem resposta'} após 3 tentativas`);
      return [];
    }
    const json = await resp.json();
    let allRows = json.results || [];
    const totalCount = json.count || allRows.length;

    const totalPagesNeeded = Math.min(Math.ceil(totalCount / pageSize), Math.ceil(maxRows / pageSize));
    if (totalPagesNeeded > 1) {
      const remainingPages = [];
      for (let p = 2; p <= totalPagesNeeded; p++) {
        remainingPages.push(p);
      }

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

// Busca UMA linha diretamente no Baserow (1 pedido rápido, sem baixar a tabela inteira)
async function fetchBaserowRowById(baseUrl, tableId, rowId, token) {
  if (!baseUrl || !tableId || !rowId) return null;
  try {
    const url = `${String(baseUrl).replace(/\/+$/, '')}/api/database/rows/table/${tableId}/${encodeURIComponent(String(rowId))}/?user_field_names=true`;
    const resp = await fetch(url, { cache: 'no-store', headers: { Authorization: `Token ${token}` } });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// Extrair campo com flexibilidade total de sinônimos, maiúsculas e acentos
function extractField(row, possibleNames) {
  if (!row) return '';

  // Expandir possibleNames com COLUMN_ALIASES se corresponder a algum grupo
  const expandedNames = new Set();
  for (const name of possibleNames) {
    const raw = String(name).trim();
    expandedNames.add(raw);
    const lower = raw.toLowerCase();
    for (const [group, synonyms] of Object.entries(COLUMN_ALIASES)) {
      if (lower === group || synonyms.some(s => s.toLowerCase() === lower)) {
        synonyms.forEach(s => expandedNames.add(s));
      }
    }
  }

  // 1. Match exato ou normalizado
  for (const name of expandedNames) {
    const norm = String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_\-\/\.]/g, '');
    for (const key of Object.keys(row)) {
      const keyNorm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_\-\/\.]/g, '');
      if (keyNorm === norm) {
        const val = row[key];
        if (val !== undefined && val !== null && val !== '') {
          if (typeof val === 'object' && val.value !== undefined) return val.value;
          if (typeof val === 'object' && val.date !== undefined) return val.date;
          if (Array.isArray(val) && val[0]?.url) return val[0].url;
          return val;
        }
      }
    }
  }

  // 2. Match por substring (ex: se chave tem "vencimento" e buscamos vencimento)
  for (const name of possibleNames) {
    const norm = String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_\-\/\.]/g, '');
    if (norm.length >= 4) {
      for (const key of Object.keys(row)) {
        const keyNorm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_\-\/\.]/g, '');
        if (keyNorm.includes(norm) || norm.includes(keyNorm)) {
          const val = row[key];
          if (val !== undefined && val !== null && val !== '') {
            if (typeof val === 'object' && val.value !== undefined) return val.value;
            if (typeof val === 'object' && val.date !== undefined) return val.date;
            if (Array.isArray(val) && val[0]?.url) return val[0].url;
            return val;
          }
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
  let trimmed = String(url).trim();
  // Links gravados sem esquema (ex.: "46.151.196.223:14609") — assume HTTP
  if (/^[a-zA-Z0-9][a-zA-Z0-9.-]+:\d+(\/.*)?$/.test(trimmed)) {
    trimmed = `http://${trimmed}`;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('rtmp://')) {
    return trimmed;
  }
  return '';
}

// Fonte bruta de TS (http://ip:porta sem caminho .m3u8) — precisa de playlist HLS sintética
// para players que pedem .m3u8 (HLS), sem proxyar o vídeo (largura de banda zero).
function isRawTsSource(url) {
  const u = String(url || '').trim();
  if (!u) return false;
  if (/\.m3u8(\?|$)/i.test(u)) return false;
  return /^https?:\/\//i.test(u);
}

// Cache curto da playlist HLS sintética por usuário/canal (evita 1 busca no Baserow
// a cada refresh do player, que acontece a cada ~20s). TTL 60s.
const HLS_PLAYLIST_CACHE = new Map(); // key -> { playlist, expiresAt }

function buildHlsPlaylist(targetUrl) {
  const seg = String(targetUrl || '').trim();
  return [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-TARGETDURATION:20',
    '#EXT-X-MEDIA-SEQUENCE:0',
    '#EXT-X-PLAYLIST-TYPE:EVENT',
    '#EXTINF:20.0,',
    seg,
    ''
  ].join('\n');
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
  if (catStr.includes(',')) {
    const parts = catStr.split(',').map(p => p.trim()).filter(Boolean);
    const filtered = parts.filter(p => !['filmes', 'filme', 'series', 'serie', 'tv', 'canais'].includes(p.toLowerCase()));
    catStr = filtered.length > 0 ? filtered[0] : parts[0];
  }

  catStr = catStr.replace(/^(canais|filmes|series)\s*\|\s*/i, '').trim();
  const cleanUpper = catStr.toUpperCase();

  if (type === 'tv') return `CANAIS | ${cleanUpper}`;
  if (type === 'movie') return `FILMES | ${cleanUpper}`;
  if (type === 'series') return `SÉRIES | ${cleanUpper}`;
  return cleanUpper;
}

// -------------------------------------------------------------
// CLASSIFICAÇÃO ROBUSTA: FILME x SÉRIE x CANAL
// Registos de canal (Tipo "TV"/"Canal"/"Live") gravados por engano na
// tabela de conteúdos NÃO podem aparecer em Filmes/Séries.
// -------------------------------------------------------------
const CONTEUDO_LIVE_ID_OFFSET = 1000000;
const stripAccentsLower = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const CHANNEL_TYPE_RE = /\b(canal|canais|tv|live|ao vivo|radio|24h)\b/;
const CHANNEL_CAT_RE = /^(canais|canal|tv|live|radio)\b/;

// Detecta registos de CANAL gravados por engano na tabela de conteúdos
function isChannelLikeRow(row) {
  if (!row) return false;
  const tipo = stripAccentsLower(extractField(row, ['tipo'])).trim();
  if (tipo.includes('film') || tipo.includes('seri') || tipo.includes('anime')) return false;
  if (CHANNEL_TYPE_RE.test(tipo)) return true;
  // Tipo vazio/ambíguo: decide pela categoria (ex: "CANAIS 24H", "CANAIS | DESPORTO", "FILMES | CANAIS 24H")
  const catRaw = stripAccentsLower(extractField(row, ['categoria', 'genero'])).trim();
  const catStripped = catRaw.replace(/^(filmes|series|canais|canal)\s*\|\s*/g, '').trim();
  if (CHANNEL_CAT_RE.test(catRaw) || CHANNEL_CAT_RE.test(catStripped)) return true;
  // Tipo vazio + nome típico de canal (ex: "TV Globo", "Canal Panda")
  const nome = stripAccentsLower(extractField(row, ['nome', 'canalNome', 'titulo'])).trim();
  return /\b(tv|canal|canais|live)\b/.test(nome);
}

// Temporadas só indica SÉRIE quando é um valor real (> 0 ou texto).
// O valor "0" (string) é gravado em milhares de FILMES — "0" NÃO é temporada.
function hasRealSeasons(row) {
  if (!row) return false;
  const raw = extractField(row, ['temporadas', 'seasons']);
  if (raw === null || raw === undefined) return false;
  const s = String(raw).trim();
  if (!s || s === '0') return false;
  const n = Number(s.replace(',', '.'));
  if (Number.isFinite(n)) return n > 0;
  return true; // texto não numérico não vazio conta como temporadas
}

// Filme de verdade: nunca um canal
function isFilmeRow(row) {
  if (isChannelLikeRow(row)) return false;
  const tipo = stripAccentsLower(extractField(row, ['tipo']));
  return tipo.includes('film') || (!tipo.includes('seri') && !tipo.includes('anime') && !hasRealSeasons(row));
}

// Série de verdade: nunca um canal e nunca um filme com Temporadas="0"
function isSerieRow(row) {
  if (isChannelLikeRow(row)) return false;
  const tipo = stripAccentsLower(extractField(row, ['tipo']));
  return tipo.includes('seri') || tipo.includes('anime') || hasRealSeasons(row);
}


// -------------------------------------------------------------
// FUNÇÕES DE CARREGAMENTO SEGMENTADO ISOLADO POR TABELA
// -------------------------------------------------------------

// 1. Carregar Canais da tabela específica da conta
async function getCanaisCached(config) {
  if (!config.tableCanaisTv) return [];
  const cacheKey = `canais_${config.baseUrl}_${config.tableCanaisTv}`;
  const now = Date.now();
  const cached = SEGMENT_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > now && cached.data.length > 0) {
    return cached.data;
  }

  const canais = await fetchBaserowRows(config.baseUrl, config.tableCanaisTv, config.tokenCanaisTv || config.apiToken, 2000);
  canais.forEach(c => {
    const link = extractStreamUrl(c);
    if (link) STREAM_URL_CACHE.set(`${config.tableCanaisTv}_live_${c.id}`, link);
  });

  SEGMENT_CACHE.set(cacheKey, { data: canais, expiresAt: now + 300000 }); // 5 min
  return canais;
}

// 2. Carregar Conteúdos (Filmes e Séries) da tabela específica da conta
async function getConteudosCached(config) {
  if (!config.tableConteudos) return [];
  const cacheKey = `conteudos_${config.baseUrl}_${config.tableConteudos}`;
  const now = Date.now();
  const cached = SEGMENT_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > now && cached.data.length > 0) {
    return cached.data;
  }

  const conteudos = await fetchBaserowRows(config.baseUrl, config.tableConteudos, config.apiToken, 12000);
  conteudos.forEach(c => {
    const link = extractStreamUrl(c);
    if (link) STREAM_URL_CACHE.set(`${config.tableConteudos}_movie_${c.id}`, link);
  });

  SEGMENT_CACHE.set(cacheKey, { data: conteudos, expiresAt: now + 600000 }); // 10 min
  return conteudos;
}

// 2b. Canais gravados por engano na tabela de conteúdos (Tipo TV/Canal/Live)
async function getChannelLikeConteudosCached(config) {
  if (!config.tableConteudos) return [];
  const conteudos = await getConteudosCached(config);
  const canaisFallback = conteudos.filter(c => isChannelLikeRow(c) && extractStreamUrl(c));
  canaisFallback.forEach(c => {
    const link = extractStreamUrl(c);
    if (link) STREAM_URL_CACHE.set(`${config.tableConteudos}_live_${c.id}`, link);
  });
  return canaisFallback;
}


// 3. Carregar Episódios da tabela específica da conta
async function getEpisodiosCached(config) {
  if (!config.tableEpisodios) return [];
  const cacheKey = `episodios_${config.baseUrl}_${config.tableEpisodios}`;
  const now = Date.now();
  const cached = SEGMENT_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > now && cached.data.length > 0) {
    return cached.data;
  }

  const episodios = await fetchBaserowRows(config.baseUrl, config.tableEpisodios, config.apiToken, 2500);
  episodios.forEach(e => {
    const link = extractStreamUrl(e);
    if (link) STREAM_URL_CACHE.set(`${config.tableEpisodios}_series_${e.id}`, link);
  });

  SEGMENT_CACHE.set(cacheKey, { data: episodios, expiresAt: now + 300000 });
  return episodios;
}

// 4. Carregar Usuários da tabela específica da conta
async function getUsuariosCached(config) {
  if (!config.tableUsuarios) return [];
  const cacheKey = `usuarios_${config.baseUrl}_${config.tableUsuarios}`;
  const now = Date.now();
  const cached = SEGMENT_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > now && cached.data.length > 0) {
    return cached.data;
  }

  const usuarios = await fetchBaserowRows(config.baseUrl, config.tableUsuarios, config.apiToken, 500);
  SEGMENT_CACHE.set(cacheKey, { data: usuarios, expiresAt: now + 120000 }); // 2 min
  return usuarios;
}

// -------------------------------------------------------------
// 5. VALIDADOR RIGOROSO DE USUÁRIO (VENCIMENTO É A FONTE DA VERDADE)
// -------------------------------------------------------------
async function validateUser(config, username, password) {
  const targetUser = String(username || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  if (!targetUser) {
    return { ok: false, status: 'Disabled', message: 'Usuário e senha são obrigatórios' };
  }

  if (!config.tableUsuarios) {
    return { ok: false, status: 'Disabled', message: 'Tabela de usuários não configurada para esta conta.' };
  }

  // 1. Buscar usuário SEMPRE SEM CACHE no Baserow para refletir alterações de vencimento instantaneamente
  // Caminho rápido: busca apenas pelas linhas que contêm o nome do usuário (1 página em vez da tabela inteira)
  const matchesTargetUser = (u) => {
    const uNome = String(extractField(u, ['nome', 'usuario', 'cliente', 'user'])).trim().toLowerCase();
    const uEmail = String(extractField(u, ['email'])).trim().toLowerCase();
    const uId = String(u.id || '');
    const mappedId = String(config.baserowUserId || '');

    if (mappedId && uId === mappedId) return true;

    return uNome === targetUser ||
           uEmail === targetUser ||
           uNome.replace(/\s+/g, '_') === targetUser ||
           uNome.replace(/[^a-z0-9]/g, '') === targetUser;
  };

  let candidateUsers = null;
  const searchTokens = targetUser.split(/[^a-z0-9]+/).filter(t => t.length >= 3);
  if (searchTokens.length > 0) {
    const foundBySearch = await fetchBaserowRows(config.baseUrl, config.tableUsuarios, config.apiToken, 200, searchTokens[0], true);
    if (foundBySearch.some(matchesTargetUser)) candidateUsers = foundBySearch;
  }
  // Fallback: carrega a tabela completa para garantir que usuários recentes ou em páginas seguintes sejam encontrados
  if (!candidateUsers) {
    candidateUsers = await fetchBaserowRows(config.baseUrl, config.tableUsuarios, config.apiToken, 3000, '', true);
  }

  // 2. Filtrar TODOS os registros correspondentes ao usuário (evita que uma linha antiga vencida bloqueie uma renovação válida)
  const allMatches = candidateUsers.filter(matchesTargetUser);

  if (allMatches.length === 0) {
    return { ok: false, status: 'Disabled', message: 'Usuário não encontrado nesta conta.' };
  }

  // 2. Se houver mais de um registro correspondente (ex: duplicatas no Baserow ou histórico):
  // Priorizar:
  // - Registro cujo ID é o baserowUserId mapeado
  // - Registro cuja senha confere E que esteja com data de vencimento VÁLIDA/FUTURA!
  // - Registro com maior data de vencimento ou mais recente
  let matchedUser = allMatches[0];

  if (allMatches.length > 1) {
    const exactMapped = config.baserowUserId ? allMatches.find(u => String(u.id) === String(config.baserowUserId)) : null;
    if (exactMapped) {
      matchedUser = exactMapped;
    } else {
      // Filtrar os que conferem com a senha digitada
      const matchingPassList = cleanPass 
        ? allMatches.filter(u => {
            const uSenha = String(extractField(u, ['senha', 'password', 'pin'])).trim();
            return !uSenha || uSenha === cleanPass;
          })
        : allMatches;

      const pool = matchingPassList.length > 0 ? matchingPassList : allMatches;

      // Buscar se algum candidato possui data de vencimento ativa no futuro
      const activeCandidates = pool.filter(u => {
        const rawV = extractField(u, ['vencimento']);
        let vDate = parseUserDate(rawV);
        if (!vDate) {
          const rawPag = extractField(u, ['pagamento', 'datapagamento', 'data de pagamento']);
          const rawDias = Number(extractField(u, ['dias', 'periodo_dias', 'totaldedias', 'total de dias'])) || 0;
          if (rawPag && rawDias > 0) {
            const pagD = parseUserDate(rawPag);
            if (pagD) vDate = new Date(pagD.getTime() + (rawDias * 24 * 3600 * 1000));
          }
        }
        return vDate && vDate.getTime() >= Date.now();
      });

      if (activeCandidates.length > 0) {
        // Ordenar candidatos ativos pela maior data de vencimento
        activeCandidates.sort((a, b) => {
          const da = parseUserDate(extractField(a, ['vencimento']))?.getTime() || 0;
          const db = parseUserDate(extractField(b, ['vencimento']))?.getTime() || 0;
          return db - da;
        });
        matchedUser = activeCandidates[0];
      } else {
        // Se nenhum estiver ativo, escolher o de maior ID (mais novo) ou maior vencimento
        pool.sort((a, b) => {
          const da = parseUserDate(extractField(a, ['vencimento']))?.getTime() || 0;
          const db = parseUserDate(extractField(b, ['vencimento']))?.getTime() || 0;
          if (db !== da) return db - da;
          return Number(b.id || 0) - Number(a.id || 0);
        });
        matchedUser = pool[0];
      }
    }
  }

  // 3. Validar Senha
  const uSenha = String(extractField(matchedUser, ['senha', 'password', 'pin'])).trim();
  if (cleanPass && uSenha && cleanPass !== uSenha) {
    return { ok: false, status: 'Disabled', message: 'Senha incorreta para o usuário informado.' };
  }

  // 3. Extrair Datas: Vencimento e DataCriacao (FONTE DA VERDADE SOBERANA)
  const rawCriacao = extractField(matchedUser, ['datacriacao']);
  const rawVencimento = extractField(matchedUser, ['vencimento']);
  const rawStatus = String(extractField(matchedUser, ['status']) || '').trim().toLowerCase();

  const criacaoDate = parseUserDate(rawCriacao) || new Date(Date.now() - 86400000);
  let vencDate = parseUserDate(rawVencimento);

  // Se vencimento não foi preenchido diretamente, verificar Pagamento e Dias
  if (!vencDate) {
    const rawPagamento = extractField(matchedUser, ['pagamento', 'datapagamento', 'data de pagamento']);
    const rawDias = Number(extractField(matchedUser, ['dias', 'periodo_dias', 'totaldedias', 'total de dias'])) || 0;
    if (rawPagamento && rawDias > 0) {
      const pagDate = parseUserDate(rawPagamento);
      if (pagDate) {
        vencDate = new Date(pagDate.getTime() + (rawDias * 24 * 3600 * 1000));
      }
    }
  }

  const nowMs = Date.now();

  // 4. REGRA DE OURO DO VENCIMENTO:
  // Se tem data de vencimento definida no Baserow:
  if (vencDate) {
    // ⚠️ Se a data de vencimento foi ultrapassada: BLOQUEIO TOTAL E IMEDIATO
    if (nowMs > vencDate.getTime()) {
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

    // ✅ Se a data de vencimento é no FUTURO (nowMs <= vencDate.getTime()):
    // A CONTA É 100% ATIVA E REATIVADA AUTOMATICAMENTE!
    // Quando o administrador atualiza a data no Baserow, o acesso volta a funcionar instantaneamente,
    // mesmo que a coluna de texto ainda contenha 'Vencido' ou 'Inativo'.
    // Apenas banimento explícito ('banido', 'fraude') bloqueia uma conta com data de validade ativa:
    const isExplicitlyBanned = ['banido', 'banida', 'fraude', 'bloqueado permanentemente'].some(k => rawStatus.includes(k));
    if (isExplicitlyBanned) {
      return {
        ok: false,
        status: 'Disabled',
        message: 'Sua conta está bloqueada pela administração do sistema.'
      };
    }
  } else {
    // Se NÃO há nenhuma data de vencimento configurada, checar o status textual:
    if (rawStatus.includes('vencid') || rawStatus.includes('expirad') || rawStatus.includes('inativ') || rawStatus.includes('bloquead') || rawStatus.includes('desativad')) {
      return {
        ok: false,
        status: 'Expired',
        message: 'Acesso expirado ou inativo. Atualize a data de vencimento para reativar.'
      };
    }
  }

  // 5. Início no futuro
  if (criacaoDate && nowMs < criacaoDate.getTime() - 60000) {
    const dataInicioFmt = criacaoDate.toLocaleDateString('pt-BR');
    return {
      ok: false,
      status: 'NotActive',
      message: `Acesso ainda não iniciado. Válido a partir de ${dataInicioFmt}.`,
      expTimestamp: vencDate ? Math.floor(vencDate.getTime() / 1000) : 0,
      criacaoTimestamp: Math.floor(criacaoDate.getTime() / 1000)
    };
  }

  // 6. Conta Ativa e Válida!
  const expTimestamp = vencDate ? Math.floor(vencDate.getTime() / 1000) : Math.floor(Date.now() / 1000) + (30 * 86400);
  const criacaoTimestamp = Math.floor(criacaoDate.getTime() / 1000);
  const rawLimite = extractField(matchedUser, ['limite']);
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

// -------------------------------------------------------------
// VERIFICADOR DE LINKS DE STREAM
// Testa cada link no próprio servidor (VPS) — o navegador não consegue
// testar links http:// diretamente por causa do mixed content.
// -------------------------------------------------------------
const STREAM_CHECK_CACHE = new Map();

// Abre a conexão, lê o primeiro pedaço do stream e encerra.
async function probeStreamUrl(link, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(link, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20', Range: 'bytes=0-1' }
    });
    if (!resp.ok && resp.status !== 206) return resp.status || 0;
    if (resp.body) {
      try {
        const reader = resp.body.getReader();
        await reader.read();
        await reader.cancel();
      } catch { /* ignora falha ao encerrar o corpo */ }
    }
    return resp.status === 206 ? 200 : resp.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

// Varre a lista com vários testes em paralelo (12 por vez)
async function probeStreams(alvos, concurrency = 12) {
  const resultados = new Array(alvos.length);
  let idx = 0;
  const worker = async () => {
    while (idx < alvos.length) {
      const i = idx++;
      const alvo = alvos[i];
      const code = await probeStreamUrl(alvo.link);
      resultados[i] = { ...alvo, status: code === 200 ? 'ok' : 'off', http: code };
    }
  };
  const n = Math.min(concurrency, alvos.length || 1);
  await Promise.all(Array.from({ length: n }, worker));
  return resultados;
}

// -------------------------------------------------------------
// HANDLER PRINCIPAL HTTP (Xtream Codes API)
// -------------------------------------------------------------
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

  // Para /live/..., /movie/..., /series/... o usuário/senha vêm no CAMINHO da URL, não na query.
  // Extraí-los ANTES de resolver a configuração da conta: sem isso o multi-tenant não encontra
  // o usuário e cai no fallback global, validando o cliente na tabela errada ("Usuário não encontrado").
  const preStreamMatch = rawUrl.match(/\/(?:u\/[^/]+\/)?(live|movie|series)\/([^/]+)\/([^/]+)\/(\d+)(\.[a-zA-Z0-9]+)?/);
  const preStreamUser = preStreamMatch ? decodeURIComponent(preStreamMatch[2]) : '';

  // 1. Resolver configuração estritamente isolada da conta do usuário
  const config = await resolveAccountConfig(req, username || preStreamUser);

  // 2. Filtro de Conteúdo (content=tv | content=movies | content=series | content=all)
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
  const liveMatch = rawUrl.match(/\/(?:u\/[^/]+\/)?(live|movie|series)\/([^/]+)\/([^/]+)\/(\d+)(\.[a-zA-Z0-9]+)?/);
  const streamExt = (liveMatch && liveMatch[5]) ? liveMatch[5].toLowerCase() : '';

  if (liveMatch || streamType) {
    const type = liveMatch ? liveMatch[1] : streamType;
    const streamUser = liveMatch ? decodeURIComponent(liveMatch[2]) : username;
    const streamPass = liveMatch ? decodeURIComponent(liveMatch[3]) : password;
    const rawId = liveMatch ? liveMatch[4] : streamId.replace(/\.[a-zA-Z0-9]+$/, '');

    // Playlist HLS sintética: players HLS voltam a buscar esta URL a cada ~20s.
    // Serve direto do cache por 60s sem revalidar no Baserow (1 busca/min no máximo).
    const hlsCacheKey = `${type}_${streamUser}|${streamPass}_${rawId}${streamExt}`;
    const hlsCached = HLS_PLAYLIST_CACHE.get(hlsCacheKey);
    if (streamExt === '.m3u8' && hlsCached && hlsCached.expiresAt > Date.now()) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(hlsCached.playlist);
    }

    // VALIDAÇÃO RIGOROSA DE EXPIRAÇÃO NO STREAM
    const authStream = await validateUser(config, streamUser, streamPass);
    if (!authStream.ok) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(403).send(`[ACESSO NEGADO] ${authStream.message}`);
    }

    const tableId = type === 'live' ? config.tableCanaisTv : (type === 'movie' ? config.tableConteudos : config.tableEpisodios);
    const cacheKey = `${tableId}_${type}_${rawId}`;
    let targetUrl = STREAM_URL_CACHE.get(cacheKey);

    if (!targetUrl) {
      if (type === 'live') await getCanaisCached(config);
      else if (type === 'movie') await getConteudosCached(config);
      else if (type === 'series') await getEpisodiosCached(config);
      targetUrl = STREAM_URL_CACHE.get(cacheKey);
    }

    // Canais gravados por engano na tabela de conteúdos usam IDs deslocados (+1000000)
    if (!targetUrl && type === 'live' && Number(rawId) >= CONTEUDO_LIVE_ID_OFFSET) {
      await getChannelLikeConteudosCached(config);
      targetUrl = STREAM_URL_CACHE.get(`${config.tableConteudos}_live_${Number(rawId) - CONTEUDO_LIVE_ID_OFFSET}`);
    }

    // Último recurso: buscar a linha do stream diretamente no Baserow
    // (1 pedido rápido; evita timeouts ao baixar tabelas inteiras em instâncias frias)
    if (!targetUrl) {
      const lookupId = (type === 'live' && Number(rawId) >= CONTEUDO_LIVE_ID_OFFSET)
        ? String(Number(rawId) - CONTEUDO_LIVE_ID_OFFSET)
        : String(rawId);
      const tokenRow = type === 'live' ? (config.tokenCanaisTv || config.apiToken) : config.apiToken;
      const streamRow = await fetchBaserowRowById(config.baseUrl, tableId, lookupId, tokenRow);
      if (streamRow) {
        const link = extractStreamUrl(streamRow);
        if (link) {
          targetUrl = link;
          STREAM_URL_CACHE.set(cacheKey, link);
        }
      }
    }


    if (targetUrl) {
      res.setHeader('Location', targetUrl);
      return res.status(302).end();
    } else {
      return res.status(404).send('Stream não encontrado nesta conta.');
    }
  }

  // -------------------------------------------------------------
  // VERIFICADOR DE LINKS (/stream-check?username=&password=&type=live|movie|series)
  // Devolve quais links estão online e quais estão offline na conta.
  // -------------------------------------------------------------
  if (rawUrl.includes('/stream-check')) {
    const checkType = String(query.type || body.type || 'live').toLowerCase();
    if (!username || !password) {
      return res.status(400).json({ error: 'Informe username e password.' });
    }
    const authCheck = await validateUser(config, username, password);
    if (!authCheck.ok) {
      return res.status(403).json({ error: authCheck.message });
    }

    let tableId = '';
    if (checkType === 'live') tableId = config.tableCanaisTv;
    else if (checkType === 'movie') tableId = config.tableConteudos;
    else if (checkType === 'series') tableId = config.tableEpisodios;
    else return res.status(400).json({ error: 'type inválido (live | movie | series).' });
    if (!tableId) {
      return res.status(400).json({ error: `Tabela de ${checkType} não configurada nesta conta.` });
    }

    // Reaproveita o resultado completo por 3 minutos (não martela os provedores)
    const checkCacheKey = `streamcheck_${tableId}_${checkType}`;
    const checkCached = STREAM_CHECK_CACHE.get(checkCacheKey);
    const limit = Math.max(0, parseInt(String(query.limit || body.limit || ''), 10) || 0);
    if (!limit && checkCached && Date.now() - checkCached.at < 180000) {
      return res.status(200).json({ ...checkCached.data, cached: true });
    }

    let itens = [];
    if (checkType === 'live') {
      itens = await getCanaisCached(config);
      const canaisNaConteudos = await getChannelLikeConteudosCached(config);
      itens = itens.concat(canaisNaConteudos.map(c => ({ ...c, __offsetId: Number(c.id) + CONTEUDO_LIVE_ID_OFFSET })));
    } else if (checkType === 'movie') {
      itens = await getConteudosCached(config);
    } else {
      itens = await getEpisodiosCached(config);
    }

    let alvos = [];
    for (const item of itens) {
      const link = extractStreamUrl(item);
      if (!link) continue;
      alvos.push({
        id: item.__offsetId || item.id,
        nome: extractField(item, ['nome', 'canalNome', 'titulo', 'title', 'Nome']) || `ID ${item.id}`,
        categoria: extractField(item, ['categoria', 'cat', 'Categoria']) || '',
        link
      });
    }
    if (limit > 0) alvos = alvos.slice(0, limit);

    const resultados = await probeStreams(alvos);
    const okCount = resultados.filter(r => r.status === 'ok').length;
    const data = {
      tipo: checkType,
      total: resultados.length,
      online: okCount,
      offline: resultados.length - okCount,
      resultados
    };
    if (!limit) STREAM_CHECK_CACHE.set(checkCacheKey, { at: Date.now(), data });
    return res.status(200).json(data);
  }

  // -------------------------------------------------------------
  // GUIA DE PROGRAMAÇÃO EPG XMLTV (/xmltv.php)
  // -------------------------------------------------------------
  if (rawUrl.includes('/xmltv.php') || query.xmltv) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    const canais = await getCanaisCached(config);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tv generator-info-name="Painel Xtream Codes - Conta ${config.accountId}">\n`;
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
      name: 'Painel Baserow Xtream Codes Bridge - Multi-Tenant v4.0',
      account_id: config.accountId,
      channels_table: config.tableCanaisTv || 'nao_configurada',
      contents_table: config.tableConteudos || 'nao_configurada',
      users_table: config.tableUsuarios || 'nao_configurada',
      security: 'Bloqueio estrito de contas vencidas ativado',
      endpoints: {
        player_api: '/player_api.php?username={user}&password={pass}&account={accountId}',
        m3u_ts: '/get.php?username={user}&password={pass}&account={accountId}&type=m3u_plus&output=ts',
        dedicated_dns: `/u/${config.accountId}/player_api.php`
      }
    });
  }

  // -------------------------------------------------------------
  // AUTENTICAÇÃO DO USUÁRIO & VALIDAÇÃO DE DATACRIACAO E VENCIMENTO
  // -------------------------------------------------------------
  const authResult = await validateUser(config, username, password);

  // SE NÃO FOR AUTORIZADO (USUÁRIO EXPIRADO, BLOQUEADO OU INEXISTENTE):
  if (!authResult.ok) {
    // 1. Download de M3U (/get.php) -> Bloqueio 403 e nenhum canal exportado
    if (rawUrl.includes('/get.php')) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(403).send(
        `#EXTM3U\n` +
        `#EXTINF:-1 tvg-id="bloqueado" tvg-name="[ACESSO NEGADO]",[ACESSO NEGADO] ${authResult.message}\n` +
        `http://0.0.0.0/expirado\n`
      );
    }

    // 2. Requisição com Action (IPTV tentando baixar lista de canais/filmes/séries) -> HTTP 403
    if (action) {
      return res.status(403).json({
        error: 'Acesso negado',
        status: authResult.status || 'Disabled',
        message: authResult.message
      });
    }

    // 3. Handshake de Login (player_api.php sem action) -> auth: 0 e status: Disabled
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
    m3u += `## Conta Isolada: ${config.accountId} | Modo: ${filterLabel}\n`;
    m3u += `## Cliente: ${username} | Validade: ${new Date(expTimestamp * 1000).toLocaleDateString('pt-BR')}\n\n`;

    // BLOCO 1: CANAIS DE TV AO VIVO (SOMENTE SE isTvAllowed)
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

      // Canais gravados por engano na tabela de conteúdos (Tipo TV/Canal) entram na seção de CANAIS
      const canalFallbackM3u = await getChannelLikeConteudosCached(config);
      const canaisNomesM3u = new Set(canais.map(cc => String(extractField(cc, ['nome', 'canalNome']) || '').trim().toLowerCase()));
      canalFallbackM3u.forEach(cf => {
        const nomeFb = extractField(cf, ['nome', 'titulo']) || `Canal ${cf.id}`;
        if (canaisNomesM3u.has(String(nomeFb).trim().toLowerCase())) return; // já existe na tabela de canais
        const linkFb = extractStreamUrl(cf);
        if (!linkFb) return;
        const capaFb = extractField(cf, ['capa', 'poster']);
        const catFb = formatCategory(extractField(cf, ['categoria', 'genero', 'canalCategoria']), 'tv');
        const logoFb = capaFb ? ` tvg-logo="${capaFb}"` : '';
        m3u += `#EXTINF:-1 tvg-id="tv-${cf.id}" tvg-name="${nomeFb}"${logoFb} group-title="${catFb}",${nomeFb}\n${linkFb}\n\n`;
      });
    }


    // BLOCO 2: FILMES VOD (SOMENTE SE isMoviesAllowed)
    if (isMoviesAllowed) {
      const conteudos = await getConteudosCached(config);
      const filmes = conteudos.filter(f => isFilmeRow(f));


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

    // BLOCO 3: SÉRIES & EPISÓDIOS (SOMENTE SE isSeriesAllowed)
    if (isSeriesAllowed) {
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
  // 2. RESPOSTA DE AUTENTICAÇÃO DO XTREAM (action vazia - handshake)
  // -------------------------------------------------------------
  if (!action) {
    return res.status(200).json({
      user_info: {
        username: username,
        password: password,
        message: 'Autenticado com sucesso na conta individual',
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

    // Categorias de canais gravados por engano na tabela de conteúdos (Tipo TV/Canal)
    const canalFallbackCats = await getChannelLikeConteudosCached(config);
    canalFallbackCats.forEach(c => {
      const catFormatted = formatCategory(extractField(c, ['categoria', 'genero', 'canalCategoria']), 'tv');
      if (!catsMap.has(catFormatted)) catsMap.set(catFormatted, catsMap.size + 1);
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
    // Canais gravados por engano na tabela de conteúdos (Tipo TV/Canal) também entram aqui
    const canalFallback = await getChannelLikeConteudosCached(config);
    const canalNomes = new Set(canais.map(c => String(extractField(c, ['nome', 'canalNome']) || '').trim().toLowerCase()));
    const canalFallbackUnicos = canalFallback
      .filter(c => {
        const nomeFb = String(extractField(c, ['nome', 'titulo']) || '').trim().toLowerCase();
        return nomeFb && !canalNomes.has(nomeFb);
      })
      .map(c => ({ ...c, __streamId: Number(c.id) + CONTEUDO_LIVE_ID_OFFSET }));

    const allLive = [...canais, ...canalFallbackUnicos];

    const catIdMap = new Map();
    allLive.forEach(c => {
      const cat = formatCategory(extractField(c, ['categoria', 'canalCategoria', 'genero']), 'tv');
      if (!catIdMap.has(cat)) catIdMap.set(cat, String(catIdMap.size + 1));
    });

    const requestedCat = query.category_id || body.category_id;

    const result = allLive
      .filter(c => {
        if (!requestedCat) return true;
        const cCat = formatCategory(extractField(c, ['categoria', 'canalCategoria', 'genero']), 'tv');
        return catIdMap.get(cCat) === String(requestedCat);
      })
      .map((c, idx) => {
        const nome = extractField(c, ['nome', 'canalNome', 'titulo']) || `Canal ${c.id}`;
        const link = extractStreamUrl(c);
        const capa = extractField(c, ['capa', 'canalCapa', 'poster']);
        const cat = formatCategory(extractField(c, ['categoria', 'canalCategoria', 'genero']), 'tv');
        const streamId = c.__streamId !== undefined ? c.__streamId : c.id;

        return {
          num: idx + 1,
          name: String(nome).trim(),
          stream_type: 'live',
          stream_id: streamId,
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
      if (isFilmeRow(c)) {
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
    const filmes = conteudos.filter(c => isFilmeRow(c));
    const catIdMap = new Map();

    filmes.forEach(f => {
      const cat = formatCategory(extractField(f, ['categoria', 'genero']), 'movie');
      if (!catIdMap.has(cat)) catIdMap.set(cat, String(catIdMap.size + 1));
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
      if (isSerieRow(c)) {
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
      const isSerie = isSerieRow(c);
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
    const seriesCacheKey = `${config.tableEpisodios}_${targetSeriesId}`;
    const cachedSeries = SERIES_INFO_CACHE.get(seriesCacheKey);
    if (cachedSeries && cachedSeries.expiresAt > now) {
      return res.status(200).json(cachedSeries.data);
    }

    const conteudos = await getConteudosCached(config);
    const serieDoc = conteudos.find(c => String(c.id) === targetSeriesId) || conteudos.find(c => String(c.id).toLowerCase() === targetSeriesId.toLowerCase());
    const serieName = serieDoc ? extractField(serieDoc, ['nome', 'titulo']) : '';
    const serieSinopse = serieDoc ? sanitizeM3uText(extractField(serieDoc, ['sinopse', 'plot', 'descricao', 'overview'])) : '';

    let matchingEps = [];
    if (serieName && config.tableEpisodios) {
      matchingEps = await fetchBaserowRows(config.baseUrl, config.tableEpisodios, config.apiToken, 1000, serieName);
    }

    if (matchingEps.length === 0 && serieName && serieName.includes(' ') && config.tableEpisodios) {
      const shortName = serieName.split(' ').slice(0, 2).join(' ');
      matchingEps = await fetchBaserowRows(config.baseUrl, config.tableEpisodios, config.apiToken, 1000, shortName);
    }

    matchingEps.forEach(e => {
      const link = extractStreamUrl(e);
      if (link) STREAM_URL_CACHE.set(`${config.tableEpisodios}_series_${e.id}`, link);
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

    SERIES_INFO_CACHE.set(seriesCacheKey, {
      data: responseData,
      expiresAt: now + 600000 // 10 minutos
    });

    return res.status(200).json(responseData);
  }

  return res.status(200).json([]);
}
