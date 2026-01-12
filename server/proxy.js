import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Proxy endpoint
app.all('/api/baserow-proxy', async (req, res) => {
    try {
        const { url, method = 'GET', token, body } = req.method === 'GET' ? req.query : req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL é obrigatória' });
        }

        console.log('\n🌐 [PROXY LOCAL] Nova requisição:');
        console.log('  URL:', url);
        console.log('  Method:', method);
        console.log('  Token:', token ? `${token.substring(0, 10)}...` : 'N/A');
        console.log('  Body length:', body ? body.length : 0);
        console.log('  Body preview:', body ? body.substring(0, 200) : 'N/A');

        const headers = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Token ${token}`;
        }

        const fetchOptions = {
            method: method,
            headers: headers,
        };

        if (['POST', 'PATCH', 'PUT'].includes(method.toUpperCase()) && body) {
            fetchOptions.body = body;
        }

        console.log('  📤 Enviando requisição para Baserow...');
        const response = await fetch(url, fetchOptions);

        console.log('  📥 Resposta recebida:', response.status, response.statusText);

        const data = await response.json();

        if (!response.ok) {
            console.error('  ❌ Erro na resposta:', data);
            return res.status(response.status).json(data);
        }

        console.log('  ✅ Sucesso! Campos na resposta:', Object.keys(data));
        res.json(data);

    } catch (error) {
        console.error('❌ [PROXY LOCAL] Erro:', error.message);
        res.status(500).json({
            error: 'Erro no proxy',
            message: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Proxy Baserow local rodando em http://localhost:${PORT}`);
    console.log(`   Endpoint: http://localhost:${PORT}/api/baserow-proxy\n`);
});
