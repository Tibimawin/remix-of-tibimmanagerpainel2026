/**
 * Cloudflare Worker - Tunnel Proxy de Streaming
 * 
 * Este worker recebe uma URL no parâmetro 'u' e faz o fetch transparente
 * dos dados, repassando headers de Range (essencial para VLC).
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("u");

    if (!targetUrl) {
      // Suporte legado ou rotas diretas /api/s/...
      // Se não houver 'u', o worker pode tentar extrair do path se necessário,
      // mas o design novo prefere receber a URL validada do backend.
      return new Response("URL original 'u' é obrigatória no Worker", { 
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    try {
      const headers = new Headers(request.headers);
      
      // Removemos headers que podem causar conflito na Cloudflare
      headers.delete("host");
      headers.delete("cf-connecting-ip");
      headers.delete("cf-ray");
      headers.delete("cf-visitor");
      headers.delete("x-forwarded-for");
      headers.delete("x-real-ip");

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        redirect: "follow",
      });

      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
      
      // Garante que o player saiba que pode fazer busca (seek)
      if (!newHeaders.has("accept-ranges")) {
        newHeaders.set("accept-ranges", "bytes");
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (e) {
      return new Response("Erro no Worker de Streaming: " + e.message, { 
        status: 502,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  },
};
