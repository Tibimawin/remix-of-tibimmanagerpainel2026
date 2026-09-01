/**
 * Utilitários de data para a funcionalidade de Jogos do Dia.
 * Gerencia a detecção de jogos de Hoje, Amanhã, Futuros e Passados
 * com base na coluna 'Data' ou 'Data Horario' da tabela de origem Baserow.
 */

export interface JogoDateInfo {
  dateStr: string;
  isToday: boolean;
  isTomorrow: boolean;
  isFuture: boolean;
  isPast: boolean;
  canImport: boolean;
  displayDate: string;
  dayOfWeek?: string;
  rawDate?: Date;
}

/**
 * Obtém a data de hoje no fuso horário de Brasília (ou local) no formato YYYY-MM-DD
 */
export function getTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date()); // Retorna YYYY-MM-DD
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Converte qualquer formato de data (Date ISO, DD/MM/YYYY, YYYY-MM-DD, etc.) para YYYY-MM-DD
 */
export function normalizeDateToYMD(dateInput?: string | null): string | null {
  if (!dateInput || typeof dateInput !== 'string') return null;

  const trimmed = dateInput.trim();
  if (!trimmed) return null;

  // Formato ISO direto ou com hora: 2026-09-01 ou 2026-09-01T15:00:00... ou 2026-09-01 15:00
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  }

  // Formato brasileiro: 01/09/2026 ou 01/09/2026 16:00
  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Formato curto brasileiro: 01/09 (assume ano atual)
  const shortDmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})/);
  if (shortDmyMatch) {
    const currentYear = new Date().getFullYear();
    const day = shortDmyMatch[1].padStart(2, '0');
    const month = shortDmyMatch[2].padStart(2, '0');
    return `${currentYear}-${month}-${day}`;
  }

  return null;
}

/**
 * Analisa a data de um jogo e retorna o status completo (Hoje, Amanhã, Futuro, etc.)
 */
export function analyzeJogoDate(dataRaw?: string, dataHorarioRaw?: string): JogoDateInfo {
  const rawCandidate = dataRaw || dataHorarioRaw || '';
  const ymd = normalizeDateToYMD(rawCandidate);

  // Se não foi informada nenhuma data, assume que é hoje para retrocompatibilidade
  if (!ymd) {
    return {
      dateStr: '',
      isToday: true,
      isTomorrow: false,
      isFuture: false,
      isPast: false,
      canImport: true,
      displayDate: 'Hoje',
      dayOfWeek: 'Hoje'
    };
  }

  const todayYMD = getTodayDateString();

  // Calcular diferença em dias
  const [tY, tM, tD] = todayYMD.split('-').map(Number);
  const [jY, jM, jD] = ymd.split('-').map(Number);

  const todayUtc = Date.UTC(tY, tM - 1, tD);
  const jogoUtc = Date.UTC(jY, jM - 1, jD);

  const diffMs = jogoUtc - todayUtc;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const isToday = diffDays === 0;
  const isTomorrow = diffDays === 1;
  const isFuture = diffDays > 0;
  const isPast = diffDays < 0;

  // Formatação amigável para exibição
  const jogoDateObj = new Date(jY, jM - 1, jD, 12, 0, 0);
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const dayOfWeek = dayNames[jogoDateObj.getDay()];
  const formattedBR = `${String(jD).padStart(2, '0')}/${String(jM).padStart(2, '0')}`;

  let displayDate = `${formattedBR} (${dayOfWeek})`;
  if (isToday) displayDate = 'Hoje';
  else if (isTomorrow) displayDate = `Amanhã (${formattedBR})`;

  return {
    dateStr: ymd,
    isToday,
    isTomorrow,
    isFuture,
    isPast,
    // REGRA DE OURO: Apenas jogos de HOJE podem ser importados (jogos futuros estão bloqueados até o dia)
    canImport: isToday,
    displayDate,
    dayOfWeek,
    rawDate: jogoDateObj
  };
}

/**
 * Retorna se um objeto de jogo é elegível para importação hoje
 */
export function isJogoElegivelHoje(jogo: Record<string, unknown>): boolean {
  if (isBlankOrSeparatorRow(jogo)) return false;
  const dateStr = (jogo.Data || jogo['Data Horario'] || '') as string;
  const dateInfo = analyzeJogoDate(dateStr);
  return dateInfo.canImport;
}

/**
 * Detecta se a linha vinda do Baserow é uma linha em branco ou um separador de eventos/dias
 */
export function isBlankOrSeparatorRow(jogo?: Record<string, unknown> | null): boolean {
  if (!jogo) return true;

  const nome = String(jogo.Nome ?? '').trim();
  const timeCasa = String(jogo['Time Casa'] ?? jogo.TimeCasa ?? '').trim();
  const timeFora = String(jogo['Time Fora'] ?? jogo.TimeFora ?? '').trim();
  const link = String(jogo.Link ?? jogo.link ?? '').trim();
  const link1 = String(jogo['Link 1'] ?? '').trim();

  // Linha 100% vazia ou sem times, links e nome
  if (!link && !link1 && !timeCasa && !timeFora && !nome) {
    return true;
  }

  // Linhas marcadas propositalmente como divisor (ex: '---', '===', 'Separador', 'Divisor')
  if (nome && (/^[-=_*~]{2,}$/.test(nome) || /^(separador|divisor|linha em branco|---)/i.test(nome))) {
    return true;
  }

  // Linha sem links e sem times (mesmo que tenha preenchido só a Data ou um título no Campeonato/Nome)
  if (!link && !link1 && !timeCasa && !timeFora) {
    return true;
  }

  return false;
}

/**
 * Retorna o título formatado para exibição no separador visual de dias/eventos
 */
export function getSeparatorLabel(jogo?: Record<string, unknown> | null): { title: string; subtitle?: string; isDateSpecific: boolean } {
  const dataRaw = String(jogo?.Data ?? jogo?.['Data Horario'] ?? '').trim();
  const campeonato = String(jogo?.Campeonato ?? '').trim();
  const nome = String(jogo?.Nome ?? '').trim();

  // Se tiver data preenchida
  if (dataRaw) {
    const dateInfo = analyzeJogoDate(dataRaw);
    return {
      title: dateInfo.isToday
        ? 'Data dos Eventos — Hoje'
        : dateInfo.isTomorrow
        ? 'Data dos Eventos — Amanhã'
        : `Data dos Eventos — ${dateInfo.displayDate}`,
      subtitle: 'Programação de Jogos',
      isDateSpecific: true
    };
  }

  // Se tiver um nome customizado que não seja só traços
  if (nome && !/^[-=_*~]{2,}$/.test(nome) && !/^(separador|divisor|linha em branco|---)/i.test(nome)) {
    return {
      title: `Data dos Eventos — ${nome}`,
      subtitle: 'Programação de Jogos',
      isDateSpecific: false
    };
  }

  // Se tiver campeonato preenchido na linha divisória
  if (campeonato && !/^(jogos do dia|evento)/i.test(campeonato)) {
    return {
      title: `Data dos Eventos — ${campeonato}`,
      subtitle: 'Programação de Jogos',
      isDateSpecific: false
    };
  }

  // Linha totalmente em branco: divisor geral de dias
  return {
    title: 'Data dos Eventos',
    subtitle: 'Programação e Confrontos',
    isDateSpecific: false
  };
}
