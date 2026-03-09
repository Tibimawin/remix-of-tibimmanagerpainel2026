import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests - MUST return 200 with null body
  if (req.method === 'OPTIONS') {
    console.log('✅ [BASEROW-PROXY] OPTIONS preflight request');
    return new Response(null, { 
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

    // Tratar respostas sem conteúdo (204 No Content - DELETE bem-sucedido)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      console.log('✅ [BASEROW-PROXY] Resposta 204 No Content (DELETE bem-sucedido)');
      return new Response(
        JSON.stringify({ success: true, status: 204 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      const text = await response.text();
      
      // Se status é 2xx e sem conteúdo, considerar sucesso
      if (response.ok && (!text || text.trim() === '')) {
        console.log('✅ [BASEROW-PROXY] Resposta vazia com status OK');
        return new Response(
          JSON.stringify({ success: true, status: response.status }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Tentar parsear como JSON
      try {
        const data = JSON.parse(text);
        return new Response(
          JSON.stringify(data),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        console.error('❌ [BASEROW-PROXY] Resposta não é JSON:', {
          status: response.status,
          contentType,
          textPreview: text.substring(0, 500),
        });

        return new Response(
          JSON.stringify({
            error: 'Baserow retornou HTML em vez de JSON',
            details: 'O token pode estar inválido/expirado, a URL pode estar errada, ou a tabela não existe',
            status: response.status,
            contentType: contentType,
            preview: text.substring(0, 200),
          }),
          { 
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
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
