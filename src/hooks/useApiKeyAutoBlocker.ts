import { useEffect, useRef } from 'react';
import { ApiKeyService } from '@/services/ApiKeyService';
import { logger } from '@/utils/logger';

const CHECK_INTERVAL = 2 * 60 * 60 * 1000; // 2 horas

/**
 * Job automático que bloqueia chaves de API de usuários com assinatura expirada.
 * Roda a cada 2 horas no lado admin.
 */
export const useApiKeyAutoBlocker = () => {
  const runningRef = useRef(false);

  useEffect(() => {
    const blockExpiredKeys = async () => {
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const allKeys = await ApiKeyService.listAllKeys();
        const activeKeys = allKeys.filter(k => k.active);

        if (activeKeys.length === 0) {
          runningRef.current = false;
          return;
        }

        const uniqueUserIds = [...new Set(activeKeys.map(k => k.userId))];
        let totalBlocked = 0;

        await Promise.all(
          uniqueUserIds.map(async (userId) => {
            try {
              const status = await ApiKeyService.getUserSubscriptionStatus(userId);

              if (status.isExpired || !status.hasApiFeature) {
                const count = await ApiKeyService.disableAllUserKeys(userId);
                if (count > 0) {
                  totalBlocked += count;
                  logger.info(`🔒 Auto-bloqueio: ${count} chave(s) do usuário ${userId} (${status.isExpired ? 'expirado' : 'sem feature API'})`);
                }
              }
            } catch (error) {
              logger.error(`Erro ao verificar usuário ${userId}:`, error);
            }
          })
        );

        if (totalBlocked > 0) {
          logger.info(`🔒 Auto-bloqueio concluído: ${totalBlocked} chave(s) bloqueada(s)`);
        }
      } catch (error) {
        logger.error('Erro no auto-bloqueio de API keys:', error);
      } finally {
        runningRef.current = false;
      }
    };

    // Executa após 10s do mount
    const timeout = setTimeout(blockExpiredKeys, 10000);

    const interval = setInterval(blockExpiredKeys, CHECK_INTERVAL);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);
};
