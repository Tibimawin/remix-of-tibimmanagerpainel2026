import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

// Proxy de streaming dos links camuflados.
// Chamado pelo domínio público (Vercel) em /api/s/<token>/<shortId>.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
};

// Quando true, os links camuflados apenas redirecionam para a URL original
// (sem consumir banda de streaming).
const REDIRECT_MODE = true;

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SERVICE_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

async function log(entry: Record<string, unknown>) {
  try {
    await supabase.from("cloak_access_logs").insert(entry);
  } catch { /* nunca quebrar o streaming por causa de log */ }
}

const deny = (msg: string, status: number) =>
  new Response(msg, { status, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const id = url.searchParams.get("id");
    const u = url.searchParams.get("u");
    const sig = url.searchParams.get("sig");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || null;
    const userAgent = req.headers.get("user-agent") || null;

    if (!token || !id) return deny("Requisição inválida", 400);

    const { data: user } = await supabase
      .from("cloak_users")
      .select("firebase_uid, expires_at, blocked, features")
      .eq("public_token", token)
      .maybeSingle();

    if (!user) {
      await log({ link_short_id: id, status: "invalid_token", ip, user_agent: userAgent });
      return deny("Acesso inválido", 403);
    }
    if (user.blocked) {
      await log({ link_short_id: id, owner_uid: user.firebase_uid, status: "blocked", ip, user_agent: userAgent });
      return deny("Acesso bloqueado", 403);
    }
    if (!user.expires_at || new Date(user.expires_at) < new Date()) {
      await log({ link_short_id: id, owner_uid: user.firebase_uid, status: "expired", ip, user_agent: userAgent });
      return deny("Assinatura expirada", 403);
    }

    const { data: link } = await supabase
      .from("cloaked_links")
      .select("original_url, owner_uid, active, access_count, bytes_served, source")
      .eq("short_id", id)
      .maybeSingle();

    if (!link || !link.active) {
      await log({ link_short_id: id, owner_uid: user.firebase_uid, status: "not_found", ip, user_agent: userAgent });
      return deny("Conteúdo indisponível", 404);
    }
    if (link.owner_uid !== user.firebase_uid) {
      await log({ link_short_id: id, owner_uid: user.firebase_uid, status: "forbidden", ip, user_agent: userAgent });
      return deny("Acesso negado", 403);
    }

    // Permissão da funcionalidade no plano do usuário (ex.: minisséries)
    const FEATURE_BY_SOURCE: Record<string, string> = {
      miniseries: "miniseries",
      "canais-tv": "importar-canais-tv",
    };
    const requiredFeature = FEATURE_BY_SOURCE[link.source as string] ?? null;
    const features: string[] = Array.isArray(user.features) ? user.features : [];
    if (requiredFeature && !features.includes(requiredFeature)) {
      await log({ link_short_id: id, owner_uid: user.firebase_uid, status: "feature_denied", ip, user_agent: userAgent });
      return deny("Funcionalidade não disponível no seu plano", 403);
    }

    let target = link.original_url as string;
    if (u) {
      if (!sig || (await sign(u)) !== sig) return deny("Assinatura inválida", 403);
      target = atob(u.replace(/-/g, "+").replace(/_/g, "/"));
    }

    // 🔁 Modo redirecionamento: não fazemos streaming (economiza banda da Vercel
    // e do backend) — apenas devolvemos um 302 para o link original.
    if (REDIRECT_MODE) {
      void Promise.all([
        supabase.from("cloaked_links").update({
          access_count: Number(link.access_count || 0) + 1,
          last_access_at: new Date().toISOString(),
        }).eq("short_id", id),
        log({ link_short_id: id, owner_uid: user.firebase_uid, status: "redirect", ip, user_agent: userAgent, bytes_served: 0 }),
      ]);
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: target, "Cache-Control": "no-store" },
      });
    }



    const range = req.headers.get("range");
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": userAgent || "Mozilla/5.0",
        ...(range ? { Range: range } : {}),
      },
      redirect: "follow",
    });

    if (!upstream.ok && upstream.status !== 206) {
      await log({ link_short_id: id, owner_uid: user.firebase_uid, status: `upstream_${upstream.status}`, ip, user_agent: userAgent });
      return deny("Erro ao acessar o conteúdo", upstream.status);
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const isPlaylist = /mpegurl/i.test(contentType) || /\.m3u8(\?|$)/i.test(target);

    const bump = async (bytes: number) => {
      await Promise.all([
        supabase.from("cloaked_links").update({
          access_count: Number(link.access_count || 0) + 1,
          bytes_served: Number(link.bytes_served || 0) + bytes,
          last_access_at: new Date().toISOString(),
        }).eq("short_id", id),
        log({ link_short_id: id, owner_uid: user.firebase_uid, status: "ok", ip, user_agent: userAgent, bytes_served: bytes }),
      ]);
    };

    if (isPlaylist) {
      const text = await upstream.text();
      const base = new URL(target);
      const lines = text.split("\n");
      const out: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) { out.push(line); continue; }
        const abs = new URL(trimmed, base).toString();
        const encoded = btoa(abs).replace(/\+/g, "-").replace(/\//g, "_");
        out.push(`/api/s/${token}/${id}?u=${encodeURIComponent(encoded)}&sig=${await sign(encoded)}`);
      }
      const body = out.join("\n");
      await bump(new TextEncoder().encode(body).length);
      return new Response(body, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" },
      });
    }

    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", contentType);
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    const cr = upstream.headers.get("content-range");
    if (cr) headers.set("Content-Range", cr);
    headers.set("Accept-Ranges", "bytes");

    void bump(Number(len || 0));

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    return new Response(`Erro interno: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});
