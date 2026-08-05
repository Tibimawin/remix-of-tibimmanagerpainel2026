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
        const isGet = req.method === 'GET';
        const { url, method = isGet ? 'GET' : 'POST', token, body } = isGet ? req.query : req.body;

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
                error: 'Não autorizado', 
                message: 'O token do Baserow não foi enviado pelo cliente. Verifique as configurações no painel.',
                debug: {
                    receivedUrl: url,
                    receivedMethod: method
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
        // Reduzido para 2 tentativas: o cliente já faz retries com backoff,
        // e múltiplas tentativas aqui estouram o limite de 30s do Vercel.
        const MAX_ATTEMPTS = 2;
        // Timeout por requisição ao Baserow (12s) para garantir que sobre
        // tempo dentro do limite de execução da função serverless.
        const FETCH_TIMEOUT_MS = 12000;

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
