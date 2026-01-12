import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  Timestamp,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface FirebaseLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: string;
  details?: string;
  createdAt: Timestamp;
}

class FirebaseLogService {
  private logsCollection = 'system_logs';
  private lastLogKey: string | null = null;
  private lastLogTime: number = 0;
  private static readonly MIN_LOG_INTERVAL_MS = 10000; // 10s entre logs idênticos

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
      const logData = {
        timestamp,
        userEmail,
        action,
        details: details || '',
        createdAt: Timestamp.now()
      };

      // Sempre registrar no localStorage primeiro (fonte principal de detalhes)
      try {
        const existing = JSON.parse(localStorage.getItem('system-logs') || '[]');
        const newLog = {
          id: Date.now().toString(),
          ...logData,
        };
        existing.unshift(newLog);
        const MAX_LOCAL_LOGS = 500;
        const trimmed = existing.slice(0, MAX_LOCAL_LOGS);
        localStorage.setItem('system-logs', JSON.stringify(trimmed));
      } catch (localError) {
        console.error('FirebaseLogService: Erro ao salvar log no localStorage:', localError);
      }

      // Throttling simples: evitar logs duplicados em sequência muito rápida
      const key = `${userEmail}|${action}|${details || ''}`;
      const now = Date.now();
      if (this.lastLogKey === key && now - this.lastLogTime < FirebaseLogService.MIN_LOG_INTERVAL_MS) {
        console.log('FirebaseLogService: Log ignorado por throttling (duplicado em curto intervalo).');
        return;
      }

      this.lastLogKey = key;
      this.lastLogTime = now;

      // Apenas enviar logs críticos para o Firestore (erros/falhas)
      const text = `${action} ${details || ''}`.toLowerCase();
      const isCritical = text.includes('erro') || text.includes('error') || text.includes('falha') || text.includes('fail');

      if (!isCritical) {
        return;
      }

      console.log('FirebaseLogService: Adicionando log crítico no Firestore:', logData);
      const docRef = await addDoc(collection(db, this.logsCollection), logData);
      console.log('FirebaseLogService: Log crítico adicionado com ID:', docRef.id);
    } catch (error) {
      console.error('FirebaseLogService: Erro ao adicionar log:', error);
      throw error;
    }
  }

  // Listener em tempo real para logs
  onLogsChange(callback: (logs: FirebaseLog[]) => void): () => void {
    try {
      console.log('FirebaseLogService: Configurando listener em tempo real...');
      
      const logsQuery = query(
        collection(db, this.logsCollection),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
        const logs: FirebaseLog[] = [];
        
        snapshot.forEach((doc) => {
          logs.push({
            id: doc.id,
            ...doc.data()
          } as FirebaseLog);
        });

        console.log('FirebaseLogService: Logs atualizados em tempo real:', logs.length);
        callback(logs);
      }, (error) => {
        console.error('FirebaseLogService: Erro no listener:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('FirebaseLogService: Erro ao configurar listener:', error);
      return () => {};
    }
  }

  // Buscar logs por período
  async getLogsByPeriod(startDate: Date, endDate: Date): Promise<FirebaseLog[]> {
    try {
      console.log('FirebaseLogService: Buscando logs por período:', { startDate, endDate });
      
      const logsQuery = query(
        collection(db, this.logsCollection),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(logsQuery);
      const logs: FirebaseLog[] = [];

      querySnapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data()
        } as FirebaseLog);
      });

      console.log('FirebaseLogService: Logs encontrados para o período:', logs.length);
      return logs;
    } catch (error) {
      console.error('FirebaseLogService: Erro ao buscar logs por período:', error);
      return [];
    }
  }

  // Buscar logs de atividades recentes (últimas 24h)
  onRecentActivitiesChange(callback: (logs: FirebaseLog[]) => void): () => void {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const recentQuery = query(
        collection(db, this.logsCollection),
        where('createdAt', '>=', Timestamp.fromDate(yesterday)),
        orderBy('createdAt', 'desc'),
        limit(15)
      );

      const unsubscribe = onSnapshot(recentQuery, (snapshot) => {
        const logs: FirebaseLog[] = [];
        
        snapshot.forEach((doc) => {
          logs.push({
            id: doc.id,
            ...doc.data()
          } as FirebaseLog);
        });

        console.log('FirebaseLogService: Atividades recentes atualizadas:', logs.length);
        callback(logs);
      }, (error) => {
        console.error('FirebaseLogService: Erro no listener de atividades recentes:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('FirebaseLogService: Erro ao configurar listener de atividades recentes:', error);
      return () => {};
    }
  }
}

export const firebaseLogService = new FirebaseLogService();