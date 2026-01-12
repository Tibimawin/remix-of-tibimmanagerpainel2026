const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const MAXPLUS_API_BASE = 'https://tiktokapi-rho.vercel.app/api/maxv3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();
    console.log(`MaxPlus Proxy - Action: ${action}`, params);

    let url: string;
    
    switch (action) {
      case 'list': {
        const categoryUrl = encodeURIComponent(params.categoryUrl);
        // The MaxPlus API expects base with query param ?url
        url = `${MAXPLUS_API_BASE}?url=${categoryUrl}`;
        break;
      }
      
      case 'details': {
        // The MaxPlus API expects base with query param ?id
        url = `${MAXPLUS_API_BASE}?id=${encodeURIComponent(params.contentId)}`;
        break;
      }
      
      case 'episode': {
        // The MaxPlus API expects base with query param ?ep
        url = `${MAXPLUS_API_BASE}?ep=${encodeURIComponent(params.episodeId)}`;
        break;
      }
      
      default:
        throw new Error(`Ação não suportada: ${action}`);
    }

    console.log(`Fazendo requisição para: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na API MaxPlus: ${response.status}`, errorText);
      throw new Error(`API MaxPlus retornou ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`Resposta recebida com sucesso para action: ${action}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no proxy MaxPlus:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Erro ao processar requisição para API MaxPlus' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});