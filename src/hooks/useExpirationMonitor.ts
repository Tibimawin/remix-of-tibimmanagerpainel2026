import { useEffect } from 'react';
import { ExpirationNotificationService } from '@/services/ExpirationNotificationService';
import { pushNotificationService } from '@/services/PushNotificationService';

export const useExpirationMonitor = () => {
  // ✅ DESABILITADO: Monitor automático de notificações de expiração
  // Motivo: Economiza quota do Firebase
  // Impacto: Admin pode ver notificações manualmente em "Notificações de Expiração"
  // Economia: ~200 ops/dia

  // REMOVIDO: Verificação automática a cada 1 hora
  // Admin pode executar manualmente quando necessário

  return; // Desabilitado
};