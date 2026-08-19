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
    
    console.log(`[CLOAK-STREAM] Chamada iniciada. token: ${token}, id: ${id}`);
    
    if (!token || !id) {
      return new Response("Parâmetros inválidos", { status: 400, headers: corsHeaders });
    }

    // Validação ultra-rápida no banco
    const { data: link, error } = await supabase
      .rpc('get_cloaked_link_validated', { p_token: token, p_short_id: id });

    if (error || !link || !link.original_url) {
      console.error("[CLOAK-STREAM] Validação falhou:", error || "Link não encontrado");
      return new Response("Acesso negado ou link inválido", { status: 403, headers: corsHeaders });
    }

    const CLOUDFLARE_WORKER_URL = "https://withered-disk-c78d.tibimfotografo.workers.dev";
    const targetUrl = `${CLOUDFLARE_WORKER_URL}?u=${encodeURIComponent(link.original_url)}`;

    console.log(`[CLOAK-STREAM] Redirecionando/Tunelando para: ${targetUrl}`);

    // Em vez de tunnel no Deno (que pode dar timeout), vamos tentar o redirect CORS-friendly
    // ou se o usuário realmente quiser túnel, faremos o tunnel na Cloudflare.
    // Para o VLC, o túnel na Cloudflare é o melhor.
    
    const headers = new Headers();
    if (req.headers.has("range")) headers.set("range", req.headers.get("range")!);
    headers.set("user-agent", req.headers.get("user-agent") || "Mozilla/5.0 (VLC/3.0.0; LibVLC/3.0.0)");

    // Fazemos o fetch para a Cloudflare. A Cloudflare DEVE responder rápido.
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: headers,
    });

    const resHeaders = new Headers(upstream.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");
    
    return new Response(upstream.body, {
      status: upstream.status,
      headers: resHeaders
    });

  } catch (err) {
    console.error("[CLOAK-STREAM] Erro fatal:", err);
    return new Response(`Erro interno: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});