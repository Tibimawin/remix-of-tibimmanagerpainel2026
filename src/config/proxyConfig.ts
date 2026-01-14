/**
 * Configuração centralizada do Proxy Baserow
 * 
 * Detecta automaticamente o ambiente:
 * - Produção Vercel: usa /api/baserow-proxy (Vercel Serverless)
 * - Preview Lovable: usa Supabase Edge Function
 * - Site Publicado Lovable: usa /api/baserow-proxy
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Detectar se está rodando em ambiente que deve usar Vercel/local proxy
const shouldUseVercelProxy = () => {
    if (typeof window === 'undefined') return false;
    
    const hostname = window.location.hostname;
    
    // Lovable preview - usa Supabase Edge Function
    if (hostname.includes('lovableproject.com')) {
        console.log('🌐 [PROXY] Ambiente: Lovable Preview');
        return false;
    }
    
    // Lovable published site - usa Supabase Edge Function (não tem /api no Lovable)
    if (hostname.includes('lovable.app')) {
        console.log('🌐 [PROXY] Ambiente: Lovable Published - usando Supabase Edge Function');
        return false;
    }
    
    // Vercel production - usa Vercel Serverless
    if (hostname.includes('vercel.app')) {
        console.log('🌐 [PROXY] Ambiente: Vercel Production');
        return true;
    }
    
    // Localhost - usar proxy local
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        console.log('🌐 [PROXY] Ambiente: Localhost');
        return true;
    }
    
    // Custom domain - provavelmente Vercel, usar Vercel proxy
    console.log('🌐 [PROXY] Ambiente: Custom domain -', hostname);
    return true;
};

export const BASEROW_PROXY_CONFIG = {
    // Supabase Edge Function
    SUPABASE_PROXY_URL: SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/baserow-proxy` : null,
    
    // Vercel Serverless Function / Local proxy
    VERCEL_PROXY_URL: '/api/baserow-proxy',

    // URL ativa - depende do ambiente
    get ACTIVE_PROXY_URL() {
        if (shouldUseVercelProxy()) {
            console.log('🌐 [PROXY] Usando Vercel/Local Proxy:', this.VERCEL_PROXY_URL);
            return this.VERCEL_PROXY_URL;
        }
        
        if (this.SUPABASE_PROXY_URL) {
            console.log('🌐 [PROXY] Usando Supabase Edge Function:', this.SUPABASE_PROXY_URL);
            return this.SUPABASE_PROXY_URL;
        }
        
        console.log('🌐 [PROXY] Fallback para Vercel Proxy:', this.VERCEL_PROXY_URL);
        return this.VERCEL_PROXY_URL;
    },

    // Verifica se está usando Supabase
    isUsingSupabase() {
        return !shouldUseVercelProxy() && !!this.SUPABASE_PROXY_URL;
    },

    // Ambiente
    getEnvironment() {
        if (typeof window === 'undefined') return 'ssr';
        const hostname = window.location.hostname;
        if (hostname.includes('lovableproject.com')) return 'lovable-preview';
        if (hostname.includes('lovable.app')) return 'lovable-published';
        if (hostname.includes('vercel.app')) return 'vercel-production';
        if (hostname === 'localhost') return 'development';
        return 'custom-domain';
    }
};

export default BASEROW_PROXY_CONFIG;
