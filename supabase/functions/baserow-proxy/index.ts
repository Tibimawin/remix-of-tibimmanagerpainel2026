import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Last updated: 2026-01-14T16:25:00Z - Force redeploy for CORS fix
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log(`📨 [BASEROW-PROXY] Request: ${req.method} from ${req.headers.get('origin') || 'unknown'}`);
  
  // Handle CORS preflight requests - MUST return 200 with empty body
  if (req.method === 'OPTIONS') {
    console.log('✅ [BASEROW-PROXY] OPTIONS preflight - returning 200 with CORS headers');
    return new Response('', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const { url, method = 'GET', token, body } = await req.json();

    if (!url) {
      console.error('❌ [BASEROW-PROXY] URL não fornecida');
      return new Response(
        JSON.stringify({ error: 'URL é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🌐 [BASEROW-PROXY] Nova requisição:', {
      url: url.substring(0, 100),
      method: method,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 15) + '...' : 'N/A',
      hasBody: !!body,
    });

    // Preparar headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Token ${token}`;
      console.log('🔑 [BASEROW-PROXY] Token adicionado:', {
        authHeaderPreview: headers['Authorization'].substring(0, 20) + '...'
      });
    }

    // Preparar opções do fetch
    const fetchOptions: RequestInit = {
      method: method,
      headers: headers,
    };

    // Adicionar body para métodos que suportam
    if (['POST', 'PATCH', 'PUT'].includes(method.toUpperCase()) && body) {
      if (typeof body === 'string') {
        fetchOptions.body = body;
      } else if (typeof body === 'object') {
        fetchOptions.body = JSON.stringify(body);
      } else {
        fetchOptions.body = String(body);
      }
      console.log('📤 [BASEROW-PROXY] Body sendo enviado:', {
        length: (fetchOptions.body as string).length,
        preview: (fetchOptions.body as string).substring(0, 200)
      });
    }

    // Fazer requisição ao Baserow
    console.log('⏳ [BASEROW-PROXY] Fazendo requisição para Baserow...');
    const response = await fetch(url, fetchOptions);

    console.log('📡 [BASEROW-PROXY] Resposta recebida:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type')
    });

    // Verificar se a resposta é JSON
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('✅ [BASEROW-PROXY] Resposta JSON válida:', {
        status: response.status,
        hasResults: !!data.results,
        count: data.count || 0
      });

      return new Response(
        JSON.stringify(data),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // Não é JSON - retornar erro estruturado
      const text = await response.text();
      console.error('❌ [BASEROW-PROXY] Resposta não é JSON:', {
        status: response.status,
        contentType,
        textPreview: text.substring(0, 500),
        url,
        method,
        hasToken: !!token
      });

      return new Response(
        JSON.stringify({
          error: 'Baserow retornou HTML em vez de JSON',
          details: 'O token pode estar inválido/expirado, a URL pode estar errada, ou a tabela não existe',
          status: response.status,
          contentType: contentType,
          preview: text.substring(0, 200),
          url: url,
          tokenPreview: token ? token.substring(0, 12) + '...' : 'N/A'
        }),
        { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    console.error('❌ [BASEROW-PROXY] Erro crítico:', {
      message: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({
        error: 'Erro no proxy',
        message: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
