/**
 * Configuração centralizada do Proxy Baserow
 * 
 * Detecta automaticamente o ambiente:
 * - Produção Vercel: usa /api/baserow-proxy (Vercel Serverless)
 * - Preview Lovable/Dev: usa Supabase Edge Function
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kuszskrqzxwpzsmfsjwg.supabase.co';

// Base do proxy Vercel (necessário em domínios Lovable, onde /api/* não existe)
// Em localhost, o Vite faz proxy de /api -> Vercel (vide vite.config.ts)
const VERCEL_PROXY_BASE = import.meta.env.VITE_VERCEL_PROXY_BASE || 'https://tibimmanagerpainel.vercel.app';

// Detectar ambiente para decidir qual proxy usar
const getEnvironmentType = () => {
    if (typeof window === 'undefined') return 'server';

    const hostname = window.location.hostname;

    // Localhost/development
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';

    // Lovable preview domains: id-preview--<uuid>.lovable.app
    if (hostname.startsWith('id-preview--') && hostname.endsWith('.lovable.app')) return 'lovable-preview';

    // Lovable published domains: <project>.lovable.app
    if (hostname.endsWith('.lovable.app')) return 'lovable-production';

    // Vercel preview/production
    if (hostname.includes('vercel.app')) return 'vercel';

    // Custom domain (assume production on Vercel)
    return 'vercel-production';
};

const shouldUseAbsoluteVercelUrl = (env: string) => {
    // Em domínios Lovable, /api/* aponta para o próprio app (retorna HTML)
    return env === 'lovable-preview' || env === 'lovable-production';
};

export const BASEROW_PROXY_CONFIG = {
    // Supabase Edge Function URL (fallback)
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

        // Preview/published em Lovable: usar URL ABSOLUTA do Vercel proxy
        if (shouldUseAbsoluteVercelUrl(envType)) {
            console.log('🌐 [PROXY] Ambiente Lovable detectado, usando Vercel Proxy ABSOLUTO:', this.VERCEL_PROXY_ABSOLUTE_URL);
            return this.VERCEL_PROXY_ABSOLUTE_URL;
        }

        // Local dev: usar /api (Vite faz proxy) | Vercel: usar /api nativo
        console.log(`🌐 [PROXY] Ambiente ${envType} detectado, usando Vercel Proxy:`, this.VERCEL_PROXY_URL);
        return this.VERCEL_PROXY_URL;
    },

    // Verifica se está usando Supabase
    // - Somente em localhost/dev (quando /api/baserow-proxy pode não existir)
    // - Em preview/published/produção: sempre usar Vercel Serverless (/api)
    isUsingSupabase() {
        return this.getEnvironment() === 'development';
    },

    // Ambiente
    getEnvironment() {
        return getEnvironmentType();
    }
};

export default BASEROW_PROXY_CONFIG;
