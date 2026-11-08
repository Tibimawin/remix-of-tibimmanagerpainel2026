
import { FirebaseUserService } from './FirebaseUserService';
import { firebaseLogService } from './FirebaseLogService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface UserActivity {
  Ultimo_Login: string;
  Status_Ativo: string;
  Total_Logins: number;
  IP_Ultimo_Acesso: string;
  Dispositivo_Ultimo_Acesso: string;
  Data_Criacao: string;
  Data_Ultima_Atividade: string;
}

class UserActivityService {
  private formatDateTime(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  private getDeviceInfo(): string {
    if (typeof navigator === 'undefined') return 'Desktop';
    const userAgent = navigator.userAgent;
    let deviceInfo = 'Desktop';

    if (userAgent.includes('Mobile')) {
      deviceInfo = 'Mobile';
    } else if (userAgent.includes('Tablet')) {
      deviceInfo = 'Tablet';
    }

    if (userAgent.includes('Chrome')) {
      deviceInfo += ' - Chrome';
    } else if (userAgent.includes('Firefox')) {
      deviceInfo += ' - Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      deviceInfo += ' - Safari';
    } else if (userAgent.includes('Edge')) {
      deviceInfo += ' - Edge';
    }

    return deviceInfo;
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || '0.0.0.0';
    } catch {
      return '0.0.0.0';
    }
  }

  async updateUserActivity(userId: string, activityType: 'login' | 'logout' | 'action', actionDetails?: string): Promise<void> {
    try {
      if (!userId) return;

      const now = new Date();
      const currentDateTime = this.formatDateTime(now);
      const clientIP = await this.getClientIP();
      const deviceInfo = this.getDeviceInfo();

      // Atualizar no Firestore
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        let userEmail = '';
        if (userSnap.exists()) {
          const userData = userSnap.data();
          userEmail = userData.email || '';
          const currentTotal = Number(userData.totalLogins) || 0;

          const updates: Record<string, any> = {
            'deviceInfo.ip': clientIP,
            'deviceInfo.dispositivo': deviceInfo,
            'deviceInfo.lastActivity': currentDateTime,
          };

          if (activityType === 'login') {
            updates.lastLogin = currentDateTime;
            updates.totalLogins = currentTotal + 1;
            updates.isActive = true;
          } else if (activityType === 'logout') {
            updates.isActive = false;
          }

          await updateDoc(userRef, updates);
        }

        // Salvar log de atividade
        if (userEmail) {
          await this.logDetailedActivity(userEmail, activityType, actionDetails, {
            ip: clientIP,
            device: deviceInfo,
            timestamp: currentDateTime
          });
        }
      } catch (firestoreError) {
        console.warn('UserActivityService: Aviso ao atualizar atividade no Firestore:', firestoreError);
      }
    } catch (error) {
      console.error('UserActivityService: Erro ao atualizar atividade do usuário:', error);
    }
  }

  private async logDetailedActivity(userEmail: string, activityType: string, details?: string, context?: any): Promise<void> {
    try {
      let action = '';
      let fullDetails = '';

      switch (activityType) {
        case 'login':
          action = 'Login realizado com sucesso';
          fullDetails = `Usuário ${userEmail} fez login no sistema em ${context?.timestamp}. IP: ${context?.ip}, Dispositivo: ${context?.device}`;
          break;
        case 'logout':
          action = 'Logout realizado';
          fullDetails = `Usuário ${userEmail} fez logout do sistema em ${context?.timestamp}. IP: ${context?.ip}`;
          break;
        case 'action':
          action = details || 'Ação realizada';
          fullDetails = `Usuário ${userEmail} realizou: ${details} em ${context?.timestamp}. IP: ${context?.ip}, Dispositivo: ${context?.device}`;
          break;
      }

      await firebaseLogService.addLog(userEmail, action, fullDetails);
    } catch (error) {
      console.warn('UserActivityService: Erro ao salvar log detalhado:', error);
    }
  }

  async getUsersWithActivity(): Promise<any[]> {
    try {
      const users = await FirebaseUserService.getAllUsers();
      return users.map(user => ({
        id: user.uid,
        Email: user.email,
        Nome: user.name,
        IP_Ultimo_Acesso: user.deviceInfo?.ip || '0.0.0.0',
        Ultimo_Login: user.lastLogin || user.deviceInfo?.lastActivity || '',
        Total_Logins: Number(user.totalLogins) || 0,
        Dispositivo_Ultimo_Acesso: user.deviceInfo?.dispositivo || 'Desktop',
        Status_Ativo: user.isActive ? 'Ativo' : 'Inativo'
      }));
    } catch (error) {
      console.error('UserActivityService: Erro ao buscar usuários:', error);
      return [];
    }
  }
}

export const userActivityService = new UserActivityService();

