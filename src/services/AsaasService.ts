export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  status: string;
  billingType: string;
  dueDate: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  externalReference?: string;
  description?: string;
}

export interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callAsaasProxy(action: string, data?: any) {
  // Use the Vercel production proxy to avoid CORS in preview
  const url = 'https://tibimmanagerpain2025.vercel.app/api/asaas-proxy';
  
  console.log('[AsaasProxy] Calling:', url, 'action:', action);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, data }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AsaasProxy] Error:', response.status, errorText);
    throw new Error(`Erro ${response.status}: ${errorText}`);
  }

  const result = await response.json();

  if (result?.errors) {
    throw new Error(result.errors?.[0]?.description || 'Erro na API Asaas');
  }

  return result;
}

export const AsaasService = {
  async createCustomer(data: { name: string; email: string; cpfCnpj: string }): Promise<AsaasCustomer> {
    return callAsaasProxy('createCustomer', data);
  },

  async createPayment(data: {
    customer: string;
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
  }): Promise<AsaasPayment> {
    return callAsaasProxy('createPayment', data);
  },

  async getPayment(paymentId: string): Promise<AsaasPayment> {
    return callAsaasProxy('getPayment', { paymentId });
  },

  async getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
    return callAsaasProxy('getPixQrCode', { paymentId });
  },

  async listPayments(filters?: { customer?: string; status?: string; externalReference?: string }) {
    return callAsaasProxy('listPayments', filters);
  },
};
