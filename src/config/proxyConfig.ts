/**
 * Configuração centralizada do Proxy Baserow
 * 
 * Usa o proxy Vercel (/api/baserow-proxy) que roda como serverless function.
 * Funciona tanto em dev quanto em produção.
 */

export const BASEROW_PROXY_CONFIG = {
    // Proxy Vercel Serverless Function
    PROXY_URL: '/api/baserow-proxy',

    // URL ativa
    get ACTIVE_PROXY_URL() {
        console.log('🌐 [PROXY] Usando Vercel Serverless Function:', this.PROXY_URL);
        return this.PROXY_URL;
    },

    // Helper
    isUsingLocalProxy() {
        return false;
    },

    // Ambiente
    getEnvironment() {
        const isProduction = import.meta.env.PROD ||
            window.location.hostname !== 'localhost';
        return isProduction ? 'production' : 'development';
    }
};

export default BASEROW_PROXY_CONFIG;
