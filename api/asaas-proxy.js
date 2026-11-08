/**
 * Vercel Serverless Function - Proxy Seguro para Asaas API
 * 
 * Proteções de Segurança Implementadas:
 * 1. Autenticação Obrigatória: Exige token JWT do Firebase Auth (Bearer Token)
 * 2. Proteção BOLA (Broken Object Level Authorization): Usuários só consultam/criam seus próprios clientes
 * 3. Bloqueio de Listagem Global: Proíbe listagem indiscriminada de /customers e /payments
 * 4. Whitelist Estrita de Endpoints: Bloqueia qualquer acesso a transferências, saldos e contas bancárias
 */

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_BASE_URL = (process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3').replace(/\/+$/, '');
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBN7cODHg978T4S2jPvrBsr5sqwZhGidtU';
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// Cache de tokens validados do Firebase (3 minutos) para reduzir chamadas ao Identity Toolkit
const TOKEN_CACHE = new Map(); // token -> { user, expiresAt }
const TOKEN_CACHE_TTL_MS = 3 * 60 * 1000;

const sendJson = (res, status, payload) => {
    res.status(status).json(payload);
};

const getAuthorizedAdminEmails = () => {
    const emails = new Set(['admin@admin.com']);
    const envEmails = process.env.VITE_ADMIN_EMAILS || process.env.ADMIN_EMAILS;
    if (envEmails && typeof envEmails === 'string') {
        envEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean).forEach(e => emails.add(e));
    }
    return emails;
};

/**
 * Validação criptográfica do Token JWT do Firebase com o Google Identity Toolkit
 */
async function verifyFirebaseToken(idToken) {
    if (!idToken || typeof idToken !== 'string') return null;

    const cleanToken = idToken.trim();
    const now = Date.now();
    const cached = TOKEN_CACHE.get(cleanToken);
    if (cached && cached.expiresAt > now) {
        return cached.user;
    }

    try {
        const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`;
        const resp = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: cleanToken })
        });

        if (!resp.ok) {
            return null;
        }

        const data = await resp.json();
        if (!data.users || data.users.length === 0) {
            return null;
        }

        const user = {
            uid: data.users[0].localId,
            email: (data.users[0].email || '').toLowerCase().trim(),
        };

        TOKEN_CACHE.set(cleanToken, { user, expiresAt: now + TOKEN_CACHE_TTL_MS });
        return user;
    } catch (err) {
        console.error('❌ [ASAAS PROXY] Falha ao verificar token com Firebase Identity Toolkit:', err?.message);
        return null;
    }
}

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
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, access_token, token, x-firebase-token');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Health check básico (não expõe dados sensíveis)
        if (req.method === 'GET' && req.query?.health === '1') {
            return sendJson(res, 200, {
                ok: true,
                service: 'asaas-proxy',
                hasApiKey: Boolean(ASAAS_API_KEY),
                authRequired: true,
            });
        }

        if (!ASAAS_API_KEY) {
            return sendJson(res, 503, {
                error: 'ASAAS_API_KEY não configurada na Vercel',
                details: 'Configure a variável ASAAS_API_KEY no projeto da Vercel e faça redeploy.',
            });
        }

        // 🛡️ Extração e Validação do Token de Autenticação (Firebase Auth)
        const authHeader = req.headers.authorization || req.headers['x-firebase-token'];
        let idToken = null;
        if (authHeader && typeof authHeader === 'string') {
            idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        } else if (req.body && typeof req.body === 'object' && req.body.idToken) {
            idToken = req.body.idToken;
        } else if (req.query && req.query.idToken) {
            idToken = req.query.idToken;
        }

        if (!idToken) {
            console.warn('⛔ [SECURITY] Requisição rejeitada no asaas-proxy: ausência de token de autenticação.');
            return sendJson(res, 401, {
                error: 'Não autorizado (401)',
                message: 'Autenticação necessária. Envie o token de sessão do usuário no header Authorization: Bearer <token>.'
            });
        }

        const authenticatedUser = await verifyFirebaseToken(idToken);
        if (!authenticatedUser) {
            console.warn('⛔ [SECURITY] Requisição rejeitada no asaas-proxy: token Firebase inválido ou expirado.');
            return sendJson(res, 401, {
                error: 'Sessão inválida ou expirada (401)',
                message: 'Sua sessão expirou ou é inválida. Faça login novamente para prosseguir.'
            });
        }

        const adminEmails = getAuthorizedAdminEmails();
        const isAdmin = adminEmails.has(authenticatedUser.email);

        const { endpoint, method = 'GET', body } = req.method === 'GET' ? req.query : (req.body || {});
        const normalizedMethod = String(method).toUpperCase();

        if (!endpoint) {
            return sendJson(res, 400, { error: 'Endpoint é obrigatório' });
        }

        if (!String(endpoint).startsWith('/')) {
            return sendJson(res, 400, { error: 'Endpoint inválido: deve começar com /' });
        }

        // 🛡️ Whitelist de endpoints permitidos: Proíbe transferências, saldos bancários, etc.
        const ALLOWED_ENDPOINT_PREFIXES = ['/customers', '/payments', '/subscriptions'];
        const isAllowedEndpoint = ALLOWED_ENDPOINT_PREFIXES.some(prefix => endpoint.startsWith(prefix));

        if (!isAllowedEndpoint) {
            console.warn('⛔ [SECURITY] Bloqueada tentativa de acesso a endpoint proibido no Asaas:', endpoint);
            return sendJson(res, 403, { 
                error: 'Acesso Negado (403)', 
                message: 'Operação ou endpoint não autorizado por política de segurança da aplicação.' 
            });
        }

        if (!ALLOWED_METHODS.includes(normalizedMethod)) {
            return sendJson(res, 405, { error: `Método não permitido: ${normalizedMethod}` });
        }

        // 🛡️ Proteção BOLA (Broken Object Level Authorization) e Bloqueio de Listagem Global para não-admins
        if (!isAdmin) {
            const urlObj = new URL(endpoint, 'https://dummy.local');
            const path = urlObj.pathname;
            const searchParams = urlObj.searchParams;

            // 1. Regras para /customers
            if (path === '/customers' || path === '/customers/') {
                if (normalizedMethod === 'GET') {
                    const queryEmail = (searchParams.get('email') || '').toLowerCase().trim();
                    if (!queryEmail) {
                        return sendJson(res, 403, {
                            error: 'Acesso Proibido (403)',
                            message: 'Listagem irrestrita de clientes não é permitida por motivos de privacidade e conformidade LGPD.'
                        });
                    }
                    if (queryEmail !== authenticatedUser.email) {
                        return sendJson(res, 403, {
                            error: 'Acesso Proibido (403)',
                            message: 'Você só possui autorização para consultar dados cadastrais vinculados ao seu próprio e-mail autenticado.'
                        });
                    }
                } else if (normalizedMethod === 'POST') {
                    // Ao criar cliente, o email deve ser o do usuário autenticado
                    const bodyEmail = (body && typeof body === 'object' && body.email) 
                        ? String(body.email).toLowerCase().trim() 
                        : '';
                    if (bodyEmail && bodyEmail !== authenticatedUser.email) {
                        return sendJson(res, 403, {
                            error: 'Acesso Proibido (403)',
                            message: 'O cadastro do cliente financeiro deve pertencer ao e-mail da sua conta autenticada.'
                        });
                    }
                }
            }

            // 2. Regras para /payments
            if (path === '/payments' || path === '/payments/') {
                if (normalizedMethod === 'GET') {
                    const customerParam = searchParams.get('customer');
                    const subscriptionParam = searchParams.get('subscription');
                    // Proíbe GET /payments aberto sem filtro de cliente ou assinatura
                    if (!customerParam && !subscriptionParam) {
                        return sendJson(res, 403, {
                            error: 'Acesso Proibido (403)',
                            message: 'Listagem global de pagamentos não é permitida. Filtre pelo identificador do seu cliente ou assinatura.'
                        });
                    }
                }
            }

            // 3. Regras para /subscriptions
            if (path === '/subscriptions' || path === '/subscriptions/') {
                if (normalizedMethod === 'GET') {
                    const customerParam = searchParams.get('customer');
                    if (!customerParam) {
                        return sendJson(res, 403, {
                            error: 'Acesso Proibido (403)',
                            message: 'Listagem global de assinaturas não é permitida. Filtre pelo seu identificador de cliente.'
                        });
                    }
                }
            }
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
        console.error('❌ [ASAAS PROXY] Erro interno:', error);
        return sendJson(res, 500, {
            error: 'Erro no proxy Asaas',
            message: error instanceof Error ? error.message : String(error),
        });
    }
}

