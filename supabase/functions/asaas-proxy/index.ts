const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight - must return 200 with headers
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    if (!ASAAS_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ASAAS_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data } = await req.json();

    const allowedActions = [
      'createCustomer', 'createPayment', 'getPayment',
      'getPixQrCode', 'listPayments', 'getBalance',
      'listSubscriptions', 'createSubscription',
    ];

    if (!allowedActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Ação não permitida: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const asaasHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
    };

    let endpoint = '';
    let method = 'GET';
    let body: string | undefined;

    switch (action) {
      case 'createCustomer':
        endpoint = '/customers';
        method = 'POST';
        body = JSON.stringify(data);
        break;
      case 'createPayment':
        endpoint = '/payments';
        method = 'POST';
        body = JSON.stringify(data);
        break;
      case 'getPayment':
        endpoint = `/payments/${data.paymentId}`;
        break;
      case 'getPixQrCode':
        endpoint = `/payments/${data.paymentId}/pixQrCode`;
        break;
      case 'listPayments': {
        const params = new URLSearchParams();
        if (data?.customer) params.set('customer', data.customer);
        if (data?.status) params.set('status', data.status);
        if (data?.externalReference) params.set('externalReference', data.externalReference);
        if (data?.limit) params.set('limit', data.limit.toString());
        if (data?.offset) params.set('offset', data.offset.toString());
        endpoint = `/payments?${params.toString()}`;
        break;
      }
      case 'getBalance':
        endpoint = '/finance/balance';
        break;
      case 'listSubscriptions': {
        const subParams = new URLSearchParams();
        if (data?.customer) subParams.set('customer', data.customer);
        if (data?.limit) subParams.set('limit', data.limit.toString());
        endpoint = `/subscriptions?${subParams.toString()}`;
        break;
      }
      case 'createSubscription':
        endpoint = '/subscriptions';
        method = 'POST';
        body = JSON.stringify(data);
        break;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: asaasHeaders,
    };
    if (method !== 'GET' && body) {
      fetchOptions.body = body;
    }

    const asaasResponse = await fetch(`${ASAAS_BASE_URL}${endpoint}`, fetchOptions);
    const responseData = await asaasResponse.json();

    return new Response(
      JSON.stringify(responseData),
      {
        status: asaasResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('Erro no asaas-proxy:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
