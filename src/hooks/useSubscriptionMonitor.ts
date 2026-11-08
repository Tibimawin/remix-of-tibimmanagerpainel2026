import { useEffect } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { UserSubscriptionNotificationService } from '@/services/UserSubscriptionNotificationService';
import { logger } from '@/utils/logger';

/**
 * Hook que monitora a assinatura do usuário e envia notificações automáticas
 * sobre expiração próxima ou assinatura expirada
 */
export const useSubscriptionMonitor = () => {
    const { userInfo } = useSimpleAuth();

    useEffect(() => {
        if (!userInfo?.id || !userInfo?.email) {
            return;
        }

        const checkSubscriptionStatus = async () => {
            try {
                // Buscar dados completos do usuário do Firebase
                const { FirebaseUserService } = await import('@/services/FirebaseUserService');
                const userData = await FirebaseUserService.getUserById(userInfo.id);

                if (!userData) {
                    logger.warn('Dados do usuário não encontrados para monitoramento de assinatura');
                    return;
                }

                const now = new Date();
                const expiryDate = new Date(userData.expiryDate);
                const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

                logger.debug('Status de assinatura verificado', {
                    userId: userInfo.id,
                    daysRemaining,
                    isActive: userData.isActive,
                    expiryDate: userData.expiryDate
                });

                // Se assinatura expirou (dias restantes <= 0)
                if (userData.isActive && daysRemaining <= 0) {
                    logger.info('Assinatura expirada detectada, enviando notificação');

                    await UserSubscriptionNotificationService.notifySubscriptionExpired(
                        userData.uid,
                        userData.email,
                        userData.name,
                        userData.expiryDate
                    );
                }
                // Se assinatura está próxima de expirar (1-7 dias)
                else if (userData.isActive && daysRemaining > 0 && daysRemaining <= 7) {
                    logger.info('Assinatura próxima de expirar detectada, enviando aviso', { daysRemaining });

                    await UserSubscriptionNotificationService.notifyExpirationWarning(
                        userData.uid,
                        userData.email,
                        userData.name,
                        daysRemaining,
                        userData.expiryDate
                    );
                }
            } catch (error) {
                logger.error('Erro ao verificar status de assinatura:', error);
            }
        };

        // Verificar imediatamente ao carregar
        checkSubscriptionStatus();

        // ✅ OTIMIZADO: Verificar a cada 6 HORAS (antes: 1 hora)
        // Redução de 83% no consumo de quota do Firestore
        // Impacto: Notificações menos frequentes, mas ainda efetivas
        const intervalId = setInterval(checkSubscriptionStatus, 6 * 60 * 60 * 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, [userInfo?.id, userInfo?.email]);

    return null;
};
