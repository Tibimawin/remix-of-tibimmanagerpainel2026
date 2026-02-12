import { useEffect, useRef } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { pushNotificationService } from '@/services/PushNotificationService';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

const LAST_PUSH_KEY = 'expiration_push_last_sent';

export const useExpirationMonitor = () => {
  const { userInfo } = useSimpleAuth();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!userInfo || checkedRef.current) return;

    const daysRemaining = userInfo.diasRestantes;

    const checkExpiration = async () => {
      // Ler config do admin (dias e habilitado)
      let configDays = 5;
      let enabled = true;
      try {
        const configDoc = await getDoc(doc(db, 'systemConfig', 'expirationPush'));
        if (configDoc.exists()) {
          const data = configDoc.data();
          configDays = data.daysBeforeExpiry ?? 5;
          enabled = data.enabled ?? true;
        }
      } catch {
        // Usar defaults
      }

      if (!enabled) return;
      if (daysRemaining > configDays || daysRemaining < 0) return;

      const now = new Date();

      // Verificar se já enviou push recentemente (a cada 24h no máximo)
      const lastSent = localStorage.getItem(LAST_PUSH_KEY);
      if (lastSent) {
        const hoursSince = (now.getTime() - new Date(lastSent).getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) return;
      }

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

    const timeout = setTimeout(checkExpiration, 5000);
    return () => clearTimeout(timeout);
  }, [userInfo?.diasRestantes]);
};
