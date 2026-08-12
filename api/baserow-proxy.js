/**
 * Vercel Serverless Function - Proxy para Baserow
 * 
 * Esta função atua como proxy entre o frontend e o Baserow em produção.
 * Em desenvolvimento local, usamos server/proxy.js
 */

export default async function handler(req, res) {
    // Habilitar CORS - CRÍTICO para domínios externos
    // Definir headers básicos para CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, access_token, token');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');

    // Responder a preflight requests com 200 OK sem corpo
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('🌐 [VERCEL PROXY] Requisição recebida:', {
        method: req.method,
        timestamp: new Date().toISOString(),
        queryKeys: Object.keys(req.query),
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent']
    });

    try {
        // Extrair parâmetros do body ou query
        let url, method, token, body;
        const isGet = req.method === 'GET';
        
        // Tentar extrair do body primeiro (mais seguro para tokens)
        if (req.body && typeof req.body === 'object') {
            url = req.body.url || req.query.url;
            method = req.body.method || req.query.method || (isGet ? 'GET' : 'POST');
            token = req.body.token || req.query.token;
            body = req.body.body;
        } else {
            url = req.query.url;
            method = req.query.method || 'GET';
            token = req.query.token;
            body = req.query.body;
        }

        // Se for apenas uma verificação de saúde do proxy sem URL alvo
        if (!url && (req.method === 'HEAD' || (isGet && Object.keys(req.query).length === 0))) {
            return res.status(200).json({ ok: true, service: 'baserow-proxy' });
        }

        if (!url) {
            return res.status(400).json({ error: 'URL é obrigatória' });
        }

        if (!token) {
            console.error('❌ [VERCEL PROXY] Erro: Token não fornecido no payload!', {
                url,
                method,
                userAgent: req.headers['user-agent'],
                referer: req.headers['referer']
            });
            return res.status(401).json({ 
                error: 'Não autorizado (Token Ausente)', 
                message: 'O token do Baserow não foi enviado pelo cliente. Isso pode ocorrer se as configurações globais não foram carregadas corretamente ou se o banco de dados (Firebase) está sendo bloqueado pelo seu navegador/AdBlock.',
                debug: {
                    receivedUrl: url,
                    receivedMethod: method,
                    timestamp: new Date().toISOString()
                }
            });
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

        // Fazer requisição com retry para erros transitórios (403, 500, 502, 503, 504)
        // O servidor Baserow ocasionalmente retorna 500 (HTML) sob carga
        let response;
        let lastResponseText = '';
        let lastContentType = '';
        const RETRY_STATUSES = [403, 500, 502, 503, 504];
        const MAX_ATTEMPTS = 3; 
        const FETCH_TIMEOUT_MS = 20000; // Aumentado para 20s para dar mais fôlego ao Baserow em requisições pesadas (muitas linhas)
        
        // Log para depuração de URL e Token (apenas se não for produção ou se estiver com erro)
        console.log(`🌐 [VERCEL PROXY] Processando request: ${method} ${url?.substring(0, 100)}`);

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
            try {
                response = await fetch(url, { ...fetchOptions, signal: controller.signal });
            } catch (fetchErr) {
                clearTimeout(timeoutId);
                const isAbort = fetchErr.name === 'AbortError';
                console.warn(`⏱️ [VERCEL PROXY] Tentativa ${attempt} falhou:`, isAbort ? 'TIMEOUT' : fetchErr.message);
                if (attempt === MAX_ATTEMPTS) {
                    return res.status(504).json({
                        error: isAbort ? 'Timeout ao conectar com Baserow' : 'Erro de rede ao conectar com Baserow',
                        details: fetchErr.message
                    });
                }
                await new Promise(r => setTimeout(r, 600 * attempt));
                continue;
            }
            clearTimeout(timeoutId);
            const ct = response.headers.get('content-type') || '';
            const isHtml = ct.includes('text/html');

            // Se é uma resposta retentável (status ruim OU HTML em vez de JSON), tentar de novo
            const shouldRetry = RETRY_STATUSES.includes(response.status) || (isHtml && !response.ok);

            if (!shouldRetry || attempt === MAX_ATTEMPTS) {
                if (isHtml && !response.ok) {
                    // Salvar para usar no fallback de erro abaixo
                    lastResponseText = await response.text();
                    lastContentType = ct;
                    // Reconstruir um "response" com texto já lido
                    response = {
                        status: response.status,
                        statusText: response.statusText,
                        ok: response.ok,
                        headers: response.headers,
                        text: async () => lastResponseText,
                        json: async () => { throw new Error('Resposta não é JSON'); }
                    };
                }
                break;
            }

            console.log(`🔁 [VERCEL PROXY] Retry ${attempt}/${MAX_ATTEMPTS - 1} - status ${response.status}`);
            // Backoff curto: ~600ms entre tentativas
            await new Promise(r => setTimeout(r, 600 * attempt));
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
        console.error('❌ [VERCEL PROXY] Erro crítico:', error);
        
        // Tentar garantir headers de erro
        if (!res.headersSent) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');
            
            return res.status(500).json({
                error: 'Erro no proxy',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
}
