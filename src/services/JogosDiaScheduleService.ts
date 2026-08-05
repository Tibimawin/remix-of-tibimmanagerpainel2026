import { collection, doc, getDoc, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { UserConfigService } from './UserConfigService';
import { BaserowService } from './BaserowService';

export interface JogosDiaSchedule {
  id: string;
  userId: string;
  userEmail: string;
  isEnabled: boolean;
  frequency: 'daily' | 'hourly';
  nextRun: string;
}

export class JogosDiaScheduleService {
  private static isRunning = false;

  static async checkAndExecuteForUser(userId: string, userEmail?: string): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const scheduleRef = doc(db, 'jogosDiaSchedules', userId);
      const scheduleSnap = await getDoc(scheduleRef);
      
      // Criar agendamento se não existir
      if (!scheduleSnap.exists()) {
        const globalConfig = await UserConfigService.getGlobalJogosDiaConfig();
        const initialSchedule: JogosDiaSchedule = {
          id: userId,
          userId,
          userEmail: userEmail || '',
          isEnabled: true,
          frequency: (globalConfig as any)?.frequency || 'daily',
          nextRun: new Date().toISOString()
        };
        await setDoc(scheduleRef, initialSchedule);
        return;
      }

      const schedule = { id: scheduleSnap.id, ...scheduleSnap.data() } as JogosDiaSchedule;
      if (!schedule.isEnabled) return;

      const now = new Date();
      if (now >= new Date(schedule.nextRun)) {
        await this.executeImport(schedule);
        await this.scheduleNextRun(schedule);
      }
    } finally {
      this.isRunning = false;
    }
  }

  private static async executeImport(schedule: JogosDiaSchedule): Promise<void> {
    const runId = `jogos_${schedule.userId}_${Date.now()}`;
    const startTime = new Date();
    let stats = { created: 0, updated: 0, errors: 0 };

    try {
      const config = await UserConfigService.getGlobalJogosDiaConfig();
      if (!config?.isActive) return;

      const userConfig = await UserConfigService.getUserConfig(schedule.userId);
      if (!userConfig?.apiToken || !userConfig?.tableIds?.canaisTv) return;

      const sourceService = new BaserowService(config.sourceToken, config.sourceBaseUrl);
      const userBaserow = new BaserowService(userConfig.apiToken, userConfig.baseUrl);
      
      const data = await sourceService.getAllTableData(config.contentTableId);
      
      for (const jogo of data.results) {
        const existing = await userBaserow.getTableData(userConfig.tableIds.canaisTv, 1, 1, jogo.Nome);
        const match = existing.results.find((r: any) => r.Link === jogo.Link);
        
        const payload = {
          'Nome': jogo.Nome,
          'Link': jogo.Link,
          'Categoria': jogo.Campeonato || 'Jogos do Dia',
          'Logo': jogo['Logo Casa'] || '',
          'TimeCasa': jogo['Time Casa'],
          'TimeFora': jogo['Time Fora'],
          'Campeonato': jogo.Campeonato
        };

        if (match) {
          await userBaserow.updateRow(userConfig.tableIds.canaisTv, String(match.id), payload);
          stats.updated++;
        } else {
          await userBaserow.createRow(userConfig.tableIds.canaisTv, payload);
          stats.created++;
        }
      }
      
      await addDoc(collection(db, 'jogosDiaLogs'), {
        userId: schedule.userId,
        runId,
        status: 'success',
        created: stats.created,
        updated: stats.updated,
        errors: 0,
        timestamp: startTime.toISOString(),
        duration: Date.now() - startTime.getTime()
      });
    } catch (error: any) {
      await addDoc(collection(db, 'jogosDiaLogs'), {
        userId: schedule.userId,
        runId,
        status: 'error',
        message: error.message,
        created: stats.created,
        updated: stats.updated,
        errors: 1,
        timestamp: startTime.toISOString()
      });
    }
  }

  private static async scheduleNextRun(schedule: JogosDiaSchedule): Promise<void> {
    const nextRun = new Date();
    if (schedule.frequency === 'hourly') nextRun.setHours(nextRun.getHours() + 1);
    else nextRun.setDate(nextRun.getDate() + 1);
    
    await updateDoc(doc(db, 'jogosDiaSchedules', schedule.id), { nextRun: nextRun.toISOString() });
  }
}


