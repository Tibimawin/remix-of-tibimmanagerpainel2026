import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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

    console.log(`[CLOAK-STREAM] Validando Token: ${token}, ID: ${id}`);

    const { data: link, error: rpcError } = await supabase.rpc('get_cloaked_link_validated', { 
      p_token: token, 
      p_short_id: id 
    });

    if (rpcError || !link || link.error || !link.original_url) {
      console.error(`[CLOAK-STREAM] Falha na validação:`, rpcError || link?.error);
      return new Response(link?.error || "Acesso negado", { status: 403, headers: corsHeaders });
    }

    // A URL final da Cloudflare
    const CLOUDFLARE_WORKER_URL = "https://withered-disk-c78d.tibimfotografo.workers.dev";
    
    // Lista de agentes conhecidos que devem ser aceitos para evitar bloqueio 1003
    const isVLC = req.headers.get("user-agent")?.includes("VLC");
    const safeUserAgent = isVLC 
      ? req.headers.get("user-agent") 
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

    
    // Construímos a URL do Worker COM a URL original do vídeo
    const workerUrl = new URL(CLOUDFLARE_WORKER_URL);
    workerUrl.searchParams.set("u", link.original_url);

    console.log(`[CLOAK-STREAM] Redirecionando Túnel para Worker: ${workerUrl.toString()}`);

    // Preparamos os cabeçalhos para o Worker
    const upstreamHeaders = new Headers();
    if (req.headers.has("range")) upstreamHeaders.set("range", req.headers.get("range")!);
    
    // O SEGREDO: Simular um player real para evitar bloqueios da Cloudflare ou do servidor de origem
    upstreamHeaders.set("user-agent", req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
    upstreamHeaders.set("accept", "*/*");
    upstreamHeaders.set("connection", "keep-alive");

    const upstream = await fetch(workerUrl.toString(), {
      method: "GET",
      headers: upstreamHeaders
    });

    console.log(`[CLOAK-STREAM] Resposta do Worker: Status ${upstream.status}`);

    const resHeaders = new Headers(upstream.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
    
    // Garante que o player saiba que aceitamos ranges para streaming
    if (!resHeaders.has("accept-ranges")) resHeaders.set("accept-ranges", "bytes");

    // Retorna o stream diretamente
    return new Response(upstream.body, {
      status: upstream.status,
      headers: resHeaders
    });

  } catch (err) {
    console.error("[CLOAK-STREAM] Erro fatal:", err);
    return new Response(`Erro interno: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});