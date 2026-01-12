/**
 * Configuração centralizada do Proxy Baserow
 * 
 * Prioriza Supabase Edge Function (funciona em todos os ambientes).
 * Fallback para Vercel Serverless Function em produção.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const BASEROW_PROXY_CONFIG = {
    // Supabase Edge Function (funciona em todos os ambientes)
    SUPABASE_PROXY_URL: SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/baserow-proxy` : null,
    
    // Vercel Serverless Function (só funciona em produção Vercel)
    VERCEL_PROXY_URL: '/api/baserow-proxy',

    // URL ativa - prioriza Supabase
    get ACTIVE_PROXY_URL() {
        if (this.SUPABASE_PROXY_URL) {
            console.log('🌐 [PROXY] Usando Supabase Edge Function:', this.SUPABASE_PROXY_URL);
            return this.SUPABASE_PROXY_URL;
        }
        console.log('🌐 [PROXY] Usando Vercel Serverless Function:', this.VERCEL_PROXY_URL);
        return this.VERCEL_PROXY_URL;
    },

    // Verifica se está usando Supabase
    isUsingSupabase() {
        return !!this.SUPABASE_PROXY_URL;
    },

    // Ambiente
    getEnvironment() {
        const isProduction = import.meta.env.PROD ||
            window.location.hostname !== 'localhost';
        return isProduction ? 'production' : 'development';
    }
};

export default BASEROW_PROXY_CONFIG;
