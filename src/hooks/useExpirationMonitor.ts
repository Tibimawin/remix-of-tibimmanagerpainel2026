import { useEffect, useRef } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { pushNotificationService } from '@/services/PushNotificationService';

const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 horas
const LAST_PUSH_KEY = 'expiration_push_last_sent';

export const useExpirationMonitor = () => {
  const { userInfo } = useSimpleAuth();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!userInfo || checkedRef.current) return;

    const daysRemaining = userInfo.diasRestantes;

    // Só notificar se faltam 5 dias ou menos e ainda não expirou
    if (daysRemaining > 5 || daysRemaining < 0) return;

    const checkExpiration = async () => {
      const now = new Date();

      // Verificar se já enviou push recentemente (a cada 24h no máximo)
      const lastSent = localStorage.getItem(LAST_PUSH_KEY);
      if (lastSent) {
        const hoursSince = (now.getTime() - new Date(lastSent).getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) return;
      }

      // Inicializar e pedir permissão se necessário
      const initialized = await pushNotificationService.initialize();
      if (!initialized) return;

      if (pushNotificationService.getPermissionStatus() !== 'granted') {
        await pushNotificationService.requestPermission();
      }

      if (pushNotificationService.getPermissionStatus() === 'granted') {
        const urgency = daysRemaining <= 1
          ? '⚠️ Último dia!'
          : daysRemaining <= 3
            ? '🔴 Faltam poucos dias!'
            : '🟡 Atenção';

        const bodyText = daysRemaining === 0
          ? 'Sua assinatura expira hoje! Renove agora para não perder o acesso.'
          : daysRemaining === 1
            ? 'Sua assinatura expira amanhã! Renove pelo painel via PIX.'
            : `Sua assinatura expira em ${daysRemaining} dias. Renove pelo painel.`;

        await pushNotificationService.sendNotification({
          title: `${urgency} Assinatura expirando`,
          body: bodyText,
          tag: 'expiration-warning',
          data: { action: 'renew', route: '/perfil' }
        });

        localStorage.setItem(LAST_PUSH_KEY, now.toISOString());
      }

      checkedRef.current = true;
    };

    // Verificar após 5 segundos do login
    const timeout = setTimeout(checkExpiration, 5000);

    return () => {
      clearTimeout(timeout);
    };
  }, [userInfo?.diasRestantes]);
};
