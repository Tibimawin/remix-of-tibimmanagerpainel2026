
const VERCEL_PROXY_BASE = import.meta.env.VITE_VERCEL_PROXY_BASE || 'https://tibimmanagerpain2025.vercel.app';

const getProxyUrl = (): string => {
  if (typeof window === 'undefined') return '/api/asaas-proxy';
  const hostname = window.location.hostname;
  if (hostname.endsWith('.lovable.app') || hostname.endsWith('.lovableproject.com')) {
    return `${VERCEL_PROXY_BASE}/api/asaas-proxy`;
  }
  return '/api/asaas-proxy';
};

interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
}

interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  cycle: string;
  status: string;
}

interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  billingType: string;
  status: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
}

const proxyFetch = async (endpoint: string, method = 'GET', body?: any) => {
  const proxyUrl = getProxyUrl();
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, method, body }),
  });
  const data = await res.json();
  if (data.errors) {
    throw new Error(data.errors[0]?.description || 'Erro na API Asaas');
  }
  return data;
};

export const AsaasPaymentService = {
  async findOrCreateCustomer(name: string, email: string, cpfCnpj: string): Promise<AsaasCustomer> {
    // Buscar cliente existente
    const searchData = await proxyFetch(`/customers?email=${encodeURIComponent(email)}`);
    if (searchData.data && searchData.data.length > 0) {
      console.log('Cliente Asaas encontrado:', searchData.data[0].id);
      return searchData.data[0];
    }
    // Criar novo
    const customer = await proxyFetch('/customers', 'POST', { name, email, cpfCnpj });
    console.log('Cliente Asaas criado:', customer.id);
    return customer;
  },

  async createSubscription(customerId: string, value: number, description: string): Promise<AsaasSubscription> {
    const subscription = await proxyFetch('/subscriptions', 'POST', {
      customer: customerId,
      billingType: 'PIX',
      value,
      cycle: 'MONTHLY',
      description,
      nextDueDate: new Date().toISOString().split('T')[0],
    });
    console.log('Assinatura criada:', subscription.id);
    return subscription;
  },

  async getPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string; expirationDate: string }> {
    return await proxyFetch(`/payments/${paymentId}/pixQrCode`);
  },

  async getSubscriptionPayments(subscriptionId: string): Promise<AsaasPayment[]> {
    const data = await proxyFetch(`/payments?subscription=${subscriptionId}`);
    return data.data || [];
  },

  async getPaymentStatus(paymentId: string): Promise<AsaasPayment> {
    return await proxyFetch(`/payments/${paymentId}`);
  },

  async getCustomerSubscriptions(customerId: string): Promise<AsaasSubscription[]> {
    const data = await proxyFetch(`/subscriptions?customer=${customerId}`);
    return data.data || [];
  },

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await proxyFetch(`/subscriptions/${subscriptionId}`, 'DELETE');
      return true;
    } catch {
      return false;
    }
  },
};
