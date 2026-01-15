/**
 * Configuração centralizada do Proxy Baserow
 * 
 * Detecta automaticamente o ambiente:
 * - Produção Vercel: usa /api/baserow-proxy (Vercel Serverless)
 * - Preview Lovable/Dev: usa Supabase Edge Function
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kuszskrqzxwpzsmfsjwg.supabase.co';

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

// Ambientes que devem usar o proxy Vercel (/api/baserow-proxy)
const isVercelProduction = () => {
    const env = getEnvironmentType();
    return (
        env === 'vercel' ||
        env === 'vercel-production' ||
        env === 'lovable-production' ||
        env === 'lovable-preview'
    );
};

export const BASEROW_PROXY_CONFIG = {
    // Supabase Edge Function URL
    SUPABASE_PROXY_URL: `${SUPABASE_URL}/functions/v1/baserow-proxy`,
    
    // Vercel Serverless Function
    VERCEL_PROXY_URL: '/api/baserow-proxy',

    // URL ativa - depende do ambiente
    get ACTIVE_PROXY_URL() {
        const envType = getEnvironmentType();
        
        // No Vercel production/preview, usar Vercel Serverless
        if (isVercelProduction()) {
            console.log('🌐 [PROXY] Ambiente Vercel detectado, usando Serverless Function:', this.VERCEL_PROXY_URL);
            return this.VERCEL_PROXY_URL;
        }
        
        // No Lovable preview ou development, usar Supabase Edge Function
        console.log(`🌐 [PROXY] Ambiente ${envType} detectado, usando Supabase Edge Function:`, this.SUPABASE_PROXY_URL);
        return this.SUPABASE_PROXY_URL;
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
