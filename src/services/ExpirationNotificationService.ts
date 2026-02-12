import { db } from '@/config/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, onSnapshot, orderBy, getDoc } from 'firebase/firestore';
import { FirebaseUserService } from './FirebaseUserService';
import { logger } from '@/utils/logger';

export interface ExpirationNotification {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  expiryDate: string;
  daysRemaining: number;
  notificationSent: boolean;
  dismissed: boolean;
  createdAt: string;
  lastReminder?: string;
}

export const ExpirationNotificationService = {
  // Verificar e criar notificações para usuários próximos do vencimento
  async checkAndCreateExpirationNotifications(): Promise<void> {
    try {
      logger.debug('Verificando usuários próximos do vencimento...');
      
      // Ler config de dias do admin
      let configDays = 5;
      try {
        const configDoc = await getDoc(doc(db, 'systemConfig', 'expirationPush'));
        if (configDoc.exists()) {
          const data = configDoc.data();
          configDays = data.daysBeforeExpiry ?? 5;
          if (data.enabled === false) {
            logger.debug('Notificações push desabilitadas pelo admin');
            return;
          }
        }
      } catch { /* usar default */ }

      // Buscar todos os usuários ativos
      const users = await FirebaseUserService.getAllUsers();
      const now = new Date();
      
      for (const user of users) {
        if (!user.expiryDate || !user.isActive) continue;
        
        const expiryDate = new Date(user.expiryDate);
        const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        
        // Se faltam 5 dias ou menos e ainda não foi criada notificação
        if (daysRemaining <= configDays && daysRemaining >= 0) {
          const existingNotification = await this.getExpirationNotificationByUser(user.uid);
          
          if (!existingNotification) {
            // Criar nova notificação de expiração
            await this.createExpirationNotification({
              userId: user.uid,
              userEmail: user.email,
              userName: user.name,
              expiryDate: user.expiryDate,
              daysRemaining,
              notificationSent: true,
              dismissed: false,
              createdAt: new Date().toISOString()
            });
            
            // Criar notificação no sistema geral também
            await addDoc(collection(db, 'userNotifications'), {
              titulo: 'Assinatura Expirando em Breve',
              mensagem: `Sua assinatura expira em ${daysRemaining} dia(s). Renove agora para continuar aproveitando todos os recursos.`,
              tipo: 'warning',
              dataRecebimento: new Date(),
              lida: false,
              destinatario: user.email,
              emailDestinatario: user.email,
              persistent: true, // Notificação persistente
              expirationWarning: true
            });
            
            logger.debug('Notificação de expiração criada para usuário:', { email: user.email });
          } else if (!existingNotification.dismissed) {
            // Atualizar dias restantes se mudou
            if (existingNotification.daysRemaining !== daysRemaining) {
              await this.updateExpirationNotification(existingNotification.id!, {
                daysRemaining,
                lastReminder: new Date().toISOString()
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Erro ao verificar notificações de expiração:', error);
    }
  },

  // Criar notificação de expiração
  async createExpirationNotification(notification: Omit<ExpirationNotification, 'id'>): Promise<void> {
    try {
      await addDoc(collection(db, 'expirationNotifications'), notification);
      logger.debug('Notificação de expiração criada:', { email: notification.userEmail });
      
      // Enviar notificação push se disponível
      try {
        const { pushNotificationService } = await import('./PushNotificationService');
        if (pushNotificationService.getPermissionStatus() === 'granted') {
          const pushBody = `Seu plano expira em ${notification.daysRemaining} ${notification.daysRemaining === 1 ? 'dia' : 'dias'}. Renove agora!`;
          await pushNotificationService.notifyAction(
            'Renovação Necessária',
            pushBody,
            notification.userId
          );
          
          // Salvar log do push
          await addDoc(collection(db, 'pushNotificationLogs'), {
            userId: notification.userId,
            userEmail: notification.userEmail,
            type: 'expiration_warning',
            title: 'Renovação Necessária',
            body: pushBody,
            daysRemaining: notification.daysRemaining,
            sentAt: new Date().toISOString(),
            status: 'sent',
            source: 'admin_check'
          });
        }
      } catch (error) {
        logger.debug('Push notification service not available');
      }
    } catch (error) {
      logger.error('Erro ao criar notificação de expiração:', error);
      throw error;
    }
  },

  // Buscar notificação de expiração por usuário
  async getExpirationNotificationByUser(userId: string): Promise<ExpirationNotification | null> {
    try {
      const q = query(
        collection(db, 'expirationNotifications'),
        where('userId', '==', userId),
        where('dismissed', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as ExpirationNotification;
      }
      
      return null;
    } catch (error) {
      logger.error('Erro ao buscar notificação de expiração:', error);
      return null;
    }
  },

  // Atualizar notificação de expiração
  async updateExpirationNotification(id: string, updates: Partial<ExpirationNotification>): Promise<void> {
    try {
      const docRef = doc(db, 'expirationNotifications', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      logger.error('Erro ao atualizar notificação de expiração:', error);
      throw error;
    }
  },

  // Dispensar notificação de expiração (quando usuário renova)
  async dismissExpirationNotification(userId: string): Promise<void> {
    try {
      const notification = await this.getExpirationNotificationByUser(userId);
      if (notification?.id) {
        await this.updateExpirationNotification(notification.id, {
          dismissed: true
        });
        
        // Remover notificações persistentes relacionadas
        const q = query(
          collection(db, 'userNotifications'),
          where('emailDestinatario', '==', notification.userEmail),
          where('expirationWarning', '==', true)
        );
        
        const querySnapshot = await getDocs(q);
        for (const docSnap of querySnapshot.docs) {
          await deleteDoc(doc(db, 'userNotifications', docSnap.id));
        }
      }
    } catch (error) {
      logger.error('Erro ao dispensar notificação de expiração:', error);
      throw error;
    }
  },

  // Buscar todas as notificações de expiração (para admin)
  async getAllExpirationNotifications(): Promise<ExpirationNotification[]> {
    try {
      const q = query(
        collection(db, 'expirationNotifications'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ExpirationNotification));
    } catch (error) {
      logger.error('Erro ao buscar todas as notificações de expiração:', error);
      return [];
    }
  },

  // Listener em tempo real para notificações de expiração de um usuário
  onUserExpirationNotification(userId: string, callback: (notification: ExpirationNotification | null) => void) {
    const q = query(
      collection(db, 'expirationNotifications'),
      where('userId', '==', userId),
      where('dismissed', '==', false)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        callback({
          id: doc.id,
          ...doc.data()
        } as ExpirationNotification);
      } else {
        callback(null);
      }
    });
  },

  // Remover todas as notificações de expiração de um usuário
  async removeAllUserExpirationNotifications(userEmail: string): Promise<void> {
    try {
      // Remover notificações da tabela expirationNotifications
      const expirationQuery = query(
        collection(db, 'expirationNotifications'),
        where('userEmail', '==', userEmail)
      );
      
      const expirationSnapshot = await getDocs(expirationQuery);
      for (const docSnap of expirationSnapshot.docs) {
        await deleteDoc(doc(db, 'expirationNotifications', docSnap.id));
      }
      
      // Remover notificações da tabela userNotifications com expirationWarning
      const userNotificationsQuery = query(
        collection(db, 'userNotifications'),
        where('emailDestinatario', '==', userEmail),
        where('expirationWarning', '==', true)
      );
      
      const userNotificationsSnapshot = await getDocs(userNotificationsQuery);
      for (const docSnap of userNotificationsSnapshot.docs) {
        await deleteDoc(doc(db, 'userNotifications', docSnap.id));
      }
      
      // Remover também notificações de expiração por título (para casos antigos)
      const titleQuery = query(
        collection(db, 'userNotifications'),
        where('emailDestinatario', '==', userEmail),
        where('titulo', '==', 'Assinatura Expirando em Breve')
      );
      
      const titleSnapshot = await getDocs(titleQuery);
      for (const docSnap of titleSnapshot.docs) {
        await deleteDoc(doc(db, 'userNotifications', docSnap.id));
      }
      
      logger.debug('Todas as notificações de expiração removidas para:', { userEmail });
    } catch (error) {
      logger.error('Erro ao remover notificações de expiração:', error);
      throw error;
    }
  },

  // Executar verificação automática (pode ser chamado periodicamente)
  async runAutomaticCheck(): Promise<void> {
    try {
      logger.debug('Executando verificação automática de expirações...');
      await this.checkAndCreateExpirationNotifications();
    } catch (error) {
      logger.error('Erro na verificação automática:', error);
    }
  }
};