import { useState, useEffect } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { ExpirationNotificationService, type ExpirationNotification } from '@/services/ExpirationNotificationService';

export const useExpirationNotifications = () => {
  const { userInfo } = useSimpleAuth();
  const [expirationNotification, setExpirationNotification] = useState<ExpirationNotification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userInfo?.id) {
      setExpirationNotification(null);
      setLoading(false);
      return;
    }

    console.log('🔔 Iniciando listener de notificações de expiração para:', userInfo.email);
    
    // Listener em tempo real para notificações de expiração
    const unsubscribe = ExpirationNotificationService.onUserExpirationNotification(
      userInfo.id,
      (notification) => {
        console.log('📅 Notificação de expiração recebida:', notification);
        setExpirationNotification(notification);
        setLoading(false);
      }
    );

    return () => {
      console.log('🔥 Removendo listener de notificações de expiração');
      unsubscribe();
    };
  }, [userInfo?.id]);

  const hasExpirationWarning = (): boolean => {
    return expirationNotification !== null && !expirationNotification.dismissed;
  };

  const getDaysRemaining = (): number => {
    return expirationNotification?.daysRemaining || 0;
  };

  const getExpiryDate = (): string | null => {
    return expirationNotification?.expiryDate || null;
  };

  const dismissNotification = async (): Promise<void> => {
    if (userInfo?.id) {
      await ExpirationNotificationService.dismissExpirationNotification(userInfo.id);
    }
  };

  return {
    expirationNotification,
    loading,
    hasExpirationWarning,
    getDaysRemaining,
    getExpiryDate,
    dismissNotification
  };
};