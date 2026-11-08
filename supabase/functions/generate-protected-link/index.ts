import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple HMAC-SHA256 JWT implementation for Deno
async function createJWT(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();

  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${data}.${sigB64}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, channelName, expiresInDays } = await req.json();

    if (!url || !channelName) {
      return new Response(
        JSON.stringify({ error: "url e channelName são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const now = Math.floor(Date.now() / 1000);
    const days = expiresInDays || 30;
    const exp = now + days * 24 * 60 * 60;

    const token = await createJWT({ url, exp, iat: now }, serviceRoleKey);

    const protectedUrl = `${supabaseUrl}/functions/v1/video-proxy?token=${token}`;

    // Salvar no banco usando service role (bypassa RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const expiresAt = new Date(exp * 1000).toISOString();

    const { error: dbError } = await supabase.from("protected_channels").insert({
      channel_name: channelName,
      original_url: url,
      token,
      protected_url: protectedUrl,
      expires_at: expiresAt,
    });

    if (dbError) {
      return new Response(
        JSON.stringify({ error: "Erro ao salvar no banco", details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ token, protectedUrl, expiresAt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
