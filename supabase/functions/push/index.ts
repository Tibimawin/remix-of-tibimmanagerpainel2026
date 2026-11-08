// Envio real de notificações push via FCM HTTP v1 (service account)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ADMIN_EMAILS = ["admin@admin.com"];

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---------- Autenticação Firebase ----------

async function verifyFirebaseUser(
  idToken?: string,
): Promise<{ uid: string; email: string | null } | null> {
  if (!idToken) return null;
  const apiKey = Deno.env.get("FIREBASE_API_KEY");
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.users?.[0];
    if (!user?.localId) return null;
    return { uid: user.localId, email: user.email ?? null };
  } catch {
    return null;
  }
}

// ---------- Google OAuth (service account -> access token) ----------

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

const b64url = (input: string | Uint8Array) => {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

function getServiceAccount(): ServiceAccount | null {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.client_email || !parsed?.private_key) return null;
    parsed.private_key = String(parsed.private_key).replace(/\\n/g, "\n");
    return parsed as ServiceAccount;
  } catch {
    return null;
  }
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(unsigned),
    ),
  );
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Falha ao autenticar no Google: ${JSON.stringify(data)}`);
  }
  cachedToken = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return data.access_token;
}

// ---------- Envio FCM ----------

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  link?: string;
  tag?: string;
}

async function sendToTokens(tokens: string[], payload: PushPayload) {
  const sa = getServiceAccount();
  if (!sa) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurado");
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID") || sa.project_id;
  const accessToken = await getAccessToken(sa);

  let sent = 0;
  const invalid: string[] = [];
  const errors: string[] = [];

  for (const token of tokens) {
    const message = {
      message: {
        token,
        notification: { title: payload.title, body: payload.body },
        data: {
          ...(payload.data || {}),
          ...(payload.tag ? { tag: payload.tag } : {}),
          ...(payload.link ? { link: payload.link } : {}),
        },
        webpush: {
          notification: {
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: payload.tag || "painel",
          },
          fcm_options: payload.link ? { link: payload.link } : undefined,
        },
      },
    };

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      },
    );

    if (res.ok) {
      sent++;
    } else {
      const text = await res.text();
      errors.push(`[${res.status}] ${text.slice(0, 300)}`);
      if (res.status === 404 || res.status === 400) invalid.push(token);
    }
  }

  if (invalid.length) {
    await supabase.from("push_tokens").update({ active: false }).in("token", invalid);
  }

  return { sent, total: tokens.length, invalid: invalid.length, errors };
}

async function tokensForUid(uid: string): Promise<string[]> {
  const { data } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("firebase_uid", uid)
    .eq("active", true);
  return (data || []).map((r: any) => r.token);
}

async function dispatch(opts: {
  uid?: string | null;
  broadcast?: boolean;
  type: string;
  payload: PushPayload;
  dedupeKey?: string | null;
}) {
  const { uid, broadcast, type, payload, dedupeKey } = opts;

  if (dedupeKey) {
    const { data: existing } = await supabase
      .from("push_events")
      .select("id")
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    if (existing) return { skipped: true, reason: "already_sent" };
  }

  let tokens: string[] = [];
  if (broadcast) {
    const { data } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("active", true)
      .limit(2000);
    tokens = (data || []).map((r: any) => r.token);
  } else if (uid) {
    tokens = await tokensForUid(uid);
  }

  const { data: evt } = await supabase
    .from("push_events")
    .insert({
      firebase_uid: uid ?? null,
      type,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      tokens_total: tokens.length,
      status: tokens.length ? "sending" : "no_tokens",
      dedupe_key: dedupeKey ?? null,
    })
    .select("id")
    .single();

  if (!tokens.length) return { sent: 0, total: 0, reason: "no_tokens" };

  try {
    const result = await sendToTokens(tokens, payload);
    await supabase
      .from("push_events")
      .update({
        status: result.sent > 0 ? "sent" : "failed",
        tokens_sent: result.sent,
        error: result.errors.length ? result.errors.join(" | ").slice(0, 1000) : null,
      })
      .eq("id", evt?.id);
    return result;
  } catch (err) {
    await supabase
      .from("push_events")
      .update({ status: "failed", error: String(err).slice(0, 1000) })
      .eq("id", evt?.id);
    throw err;
  }
}

// ---------- Handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const idToken: string | undefined = body.idToken;

    if (action === "status") {
      const sa = getServiceAccount();
      const { count } = await supabase
        .from("push_tokens")
        .select("id", { count: "exact", head: true })
        .eq("active", true);
      return json({
        ready: !!sa,
        hasServiceAccount: !!sa,
        hasVapidPublicKey: !!Deno.env.get("FIREBASE_VAPID_PUBLIC_KEY"),
        activeTokens: count || 0,
      });
    }

    if (action === "vapid-key") {
      // Chave pública (Web Push certificate) — pode ser exposta ao cliente
      return json({ key: Deno.env.get("FIREBASE_VAPID_PUBLIC_KEY") || null });
    }

    if (action === "register-token") {
      const user = await verifyFirebaseUser(idToken);
      if (!user) return json({ error: "Não autorizado" }, 401);
      const token = String(body.token || "");
      if (!token) return json({ error: "token obrigatório" }, 400);

      const { error } = await supabase.from("push_tokens").upsert(
        {
          firebase_uid: user.uid,
          token,
          email: user.email,
          user_agent: String(body.user_agent || "").slice(0, 400) || null,
          platform: body.platform ? String(body.platform) : "web",
          active: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "token" },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "unregister-token") {
      const token = String(body.token || "");
      if (!token) return json({ error: "token obrigatório" }, 400);
      await supabase.from("push_tokens").update({ active: false }).eq("token", token);
      return json({ ok: true });
    }

    // ----- Eventos do app (usuário autenticado) -----

    if (action === "notify-payment" || action === "notify-expiration") {
      const user = await verifyFirebaseUser(idToken);
      if (!user) return json({ error: "Não autorizado" }, 401);

      const isPayment = action === "notify-payment";
      const payload: PushPayload = isPayment
        ? {
            title: "✅ Pagamento confirmado",
            body: String(body.message || "Seu pagamento foi confirmado e o acesso foi liberado."),
            link: "/",
            tag: "pagamento",
            data: { type: "payment", ...(body.data || {}) },
          }
        : {
            title: "⏰ Sua assinatura está expirando",
            body: String(body.message || "Renove para continuar com acesso ao painel."),
            link: "/",
            tag: "expiracao",
            data: { type: "expiration", ...(body.data || {}) },
          };

      const result = await dispatch({
        uid: user.uid,
        type: isPayment ? "payment" : "expiration",
        payload,
        dedupeKey: body.dedupeKey ? String(body.dedupeKey) : null,
      });
      return json({ ok: true, ...result });
    }

    // ----- Ações administrativas -----

    if (action.startsWith("admin-")) {
      const user = await verifyFirebaseUser(idToken);
      if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return json({ error: "Não autorizado" }, 401);
      }
    }

    if (action === "admin-send") {
      const payload: PushPayload = {
        title: String(body.title || "Aviso do painel"),
        body: String(body.body || ""),
        link: body.link ? String(body.link) : "/",
        tag: body.tag ? String(body.tag) : "admin",
        data: { type: "admin" },
      };
      const result = await dispatch({
        uid: body.firebase_uid ? String(body.firebase_uid) : null,
        broadcast: !body.firebase_uid,
        type: "admin",
        payload,
      });
      return json({ ok: true, ...result });
    }

    if (action === "admin-events") {
      const { data, error } = await supabase
        .from("push_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return json({ error: error.message }, 500);
      return json({ events: data || [] });
    }

    if (action === "admin-tokens") {
      const { data, error } = await supabase
        .from("push_tokens")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(300);
      if (error) return json({ error: error.message }, 500);
      return json({ tokens: data || [] });
    }

    // ----- Rotina automática de expiração (cron / admin) -----

    if (action === "run-expiration-check" || action === "admin-run-expiration-check") {
      const cronSecret = Deno.env.get("PUSH_CRON_SECRET");
      if (action === "run-expiration-check") {
        if (!cronSecret || String(body.secret || "") !== cronSecret) {
          return json({ error: "Não autorizado" }, 401);
        }
      }

      const now = Date.now();
      const horizon = new Date(now + 3 * 864e5).toISOString();
      const { data: users } = await supabase
        .from("cloak_users")
        .select("firebase_uid, email, expires_at, blocked")
        .not("expires_at", "is", null)
        .lte("expires_at", horizon)
        .limit(1000);

      let notified = 0;
      let skipped = 0;
      for (const u of users || []) {
        const exp = new Date(u.expires_at as string).getTime();
        const diffDays = Math.ceil((exp - now) / 864e5);
        let bucket: string | null = null;
        if (diffDays <= 0) bucket = "expired";
        else if (diffDays <= 1) bucket = "d1";
        else if (diffDays <= 3) bucket = "d3";
        if (!bucket) continue;

        const message = bucket === "expired"
          ? "Seu acesso expirou. Renove agora para voltar a usar o painel e seus links."
          : `Seu acesso expira em ${diffDays} dia${diffDays > 1 ? "s" : ""}. Renove para não perder o acesso.`;

        const result = await dispatch({
          uid: u.firebase_uid,
          type: "expiration",
          payload: {
            title: bucket === "expired" ? "🚫 Acesso expirado" : "⏰ Assinatura expirando",
            body: message,
            link: "/",
            tag: "expiracao",
            data: { type: "expiration", bucket, days: String(diffDays) },
          },
          dedupeKey: `exp:${u.firebase_uid}:${String(u.expires_at).slice(0, 10)}:${bucket}`,
        });
        if ((result as any).skipped) skipped++;
        else if ((result as any).sent > 0) notified++;
      }

      return json({ ok: true, checked: users?.length || 0, notified, skipped });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (err) {
    return json({ error: "Erro interno", details: String(err) }, 500);
  }
});
