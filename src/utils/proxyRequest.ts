/**
 * Utilitário para fazer requisições via proxy Baserow
 *
 * Estratégia atual:
 * - Vercel/custom domain: usa /api/baserow-proxy (Serverless)
 * - Lovable preview/published: usa URL absoluta do Vercel proxy (porque /api/* retorna HTML)
 * - Localhost: usa /api/baserow-proxy (Vite faz proxy para o Vercel)
 */

import { supabase } from '@/integrations/supabase/client';
import { BASEROW_PROXY_CONFIG } from '@/config/proxyConfig';

export interface ProxyPayload {
  url: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  token: string;
  body?: string | object | null;
}

export interface ProxyResponse {
  ok: boolean;
  status: number;
  data: any;
  error?: string;
}

/**
 * Faz uma requisição via proxy Baserow
 * Detecta automaticamente o ambiente e usa o método correto
 */
export async function makeProxyRequest(payload: ProxyPayload): Promise<ProxyResponse> {
  const isSupabase = BASEROW_PROXY_CONFIG.isUsingSupabase();
  
  console.log(`🌐 [ProxyRequest] Fazendo requisição via ${isSupabase ? 'Supabase Edge Function' : 'Vercel Proxy'}`, {
    url: payload.url.substring(0, 80) + '...',
    method: payload.method,
    hasToken: !!payload.token,
    environment: BASEROW_PROXY_CONFIG.getEnvironment()
  });

  try {
    if (isSupabase) {
      // Usar supabase.functions.invoke para evitar CORS
      const { data, error } = await supabase.functions.invoke('baserow-proxy', {
        body: payload
      });

      if (error) {
        console.error('❌ [ProxyRequest] Erro na Edge Function:', error);
        return {
          ok: false,
          status: 500,
          data: null,
          error: error.message
        };
      }

      // Verificar se a Edge Function retornou um erro estruturado
      if (data?.error) {
        console.error('❌ [ProxyRequest] Erro retornado pela Edge Function:', data);
        return {
          ok: false,
          status: data.status || 502,
          data: null,
          error: data.error
        };
      }

      console.log('✅ [ProxyRequest] Sucesso via Supabase');
      return {
        ok: true,
        status: 200,
        data: data
      };
    } else {
      // Usar fetch direto para Vercel
      const response = await fetch(BASEROW_PROXY_CONFIG.ACTIVE_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        console.error('❌ [ProxyRequest] Erro HTTP no Vercel Proxy:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        return {
          ok: false,
          status: response.status,
          data: null,
          error: isJson && (data as any)?.error
            ? (data as any).error
            : `Proxy retornou ${response.status} (${response.statusText})`
        };
      }

      if (isJson && (data as any)?.error) {
        console.error('❌ [ProxyRequest] Erro no Vercel Proxy:', data);
        return {
          ok: false,
          status: response.status,
          data: null,
          error: (data as any).error
        };
      }

      if (!isJson) {
        console.error('❌ [ProxyRequest] Vercel Proxy retornou resposta não-JSON:', {
          status: response.status,
          statusText: response.statusText,
          preview: String(data).substring(0, 300)
        });
        return {
          ok: false,
          status: 502,
          data: null,
          error: 'Proxy retornou resposta inválida (não-JSON)'
        };
      }

      console.log('✅ [ProxyRequest] Sucesso via Vercel');
      return {
        ok: true,
        status: response.status,
        data
      };
    }
  } catch (error: any) {
    console.error('❌ [ProxyRequest] Erro crítico:', error);
    return {
      ok: false,
      status: 500,
      data: null,
      error: error.message
    };
  }
}

/**
 * Testa a conexão com o Baserow
 */
export async function testBaserowConnection(
  baseUrl: string,
  token: string,
  tableId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  const url = `${baseUrl}/api/database/rows/table/${tableId}/?user_field_names=true&size=1`;
  
  const result = await makeProxyRequest({
    url,
    method: 'GET',
    token
  });

  if (result.ok) {
    return {
      success: true,
      count: result.data?.count || 0
    };
  }

  return {
    success: false,
    error: result.error
  };
}
