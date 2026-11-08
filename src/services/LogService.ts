
import { firebaseLogService } from './FirebaseLogService';

export interface SystemLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: string;
  details?: string;
}

class LogService {
  private readonly MAX_LOGS = 200;

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
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

  async addLog(userEmail: string, action: string, details?: string): Promise<void> {
    try {
      const timestamp = this.formatDate(new Date());
      const newLog: SystemLog = {
        id: this.generateId(),
        userEmail: userEmail || 'Usuário',
        action: action || 'Ação',
        details: details || '',
        timestamp: timestamp
      };

      // Salvar no localStorage de forma segura
      this.addLogToLocalStorage(newLog);

      // Sincronizar com FirebaseLogService
      try {
        await firebaseLogService.addLog(userEmail, action, details);
      } catch (fbError) {
        console.warn('LogService: Aviso ao sincronizar com FirebaseLogService:', fbError);
      }
    } catch (error) {
      console.error('LogService: Erro ao registrar log:', error);
    }
  }

  private addLogToLocalStorage(newLog: SystemLog): void {
    try {
      const logs = this.getLogsFromLocalStorage();
      logs.unshift(newLog);

      if (logs.length > this.MAX_LOGS) {
        logs.splice(this.MAX_LOGS);
      }

      localStorage.setItem('system-logs', JSON.stringify(logs));
    } catch (error) {
      console.error('LogService: Erro ao salvar log no localStorage:', error);
    }
  }

  async getLogs(): Promise<SystemLog[]> {
    try {
      return this.getLogsFromLocalStorage();
    } catch (error) {
      console.error('LogService: Erro ao carregar logs:', error);
      return [];
    }
  }

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
    localStorage.removeItem('system-logs');
  }
}

export const logService = new LogService();

