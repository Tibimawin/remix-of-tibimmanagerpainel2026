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
const SENSITIVE_FIELDS = ['token', 'password', 'senha', 'api_key', 'secret', 'ip_address', 'favoritos', 'histórico', 'historico', 'link', 'uid'];

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

async function validateApiKey(apiKey) {
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

  const results = await resp.json();
  
  if (!results || !results[0] || !results[0].document) {
    return null;
  }

  const doc = results[0].document;
  const docPath = doc.name;
  const fields = doc.fields;
  
  return {
    docPath,
    userId: fields.userId?.stringValue,
    rateLimit: fields.rateLimit?.integerValue || 60,
    requestCount: fields.requestCount?.integerValue || 0,
    allowedEndpoints: (fields.allowedEndpoints?.arrayValue?.values || []).map(v => v.stringValue),
  };
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
