import { db } from '@/config/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { MAXPLUS_TRIAL_DURATION_MS } from '@/types/planTypes';

export interface MaxPlusTrialInfo {
  hasStarted: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  remainingMs: number;
  remainingSeconds: number;
  isActive: boolean;
  isExpired: boolean;
}

export const MaxPlusTrialService = {
  /**
   * Obtém a data de início do teste, verificando primeiro no Firestore e em seguida no localStorage
   */
  getTrialStartDate(userId?: string, firestoreStart?: string): string | null {
    if (firestoreStart && typeof firestoreStart === 'string' && firestoreStart.trim() !== '') {
      // Sincroniza com localStorage se ainda não estiver
      const storageKey = userId ? `maxplus_trial_start_${userId}` : 'maxplus_trial_start_guest';
      try {
        if (!localStorage.getItem(storageKey)) {
          localStorage.setItem(storageKey, firestoreStart);
        }
      } catch (e) {
        // Ignora erros de localStorage privado
      }
      return firestoreStart;
    }

    const storageKey = userId ? `maxplus_trial_start_${userId}` : 'maxplus_trial_start_guest';
    try {
      const local = localStorage.getItem(storageKey) || localStorage.getItem('maxplus_trial_start_device');
      if (local) return local;
    } catch (e) {
      // Ignore
    }

    return null;
  },

  /**
   * Calcula as informações completas do teste de 24 horas
   */
  getTrialInfo(userId?: string, firestoreStart?: string): MaxPlusTrialInfo {
    const startedAt = this.getTrialStartDate(userId, firestoreStart);

    if (!startedAt) {
      return {
        hasStarted: false,
        startedAt: null,
        expiresAt: null,
        remainingMs: 0,
        remainingSeconds: 0,
        isActive: false,
        isExpired: false
      };
    }

    const startTime = new Date(startedAt).getTime();
    if (isNaN(startTime)) {
      return {
        hasStarted: false,
        startedAt: null,
        expiresAt: null,
        remainingMs: 0,
        remainingSeconds: 0,
        isActive: false,
        isExpired: false
      };
    }

    const expiresTime = startTime + MAXPLUS_TRIAL_DURATION_MS;
    const now = Date.now();
    const remainingMs = Math.max(0, expiresTime - now);
    const remainingSeconds = Math.floor(remainingMs / 1000);
    const isActive = remainingMs > 0;
    const isExpired = remainingMs === 0;

    return {
      hasStarted: true,
      startedAt,
      expiresAt: new Date(expiresTime).toISOString(),
      remainingMs,
      remainingSeconds,
      isActive,
      isExpired
    };
  },

  /**
   * Inicia o teste de 24h para o usuário (chamado na primeira visualização do MaxPlus)
   */
  async startTrial(userId?: string): Promise<MaxPlusTrialInfo> {
    const current = this.getTrialInfo(userId);
    if (current.hasStarted) {
      return current;
    }

    const nowIso = new Date().toISOString();
    const storageKey = userId ? `maxplus_trial_start_${userId}` : 'maxplus_trial_start_guest';

    try {
      localStorage.setItem(storageKey, nowIso);
      localStorage.setItem('maxplus_trial_start_device', nowIso);
    } catch (e) {
      console.warn('Erro ao salvar início de teste no localStorage:', e);
    }

    // Persistir no Firestore
    if (userId && userId !== 'guest' && userId !== 'unknown') {
      try {
        const permRef = doc(db, 'userPermissions', userId);
        await updateDoc(permRef, {
          maxplusTrialStartedAt: nowIso
        }).catch(async () => {
          // Se o documento ainda não existir, cria com merge
          await setDoc(permRef, { maxplusTrialStartedAt: nowIso }, { merge: true });
        });

        // Também salva de forma redundante em users/{userId}
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, { maxplusTrialStartedAt: nowIso }, { merge: true }).catch(() => {});
        console.log(`⏱️ [MaxPlusTrial] Teste de 24h iniciado para usuário ${userId} em ${nowIso}`);
      } catch (err) {
        console.error('Erro ao registrar início do teste MaxPlus no Firestore:', err);
      }
    }

    return this.getTrialInfo(userId, nowIso);
  },

  /**
   * Verifica rapidamente se o teste de 24h ainda está ativo
   */
  isTrialActive(userId?: string, firestoreStart?: string): boolean {
    const info = this.getTrialInfo(userId, firestoreStart);
    // Se o teste ainda não foi iniciado, é considerado ativo (pois será iniciado ao entrar)
    if (!info.hasStarted) return true;
    return info.isActive;
  },

  /**
   * Verifica se o teste de 24h já expirou
   */
  isTrialExpired(userId?: string, firestoreStart?: string): boolean {
    const info = this.getTrialInfo(userId, firestoreStart);
    return info.hasStarted && info.isExpired;
  },

  /**
   * Formata segundos restantes em HH:MM:SS
   */
  formatRemainingTime(totalSeconds: number): { hours: string; minutes: string; seconds: string; fullText: string } {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const hStr = pad(hours);
    const mStr = pad(minutes);
    const sStr = pad(seconds);

    return {
      hours: hStr,
      minutes: mStr,
      seconds: sStr,
      fullText: `${hStr}:${mStr}:${sStr}`
    };
  }
};
