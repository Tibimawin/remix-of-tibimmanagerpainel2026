import { pushNotificationService } from './PushNotificationService';
import { logger } from '@/utils/logger';

export type NotificationScheduleType = 
  | 'expiration' // Expiração de planos
  | 'backup' // Backups programados
  | 'maintenance' // Manutenção programada
  | 'report' // Relatórios periódicos
  | 'reminder'; // Lembretes gerais

export interface ScheduledNotification {
  id: string;
  type: NotificationScheduleType;
  title: string;
  message: string;
  schedule: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
    time?: string; // HH:mm format
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
    specificDate?: string; // ISO date string for 'once'
  };
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
}

class ScheduledNotificationService {
  private schedules: ScheduledNotification[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private readonly STORAGE_KEY = 'scheduled-notifications';
  private readonly CHECK_INTERVAL = 60 * 1000; // Verificar a cada 1 minuto

  constructor() {
    this.loadSchedules();
  }

  /**
   * Carrega agendamentos salvos do localStorage
   */
  private loadSchedules(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.schedules = JSON.parse(saved);
        logger.debug('Agendamentos carregados', { count: this.schedules.length });
      }
    } catch (error) {
      logger.error('Erro ao carregar agendamentos:', error);
      this.schedules = [];
    }
  }

  /**
   * Salva agendamentos no localStorage
   */
  private saveSchedules(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.schedules));
      logger.debug('Agendamentos salvos');
    } catch (error) {
      logger.error('Erro ao salvar agendamentos:', error);
    }
  }

  /**
   * Calcula a próxima execução baseada no agendamento
   */
  private calculateNextRun(schedule: ScheduledNotification['schedule']): Date {
    const now = new Date();
    const next = new Date();

    if (schedule.frequency === 'once' && schedule.specificDate) {
      return new Date(schedule.specificDate);
    }

    // Parse time if provided
    if (schedule.time) {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      next.setHours(hours, minutes, 0, 0);
    }

    switch (schedule.frequency) {
      case 'daily':
        // Se já passou hoje, agenda para amanhã
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        break;

      case 'weekly':
        const targetDay = schedule.dayOfWeek ?? 0;
        const currentDay = next.getDay();
        let daysUntilTarget = targetDay - currentDay;
        
        if (daysUntilTarget < 0 || (daysUntilTarget === 0 && next <= now)) {
          daysUntilTarget += 7;
        }
        
        next.setDate(next.getDate() + daysUntilTarget);
        break;

      case 'monthly':
        const targetDate = schedule.dayOfMonth ?? 1;
        next.setDate(targetDate);
        
        // Se já passou este mês, agenda para o próximo
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        break;
    }

    return next;
  }

  /**
   * Verifica e executa agendamentos pendentes
   */
  private async checkAndExecuteSchedules(): Promise<void> {
    const now = new Date();
    logger.debug('Verificando agendamentos...', { 
      total: this.schedules.length,
      enabled: this.schedules.filter(s => s.enabled).length
    });

    for (const schedule of this.schedules) {
      if (!schedule.enabled) continue;

      const nextRun = schedule.nextRun ? new Date(schedule.nextRun) : null;
      
      // Se não tem nextRun ou já passou da hora
      if (!nextRun || now >= nextRun) {
        await this.executeSchedule(schedule);
      }
    }
  }

  /**
   * Executa um agendamento específico
   */
  private async executeSchedule(schedule: ScheduledNotification): Promise<void> {
    try {
      logger.info('Executando agendamento', { title: schedule.title });

      // Enviar notificação push
      if (pushNotificationService.getPermissionStatus() === 'granted') {
        await pushNotificationService.notifyAction(
          schedule.title,
          schedule.message
        );
      }

      // Atualizar última execução
      schedule.lastRun = new Date().toISOString();

      // Calcular próxima execução (se não for 'once')
      if (schedule.schedule.frequency !== 'once') {
        const nextRun = this.calculateNextRun(schedule.schedule);
        schedule.nextRun = nextRun.toISOString();
      } else {
        // Se for 'once', desabilitar após execução
        schedule.enabled = false;
      }

      this.saveSchedules();
      logger.info('Agendamento executado com sucesso', { title: schedule.title });
    } catch (error) {
      logger.error('Erro ao executar agendamento:', error);
    }
  }

  /**
   * Inicia o verificador automático de agendamentos
   */
  public startScheduler(): void {
    if (this.checkInterval) {
      logger.warn('Scheduler já está rodando');
      return;
    }

    logger.info('Iniciando scheduler de notificações...');
    
    // Executar verificação inicial
    this.checkAndExecuteSchedules();

    // Configurar verificações periódicas
    this.checkInterval = setInterval(() => {
      this.checkAndExecuteSchedules();
    }, this.CHECK_INTERVAL);

    logger.info('Scheduler iniciado com sucesso');
  }

  /**
   * Para o verificador automático
   */
  public stopScheduler(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Scheduler parado');
    }
  }

  /**
   * Adiciona um novo agendamento
   */
  public addSchedule(
    schedule: Omit<ScheduledNotification, 'id' | 'createdAt' | 'nextRun'>
  ): ScheduledNotification {
    const newSchedule: ScheduledNotification = {
      ...schedule,
      id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      nextRun: this.calculateNextRun(schedule.schedule).toISOString()
    };

    this.schedules.push(newSchedule);
    this.saveSchedules();
    
    logger.info('Novo agendamento criado', { title: newSchedule.title });
    return newSchedule;
  }

  /**
   * Atualiza um agendamento existente
   */
  public updateSchedule(
    id: string,
    updates: Partial<ScheduledNotification>
  ): boolean {
    const index = this.schedules.findIndex(s => s.id === id);
    if (index === -1) {
      logger.error('Agendamento não encontrado', { id });
      return false;
    }

    const schedule = this.schedules[index];
    this.schedules[index] = { ...schedule, ...updates };

    // Recalcular nextRun se o schedule mudou
    if (updates.schedule) {
      this.schedules[index].nextRun = this.calculateNextRun(
        this.schedules[index].schedule
      ).toISOString();
    }

    this.saveSchedules();
    logger.info('Agendamento atualizado', { id });
    return true;
  }

  /**
   * Remove um agendamento
   */
  public removeSchedule(id: string): boolean {
    const index = this.schedules.findIndex(s => s.id === id);
    if (index === -1) {
      logger.error('Agendamento não encontrado', { id });
      return false;
    }

    this.schedules.splice(index, 1);
    this.saveSchedules();
    logger.info('Agendamento removido', { id });
    return true;
  }

  /**
   * Lista todos os agendamentos
   */
  public getSchedules(): ScheduledNotification[] {
    return [...this.schedules];
  }

  /**
   * Obtém agendamentos por tipo
   */
  public getSchedulesByType(type: NotificationScheduleType): ScheduledNotification[] {
    return this.schedules.filter(s => s.type === type);
  }

  /**
   * Executa um agendamento manualmente
   */
  public async executeManually(id: string): Promise<boolean> {
    const schedule = this.schedules.find(s => s.id === id);
    if (!schedule) {
      logger.error('Agendamento não encontrado', { id });
      return false;
    }

    await this.executeSchedule(schedule);
    return true;
  }

  /**
   * Cria agendamentos padrão para o sistema
   */
  public createDefaultSchedules(): void {
    // Verificação diária de expiração às 9h
    this.addSchedule({
      type: 'expiration',
      title: 'Verificação de Expiração',
      message: 'Verificando planos próximos do vencimento...',
      schedule: {
        frequency: 'daily',
        time: '09:00'
      },
      enabled: true
    });

    // Lembrete semanal de backup aos domingos às 10h
    this.addSchedule({
      type: 'backup',
      title: 'Lembrete de Backup',
      message: 'Não esqueça de realizar o backup dos seus dados!',
      schedule: {
        frequency: 'weekly',
        dayOfWeek: 0, // Domingo
        time: '10:00'
      },
      enabled: true
    });

    logger.info('Agendamentos padrão criados');
  }
}

export const scheduledNotificationService = new ScheduledNotificationService();
