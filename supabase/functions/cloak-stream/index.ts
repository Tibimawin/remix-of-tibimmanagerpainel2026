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

    // Validação ultra-rápida no banco via RPC
    const { data: link, error } = await supabase.rpc('get_cloaked_link_validated', { 
      p_token: token, 
      p_short_id: id 
    });

    if (error) {
      console.error("[CLOAK-STREAM] Erro no RPC:", error);
      return new Response(`Erro de validação: ${error.message}`, { status: 500, headers: corsHeaders });
    }

    if (!link || link.error || !link.original_url) {
      console.error("[CLOAK-STREAM] Acesso negado:", link?.error || "Link não encontrado");
      return new Response(link?.error || "Acesso negado ou link inválido", { status: 403, headers: corsHeaders });
    }

    const CLOUDFLARE_WORKER_URL = "https://withered-disk-c78d.tibimfotografo.workers.dev";
    const targetUrl = `${CLOUDFLARE_WORKER_URL}?u=${encodeURIComponent(link.original_url)}`;

    console.log(`[CLOAK-STREAM] Tunelando para Cloudflare: ${targetUrl}`);

    const headers = new Headers();
    if (req.headers.has("range")) headers.set("range", req.headers.get("range")!);
    
    // Imitar o player para evitar bloqueios do servidor de origem
    const userAgent = req.headers.get("user-agent") || "Mozilla/5.0 (VLC/3.0.0; LibVLC/3.0.0)";
    headers.set("user-agent", userAgent);

    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: headers,
    });

    // Clonamos os headers da resposta e adicionamos CORS
    const resHeaders = new Headers(upstream.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");
    
    // Essencial para o VLC: garantir que accept-ranges esteja presente
    if (!resHeaders.has("accept-ranges")) {
      resHeaders.set("accept-ranges", "bytes");
    }

    // Registrar log de acesso de forma assíncrona (sem travar a resposta)
    if (link.owner_uid) {
      void supabase.from("cloak_access_logs").insert({
        link_short_id: id,
        owner_uid: link.owner_uid,
        status: "ok",
        ip: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for"),
        bytes_served: Number(upstream.headers.get("content-length") || 0)
      }).then(({ error }) => {
        if (error) console.error("[CLOAK-STREAM] Erro ao gravar log:", error);
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: resHeaders
    });

  } catch (err) {
    console.error("[CLOAK-STREAM] Erro fatal:", err);
    return new Response(`Erro interno: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});