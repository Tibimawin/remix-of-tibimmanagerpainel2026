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

async function isAdmin(idToken?: string): Promise<boolean> {
  if (!idToken) return false;
  const apiKey = Deno.env.get("FIREBASE_API_KEY");
  if (!apiKey) return false;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) return false;
    const data = await res.json();
    const email = data?.users?.[0]?.email?.toLowerCase?.();
    return !!email && ADMIN_EMAILS.includes(email);
  } catch {
    return false;
  }
}

function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const idToken: string | undefined = body.idToken;

    // ---------- Ações públicas (usuário logado do app) ----------

    if (action === "sync-user") {
      const uid = String(body.firebase_uid || "");
      if (!uid) return json({ error: "firebase_uid obrigatório" }, 400);

      const { data: existing } = await supabase
        .from("cloak_users")
        .select("public_token")
        .eq("firebase_uid", uid)
        .maybeSingle();

      const payload: Record<string, unknown> = {
        firebase_uid: uid,
        email: body.email ?? null,
        name: body.name ?? null,
        expires_at: body.expires_at ?? null,
        last_seen_at: new Date().toISOString(),
        public_token: existing?.public_token ?? randomToken(),
      };
      if (typeof body.blocked === "boolean") payload.blocked = body.blocked;

      const { data, error } = await supabase
        .from("cloak_users")
        .upsert(payload, { onConflict: "firebase_uid" })
        .select("public_token, expires_at, blocked")
        .single();

      if (error) return json({ error: error.message }, 500);
      return json({ token: data.public_token, expires_at: data.expires_at, blocked: data.blocked });
    }

    if (action === "register-links") {
      const links = Array.isArray(body.links) ? body.links : [];
      if (links.length === 0) return json({ ok: true, count: 0 });

      const rows = links
        .filter((l: any) => l?.short_id && l?.owner_uid && l?.original_url)
        .map((l: any) => ({
          short_id: String(l.short_id),
          owner_uid: String(l.owner_uid),
          original_url: String(l.original_url),
          content_name: l.content_name ? String(l.content_name) : null,
          source: l.source ? String(l.source) : "miniseries",
          kind: l.kind ? String(l.kind) : "episode",
          active: true,
        }));

      const { error } = await supabase
        .from("cloaked_links")
        .upsert(rows, { onConflict: "short_id" });

      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, count: rows.length });
    }

    // ---------- Ações administrativas ----------

    if (action.startsWith("admin-")) {
      if (!(await isAdmin(idToken))) return json({ error: "Não autorizado" }, 401);
    }

    if (action === "admin-overview") {
      const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [links, activeLinks, users, logs7, logsToday] = await Promise.all([
        supabase.from("cloaked_links").select("id", { count: "exact", head: true }),
        supabase.from("cloaked_links").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("cloak_users").select("id", { count: "exact", head: true }),
        supabase.from("cloak_access_logs").select("bytes_served, created_at, status").gte("created_at", since7),
        supabase.from("cloak_access_logs").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      ]);

      const rows = logs7.data || [];
      const bytes7 = rows.reduce((s: number, r: any) => s + Number(r.bytes_served || 0), 0);
      const blocked7 = rows.filter((r: any) => r.status !== "ok").length;

      const byDay: Record<string, number> = {};
      for (const r of rows) {
        const d = String(r.created_at).slice(0, 10);
        byDay[d] = (byDay[d] || 0) + 1;
      }

      return json({
        totalLinks: links.count || 0,
        activeLinks: activeLinks.count || 0,
        totalUsers: users.count || 0,
        accesses7d: rows.length,
        accessesToday: logsToday.count || 0,
        bytes7d: bytes7,
        blocked7d: blocked7,
        byDay: Object.entries(byDay).sort().map(([day, count]) => ({ day, count })),
      });
    }

    if (action === "admin-users") {
      const { data, error } = await supabase
        .from("cloak_users")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) return json({ error: error.message }, 500);

      const uids = (data || []).map((u: any) => u.firebase_uid);
      const { data: linkRows } = await supabase
        .from("cloaked_links")
        .select("owner_uid, access_count, bytes_served, last_access_at")
        .in("owner_uid", uids.length ? uids : ["__none__"]);

      const stats: Record<string, { links: number; accesses: number; bytes: number; last: string | null }> = {};
      for (const l of linkRows || []) {
        const s = stats[l.owner_uid] ||= { links: 0, accesses: 0, bytes: 0, last: null };
        s.links += 1;
        s.accesses += Number(l.access_count || 0);
        s.bytes += Number(l.bytes_served || 0);
        if (l.last_access_at && (!s.last || l.last_access_at > s.last)) s.last = l.last_access_at;
      }

      return json({
        users: (data || []).map((u: any) => ({ ...u, stats: stats[u.firebase_uid] || { links: 0, accesses: 0, bytes: 0, last: null } })),
      });
    }

    if (action === "admin-links") {
      const search = String(body.search || "").trim();
      let q = supabase.from("cloaked_links").select("*").order("created_at", { ascending: false }).limit(300);
      if (search) q = q.or(`content_name.ilike.%${search}%,original_url.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ links: data || [] });
    }

    if (action === "admin-logs") {
      const { data, error } = await supabase
        .from("cloak_access_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return json({ error: error.message }, 500);
      return json({ logs: data || [] });
    }

    if (action === "admin-toggle-user") {
      const { error } = await supabase
        .from("cloak_users")
        .update({ blocked: !!body.blocked })
        .eq("firebase_uid", String(body.firebase_uid));
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "admin-rotate-token") {
      const { data, error } = await supabase
        .from("cloak_users")
        .update({ public_token: randomToken() })
        .eq("firebase_uid", String(body.firebase_uid))
        .select("public_token")
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ token: data.public_token });
    }

    if (action === "admin-toggle-link") {
      const { error } = await supabase
        .from("cloaked_links")
        .update({ active: !!body.active })
        .eq("short_id", String(body.short_id));
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (err) {
    return json({ error: "Erro interno", details: String(err) }, 500);
  }
});
