/**
 * Vercel Serverless Function - Proxy para Asaas API
 * Protege a API key e resolve CORS
 */

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).json({ ok: true });
    }

    try {
        const { endpoint, method = 'GET', body } = req.method === 'GET' ? req.query : req.body;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint é obrigatório' });
        }

        const url = `${ASAAS_BASE_URL}${endpoint}`;

        const fetchOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'access_token': ASAAS_API_KEY,
            },
        };

        if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body) {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.json();

        return res.status(response.status).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Erro no proxy Asaas', message: error.message });
    }
}
