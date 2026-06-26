/**
 * Vercel Serverless Function - Public API Gateway
 * 
 * Validates user API keys against Firestore and proxies requests to Baserow.
 * Users never see the real Baserow token.
 */

const FIREBASE_PROJECT_ID = 'tibimmanagerpainelvercel';
const FIREBASE_API_KEY = 'AIzaSyBN7cODHg978T4S2jPvrBsr5sqwZhGidtU';

// Baserow config - uses env vars set in Vercel
const BASEROW_TOKEN = process.env.BASEROW_ADMIN_TOKEN || '';
const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL || 'https://api.baserow.io';

// Table IDs - configure via env vars
const TABLE_IDS = {
  conteudos: process.env.BASEROW_TABLE_CONTEUDOS || '',
  episodios: process.env.BASEROW_TABLE_EPISODIOS || '',
  categorias: process.env.BASEROW_TABLE_CATEGORIAS || '',
};

// Fields to remove from responses (sensitive data)
const SENSITIVE_FIELDS = ['token', 'password', 'senha', 'api_key', 'secret', 'ip_address'];

function sanitizeData(data) {
  if (Array.isArray(data)) return data.map(sanitizeData);
  if (data && typeof data === 'object') {
    const clean = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some(f => lowerKey.includes(f))) continue;
      clean[key] = value;
    }
    return clean;
  }
  return data;
}

// In-memory caches (per warm serverless instance) to reduce Firestore REST quota usage
const KEY_CACHE = new Map();   // apiKey -> { value, expiresAt }
const SUB_CACHE = new Map();   // userId -> { value, expiresAt }
const KEY_TTL_MS = 120_000;    // 2 min
const SUB_TTL_MS = 60_000;     // 1 min

function cacheGet(map, k) {
  const e = map.get(k);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) { map.delete(k); return undefined; }
  return e.value;
}
function cacheSet(map, k, value, ttl) {
  map.set(k, { value, expiresAt: Date.now() + ttl });
}

async function validateApiKey(apiKey) {
  const cached = cacheGet(KEY_CACHE, apiKey);
  if (cached !== undefined) return cached;

  // Query Firestore REST API for the API key
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
  
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'apiKeys' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'key' },
                op: 'EQUAL',
                value: { stringValue: apiKey }
              }
            },
            {
              fieldFilter: {
                field: { fieldPath: 'active' },
                op: 'EQUAL',
                value: { booleanValue: true }
              }
            }
          ]
        }
      },
      limit: 1
    }
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    console.warn('[public-api] Firestore validateApiKey HTTP', resp.status);
    return null; // do not cache transient failure (e.g. 429 quota)
  }

  const results = await resp.json();

  if (!results || !results[0] || !results[0].document) {
    cacheSet(KEY_CACHE, apiKey, null, KEY_TTL_MS);
    return null;
  }

  const doc = results[0].document;
  const docPath = doc.name;
  const fields = doc.fields;

  const data = {
    docPath,
    userId: fields.userId?.stringValue,
    rateLimit: fields.rateLimit?.integerValue || 60,
    requestCount: fields.requestCount?.integerValue || 0,
    allowedEndpoints: (fields.allowedEndpoints?.arrayValue?.values || []).map(v => v.stringValue),
  };
  cacheSet(KEY_CACHE, apiKey, data, KEY_TTL_MS);
  return data;
}

async function checkUserSubscription(userId) {
  const cached = cacheGet(SUB_CACHE, userId);
  if (cached !== undefined) return cached;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/userPermissions/${userId}?key=${FIREBASE_API_KEY}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      // Do not cache transient HTTP failures (e.g. 429 quota)
      if (resp.status === 429 || resp.status >= 500) {
        return { active: false, reason: 'Erro temporário ao verificar assinatura' };
      }
      const result = { active: false, reason: 'Permissões não encontradas' };
      cacheSet(SUB_CACHE, userId, result, SUB_TTL_MS);
      return result;
    }

    const doc = await resp.json();
    const fields = doc.fields || {};

    // Check if user has the 'minha-api' feature enabled
    const enabledFeatures = (fields.enabledFeatures?.arrayValue?.values || []).map(v => v.stringValue);
    if (!enabledFeatures.includes('minha-api')) {
      const result = { active: false, reason: 'Plano não inclui acesso à API' };
      cacheSet(SUB_CACHE, userId, result, SUB_TTL_MS);
      return result;
    }

    // Check subscription expiry
    const expiryDateStr = fields.subscriptionExpiry?.timestampValue || fields.expiryDate?.stringValue;
    if (expiryDateStr) {
      const expiryDate = new Date(expiryDateStr);
      if (expiryDate < new Date()) {
        const result = { active: false, reason: 'Assinatura expirada' };
        cacheSet(SUB_CACHE, userId, result, SUB_TTL_MS);
        return result;
      }
    }

    const result = { active: true };
    cacheSet(SUB_CACHE, userId, result, SUB_TTL_MS);
    return result;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return { active: false, reason: 'Erro ao verificar assinatura' };
  }
}

async function updateKeyUsage(docPath) {
  const url = `https://firestore.googleapis.com/v1/${docPath}?updateMask.fieldPaths=lastUsedAt&updateMask.fieldPaths=requestCount&key=${FIREBASE_API_KEY}`;
  
  try {
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          lastUsedAt: { timestampValue: new Date().toISOString() },
          requestCount: { integerValue: '1' } // Simplified - just marks as used
        }
      })
    });
  } catch (e) {
    console.warn('Failed to update key usage:', e);
  }
}

async function incrementRequestCount(docPath, currentCount) {
  const url = `https://firestore.googleapis.com/v1/${docPath}?updateMask.fieldPaths=lastUsedAt&updateMask.fieldPaths=requestCount&key=${FIREBASE_API_KEY}`;
  
  try {
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          lastUsedAt: { timestampValue: new Date().toISOString() },
          requestCount: { integerValue: String((parseInt(currentCount) || 0) + 1) }
        }
      })
    });
  } catch (e) {
    console.warn('Failed to increment request count:', e);
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  // Get API key from header or query param
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API Key obrigatória',
      hint: 'Envie via header X-API-Key ou query param ?api_key=sua_chave'
    });
  }

  // Validate API key
  const keyData = await validateApiKey(apiKey);
  
  if (!keyData) {
    return res.status(403).json({ error: 'API Key inválida ou desativada' });
  }

  // Check if user subscription is active
  const subscription = await checkUserSubscription(keyData.userId);
  if (!subscription.active) {
    return res.status(403).json({ 
      error: 'Acesso à API bloqueado',
      reason: subscription.reason,
      hint: 'Sua assinatura expirou ou seu plano não inclui acesso à API. Renove sua assinatura para continuar usando.'
    });
  }

  // Get endpoint
  const endpoint = req.query.endpoint;
  
  if (!endpoint) {
    return res.status(400).json({ 
      error: 'Endpoint obrigatório',
      endpoints_disponiveis: ['conteudos', 'episodios', 'categorias', 'busca'],
      exemplo: '/api/public-api?api_key=pk_live_xxx&endpoint=conteudos'
    });
  }

  // Check allowed endpoints
  if (keyData.allowedEndpoints.length > 0 && !keyData.allowedEndpoints.includes(endpoint)) {
    return res.status(403).json({ error: `Endpoint '${endpoint}' não permitido para esta chave` });
  }

  // Check if table ID is configured
  if (endpoint === 'busca') {
    // Search across conteudos
    const searchQuery = req.query.q;
    if (!searchQuery) {
      return res.status(400).json({ error: 'Parâmetro "q" obrigatório para busca' });
    }

    const tableId = TABLE_IDS.conteudos;
    if (!tableId) {
      return res.status(500).json({ error: 'Tabela de conteúdos não configurada no servidor' });
    }

    const page = parseInt(req.query.page) || 1;
    const size = Math.min(parseInt(req.query.size) || 20, 100);

    try {
      const baserowUrl = `${BASEROW_BASE_URL}/api/database/rows/table/${tableId}/?user_field_names=true&search=${encodeURIComponent(searchQuery)}&page=${page}&size=${size}`;
      
      const response = await fetch(baserowUrl, {
        headers: { 'Authorization': `Token ${BASEROW_TOKEN}` }
      });

      if (!response.ok) {
        return res.status(502).json({ error: 'Erro ao buscar dados' });
      }

      const data = await response.json();
      
      // Update usage
      incrementRequestCount(keyData.docPath, keyData.requestCount);

      return res.status(200).json({
        success: true,
        endpoint: 'busca',
        query: searchQuery,
        page,
        size,
        count: data.count || 0,
        results: sanitizeData(data.results || [])
      });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno ao processar busca' });
    }
  }

  const tableId = TABLE_IDS[endpoint];
  if (!tableId) {
    return res.status(400).json({ 
      error: `Endpoint '${endpoint}' não reconhecido ou não configurado`,
      endpoints_disponiveis: Object.keys(TABLE_IDS).filter(k => TABLE_IDS[k])
    });
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const size = Math.min(parseInt(req.query.size) || 20, 100);

  // Optional filters
  const search = req.query.search || '';
  const orderBy = req.query.order_by || '';

  try {
    let baserowUrl = `${BASEROW_BASE_URL}/api/database/rows/table/${tableId}/?user_field_names=true&page=${page}&size=${size}`;
    
    if (search) {
      baserowUrl += `&search=${encodeURIComponent(search)}`;
    }
    if (orderBy) {
      baserowUrl += `&order_by=${encodeURIComponent(orderBy)}`;
    }

    const response = await fetch(baserowUrl, {
      headers: { 'Authorization': `Token ${BASEROW_TOKEN}` }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Erro ao buscar dados do servidor' });
    }

    const data = await response.json();
    
    // Update usage stats
    incrementRequestCount(keyData.docPath, keyData.requestCount);

    return res.status(200).json({
      success: true,
      endpoint,
      page,
      size,
      count: data.count || 0,
      next: data.next ? true : false,
      previous: data.previous ? true : false,
      results: sanitizeData(data.results || [])
    });
  } catch (err) {
    console.error('Public API error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
