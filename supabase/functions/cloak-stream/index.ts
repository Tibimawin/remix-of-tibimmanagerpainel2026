import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range, user-agent",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const id = url.searchParams.get("id");
    
    if (!token || !id) {
      return new Response("Parâmetros inválidos", { status: 400, headers: corsHeaders });
    }

    const { data: link, error } = await supabase.rpc('get_cloaked_link_validated', { 
      p_token: token, 
      p_short_id: id 
    });

    if (error || !link || link.error || !link.original_url) {
      return new Response(link?.error || "Acesso negado", { status: 403, headers: corsHeaders });
    }

    // TENTATIVA DE TÚNEL DIRETO (Sem Cloudflare Worker intermediário para testar)
    console.log(`[CLOAK-STREAM] Tentando túnel direto para: ${link.original_url}`);

    const headers = new Headers();
    if (req.headers.has("range")) headers.set("range", req.headers.get("range")!);
    headers.set("user-agent", req.headers.get("user-agent") || "Mozilla/5.0 (VLC/3.0.0; LibVLC/3.0.0)");

    // Adicionamos um timeout curto para não travar a função
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const upstream = await fetch(link.original_url, {
        method: "GET",
        headers: headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const resHeaders = new Headers(upstream.headers);
      resHeaders.set("Access-Control-Allow-Origin", "*");
      if (!resHeaders.has("accept-ranges")) resHeaders.set("accept-ranges", "bytes");

      return new Response(upstream.body, {
        status: upstream.status,
        headers: resHeaders
      });
    } catch (fetchErr) {
      console.error("[CLOAK-STREAM] Falha no túnel direto, tentando via Cloudflare Worker...");
      
      const CLOUDFLARE_WORKER_URL = "https://withered-disk-c78d.tibimfotografo.workers.dev";
      const targetUrl = `${CLOUDFLARE_WORKER_URL}?u=${encodeURIComponent(link.original_url)}`;
      
      const cfResponse = await fetch(targetUrl, {
        method: "GET",
        headers: headers,
      });
      
      const resHeaders = new Headers(cfResponse.headers);
      resHeaders.set("Access-Control-Allow-Origin", "*");
      return new Response(cfResponse.body, {
        status: cfResponse.status,
        headers: resHeaders
      });
    }

  } catch (err) {
    return new Response(`Erro interno: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});