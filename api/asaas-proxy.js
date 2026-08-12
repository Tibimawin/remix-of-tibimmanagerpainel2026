/**
 * Vercel Serverless Function - Proxy para Asaas API
 * Protege a API key e resolve CORS
 */

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3';
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const sendJson = (res, status, payload) => {
    res.status(status).json(payload);
};

const readAsaasResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!text) return null;

    if (contentType.includes('application/json')) {
        try {
            return JSON.parse(text);
        } catch {
            return { raw: text };
        }
    }

    try {
        return JSON.parse(text);
    } catch {
        return { raw: text.substring(0, 500) };
    }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, access_token, token');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET' && req.query?.health === '1') {
            return sendJson(res, 200, {
                ok: true,
                service: 'asaas-proxy',
                hasApiKey: Boolean(ASAAS_API_KEY),
                baseUrl: ASAAS_BASE_URL,
            });
        }

        if (!ASAAS_API_KEY) {
            return sendJson(res, 503, {
                error: 'ASAAS_API_KEY não configurada na Vercel',
                details: 'Configure a variável ASAAS_API_KEY no projeto da Vercel e faça redeploy.',
            });
        }

        const { endpoint, method = 'GET', body } = req.method === 'GET' ? req.query : req.body;
        const normalizedMethod = String(method).toUpperCase();

        if (!endpoint) {
            return sendJson(res, 400, { error: 'Endpoint é obrigatório' });
        }

        if (!String(endpoint).startsWith('/')) {
            return sendJson(res, 400, { error: 'Endpoint inválido: deve começar com /' });
        }

        if (!ALLOWED_METHODS.includes(normalizedMethod)) {
            return sendJson(res, 405, { error: `Método não permitido: ${normalizedMethod}` });
        }

        const url = `${ASAAS_BASE_URL}${endpoint}`;

        const fetchOptions = {
            method: normalizedMethod,
            headers: {
                'Content-Type': 'application/json',
                'access_token': ASAAS_API_KEY,
            },
        };

        if (['POST', 'PUT', 'PATCH'].includes(normalizedMethod) && body) {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);
        const data = await readAsaasResponse(response);

        if (!response.ok) {
            return sendJson(res, response.status, {
                error: data?.errors?.[0]?.description || data?.message || 'Erro retornado pela API Asaas',
                status: response.status,
                asaas: data,
            });
        }

        return sendJson(res, response.status, data ?? { success: true });
    } catch (error) {
        return sendJson(res, 500, {
            error: 'Erro no proxy Asaas',
            message: error instanceof Error ? error.message : String(error),
        });
    }
}
