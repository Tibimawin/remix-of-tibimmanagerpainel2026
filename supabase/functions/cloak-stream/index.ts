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
    
    if (!token || !id) return new Response("Parâmetros inválidos", { status: 400, headers: corsHeaders });

    const { data: link, error } = await supabase.rpc('get_cloaked_link_validated', { 
      p_token: token, 
      p_short_id: id 
    });

    if (error || !link || link.error || !link.original_url) {
      return new Response(link?.error || "Acesso negado", { status: 403, headers: corsHeaders });
    }

    // A URL final da Cloudflare
    const CLOUDFLARE_WORKER_URL = "https://withered-disk-c78d.tibimfotografo.workers.dev";
    
    // Construímos a URL do Worker COM a URL original do vídeo
    const workerUrl = new URL(CLOUDFLARE_WORKER_URL);
    workerUrl.searchParams.set("u", link.original_url);

    console.log(`[CLOAK-STREAM] Link validado. Redirecionando para: ${workerUrl.toString()}`);

    // Retornamos 200 e o corpo do vídeo via túnel DIRETO para garantir que não haja 403 de redirecionamento no player
    // Se o player não segue 302 bem, o túnel é mais seguro.
    const headers = new Headers();
    if (req.headers.has("range")) headers.set("range", req.headers.get("range")!);
    headers.set("user-agent", req.headers.get("user-agent") || "Mozilla/5.0 (VLC/3.0.0; LibVLC/3.0.0)");

    const upstream = await fetch(workerUrl.toString(), {
      method: "GET",
      headers: headers
    });

    const resHeaders = new Headers(upstream.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");
    if (!resHeaders.has("accept-ranges")) resHeaders.set("accept-ranges", "bytes");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: resHeaders
    });

  } catch (err) {
    console.error("[CLOAK-STREAM] Erro fatal:", err);
    return new Response(`Erro interno: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});