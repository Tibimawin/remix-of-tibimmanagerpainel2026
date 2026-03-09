import { collection, query, where, getDocs, getDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { BaserowService } from './BaserowService';
import type { ScheduledCleanup } from '@/hooks/useScheduledCleanups';

export class ScheduledCleanupService {
  /**
   * Executa um agendamento específico
   */
  static async executeScheduledCleanup(scheduleId: string): Promise<void> {
    try {
      // Buscar o agendamento específico
      const scheduleRef = doc(db, 'scheduledCleanups', scheduleId);
      const scheduleSnap = await getDoc(scheduleRef);

      if (!scheduleSnap.exists()) {
        throw new Error('Agendamento não encontrado');
      }

      const schedule = { id: scheduleSnap.id, ...scheduleSnap.data() } as ScheduledCleanup;

      if (!schedule.isActive) {
        console.log(`⏸️ Agendamento "${schedule.name}" está inativo, pulando execução.`);
        return;
      }

      console.log(`🚀 Executando agendamento: ${schedule.name}`);

      // Inicializar serviço do Baserow
      const baserowService = new BaserowService(schedule.apiToken, schedule.baseUrl);

      let deletedCount = 0;
      let totalEstimated = 0;
      let page = 1;
      const pageSize = 200; // processar 200 registros por vez (limite do Baserow)
      let hasMore = true;

      console.log(`🧹 Iniciando limpeza otimizada da tabela ${schedule.tableId}`);

      while (hasMore) {
        try {
          console.log(`🔄 Processando página ${page}...`);

          const pageData = await baserowService.getTableData(schedule.tableId, page, pageSize);

          if (!pageData.results || pageData.results.length === 0) {
            console.log(`✅ Nenhum registro restante na página ${page}, finalizando.`);
            break;
          }

          totalEstimated = pageData.count || totalEstimated;
          const currentBatch = pageData.results;

          // Obter IDs da página atual
          const ids = currentBatch.map((r: any) => Number(r.id));

          // Deletar em lote — MUITO mais rápido que individualmente
          try {
            await baserowService.deleteRowsBatch(schedule.tableId, ids);
            deletedCount += ids.length;
            console.log(`🗑️ Página ${page}: ${ids.length} registros deletados (total: ${deletedCount}/${totalEstimated})`);
          } catch (error) {
            console.error(`⚠️ Erro ao deletar lote da página ${page}:`, error);
          }

          // Verificar se há mais páginas
          hasMore = !!pageData.next && currentBatch.length === pageSize;
          page++;

          // Pausa reduzida para maior velocidade (50ms a 150ms)
          const delay = Math.min(50 + Math.random() * 100, 150);
          await new Promise(resolve => setTimeout(resolve, delay));

        } catch (error) {
          console.error(`❌ Erro ao processar página ${page}:`, error);
          page++;
          // Pausa maior em caso de erro
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Atualizar dados da execução
      await this.updateScheduleLastRun(scheduleId, new Date().toISOString(), deletedCount);
      await this.updateNextRun(scheduleId, schedule.frequency, schedule.time);

      console.log(`✅ Agendamento "${schedule.name}" concluído. ${deletedCount}/${totalEstimated} registros deletados.`);

      // Enviar notificação se configurado
      if (schedule.notifications && schedule.email) {
        await this.sendNotification(schedule, deletedCount, totalEstimated);
      }

    } catch (error) {
      console.error('🔥 Erro ao executar agendamento:', error);
      throw error;
    }
  }

  /**
   * Verifica e executa agendamentos prontos para execução
   */
  static async checkAndExecuteSchedules(): Promise<void> {
    try {
      const now = new Date();
      const schedulesRef = collection(db, 'scheduledCleanups');
      const q = query(schedulesRef, where('isActive', '==', true));

      const snapshot = await getDocs(q);

      for (const docSnap of snapshot.docs) {
        const schedule = { id: docSnap.id, ...docSnap.data() } as ScheduledCleanup;

        const nextRunDate = new Date(schedule.nextRun);
        const shouldExecute = now >= nextRunDate;

        if (shouldExecute) {
          console.log(`🕒 Executando agendamento: ${schedule.name} (${schedule.id})`);
          try {
            await this.executeScheduledCleanup(schedule.id);
          } catch (error) {
            console.error(`Erro ao executar agendamento ${schedule.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar agendamentos:', error);
    }
  }

  /**
   * Atualiza informações da última execução
   */
  private static async updateScheduleLastRun(scheduleId: string, lastRun: string, deletedCount: number): Promise<void> {
    try {
      const scheduleRef = doc(db, 'scheduledCleanups', scheduleId);
      await updateDoc(scheduleRef, {
        lastRun,
        lastRunDeletedCount: deletedCount
      });
    } catch (error) {
      console.error('Erro ao atualizar última execução:', error);
    }
  }

  /**
   * Calcula e atualiza a próxima execução
   */
  private static async updateNextRun(scheduleId: string, frequency: string, time: string): Promise<void> {
    try {
      const now = new Date();
      const [hours, minutes] = time.split(':').map(Number);
      const nextRun = new Date();

      // Calcular próxima execução
      if (frequency === 'daily') {
        nextRun.setDate(now.getDate() + 1);
      } else if (frequency === 'weekly') {
        nextRun.setDate(now.getDate() + 7);
      } else if (frequency === 'monthly') {
        nextRun.setMonth(now.getMonth() + 1);
      }

      nextRun.setHours(hours, minutes, 0, 0);

      const scheduleRef = doc(db, 'scheduledCleanups', scheduleId);
      await updateDoc(scheduleRef, { nextRun: nextRun.toISOString() });

      console.log(`📅 Próxima execução agendada para: ${nextRun.toLocaleString()}`);
    } catch (error) {
      console.error('Erro ao atualizar próxima execução:', error);
    }
  }

  /**
   * Envia notificação (placeholder)
   */
  private static async sendNotification(schedule: ScheduledCleanup, deletedCount: number, totalCount: number): Promise<void> {
    console.log(`📨 Notificação: "${schedule.name}" executado. ${deletedCount}/${totalCount} registros deletados.`);
  }
}
