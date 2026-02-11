// asaas-proxy v4
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ASAAS_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ASAAS_API_KEY not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const action = body.action;
    const data = body.data;

    const baseUrl = 'https://api.asaas.com/v3';
    let endpoint = '';
    let method = 'GET';
    let reqBody: string | null = null;

    if (action === 'createCustomer') {
      endpoint = '/customers';
      method = 'POST';
      reqBody = JSON.stringify(data);
    } else if (action === 'createPayment') {
      endpoint = '/payments';
      method = 'POST';
      reqBody = JSON.stringify(data);
    } else if (action === 'getPayment') {
      endpoint = '/payments/' + data.paymentId;
    } else if (action === 'getPixQrCode') {
      endpoint = '/payments/' + data.paymentId + '/pixQrCode';
    } else if (action === 'listPayments') {
      const p = new URLSearchParams();
      if (data && data.customer) p.set('customer', data.customer);
      if (data && data.status) p.set('status', data.status);
      if (data && data.externalReference) p.set('externalReference', data.externalReference);
      endpoint = '/payments?' + p.toString();
    } else if (action === 'getBalance') {
      endpoint = '/finance/balance';
    } else if (action === 'createSubscription') {
      endpoint = '/subscriptions';
      method = 'POST';
      reqBody = JSON.stringify(data);
    } else if (action === 'listSubscriptions') {
      const sp = new URLSearchParams();
      if (data && data.customer) sp.set('customer', data.customer);
      endpoint = '/subscriptions?' + sp.toString();
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action: ' + action }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const opts: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
    };
    if (reqBody && method !== 'GET') {
      opts.body = reqBody;
    }

    const res = await fetch(baseUrl + endpoint, opts);
    const resData = await res.json();

    return new Response(JSON.stringify(resData), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
