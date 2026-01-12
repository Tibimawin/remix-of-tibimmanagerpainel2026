
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

    if (baseUrl.startsWith('http://')) {
      const encodedUrl = encodeURIComponent(originalUrl);
      const proxyRequestUrl = `${PROXY_URL}?token=${ADMIN_TOKEN}&url=${encodedUrl}&method=GET`;
      const response = await fetch(proxyRequestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } else {
      return fetch(originalUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    throw error;
  }
}
