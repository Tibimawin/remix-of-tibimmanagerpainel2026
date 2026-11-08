import { getMessaging, getToken, onMessage, deleteToken, Messaging } from 'firebase/messaging';
import { app, auth } from '@/config/firebase';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Mantenha em sincronia com SW_VERSION em public/firebase-messaging-sw.js
const SW_VERSION = '1.0.1';


interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

class PushNotificationService {
  private messaging: Messaging | null = null;
  private vapidKey: string | null = null;
  private static edgeFunctionUnavailable = false;


  async initialize() {
    try {
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Workers não suportados neste navegador');
        return false;
      }

      if (!('Notification' in window)) {
        console.warn('Notificações não suportadas neste navegador');
        return false;
      }

      // Registrar Service Worker com versão explícita (evita cache antigo do navegador)
      const registration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?v=${SW_VERSION}`,
        { updateViaCache: 'none' }
      );
      // Força checagem de atualização a cada inicialização
      registration.update().catch(() => {});
      console.log('Service Worker registrado (v' + SW_VERSION + '):', registration);


      this.messaging = getMessaging(app);
      
      // Listener para mensagens em foreground
      onMessage(this.messaging, (payload) => {
        console.log('Mensagem recebida em foreground:', payload);
        this.showNotification(payload);
      });

      return true;
    } catch (error) {
      console.error('Erro ao inicializar notificações:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Permissão de notificação concedida');
        await this.getDeviceToken();
        return true;
      } else {
        console.log('Permissão de notificação negada');
        toast.error('Permissão negada', {
          description: 'Você não receberá notificações push.'
        });
        return false;
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      return false;
    }
  }

  /**
   * Obtém a chave pública VAPID (Web Push certificate).
   * Prioriza a variável de ambiente do build (Vercel) e cai para o backend.
   */
  async getVapidKey(): Promise<string | null> {
    if (this.vapidKey) return this.vapidKey;

    const envKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY as string | undefined;
    if (envKey && envKey.length > 40) {
      this.vapidKey = envKey;
      return this.vapidKey;
    }

    if (PushNotificationService.edgeFunctionUnavailable) return null;

    try {
      const { data, error } = await supabase.functions.invoke('push', { body: { action: 'vapid-key' } });
      if (error) {
        PushNotificationService.edgeFunctionUnavailable = true;
        return null;
      }
      if (data?.key) {
        this.vapidKey = data.key as string;
        return this.vapidKey;
      }
    } catch {
      PushNotificationService.edgeFunctionUnavailable = true;
    }
    return null;
  }

  async getDeviceToken(): Promise<string | null> {
    try {
      if (!this.messaging) {
        await this.initialize();
      }

      if (!this.messaging) {
        throw new Error('Messaging não inicializado');
      }

      const vapidKey = await this.getVapidKey();
      if (!vapidKey) {
        return null;
      }

      const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      const token = await getToken(this.messaging, {
        vapidKey,
        ...(registration ? { serviceWorkerRegistration: registration } : {}),
      });

      if (token) {
        localStorage.setItem('fcm_token', token);
        await this.registerTokenOnServer(token);
        return token;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  /** Salva o token do dispositivo no backend para envios reais via FCM */
  async registerTokenOnServer(token: string): Promise<boolean> {
    if (PushNotificationService.edgeFunctionUnavailable) return false;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return false;
      const { data, error } = await supabase.functions.invoke('push', {
        body: {
          action: 'register-token',
          idToken,
          token,
          user_agent: navigator.userAgent,
          platform: 'web',
        },
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      if (error || (data as any)?.error) {
        PushNotificationService.edgeFunctionUnavailable = true;
        return false;
      }
      localStorage.setItem('fcm_token_registered', token);
      return true;
    } catch {
      PushNotificationService.edgeFunctionUnavailable = true;
      return false;
    }
  }

  /** Desativa o token atual (logout / desativar notificações) */
  async unregister(): Promise<void> {
    const token = localStorage.getItem('fcm_token');
    if (!token) return;
    if (!PushNotificationService.edgeFunctionUnavailable) {
      try {
        await supabase.functions.invoke('push', { body: { action: 'unregister-token', token } });
      } catch {
        PushNotificationService.edgeFunctionUnavailable = true;
      }
    }
    if (this.messaging) await deleteToken(this.messaging).catch(() => {});
    localStorage.removeItem('fcm_token');
    localStorage.removeItem('fcm_token_registered');
  }

  /** Garante que o usuário logado tenha o token registrado (chame após login) */
  async syncTokenForCurrentUser(): Promise<void> {
    if (!auth.currentUser) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const cached = localStorage.getItem('fcm_token');
    const registered = localStorage.getItem('fcm_token_registered');
    if (cached && cached === registered) return;
    await this.getDeviceToken();
  }



  async sendNotification(notification: NotificationPayload): Promise<boolean> {
    try {
      // Em produção, isso seria enviado para o backend que usa o FCM Admin SDK
      // Por enquanto, vamos criar uma notificação local
      if (Notification.permission === 'granted') {
        const notif = new Notification(notification.title, {
          body: notification.body,
          icon: notification.icon || '/favicon.ico',
          badge: notification.badge || '/favicon.ico',
          tag: notification.tag,
          data: notification.data,
          requireInteraction: false,
          silent: false
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };

        // Auto-close após 5 segundos
        setTimeout(() => notif.close(), 5000);

        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    }
  }

  private showNotification(payload: any) {
    const { notification, data } = payload;
    
    toast.info(notification?.title || 'Nova notificação', {
      description: notification?.body,
      duration: 5000
    });

    // Também mostrar notificação nativa
    if (Notification.permission === 'granted' && notification) {
      new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/favicon.ico'
      });
    }
  }

  async notifyAction(action: string, details: string, userId?: string) {
    const notification: NotificationPayload = {
      title: '🔔 Nova Ação no Painel',
      body: `${action}: ${details}`,
      icon: '/favicon.ico',
      tag: `action-${Date.now()}`,
      data: {
        action,
        details,
        userId,
        timestamp: new Date().toISOString()
      }
    };

    await this.sendNotification(notification);
  }

  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }
}

export const pushNotificationService = new PushNotificationService();
