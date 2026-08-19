import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

// Bridge entre Vercel e Cloudflare Workers.
// Versão simplificada para evitar erros 503/400.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range, user-agent",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const id = url.searchParams.get("id");
    
    const CLOUDFLARE_WORKER_URL = "https://withered-disk-c78d.tibimfotografo.workers.dev";
    
    // O Worker espera /api/s/:token/:id
    const targetUrl = `${CLOUDFLARE_WORKER_URL}/api/s/${token}/${id}${url.search}`;
    
    console.log(`[CLOAK-BRIDGE] Fetching: ${targetUrl}`);
    
    const headers = new Headers();
    if (req.headers.has("range")) headers.set("range", req.headers.get("range")!);
    headers.set("user-agent", req.headers.get("user-agent") || "Mozilla/5.0 (VLC/3.0.0; LibVLC/3.0.0)");

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      redirect: "follow",
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    if (!responseHeaders.has("accept-ranges")) responseHeaders.set("accept-ranges", "bytes");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });

  } catch (err) {
    console.error("[CLOAK-BRIDGE] Error:", err);
    return new Response(`Erro: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});