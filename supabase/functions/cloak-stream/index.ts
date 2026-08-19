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
      console.error("[CLOAK] Parâmetros ausentes:", { token, id });
      return new Response("Token e ID são obrigatórios", { status: 400, headers: corsHeaders });
    }

    console.log(`[CLOAK] Validando: token=${token}, id=${id}`);

    // 1. Validar Usuário
    const { data: user, error: userError } = await supabase
      .from("cloak_users")
      .select("firebase_uid, blocked, expires_at")
      .eq("public_token", token)
      .maybeSingle();

    if (userError || !user) {
      console.error("[CLOAK] Usuário não encontrado ou erro:", userError);
      return new Response("Token inválido", { status: 403, headers: corsHeaders });
    }

    if (user.blocked) return new Response("Usuário bloqueado", { status: 403, headers: corsHeaders });
    if (user.expires_at && new Date(user.expires_at) < new Date()) {
      return new Response("Assinatura expirada", { status: 403, headers: corsHeaders });
    }

    // 2. Validar Link
    const { data: link, error: linkError } = await supabase
      .from("cloaked_links")
      .select("original_url, active")
      .eq("short_id", id)
      .eq("owner_uid", user.firebase_uid)
      .maybeSingle();

    if (linkError || !link) {
      console.error("[CLOAK] Link não encontrado:", linkError);
      return new Response("Link não encontrado", { status: 404, headers: corsHeaders });
    }

    if (!link.active) return new Response("Link desativado", { status: 403, headers: corsHeaders });

    // 3. Encaminhar para o Worker da Cloudflare (Proxy de Streaming)
    const CLOUDFLARE_WORKER_URL = "https://withered-disk-c78d.tibimfotografo.workers.dev";
    
    // O Worker da Cloudflare agora recebe a URL real codificada para fazer o fetch
    const targetUrl = new URL(CLOUDFLARE_WORKER_URL);
    targetUrl.searchParams.set("u", link.original_url);
    
    // Repassa headers de streaming (Range)
    const headers = new Headers();
    if (req.headers.has("range")) headers.set("range", req.headers.get("range")!);
    headers.set("user-agent", req.headers.get("user-agent") || "Mozilla/5.0 (VLC/3.0.0; LibVLC/3.0.0)");

    console.log(`[CLOAK] Streaming via Cloudflare: ${link.original_url}`);

    const upstream = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: headers,
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    if (!responseHeaders.has("accept-ranges")) responseHeaders.set("accept-ranges", "bytes");

    // Registrar log de acesso de forma assíncrona
    void supabase.from("cloak_access_logs").insert({
      link_short_id: id,
      owner_uid: user.firebase_uid,
      status: "ok",
      ip: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for"),
      bytes_served: Number(upstream.headers.get("content-length") || 0)
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });

  } catch (err) {
    console.error("[CLOAK] Erro crítico:", err);
    return new Response(`Erro: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});