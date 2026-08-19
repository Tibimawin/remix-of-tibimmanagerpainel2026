import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

// Bridge entre Vercel e Cloudflare Workers.
// Este serviço garante que o tráfego passe pela Cloudflare sem interrupções.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range, user-agent",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const id = url.searchParams.get("id");
    
    // O Worker da Cloudflare configurado
    const CLOUDFLARE_WORKER_URL = "https://withered-disk-c78d.tibimfotografo.workers.dev";
    
    // O Worker espera /api/s/:token/:id
    let targetUrl = `${CLOUDFLARE_WORKER_URL}/api/s/${token}/${id}${url.search}`;
    
    if (!token || !id) {
      const pathname = url.pathname.replace("/functions/v1/cloak-stream", "");
      targetUrl = `${CLOUDFLARE_WORKER_URL}${pathname}${url.search}`;
    }
    
    console.log(`[CLOAK-BRIDGE] Fetching from Cloudflare: ${targetUrl}`);
    
    // Filtramos headers sensíveis que podem causar erro no fetch do Deno
    const safeHeaders = new Headers();
    const forbiddenHeaders = ['host', 'content-length', 'connection', 'upgrade'];
    
    for (const [key, value] of req.headers.entries()) {
      if (!forbiddenHeaders.includes(key.toLowerCase())) {
        safeHeaders.set(key, value);
      }
    }

    // Encaminha a requisição
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: safeHeaders,
      redirect: "follow",
    });

    // Criamos uma nova resposta mantendo o stream aberto
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    
    // O VLC precisa ter certeza que o servidor aceita ranges
    if (!responseHeaders.has("accept-ranges")) {
      responseHeaders.set("accept-ranges", "bytes");
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });

  } catch (err) {
    console.error("[CLOAK-BRIDGE] Error:", err);
    return new Response(`Erro de conexão bridge: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});