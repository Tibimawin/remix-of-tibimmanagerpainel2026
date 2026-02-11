import { useState, useEffect, useCallback, useRef } from 'react';
import { AsaasService, type AsaasPayment, type AsaasPixQrCode } from '@/services/AsaasService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { toast } from 'sonner';

interface UseAssinaturaReturn {
  loading: boolean;
  creatingPayment: boolean;
  payment: AsaasPayment | null;
  pixQrCode: AsaasPixQrCode | null;
  paymentConfirmed: boolean;
  createPayment: (billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD', cpfCnpj: string) => Promise<void>;
  reset: () => void;
}

export function useAssinatura(): UseAssinaturaReturn {
  const { userInfo } = useSimpleAuth();
  const [loading, setLoading] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [payment, setPayment] = useState<AsaasPayment | null>(null);
  const [pixQrCode, setPixQrCode] = useState<AsaasPixQrCode | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback((paymentId: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const updated = await AsaasService.getPayment(paymentId);
        if (updated.status === 'CONFIRMED' || updated.status === 'RECEIVED') {
          setPaymentConfirmed(true);
          stopPolling();
          toast.success('Pagamento confirmado! Seu acesso foi liberado.');
        }
      } catch (err) {
        console.error('Erro no polling:', err);
      }
    }, 5000);
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const createPayment = useCallback(async (billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD', cpfCnpj: string) => {
    if (!userInfo) {
      toast.error('Usuário não autenticado');
      return;
    }

    setCreatingPayment(true);
    try {
      // 1. Create customer
      const customer = await AsaasService.createCustomer({
        name: userInfo.email,
        email: userInfo.email,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      });

      // 2. Create payment
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);

      const newPayment = await AsaasService.createPayment({
        customer: customer.id,
        billingType,
        value: 30,
        dueDate: dueDate.toISOString().split('T')[0],
        description: 'Assinatura Painel - 30 dias',
        externalReference: userInfo.id,
      });

      setPayment(newPayment);

      // 3. If PIX, get QR code
      if (billingType === 'PIX') {
        const qr = await AsaasService.getPixQrCode(newPayment.id);
        setPixQrCode(qr);
      }

      // 4. Start polling
      startPolling(newPayment.id);

      toast.success(
        billingType === 'PIX'
          ? 'QR Code PIX gerado! Escaneie para pagar.'
          : billingType === 'BOLETO'
          ? 'Boleto gerado com sucesso!'
          : 'Cobrança criada com sucesso!'
      );
    } catch (err: any) {
      console.error('Erro ao criar pagamento:', err);
      toast.error(err.message || 'Erro ao criar pagamento');
    } finally {
      setCreatingPayment(false);
    }
  }, [userInfo, startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setPayment(null);
    setPixQrCode(null);
    setPaymentConfirmed(false);
  }, [stopPolling]);

  return {
    loading,
    creatingPayment,
    payment,
    pixQrCode,
    paymentConfirmed,
    createPayment,
    reset,
  };
}
