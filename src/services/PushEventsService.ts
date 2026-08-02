import { supabase } from '@/integrations/supabase/client';
import { auth } from '@/config/firebase';

/**
 * Disparo de eventos push reais (pagamento e expiração) através da
 * edge function `push`, que envia via FCM HTTP v1 com service account.
 */
class PushEventsService {
  private async call(action: string, payload: Record<string, unknown> = {}) {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return null;
      const { data, error } = await supabase.functions.invoke('push', {
        body: { action, idToken, ...payload },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn(`[push] falha ao disparar "${action}":`, err);
      return null;
    }
  }

  /** Alerta de pagamento confirmado para o usuário logado */
  async notifyPaymentConfirmed(options: {
    message?: string;
    paymentId?: string;
    amount?: number;
    accessDays?: number;
  } = {}) {
    const { message, paymentId, amount, accessDays } = options;
    return this.call('notify-payment', {
      message:
        message ||
        (accessDays
          ? `Pagamento confirmado! Seu acesso foi estendido por ${accessDays} dias.`
          : 'Pagamento confirmado! Seu acesso foi liberado.'),
      dedupeKey: paymentId ? `pay:${paymentId}` : null,
      data: {
        ...(paymentId ? { paymentId: String(paymentId) } : {}),
        ...(amount != null ? { amount: String(amount) } : {}),
        ...(accessDays != null ? { accessDays: String(accessDays) } : {}),
      },
    });
  }

  /** Alerta de assinatura expirando/expirada para o usuário logado */
  async notifyExpiration(options: { message?: string; daysLeft?: number; expiresAt?: string } = {}) {
    const { message, daysLeft, expiresAt } = options;
    const dedupeDay = (expiresAt || new Date().toISOString()).slice(0, 10);
    return this.call('notify-expiration', {
      message:
        message ||
        (daysLeft != null && daysLeft > 0
          ? `Sua assinatura expira em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}. Renove para não perder o acesso.`
          : 'Seu acesso expirou. Renove agora para continuar usando o painel.'),
      dedupeKey: `exp-client:${dedupeDay}:${daysLeft ?? 'expired'}`,
      data: {
        ...(daysLeft != null ? { daysLeft: String(daysLeft) } : {}),
        ...(expiresAt ? { expiresAt } : {}),
      },
    });
  }

  /** Diagnóstico: verifica se o backend de push está pronto */
  async status() {
    const { data } = await supabase.functions.invoke('push', { body: { action: 'status' } });
    return data as {
      ready: boolean;
      hasServiceAccount: boolean;
      hasVapidPublicKey: boolean;
      activeTokens: number;
    } | null;
  }
}

export const pushEventsService = new PushEventsService();
