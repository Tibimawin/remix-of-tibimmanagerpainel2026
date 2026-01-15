/**
 * Configuração centralizada do Proxy Baserow
 * 
 * Detecta automaticamente o ambiente:
 * - Produção Vercel: usa /api/baserow-proxy (Vercel Serverless)
 * - Preview Lovable/Dev: usa Supabase Edge Function
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kuszskrqzxwpzsmfsjwg.supabase.co';

// Detectar se está rodando no Vercel (produção) ou Lovable preview
const getEnvironmentType = () => {
    if (typeof window === 'undefined') return 'server';
    
    const hostname = window.location.hostname;
    
    // Lovable preview
    if (hostname.includes('lovable.app')) return 'lovable-preview';
    
    // Localhost/development
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
    
    // Vercel preview/production
    if (hostname.includes('vercel.app')) return 'vercel';
    
    // Custom domain (assume production on Vercel)
    return 'vercel-production';
};

const isVercelProduction = () => {
    const env = getEnvironmentType();
    return env === 'vercel' || env === 'vercel-production';
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
    isUsingSupabase() {
        return !isVercelProduction();
    },

    // Ambiente
    getEnvironment() {
        return getEnvironmentType();
    }
};

export default BASEROW_PROXY_CONFIG;
