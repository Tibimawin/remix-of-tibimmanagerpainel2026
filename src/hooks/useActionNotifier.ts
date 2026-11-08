import { useEffect, useCallback } from 'react';
import { pushNotificationService } from '@/services/PushNotificationService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

interface ActionNotification {
  action: string;
  entity?: string;
  details?: string;
}

export const useActionNotifier = () => {
  const { userInfo } = useSimpleAuth();

  useEffect(() => {
    // Inicializar serviço de notificações
    pushNotificationService.initialize();
  }, []);

  const notifyAction = useCallback(async (notification: ActionNotification) => {
    const { action, entity, details } = notification;
    
    const message = entity 
      ? `${action} ${entity}${details ? `: ${details}` : ''}`
      : action;

    await pushNotificationService.notifyAction(
      action,
      message,
      userInfo?.email
    );

    console.log('📢 Ação notificada:', message);
  }, [userInfo]);

  const requestPermission = useCallback(async () => {
    return await pushNotificationService.requestPermission();
  }, []);

  const getPermissionStatus = useCallback(() => {
    return pushNotificationService.getPermissionStatus();
  }, []);

  const isSupported = useCallback(() => {
    return pushNotificationService.isSupported();
  }, []);

  return {
    notifyAction,
    requestPermission,
    getPermissionStatus,
    isSupported
  };
};

// Hook para notificar CRUD operations automaticamente
export const useAutoNotifyCRUD = (entityName: string) => {
  const { notifyAction } = useActionNotifier();

  const notifyCreate = useCallback((details?: string) => {
    notifyAction({
      action: 'Criado',
      entity: entityName,
      details
    });
  }, [entityName, notifyAction]);

  const notifyUpdate = useCallback((details?: string) => {
    notifyAction({
      action: 'Atualizado',
      entity: entityName,
      details
    });
  }, [entityName, notifyAction]);

  const notifyDelete = useCallback((details?: string) => {
    notifyAction({
      action: 'Excluído',
      entity: entityName,
      details
    });
  }, [entityName, notifyAction]);

  const notifyImport = useCallback((details?: string) => {
    notifyAction({
      action: 'Importado',
      entity: entityName,
      details
    });
  }, [entityName, notifyAction]);

  return {
    notifyCreate,
    notifyUpdate,
    notifyDelete,
    notifyImport
  };
};
