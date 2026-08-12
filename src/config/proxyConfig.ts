/**
 * Configuração centralizada do Proxy Baserow
 * 
 * Detecta automaticamente o ambiente:
 * - Produção Vercel: usa /api/baserow-proxy (Vercel Serverless)
 * - Lovable/domínio custom: usa URL absoluta do Vercel Serverless
 * - Localhost: usa /api/baserow-proxy via proxy do Vite
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kuszskrqzxwpzsmfsjwg.supabase.co';

// Base do proxy Vercel (necessário em domínios Lovable, onde /api/* não existe)
// Em localhost, o Vite faz proxy de /api -> Vercel (vide vite.config.ts)
const VERCEL_PROXY_BASE = import.meta.env.VITE_VERCEL_PROXY_BASE || 'https://tibimmanagerpainel2026-git-main-apktibim-1235s-projects.vercel.app'.replace(/\/$/, '');

// Detectar ambiente para decidir qual proxy usar
const getEnvironmentType = () => {
    if (typeof window === 'undefined') return 'server';

    const hostname = window.location.hostname;

    // Localhost/development
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';

    // Lovable preview domains: id-preview--<uuid>.lovable.app
    if (hostname.startsWith('id-preview--') && hostname.endsWith('.lovable.app')) return 'lovable-preview';

    // Lovable internal preview domains: <uuid>.lovableproject.com
    if (hostname.endsWith('.lovableproject.com')) return 'lovable-preview';

    // Lovable published domains: <project>.lovable.app
    if (hostname.endsWith('.lovable.app')) return 'lovable-production';

    // Vercel preview/production
    if (hostname.includes('vercel.app')) return 'vercel';

    // Custom domain (assume production on Vercel)
    return 'vercel-production';
};

const shouldUseAbsoluteVercelUrl = (env: string) => {
    // Em domínios Lovable e em domínios custom (não-Vercel), /api/* não existe
    // localmente — precisamos chamar o Vercel pela URL absoluta.
    return env === 'lovable-preview'
        || env === 'lovable-production'
        || env === 'vercel-production';
};

export const BASEROW_PROXY_CONFIG = {
    // Mantido apenas por compatibilidade visual/diagnóstico.
    // O app NÃO usa mais Supabase como fallback do Baserow para evitar CORS.
    SUPABASE_PROXY_URL: `${SUPABASE_URL}/functions/v1/baserow-proxy`,

    // Vercel Serverless Function (relative, funciona quando o host é Vercel/custom domain)
    VERCEL_PROXY_URL: '/api/baserow-proxy',

    // Vercel Serverless Function (absolute, necessário em domínios Lovable)
    get VERCEL_PROXY_ABSOLUTE_URL() {
        return `${VERCEL_PROXY_BASE}${this.VERCEL_PROXY_URL}`;
    },

    // URL ativa - depende do ambiente
    get ACTIVE_PROXY_URL() {
        const envType = getEnvironmentType();

        // Preview/published em Lovable e domínio custom: usar URL ABSOLUTA do Vercel proxy
        if (shouldUseAbsoluteVercelUrl(envType)) {
            console.log(`🌐 [PROXY] Ambiente ${envType} detectado, usando Vercel Proxy ABSOLUTO:`, this.VERCEL_PROXY_ABSOLUTE_URL);
            return this.VERCEL_PROXY_ABSOLUTE_URL;
        }

        // Local dev: usar /api (Vite faz proxy) | Vercel: usar /api nativo
        console.log(`🌐 [PROXY] Ambiente ${envType} detectado, usando Vercel Proxy:`, this.VERCEL_PROXY_URL);
        return this.VERCEL_PROXY_URL;
    },

    // Supabase desativado definitivamente como fallback do proxy Baserow.
    // O fallback antigo tentava a Edge Function após qualquer 404 do Vercel,
    // mas esse 404 muitas vezes é uma resposta real do Baserow (tabela inexistente
    // ou sem permissão), gerando erro de CORS e mascarando a causa real.
    isUsingSupabase() {
        return false;
    },

    // Ambiente
    getEnvironment() {
        return getEnvironmentType();
    }
};

export default BASEROW_PROXY_CONFIG;
