/**
 * Configuração centralizada do Proxy Baserow
 * 
 * Detecta automaticamente o ambiente:
 * - Produção Vercel: usa /api/baserow-proxy (Vercel Serverless)
 * - Preview Lovable: usa Supabase Edge Function
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Detectar se está rodando no Vercel (produção) ou Lovable preview
const isVercelProduction = () => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    // Vercel production deploys ou custom domains (não lovable.app)
    return hostname.includes('vercel.app') || 
           (!hostname.includes('lovable.app') && !hostname.includes('localhost'));
};

export const BASEROW_PROXY_CONFIG = {
    // Supabase Edge Function
    SUPABASE_PROXY_URL: SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/baserow-proxy` : null,
    
    // Vercel Serverless Function
    VERCEL_PROXY_URL: '/api/baserow-proxy',

    // URL ativa - depende do ambiente
    get ACTIVE_PROXY_URL() {
        // No Vercel production, usar Vercel Serverless
        if (isVercelProduction()) {
            console.log('🌐 [PROXY] Ambiente Vercel detectado, usando Serverless Function:', this.VERCEL_PROXY_URL);
            return this.VERCEL_PROXY_URL;
        }
        
        // No Lovable preview ou dev, usar Supabase Edge Function
        if (this.SUPABASE_PROXY_URL) {
            console.log('🌐 [PROXY] Ambiente Lovable/Dev detectado, usando Supabase Edge Function:', this.SUPABASE_PROXY_URL);
            return this.SUPABASE_PROXY_URL;
        }
        
        // Fallback para Vercel
        console.log('🌐 [PROXY] Fallback para Vercel Serverless Function:', this.VERCEL_PROXY_URL);
        return this.VERCEL_PROXY_URL;
    },

    // Verifica se está usando Supabase
    isUsingSupabase() {
        return !isVercelProduction() && !!this.SUPABASE_PROXY_URL;
    },

    // Ambiente
    getEnvironment() {
        if (isVercelProduction()) return 'vercel-production';
        if (typeof window !== 'undefined' && window.location.hostname.includes('lovable.app')) return 'lovable-preview';
        return 'development';
    }
};

export default BASEROW_PROXY_CONFIG;
