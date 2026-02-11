import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

const ALLOWED_ACTIONS = [
  'createCustomer',
  'createPayment',
  'getPayment',
  'getPixQrCode',
  'listPayments',
  'getBalance',
  'listSubscriptions',
  'createSubscription',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    if (!ALLOWED_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Ação não permitida: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const asaasHeaders = {
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

      case 'listPayments':
        const params = new URLSearchParams();
        if (data?.customer) params.set('customer', data.customer);
        if (data?.status) params.set('status', data.status);
        if (data?.externalReference) params.set('externalReference', data.externalReference);
        if (data?.limit) params.set('limit', data.limit.toString());
        if (data?.offset) params.set('offset', data.offset.toString());
        endpoint = `/payments?${params.toString()}`;
        break;

      case 'getBalance':
        endpoint = '/finance/balance';
        break;

      case 'listSubscriptions':
        const subParams = new URLSearchParams();
        if (data?.customer) subParams.set('customer', data.customer);
        if (data?.limit) subParams.set('limit', data.limit.toString());
        endpoint = `/subscriptions?${subParams.toString()}`;
        break;

      case 'createSubscription':
        endpoint = '/subscriptions';
        method = 'POST';
        body = JSON.stringify(data);
        break;
    }

    const asaasResponse = await fetch(`${ASAAS_BASE_URL}${endpoint}`, {
      method,
      headers: asaasHeaders,
      body: method !== 'GET' ? body : undefined,
    });

    const responseData = await asaasResponse.json();

    return new Response(
      JSON.stringify(responseData),
      {
        status: asaasResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro no asaas-proxy:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
