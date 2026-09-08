import { makeProxyRequest } from '@/utils/proxyRequest';

export interface BaserowAppUser {
  id: number;
  order?: string;
  Nome: string;
  Email: string;
  Senha?: string;
  Status: string;
  DataCriacao?: string;
  ID?: string;
  Limite?: string;
  Moedas?: unknown;
  AppId: string | null;
  Vencimento: string;
  UltimoCheckin?: string | null;
  UltimoAcesso: string;
  Token?: string | null;
  CompartilhamentoAtivo?: boolean;
  DispositivosConectados?: string | null;
}

export interface StreamingAppMetrics {
  totalUsers: number;
  onlineUsers: number;
  onlineTodayUsers: number;
  paidUsers: number;
  freeUsers: number;
  weeklyAccess: {
    dayName: string;
    dateFormatted: string;
    accessCount: number;
  }[];
  users: BaserowAppUser[];
}

export const BASEROW_APP_CONFIG = {
  TABLE_URL: 'http://31.220.72.235:8080/api/database/rows/table/1405/?user_field_names=true&size=200',
  TOKEN: '0m6dXo4S7jgvjMiQxInTjaNmPlEawDEC'
};

/**
 * Converte strings de datas em formatos variados para objeto Date válido
 */
export function parseBaserowDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Formato ISO ou YYYY-MM-DD (com ou sem hora HH:mm:ss)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const formatted = trimmed.replace(' ', 'T');
    const d = new Date(formatted);
    if (!isNaN(d.getTime())) return d;
  }

  // Formato brasileiro DD/MM/YYYY (com ou sem hora HH:mm:ss)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
    const [datePart, timePart] = trimmed.split(' ');
    const parts = datePart.split('/').map(Number);
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (timePart) {
      const tParts = timePart.split(':').map(Number);
      hours = tParts[0] || 0;
      minutes = tParts[1] || 0;
      seconds = tParts[2] || 0;
    }

    const d = new Date(year, month - 1, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d;
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Verifica se o usuário acessou nos últimos 5 minutos
 */
export function isUserOnline(lastAccessStr: string | null | undefined, referenceTime: Date = new Date()): boolean {
  const accessDate = parseBaserowDate(lastAccessStr);
  if (!accessDate) return false;

  const diffMs = referenceTime.getTime() - accessDate.getTime();
  // Até 5 minutos atrás (com tolerância de 1 minuto para relógios dessincronizados)
  return diffMs >= -60000 && diffMs <= 5 * 60 * 1000;
}

/**
 * Verifica se o usuário acessou hoje (mesmo ano, mês e dia da data de referência)
 */
export function isUserOnlineToday(lastAccessStr: string | null | undefined, referenceTime: Date = new Date()): boolean {
  const accessDate = parseBaserowDate(lastAccessStr);
  if (!accessDate) return false;

  return (
    accessDate.getFullYear() === referenceTime.getFullYear() &&
    accessDate.getMonth() === referenceTime.getMonth() &&
    accessDate.getDate() === referenceTime.getDate()
  );
}

/**
 * Verifica se o usuário é Assinante Pago / VIP
 * Status diferente de 'Grátis' e Vencimento >= hoje
 */
export function isUserPaidVip(status: string | null | undefined, vencimentoStr: string | null | undefined, referenceDate: Date = new Date()): boolean {
  const s = (status || '').trim().toLowerCase();
  if (!s || s === 'grátis' || s === 'gratis') return false;

  const venc = parseBaserowDate(vencimentoStr);
  if (!venc) return false;

  const todayStart = new Date(referenceDate);
  todayStart.setHours(0, 0, 0, 0);

  return venc >= todayStart;
}

/**
 * Calcula os acessos diários dos últimos 7 dias (Segunda a Domingo ou últimos 7 dias)
 */
export function calculateWeeklyAccess(users: BaserowAppUser[], referenceDate: Date = new Date()) {
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const result: { dayName: string; dateFormatted: string; accessCount: number }[] = [];

  // Gera os últimos 7 dias terminando hoje
  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(referenceDate.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const dayName = dayNames[d.getDay()];
    const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Contar quantos usuários acessaram nesta data
    let count = 0;
    users.forEach(u => {
      const accessDate = parseBaserowDate(u.UltimoAcesso);
      if (accessDate) {
        if (
          accessDate.getFullYear() === d.getFullYear() &&
          accessDate.getMonth() === d.getMonth() &&
          accessDate.getDate() === d.getDate()
        ) {
          count++;
        }
      }
    });

    result.push({
      dayName: `${dayName} (${dateFormatted})`,
      dateFormatted,
      accessCount: count
    });
  }

  return result;
}

export const StreamingAppService = {
  /**
   * Busca todos os registros da tabela 1405 do Baserow
   */
  async fetchAllAppUsers(): Promise<BaserowAppUser[]> {
    try {
      console.log('📡 [StreamingAppService] Buscando usuários da tabela 1405...');
      
      const response = await makeProxyRequest({
        url: BASEROW_APP_CONFIG.TABLE_URL,
        method: 'GET',
        token: BASEROW_APP_CONFIG.TOKEN
      });

      if (!response.ok) {
        console.error('❌ [StreamingAppService] Erro na resposta do proxy:', response);
        throw new Error(response.error || `Erro ao consultar Baserow (Status ${response.status})`);
      }

      const data = response.data;
      const results: BaserowAppUser[] = Array.isArray(data?.results) ? data.results : [];
      console.log(`✅ [StreamingAppService] ${results.length} usuários carregados da tabela 1405.`);
      return results;
    } catch (error: unknown) {
      console.error('❌ [StreamingAppService] Falha ao carregar usuários:', error);
      throw error;
    }
  },

  /**
   * Retorna os usuários filtrados por AppId
   */
  async getUsersByAppId(appId: string): Promise<BaserowAppUser[]> {
    if (!appId || !appId.trim()) return [];
    
    const allUsers = await this.fetchAllAppUsers();
    const cleanAppId = appId.trim().toLowerCase();

    return allUsers.filter(user => {
      const userAppId = (user.AppId || '').trim().toLowerCase();
      return userAppId === cleanAppId;
    });
  },

  /**
   * Calcula as métricas consolidadas para um dado conjunto de usuários do aplicativo
   */
  calculateMetrics(users: BaserowAppUser[]): StreamingAppMetrics {
    const now = new Date();

    let onlineCount = 0;
    let onlineTodayCount = 0;
    let paidCount = 0;
    let freeCount = 0;

    users.forEach(user => {
      const online = isUserOnline(user.UltimoAcesso, now);
      if (online) onlineCount++;

      const onlineToday = isUserOnlineToday(user.UltimoAcesso, now);
      if (onlineToday) onlineTodayCount++;

      const isPaid = isUserPaidVip(user.Status, user.Vencimento, now);
      if (isPaid) {
        paidCount++;
      } else {
        freeCount++;
      }
    });

    const weeklyAccess = calculateWeeklyAccess(users, now);

    return {
      totalUsers: users.length,
      onlineUsers: onlineCount,
      onlineTodayUsers: onlineTodayCount,
      paidUsers: paidCount,
      freeUsers: freeCount,
      weeklyAccess,
      users
    };
  },

  /**
   * Retorna resumo de todos os AppIds existentes no Baserow e a contagem de usuários de cada um
   */
  async getAppIdSummary(): Promise<{ appId: string; count: number }[]> {
    try {
      const allUsers = await this.fetchAllAppUsers();
      const counts: Record<string, number> = {};

      allUsers.forEach(u => {
        const id = (u.AppId || '').trim();
        if (id) {
          counts[id] = (counts[id] || 0) + 1;
        }
      });

      return Object.entries(counts).map(([appId, count]) => ({ appId, count }));
    } catch (error) {
      console.error('Erro ao obter resumo de AppIds:', error);
      return [];
    }
  }
};
