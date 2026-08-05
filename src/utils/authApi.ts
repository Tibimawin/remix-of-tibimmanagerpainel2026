
/**
 * Função isolada para fazer a requisição de autenticação na API do Baserow, usando proxy se necessário.
 */
const ADMIN_TOKEN = 'TH0lxs0P4EzApqjqMXjEqHvtRsjemFgn';
import { BASEROW_PROXY_CONFIG } from '../config/proxyConfig';

const PROXY_URL = BASEROW_PROXY_CONFIG.ACTIVE_PROXY_URL;

export async function makeAuthRequest(baseUrl: string) {
  try {
    const endpoint = `/api/database/rows/table/758/?user_field_names=true`;
    const originalUrl = `${baseUrl}${endpoint}`;

    const proxyPayload = {
      url: originalUrl,
      method: 'GET',
      token: ADMIN_TOKEN
    };

    return fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proxyPayload)
    });
  } catch (error) {
    throw error;
  }
}
