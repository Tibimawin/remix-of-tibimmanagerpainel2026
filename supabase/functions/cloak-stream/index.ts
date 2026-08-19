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
  // CORS Preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const id = url.searchParams.get("id");
    
    if (!token || !id) {
      return new Response("Parâmetros inválidos", { status: 400, headers: corsHeaders });
    }

    // Validação ultra-rápida no banco
    const { data: link, error } = await supabase.rpc('get_cloaked_link_validated', { 
      p_token: token, 
      p_short_id: id 
    });

    if (error || !link || link.error || !link.original_url) {
      return new Response(link?.error || "Acesso negado", { status: 403, headers: corsHeaders });
    }

    // Redirecionamento para a Cloudflare (Modo Tunelamento no Worker)
    // Usamos o Worker como o responsável final pelo streaming para economizar recursos do backend
    const CLOUDFLARE_WORKER_URL = "https://withered-disk-c78d.tibimfotografo.workers.dev";
    const targetUrl = `${CLOUDFLARE_WORKER_URL}?u=${encodeURIComponent(link.original_url)}`;

    console.log(`[CLOAK-STREAM] Delegando streaming para Cloudflare Worker: ${targetUrl}`);

    // Em vez de tunelar o tráfego pesado pelo Deno (que tem limites), 
    // nós redirecionamos o proxy da Vercel para o Worker da Cloudflare.
    // O proxy da Vercel seguirá o redirecionamento e fará o túnel final.
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": targetUrl
      }
    });

  } catch (err) {
    console.error("[CLOAK-STREAM] Erro fatal:", err);
    return new Response(`Erro interno: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});