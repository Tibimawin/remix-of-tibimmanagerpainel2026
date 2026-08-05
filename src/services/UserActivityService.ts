
// Novo serviço para gerenciar atividades de usuários na tabela 758
const ADMIN_API_KEY = 'TH0lxs0P4EzApqjqMXjEqHvtRsjemFgn';
const BASEROW_BASE_URL = 'http://213.199.56.115';
import { BASEROW_PROXY_CONFIG } from '../config/proxyConfig';

const PROXY_URL = BASEROW_PROXY_CONFIG.ACTIVE_PROXY_URL;

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
    // Formato brasileiro: DD/MM/YYYY HH:mm:ss
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  private getDeviceInfo(): string {
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
    } catch (error) {
      console.warn('Erro ao obter IP:', error);
      return '0.0.0.0';
    }
  }

  private async makeRequest(method: string, endpoint: string, data?: any) {
    try {
      const originalUrl = `${BASEROW_BASE_URL}${endpoint}`;
      console.log('UserActivityService: Fazendo requisição:', { method, originalUrl });

      const proxyPayload = {
        url: originalUrl,
        method: method,
        token: ADMIN_API_KEY,
        body: data ? JSON.stringify(data) : null
      };

      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proxyPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('UserActivityService: Erro na resposta:', response.status, errorText);
        throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('UserActivityService: Erro na requisição:', error);
      throw error;
    }
  }

  async updateUserActivity(userId: string, activityType: 'login' | 'logout' | 'action', actionDetails?: string): Promise<void> {
    try {
      console.log('=== UPDATEUSERACTIVITY INICIANDO ===');
      console.log('UserActivityService: Atualizando atividade do usuário:', { userId, activityType, actionDetails });

      const now = new Date();
      const currentDateTime = this.formatDateTime(now);
      const clientIP = await this.getClientIP();
      const deviceInfo = this.getDeviceInfo();

      console.log('UserActivityService: Dados coletados:', {
        currentDateTime,
        clientIP,
        deviceInfo
      });

      // Primeiro, buscar dados atuais do usuário para pegar Total_Logins atual
      console.log('UserActivityService: Buscando dados atuais do usuário...');
      const getUserResponse = await this.makeRequest('GET', `/api/database/rows/table/758/${userId}/?user_field_names=true`);

      console.log('UserActivityService: Dados atuais do usuário:', getUserResponse);

      const currentTotalLogins = Number(getUserResponse.Total_Logins) || 0;
      console.log('UserActivityService: Total_Logins atual:', currentTotalLogins);

      let updateData: any = {
        Data_Ultima_Atividade: currentDateTime,
        IP_Ultimo_Acesso: clientIP,
        Dispositivo_Ultimo_Acesso: deviceInfo
      };

      if (activityType === 'login') {
        updateData.Ultimo_Login = currentDateTime;
        updateData.Status_Ativo = 'Ativo';
        updateData.Total_Logins = currentTotalLogins + 1;

        console.log('UserActivityService: Dados de login preparados:', updateData);
      } else if (activityType === 'logout') {
        updateData.Status_Ativo = 'Inativo';
        console.log('UserActivityService: Dados de logout preparados:', updateData);
      }

      console.log('UserActivityService: Dados finais para atualização:', updateData);

      // Atualizar usuário na tabela 758 com user_field_names=true
      console.log('UserActivityService: Enviando atualização para tabela 758...');
      const updateResponse = await this.makeRequest('PATCH', `/api/database/rows/table/758/${userId}/?user_field_names=true`, updateData);

      console.log('UserActivityService: Usuário atualizado com sucesso:', updateResponse);

      // Registrar no log detalhado (tabela 759)
      await this.logDetailedActivity(getUserResponse.Email, activityType, actionDetails, {
        ip: clientIP,
        device: deviceInfo,
        timestamp: currentDateTime
      });

      console.log('=== UPDATEUSERACTIVITY FINALIZADO ===');

    } catch (error) {
      console.error('UserActivityService: Erro ao atualizar atividade do usuário:', error);
      throw error;
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

      const logData = {
        userEmail: userEmail,
        action: action,
        details: fullDetails,
        timestamp: context?.timestamp || this.formatDateTime(new Date())
      };

      console.log('UserActivityService: Salvando log detalhado:', logData);

      // Salvar no log centralizado (tabela 759) com user_field_names=true
      await this.makeRequest('POST', '/api/database/rows/table/759/?user_field_names=true', logData);

      console.log('UserActivityService: Log detalhado salvo com sucesso');

    } catch (error) {
      console.error('UserActivityService: Erro ao salvar log detalhado:', error);
    }
  }

  async getUsersWithActivity(): Promise<any[]> {
    try {
      console.log('UserActivityService: Buscando usuários com dados de atividade...');

      const response = await this.makeRequest('GET', '/api/database/rows/table/758/?user_field_names=true&size=200');

      console.log('UserActivityService: Resposta dos usuários:', response);

      return response.results || [];
    } catch (error) {
      console.error('UserActivityService: Erro ao buscar usuários:', error);
      return [];
    }
  }
}

export const userActivityService = new UserActivityService();
