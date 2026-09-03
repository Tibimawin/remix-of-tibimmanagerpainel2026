import { collection, doc, getDoc, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { UserConfigService } from './UserConfigService';
import { BaserowService } from './BaserowService';
import { isJogoElegivelHoje, analyzeJogoDate, isBlankOrSeparatorRow } from '@/utils/jogosDiaDateUtils';

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
    const progressRef = doc(db, 'jogosDiaProgress', schedule.userId);

    try {
      const config = await UserConfigService.getGlobalJogosDiaConfig();
      if (!config?.isActive) return;

      const userConfig = await UserConfigService.getUserConfig(schedule.userId);
      const targetTableId = userConfig.tableIds.jogosDia || userConfig.tableIds.canaisTv;
      if (!userConfig?.apiToken || !targetTableId) return;

      const sourceService = new BaserowService(config.sourceToken, config.sourceBaseUrl);
      const userBaserow = new BaserowService(userConfig.apiToken, userConfig.baseUrl);
      
      const data = await sourceService.getAllTableData(config.contentTableId);
      const items = data.results || [];
      const total = items.length;

      // Inicializar progresso
      await setDoc(progressRef, {
        status: 'running',
        current: 0,
        total,
        startTime: startTime.toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      let skippedFuture = 0;

      for (let i = 0; i < total; i++) {
        const jogo = items[i];
        try {
          // Ignorar linhas em branco ou separadores de eventos
          if (isBlankOrSeparatorRow(jogo)) {
            await updateDoc(progressRef, {
              current: i + 1,
              updatedAt: new Date().toISOString()
            });
            continue;
          }

          // REGRA DE OURO: Apenas jogos agendados para HOJE são importados para a grade.
          // Eventos passados (ontem, etc.) ou jogos futuros são ignorados.
          const dateCheck = analyzeJogoDate(jogo.Data || (jogo as any)['Data'], jogo['Data Horario'] || (jogo as any)['Data Horario']);
          if (!dateCheck.canImport) {
            if (dateCheck.isPast) {
              console.log(`⏳ [JogosDiaSchedule] Ignorando jogo passado '${jogo.Nome}' (${dateCheck.displayDate}) - evento já finalizado.`);
            } else {
              console.log(`⏳ [JogosDiaSchedule] Ignorando jogo futuro '${jogo.Nome}' (${dateCheck.displayDate}) - liberado apenas no dia.`);
              skippedFuture++;
            }
            await updateDoc(progressRef, {
              current: i + 1,
              updatedAt: new Date().toISOString()
            });
            continue;
          }

          const existing = await userBaserow.getTableData(targetTableId, 1, 1, jogo.Nome);
          const match = existing.results.find((r: any) => r.Link === jogo.Link);
          
          const payload = {
            'Nome': jogo.Nome,
            'Link': jogo.Link,
            'Categoria': jogo.Campeonato || 'Jogos do Dia',
            'Logo': jogo['Logo Casa'] || '',
            'Capa': jogo['Logo Casa'] || '',
            'TimeCasa': jogo['Time Casa'],
            'TimeFora': jogo['Time Fora'],
            'Campeonato': jogo.Campeonato,
            'Data': jogo.Data || jogo['Data Horario'] || '',
            'LogoCasa': jogo['Logo Casa'] || '',
            'LogoFora': jogo['Logo Fora'] || '',
            'Link1': jogo['Link 1'] || '',
            'Link2': jogo['Link 2'] || '',
            // Inclusão de mapeamento com nomes originais (com espaços) para garantir compatibilidade total
            'Time Casa': jogo['Time Casa'],
            'Time Fora': jogo['Time Fora'],
            'Logo Casa': jogo['Logo Casa'],
            'Logo Fora': jogo['Logo Fora'],
            'Data Horario': jogo['Data Horario'] || jogo.Data || '',
            'Link 1': jogo['Link 1'] || '',
            'Link 2': jogo['Link 2'] || ''
          };

          if (match) {
            await userBaserow.updateRow(targetTableId, String(match.id), payload);
            stats.updated++;
          } else {
            await userBaserow.createRow(targetTableId, payload);
            stats.created++;
          }
        } catch (e) {
          console.error('Erro ao importar jogo individual:', e);
          stats.errors++;
        }

        // Atualizar progresso a cada item ou em lotes se for muito grande
        await updateDoc(progressRef, {
          current: i + 1,
          updatedAt: new Date().toISOString()
        });
      }
      
      await addDoc(collection(db, 'jogosDiaLogs'), {
        userId: schedule.userId,
        runId,
        status: 'success',
        created: stats.created,
        updated: stats.updated,
        errors: stats.errors,
        timestamp: startTime.toISOString(),
        duration: Date.now() - startTime.getTime()
      });

      await updateDoc(progressRef, {
        status: 'completed',
        updatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      await addDoc(collection(db, 'jogosDiaLogs'), {
        userId: schedule.userId,
        runId,
        status: 'error',
        message: error.message,
        created: stats.created,
        updated: stats.updated,
        errors: stats.errors + 1,
        timestamp: startTime.toISOString()
      });

      await updateDoc(progressRef, {
        status: 'error',
        message: error.message,
        updatedAt: new Date().toISOString()
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


