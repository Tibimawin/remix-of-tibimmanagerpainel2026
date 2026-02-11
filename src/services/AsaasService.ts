import { supabase } from '@/integrations/supabase/client';

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

async function callAsaasProxy(action: string, data?: any) {
  const { data: response, error } = await supabase.functions.invoke('asaas-proxy', {
    body: { action, data },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao chamar API Asaas');
  }

  if (response?.errors) {
    throw new Error(response.errors?.[0]?.description || 'Erro na API Asaas');
  }

  return response;
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
