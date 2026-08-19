import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

// Proxy de streaming dos links camuflados.
// Migrado para Cloudflare Workers para redução de custos e latência.
// Este ponto de entrada agora redireciona para o Worker da Cloudflare.


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
};

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
    const pathname = url.pathname.replace("/functions/v1/cloak-stream", "");
    
    // O Worker da Cloudflare configurado pelo usuário
    const CLOUDFLARE_WORKER_URL = "https://withered-disk-c78d.tibimfotografo.workers.dev";
    
    // Redireciona a requisição para o Worker da Cloudflare mantendo o path e query
    const targetUrl = `${CLOUDFLARE_WORKER_URL}${pathname}${url.search}`;
    
    console.log(`[CLOAK-STREAM] Redirecting to Cloudflare: ${targetUrl}`);
    
    // Adicionamos cabeçalhos CORS explicitamente no redirecionamento
    return new Response(null, {
      status: 307,
      headers: {
        ...corsHeaders,
        "Location": targetUrl,
      }
    });
  } catch (err) {
    return new Response(`Erro de redirecionamento: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});
