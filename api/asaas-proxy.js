/**
 * Vercel Serverless Function - Proxy direto para API Asaas
 * 
 * Chama a API do Asaas diretamente, sem passar pelo Supabase Edge Function.
 * Requer ASAAS_API_KEY nas env vars do Vercel.
 */

const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).json({ ok: true });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
        if (!ASAAS_API_KEY) {
            console.error('❌ [ASAAS] ASAAS_API_KEY não configurada no Vercel');
            return res.status(500).json({ error: 'ASAAS_API_KEY não configurada' });
        }

        const { action, data } = req.body;

        if (!action) {
            return res.status(400).json({ error: 'action é obrigatório' });
        }

        let endpoint = '';
        let method = 'GET';
        let body = undefined;

        switch (action) {
            case 'createCustomer':
                endpoint = '/customers';
                method = 'POST';
                body = JSON.stringify(data);
                break;
            case 'createPayment':
                endpoint = '/payments';
                method = 'POST';
                body = JSON.stringify(data);
                break;
            case 'getPayment':
                endpoint = `/payments/${data.paymentId}`;
                break;
            case 'getPixQrCode':
                endpoint = `/payments/${data.paymentId}/pixQrCode`;
                break;
            case 'listPayments': {
                const params = new URLSearchParams();
                if (data?.customer) params.set('customer', data.customer);
                if (data?.status) params.set('status', data.status);
                if (data?.externalReference) params.set('externalReference', data.externalReference);
                if (data?.limit) params.set('limit', data.limit.toString());
                if (data?.offset) params.set('offset', data.offset.toString());
                endpoint = `/payments?${params.toString()}`;
                break;
            }
            case 'getBalance':
                endpoint = '/finance/balance';
                break;
            case 'listSubscriptions': {
                const subParams = new URLSearchParams();
                if (data?.customer) subParams.set('customer', data.customer);
                if (data?.limit) subParams.set('limit', data.limit.toString());
                endpoint = `/subscriptions?${subParams.toString()}`;
                break;
            }
            case 'createSubscription':
                endpoint = '/subscriptions';
                method = 'POST';
                body = JSON.stringify(data);
                break;
            default:
                return res.status(400).json({ error: `Ação não permitida: ${action}` });
        }

        const fetchOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'access_token': ASAAS_API_KEY,
            },
        };

        if (method !== 'GET' && body) {
            fetchOptions.body = body;
        }

        console.log(`🔄 [ASAAS] ${action} → ${method} ${endpoint}`);

        const response = await fetch(`${ASAAS_BASE_URL}${endpoint}`, fetchOptions);
        const responseData = await response.json();

        return res.status(response.status).json(responseData);
    } catch (error) {
        console.error('❌ [ASAAS] Erro:', error.message);
        return res.status(500).json({ error: error.message || 'Erro interno' });
    }
}
