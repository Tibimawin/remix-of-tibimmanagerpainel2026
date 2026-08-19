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

    // A URL final da Cloudflare que o usuário configurou
    const CLOUDFLARE_WORKER_URL = "https://withered-disk-c78d.tibimfotografo.workers.dev";
    
    // Construímos a URL do Worker. 
    // Passamos o link original 'u' e também um 'token_auth' opcional para o Worker validar se quiser
    const workerUrl = new URL(CLOUDFLARE_WORKER_URL);
    workerUrl.searchParams.set("u", link.original_url);
    workerUrl.searchParams.set("id", id);

    console.log(`[CLOAK-STREAM] Link validado. Redirecionando para Cloudflare: ${workerUrl.toString()}`);

    // Retornamos um 302 para que o streaming ocorra diretamente entre o Player e a Cloudflare,
    // economizando largura de banda da Vercel e do Backend.
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": workerUrl.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });

  } catch (err) {
    console.error("[CLOAK-STREAM] Erro fatal:", err);
    return new Response(`Erro interno: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});