const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function verifyJWT(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  try {
    const encoder = new TextEncoder();
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const data = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Decode signature
    const sigStr = atob(sigB64.replace(/-/g, "+").replace(/_/g, "/"));
    const sigArr = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) {
      sigArr[i] = sigStr.charCodeAt(i);
    }

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigArr,
      encoder.encode(data)
    );

    if (!valid) return null;

    // Decode payload
    const payloadStr = atob(
      payloadB64.replace(/-/g, "+").replace(/_/g, "/")
    );
    const payload = JSON.parse(payloadStr);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Token ausente", { status: 400, headers: corsHeaders });
    }

    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const payload = await verifyJWT(token, secret);

    if (!payload || !payload.url) {
      return new Response("Token inválido ou expirado", {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Proxy the original URL content
    const originalUrl = payload.url as string;
    const response = await fetch(originalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VideoProxy/1.0)",
      },
    });

    if (!response.ok) {
      return new Response(`Erro ao acessar recurso: ${response.status}`, {
        status: response.status,
        headers: corsHeaders,
      });
    }

    // Stream the response
    const headers = new Headers(corsHeaders);
    const contentType = response.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    const contentLength = response.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(response.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    return new Response(`Erro interno: ${String(err)}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
