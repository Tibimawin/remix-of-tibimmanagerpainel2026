/**
 * Vercel Serverless Function - Proxy para Asaas via Supabase Edge Function
 * 
 * Redireciona chamadas para o Edge Function asaas-proxy no Supabase,
 * evitando problemas de CORS no ambiente de preview.
 */

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
        const { action, data } = req.body;

        if (!action) {
            return res.status(400).json({ error: 'action é obrigatório' });
        }

        const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kuszskrqzxwpzsmfsjwg.supabase.co';
        const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

        const response = await fetch(`${SUPABASE_URL}/functions/v1/asaas-proxy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
            body: JSON.stringify({ action, data }),
        });

        const responseData = await response.json();
        return res.status(response.status).json(responseData);
    } catch (error) {
        console.error('❌ [ASAAS PROXY] Erro:', error.message);
        return res.status(500).json({ error: error.message || 'Erro interno' });
    }
}
