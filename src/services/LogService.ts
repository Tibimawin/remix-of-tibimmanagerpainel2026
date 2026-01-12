
export interface SystemLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: string;
  details?: string;
}

// Configurações para requisições ao Baserow (igual ao AdminDashboard)
const ADMIN_API_KEY = 'TH0lxs0P4EzApqjqMXjEqHvtRsjemFgn';
const BASEROW_BASE_URL = 'http://213.199.56.115';
import { BASEROW_PROXY_CONFIG } from '../config/proxyConfig';

const PROXY_URL = BASEROW_PROXY_CONFIG.ACTIVE_PROXY_URL;

class LogService {
  private readonly MAX_LOGS = 100;

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private formatDate(date: Date): string {
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Função para fazer requisições diretas ao proxy (atualizada para usar JSON body)
  private async makeRequest(method: string, endpoint: string, data?: any) {
    try {
      const originalUrl = `${BASEROW_BASE_URL}${endpoint}`;
      console.log('LogService: Fazendo requisição para:', originalUrl);
      console.log('LogService: Método:', method);
      console.log('LogService: Dados a serem enviados:', data);

      // 🔧 Usar formato JSON no body (igual ao BaserowService)
      const proxyPayload = {
        url: originalUrl,
        method: method,
        token: ADMIN_API_KEY,
        body: data ? JSON.stringify(data) : null
      };

      console.log('LogService: Payload do proxy:', proxyPayload);

      const response = await fetch(PROXY_URL, {
        method: 'POST', // Sempre POST para o proxy
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proxyPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LogService: Erro na resposta:', {
          status: response.status,
          error: errorText
        });
        throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('LogService: Resposta recebida com sucesso');
      return result;
    } catch (error) {
      console.error('LogService: Erro na requisição:', error);
      throw error;
    }
  }

  async addLog(userEmail: string, action: string, details?: string): Promise<void> {
    try {
      const timestamp = this.formatDate(new Date());
      const newLog = {
        userEmail: userEmail,
        action: action,
        details: details || '',
        timestamp: timestamp
      };

      console.log('LogService: Adicionando log:', newLog);

      // Tentar salvar no Baserow primeiro
      try {
        const result = await this.makeRequest('POST', '/api/database/rows/table/759/', newLog);
        console.log('LogService: Log salvo no Baserow com sucesso:', result);
      } catch (baserowError) {
        console.warn('LogService: Erro ao salvar no Baserow, usando localStorage como fallback:', baserowError);
        // Fallback para localStorage se o Baserow falhar
        this.addLogToLocalStorage(userEmail, action, details);
      }
    } catch (error) {
      console.error('LogService: Erro ao registrar log:', error);
      // Fallback para localStorage
      this.addLogToLocalStorage(userEmail, action, details);
    }
  }

  // Método de fallback para localStorage
  private addLogToLocalStorage(userEmail: string, action: string, details?: string): void {
    try {
      const logs = this.getLogsFromLocalStorage();
      const newLog: SystemLog = {
        id: this.generateId(),
        timestamp: this.formatDate(new Date()),
        userEmail,
        action,
        details
      };

      logs.unshift(newLog);

      if (logs.length > this.MAX_LOGS) {
        logs.splice(this.MAX_LOGS);
      }

      localStorage.setItem('system-logs', JSON.stringify(logs));
      console.log('LogService: Log salvo no localStorage (fallback):', newLog);
    } catch (error) {
      console.error('LogService: Erro ao salvar log no localStorage:', error);
    }
  }

  async getLogs(): Promise<SystemLog[]> {
    try {
      console.log('LogService: Buscando logs centralizados...');

      // Tentar buscar do Baserow primeiro
      try {
        const response = await this.makeRequest('GET', '/api/database/rows/table/759/?user_field_names=true&size=100&order=-id');
        const logs = response.results || [];

        console.log('LogService: Logs obtidos do Baserow:', logs.length);
        console.log('LogService: Exemplo de log do Baserow:', logs[0]);

        // Converter para o formato esperado com melhor mapeamento
        const formattedLogs: SystemLog[] = logs.map((log: any) => {
          console.log('LogService: Processando log:', log);

          return {
            id: log.id?.toString() || this.generateId(),
            timestamp: log.timestamp || this.formatDate(new Date()),
            userEmail: log.userEmail || log.user_email || log.Email || 'Usuário Desconhecido',
            action: log.action || log.Action || 'Ação não registrada',
            details: log.details || log.Details || ''
          };
        });

        console.log('LogService: Logs formatados:', formattedLogs.slice(0, 3));
        return formattedLogs;
      } catch (baserowError) {
        console.warn('LogService: Erro ao buscar logs do Baserow, usando localStorage como fallback:', baserowError);
        return this.getLogsFromLocalStorage();
      }
    } catch (error) {
      console.error('LogService: Erro ao carregar logs:', error);
      return this.getLogsFromLocalStorage();
    }
  }

  // Método de fallback para localStorage
  private getLogsFromLocalStorage(): SystemLog[] {
    try {
      const stored = localStorage.getItem('system-logs');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('LogService: Erro ao carregar logs do localStorage:', error);
      return [];
    }
  }

  clearLogs(): void {
    // Limpar localStorage (método atual)
    localStorage.removeItem('system-logs');

    // TODO: Implementar limpeza no Baserow se necessário
    console.log('LogService: Logs limpos do localStorage');
  }
}

export const logService = new LogService();
