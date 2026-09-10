
const VERCEL_PROXY_BASE = import.meta.env.VITE_VERCEL_PROXY_BASE || 'https://tibimmanagerpainel2026.vercel.app';

const getProxyUrl = (): string => {
  if (typeof window === 'undefined') return '/api/asaas-proxy';
  const hostname = window.location.hostname;
  if (hostname.endsWith('.lovable.app') || hostname.endsWith('.lovableproject.com')) {
    return `${VERCEL_PROXY_BASE}/api/asaas-proxy`;
  }
  return '/api/asaas-proxy';
};

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
  addressNumber?: string;
}

export interface AsaasCreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface AsaasCreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone: string;
  mobilePhone?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  cycle: string;
  status: string;
  billingType?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  billingType: string;
  status: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  dueDate?: string;
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
  async findOrCreateCustomer(
    name: string,
    email: string,
    cpfCnpj: string,
    extra?: { phone?: string; postalCode?: string; addressNumber?: string }
  ): Promise<AsaasCustomer> {
    const cleanCpf = cpfCnpj.replace(/\D/g, '');
    const cleanPhone = extra?.phone ? extra.phone.replace(/\D/g, '') : undefined;
    const cleanPostal = extra?.postalCode ? extra.postalCode.replace(/\D/g, '') : undefined;

    // Buscar cliente existente
    const searchData = await proxyFetch(`/customers?email=${encodeURIComponent(email)}`);
    if (searchData.data && searchData.data.length > 0) {
      const existing = searchData.data[0];
      console.log('Cliente Asaas encontrado:', existing.id);
      if ((cleanPhone || cleanPostal) && (!existing.postalCode || !existing.phone)) {
        try {
          await proxyFetch(`/customers/${existing.id}`, 'POST', {
            phone: cleanPhone || existing.phone,
            mobilePhone: cleanPhone || existing.mobilePhone,
            postalCode: cleanPostal || existing.postalCode,
            addressNumber: extra?.addressNumber || existing.addressNumber,
          });
        } catch (e) {
          console.warn('Aviso ao atualizar dados complementares do cliente:', e);
        }
      }
      return existing;
    }

    // Criar novo
    const payload: any = {
      name,
      email,
      cpfCnpj: cleanCpf,
    };
    if (cleanPhone) {
      payload.phone = cleanPhone;
      payload.mobilePhone = cleanPhone;
    }
    if (cleanPostal) {
      payload.postalCode = cleanPostal;
      payload.addressNumber = extra?.addressNumber || 'S/N';
    }

    const customer = await proxyFetch('/customers', 'POST', payload);
    console.log('Cliente Asaas criado:', customer.id);
    return customer;
  },

  async createSubscription(
    customerId: string,
    value: number,
    description: string,
    cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY' = 'MONTHLY'
  ): Promise<AsaasSubscription> {
    const subscription = await proxyFetch('/subscriptions', 'POST', {
      customer: customerId,
      billingType: 'PIX',
      value,
      cycle,
      description,
      nextDueDate: new Date().toISOString().split('T')[0],
    });
    console.log('Assinatura PIX criada:', subscription.id);
    return subscription;
  },

  async createCreditCardSubscription(
    customerId: string,
    value: number,
    description: string,
    creditCard: AsaasCreditCardData,
    creditCardHolderInfo: AsaasCreditCardHolderInfo,
    cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY' = 'MONTHLY'
  ): Promise<AsaasSubscription> {
    const today = new Date().toISOString().split('T')[0];
    const subscription = await proxyFetch('/subscriptions', 'POST', {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value,
      nextDueDate: today,
      cycle,
      description,
      creditCard: {
        holderName: creditCard.holderName.trim().toUpperCase(),
        number: creditCard.number.replace(/\D/g, ''),
        expiryMonth: creditCard.expiryMonth.padStart(2, '0'),
        expiryYear: creditCard.expiryYear.length === 2 ? `20${creditCard.expiryYear}` : creditCard.expiryYear,
        ccv: creditCard.ccv.trim(),
      },
      creditCardHolderInfo: {
        name: creditCardHolderInfo.name.trim(),
        email: creditCardHolderInfo.email.trim(),
        cpfCnpj: creditCardHolderInfo.cpfCnpj.replace(/\D/g, ''),
        postalCode: creditCardHolderInfo.postalCode.replace(/\D/g, ''),
        addressNumber: creditCardHolderInfo.addressNumber.trim(),
        addressComplement: creditCardHolderInfo.addressComplement?.trim() || undefined,
        phone: creditCardHolderInfo.phone.replace(/\D/g, ''),
        mobilePhone: creditCardHolderInfo.phone.replace(/\D/g, ''),
      },
    });
    console.log('Assinatura com Cartão criada:', subscription.id);
    return subscription;
  },

  async createCreditCardPayment(
    customerId: string,
    value: number,
    description: string,
    creditCard: AsaasCreditCardData,
    creditCardHolderInfo: AsaasCreditCardHolderInfo
  ): Promise<AsaasPayment> {
    const today = new Date().toISOString().split('T')[0];
    const payment = await proxyFetch('/payments', 'POST', {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value,
      dueDate: today,
      description,
      creditCard: {
        holderName: creditCard.holderName.trim().toUpperCase(),
        number: creditCard.number.replace(/\D/g, ''),
        expiryMonth: creditCard.expiryMonth.padStart(2, '0'),
        expiryYear: creditCard.expiryYear.length === 2 ? `20${creditCard.expiryYear}` : creditCard.expiryYear,
        ccv: creditCard.ccv.trim(),
      },
      creditCardHolderInfo: {
        name: creditCardHolderInfo.name.trim(),
        email: creditCardHolderInfo.email.trim(),
        cpfCnpj: creditCardHolderInfo.cpfCnpj.replace(/\D/g, ''),
        postalCode: creditCardHolderInfo.postalCode.replace(/\D/g, ''),
        addressNumber: creditCardHolderInfo.addressNumber.trim(),
        addressComplement: creditCardHolderInfo.addressComplement?.trim() || undefined,
        phone: creditCardHolderInfo.phone.replace(/\D/g, ''),
        mobilePhone: creditCardHolderInfo.phone.replace(/\D/g, ''),
      },
    });
    console.log('Pagamento com Cartão criado:', payment.id);
    return payment;
  },

  async createInvoiceCheckoutPayment(
    customerId: string,
    value: number,
    description: string
  ): Promise<AsaasPayment> {
    const today = new Date().toISOString().split('T')[0];
    const payment = await proxyFetch('/payments', 'POST', {
      customer: customerId,
      billingType: 'UNDEFINED', // Checkout Asaas com suporte a Cartão de Débito, Crédito e Pix
      value,
      dueDate: today,
      description,
    });
    console.log('Fatura de Checkout/Débito criada:', payment.id, payment.invoiceUrl);
    return payment;
  },

  async createOneTimePayment(customerId: string, value: number, description: string): Promise<AsaasPayment> {
    const today = new Date().toISOString().split('T')[0];
    const payment = await proxyFetch('/payments', 'POST', {
      customer: customerId,
      billingType: 'PIX',
      value,
      dueDate: today,
      description,
    });
    console.log('Cobrança avulsa criada:', payment.id);
    return payment;
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

  async getCustomerPaymentsByEmail(email: string): Promise<AsaasPayment[]> {
    try {
      // Buscar cliente pelo email
      const searchData = await proxyFetch(`/customers?email=${encodeURIComponent(email)}`);
      if (!searchData.data || searchData.data.length === 0) return [];

      const customerId = searchData.data[0].id;
      // Buscar todos os pagamentos do cliente
      const paymentsData = await proxyFetch(`/payments?customer=${customerId}&limit=50`);
      return paymentsData.data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico de pagamentos:', error);
      return [];
    }
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
