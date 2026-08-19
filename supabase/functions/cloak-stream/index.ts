import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

// Proxy de streaming dos links camuflados.
// Migrado para Cloudflare Workers para redução de custos e latência.

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
    const pathname = url.pathname.replace("/functions/v1/cloak-stream", "");
    
    // O Worker da Cloudflare configurado pelo usuário
    const CLOUDFLARE_WORKER_URL = "https://withered-disk-c78d.tibimfotografo.workers.dev";
    
    // Constrói a URL final do Cloudflare
    const targetUrl = `${CLOUDFLARE_WORKER_URL}${pathname}${url.search}`;
    
    console.log(`[CLOAK-STREAM] Proxying to Cloudflare: ${targetUrl}`);
    
    // Buscamos o recurso da Cloudflare com os headers originais (Range, etc)
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: req.headers,
      redirect: "follow",
    });

    // Repassamos a resposta da Cloudflare de volta para a Vercel
    const responseHeaders = new Headers(upstream.headers);
    // Adicionamos CORS para garantir acesso
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });

  } catch (err) {
    console.error("[CLOAK-STREAM] Error:", err);
    return new Response(`Erro de proxy: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});
