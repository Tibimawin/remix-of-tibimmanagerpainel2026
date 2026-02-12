
const ASAAS_API_KEY = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjE1ZGE0NDBlLWJjNjMtNDNiZi05NzBiLWRiMDZjZDg1NDJiYzo6JGFhY2hfOGU1OGRhZTYtMDEyMS00MmI3LWFiZDgtMmM3NDM2NDU5YWRk';
const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

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
  pixQrCodeId?: string;
  pixTransaction?: {
    qrCode: string;
    pixCopiaECola: string;
    expirationDate: string;
  };
}

const headers = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_API_KEY,
};

export const AsaasPaymentService = {
  // Criar ou buscar cliente
  async findOrCreateCustomer(name: string, email: string, cpfCnpj: string): Promise<AsaasCustomer> {
    try {
      // Buscar cliente existente por email
      const searchRes = await fetch(`${ASAAS_BASE_URL}/customers?email=${encodeURIComponent(email)}`, { headers });
      const searchData = await searchRes.json();
      
      if (searchData.data && searchData.data.length > 0) {
        console.log('Cliente Asaas encontrado:', searchData.data[0].id);
        return searchData.data[0];
      }

      // Criar novo cliente
      const createRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, email, cpfCnpj }),
      });
      const customer = await createRes.json();
      
      if (customer.errors) {
        throw new Error(customer.errors[0]?.description || 'Erro ao criar cliente');
      }
      
      console.log('Cliente Asaas criado:', customer.id);
      return customer;
    } catch (error) {
      console.error('Erro ao buscar/criar cliente Asaas:', error);
      throw error;
    }
  },

  // Criar assinatura recorrente com PIX
  async createSubscription(customerId: string, value: number, description: string): Promise<AsaasSubscription> {
    try {
      const res = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value,
          cycle: 'MONTHLY',
          description,
          nextDueDate: new Date().toISOString().split('T')[0],
        }),
      });
      const subscription = await res.json();
      
      if (subscription.errors) {
        throw new Error(subscription.errors[0]?.description || 'Erro ao criar assinatura');
      }
      
      console.log('Assinatura criada:', subscription.id);
      return subscription;
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw error;
    }
  },

  // Buscar QR Code PIX de uma cobrança
  async getPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string; expirationDate: string }> {
    try {
      const res = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}/pixQrCode`, { headers });
      const data = await res.json();
      
      if (data.errors) {
        throw new Error(data.errors[0]?.description || 'Erro ao gerar QR Code PIX');
      }
      
      return data;
    } catch (error) {
      console.error('Erro ao buscar QR Code PIX:', error);
      throw error;
    }
  },

  // Buscar cobranças de uma assinatura
  async getSubscriptionPayments(subscriptionId: string): Promise<AsaasPayment[]> {
    try {
      const res = await fetch(`${ASAAS_BASE_URL}/payments?subscription=${subscriptionId}`, { headers });
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error('Erro ao buscar cobranças:', error);
      return [];
    }
  },

  // Verificar status de um pagamento
  async getPaymentStatus(paymentId: string): Promise<AsaasPayment> {
    try {
      const res = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, { headers });
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      throw error;
    }
  },

  // Listar assinaturas de um cliente
  async getCustomerSubscriptions(customerId: string): Promise<AsaasSubscription[]> {
    try {
      const res = await fetch(`${ASAAS_BASE_URL}/subscriptions?customer=${customerId}`, { headers });
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error);
      return [];
    }
  },

  // Cancelar assinatura
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const res = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers,
      });
      return res.ok;
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      return false;
    }
  },
};
