/**
 * Vercel Serverless Function - Proxy para Baserow
 * 
 * Esta função atua como proxy entre o frontend e o Baserow em produção.
 * Em desenvolvimento local, usamos server/proxy.js
 */

export default async function handler(req, res) {
    // Habilitar CORS - CRÍTICO
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    // Responder a preflight requests com 200 OK
    if (req.method === 'OPTIONS') {
        console.log('✅ [VERCEL PROXY] OPTIONS request - retornando 200');
        return res.status(200).json({ ok: true });
    }

    console.log('🌐 [VERCEL PROXY] Requisição recebida:', {
        method: req.method,
        timestamp: new Date().toISOString()
    });

    try {
        // Extrair parâmetros do body ou query
        const { url, method = 'GET', token, body } = req.method === 'GET' ? req.query : req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL é obrigatória' });
        }

        console.log('🌐 [VERCEL PROXY] Nova requisição:', {
            url: url.substring(0, 100) + '...',
            method: method,
            hasToken: !!token,
            hasBody: !!body,
            bodyType: typeof body
        });

        // Preparar headers
        const headers = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Token ${token}`;
            console.log('🔑 [VERCEL PROXY] Token adicionado:', {
                tokenPreview: token.substring(0, 15) + '...',
                authHeader: headers['Authorization'].substring(0, 20) + '...'
            });
        } else {
            console.warn('⚠️ [VERCEL PROXY] Nenhum token fornecido!');
        }

        // Preparar opções do fetch
        const fetchOptions = {
            method: method,
            headers: headers,
        };

        // Adicionar body para métodos que suportam
        if (['POST', 'PATCH', 'PUT'].includes(method.toUpperCase()) && body) {
            // 🔧 IMPORTANTE: Garantir que o body seja sempre uma string JSON
            if (typeof body === 'string') {
                fetchOptions.body = body;
            } else if (typeof body === 'object') {
                fetchOptions.body = JSON.stringify(body);
            } else {
                console.warn('⚠️ [VERCEL PROXY] Tipo de body inesperado:', typeof body);
                fetchOptions.body = String(body);
            }

            console.log('📤 [VERCEL PROXY] Body sendo enviado:', {
                length: fetchOptions.body.length,
                preview: fetchOptions.body.substring(0, 200)
            });
        }

        // Fazer requisição com retry para 403
        let response = await fetch(url, fetchOptions);

        // Retry automático para 403 (pode ser temporário)
        if (response.status === 403) {
            await new Promise(r => setTimeout(r, 1000));
            response = await fetch(url, fetchOptions);
        }

        // Log do status da resposta
        console.log('📡 [VERCEL PROXY] Resposta recebida:', {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type')
        });

        // Tratar respostas sem conteúdo (204 No Content - DELETE bem-sucedido)
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            console.log('✅ [VERCEL PROXY] Resposta 204 No Content (DELETE bem-sucedido)');
            return res.status(200).json({ success: true, status: 204 });
        }

        // Verificar se a resposta tem conteúdo JSON
        const contentType = response.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            console.log('📥 [VERCEL PROXY] Resposta JSON recebida:', {
                status: response.status,
                dataKeys: Object.keys(data).slice(0, 10).join(', ')
            });
        } else {
            const text = await response.text();
            
            // Se status é 2xx e sem content-type, considerar sucesso
            if (response.ok && (!text || text.trim() === '')) {
                console.log('✅ [VERCEL PROXY] Resposta vazia com status OK');
                return res.status(200).json({ success: true, status: response.status });
            }
            
            // Tentar parsear como JSON mesmo sem content-type
            try {
                data = JSON.parse(text);
                console.log('📥 [VERCEL PROXY] Texto parseado como JSON');
            } catch {
                console.error('⚠️ [VERCEL PROXY] Resposta não é JSON:', {
                    contentType,
                    textPreview: text.substring(0, 500),
                    url: url,
                    method: method,
                    hasToken: !!token
                });
                
                return res.status(502).json({
                    error: 'Baserow retornou HTML em vez de JSON',
                    details: 'O servidor Baserow pode estar offline, o token pode estar inválido, ou a URL/tabela não existe',
                    contentType: contentType,
                    preview: text.substring(0, 200),
                    url: url
                });
            }
        }

        // Retornar resposta
        if (!response.ok) {
            console.error('❌ [VERCEL PROXY] Erro na requisição:', {
                status: response.status,
                statusText: response.statusText,
                data: data
            });
            return res.status(response.status).json(data);
        }

        console.log('✅ [VERCEL PROXY] Sucesso!');
        return res.status(200).json(data);

    } catch (error) {
        console.error('❌ [VERCEL PROXY] Erro crítico:', {
            message: error.message,
            stack: error.stack
        });
        
        // Garantir CORS mesmo em erro
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        
        return res.status(500).json({
            error: 'Erro no proxy',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : 'Erro interno do servidor'
        });
    }
}
