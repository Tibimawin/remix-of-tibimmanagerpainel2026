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
 * Converte qualquer formato de data (Date ISO, DD/MM/YYYY, YYYY-MM-DD, etc.) para YYYY-MM-DD no fuso de Brasília
 */
export function normalizeDateToYMD(dateInput?: unknown): string | null {
  if (!dateInput) return null;

  let str = '';
  if (typeof dateInput === 'string') {
    str = dateInput.trim();
  } else if (dateInput instanceof Date) {
    try {
      str = dateInput.toISOString();
    } catch {
      return null;
    }
  } else if (typeof dateInput === 'object' && dateInput !== null && 'value' in dateInput) {
    str = String((dateInput as { value: unknown }).value ?? '').trim();
  } else {
    str = String(dateInput).trim();
  }

  if (!str) return null;

  // Se for ISO completo com timezone (ex: 2026-09-03T23:00:00Z ou +00:00)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        return formatter.format(d);
      }
    } catch {
      // continua para os padrões abaixo
    }
  }

  // 1) Formato ISO direto ou com hora: 2026-09-01 ou 2026/09/01
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2) Formato brasileiro: 01/09/2026, 01-09-2026 ou 01.09.2026
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3) Formato brasileiro embutido em texto (ex: "Quarta 01/09/2026", "Jogo 01/09/2026")
  const embeddedDmyMatch = str.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (embeddedDmyMatch) {
    const day = embeddedDmyMatch[1].padStart(2, '0');
    const month = embeddedDmyMatch[2].padStart(2, '0');
    const year = embeddedDmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 4) Formato curto brasileiro: 01/09, 01-09 ou 01.09 (assume ano atual)
  const shortDmyMatch = str.match(/(?:^|[^\d])(\d{1,2})[-/.](\d{1,2})(?:[^\d]|$)/);
  if (shortDmyMatch) {
    const currentYear = new Date().getFullYear();
    const day = shortDmyMatch[1].padStart(2, '0');
    const month = shortDmyMatch[2].padStart(2, '0');
    const dNum = Number(day);
    const mNum = Number(month);
    if (dNum >= 1 && dNum <= 31 && mNum >= 1 && mNum <= 12) {
      return `${currentYear}-${month}-${day}`;
    }
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

/**
 * Filtra jogos do passado e organiza os separadores de eventos.
 * - Jogos com data anterior a hoje (ontem, anteontem, etc.) são removidos completamente.
 * - Linhas em branco/separadores que pertenciam a dias do passado são removidos.
 * - Separadores sem jogos ativos associados não poluem a interface.
 */
export function sanitizeAndFilterActiveJogos<T extends Record<string, unknown>>(jogos: T[]): T[] {
  if (!jogos || !Array.isArray(jogos)) return [];

  const getRowRawDate = (row: Record<string, unknown> | null | undefined): string => {
    return String(
      row?.Data ?? 
      row?.['Data Horario'] ?? 
      row?.DataHorario ?? 
      row?.['Data/Hora'] ?? 
      row?.DataHora ?? 
      ''
    ).trim();
  };

  // 1. Mapear cada linha com sua identificação
  const analyzed = jogos.map(item => {
    const isSeparator = isBlankOrSeparatorRow(item);
    const rawDate = getRowRawDate(item);
    const dateInfo = rawDate ? analyzeJogoDate(rawDate) : null;
    return {
      item,
      isSeparator,
      rawDate,
      dateInfo
    };
  });

  // 2. Propagação de contexto de data em blocos:
  // Se um separador tiver data explícita (ex: "02/09" ou "04/09"), os jogos abaixo dele herdam essa data
  let currentBlockDate: JogoDateInfo | null = null;
  for (let i = 0; i < analyzed.length; i++) {
    const entry = analyzed[i];
    if (entry.isSeparator) {
      if (entry.dateInfo) {
        currentBlockDate = entry.dateInfo;
      } else {
        // Se o separador não tem data explícita, verifica se os jogos abaixo têm
        let nextGameDate: JogoDateInfo | null = null;
        for (let j = i + 1; j < analyzed.length; j++) {
          if (analyzed[j].isSeparator) break;
          if (analyzed[j].dateInfo) {
            nextGameDate = analyzed[j].dateInfo;
            break;
          }
        }
        currentBlockDate = nextGameDate;
      }
    } else {
      if (!entry.dateInfo && currentBlockDate) {
        entry.dateInfo = currentBlockDate;
      }
    }
  }

  // 3. Filtrar itens do passado (ontem, anteontem, etc.)
  const nonPastEntries: typeof analyzed = [];

  for (let i = 0; i < analyzed.length; i++) {
    const entry = analyzed[i];

    if (entry.isSeparator) {
      // Se o separador tiver data explícita e ela for do passado, descarta
      if (entry.dateInfo && entry.dateInfo.isPast) {
        continue;
      }

      // Verifica se há pelo menos 1 jogo ativo (não passado) à frente até o próximo separador
      let hasActiveGamesAhead = false;
      for (let j = i + 1; j < analyzed.length; j++) {
        if (analyzed[j].isSeparator) break;
        const gameDate = analyzed[j].dateInfo || (analyzed[j].rawDate ? analyzeJogoDate(analyzed[j].rawDate) : null);
        if (!gameDate || !gameDate.isPast) {
          hasActiveGamesAhead = true;
          break;
        }
      }

      // Se todos os jogos daquele bloco já passaram ou não há jogos à frente, descarta o separador
      if (!hasActiveGamesAhead) {
        continue;
      }

      nonPastEntries.push(entry);
    } else {
      // É um jogo normal
      const dateInfo = entry.dateInfo || (entry.rawDate ? analyzeJogoDate(entry.rawDate) : null);
      // Se o jogo tem data e já passou (ex: hoje é 04 e o jogo foi dia 02 ou 03), DESCARTA!
      if (dateInfo && dateInfo.isPast) {
        continue;
      }
      nonPastEntries.push(entry);
    }
  }

  // 4. Limpeza estética de separadores:
  // - Remove separador em branco no topo se for apenas espaço vazio sem jogos anteriores
  // - Evita separadores duplicados consecutivos
  // - Remove separador no final da lista
  const result: T[] = [];
  for (let i = 0; i < nonPastEntries.length; i++) {
    const current = nonPastEntries[i];
    if (current.isSeparator) {
      // Se for o primeiro item da lista e não tiver data explícita, descarta para não ficar espaço vazio no topo
      if (result.length === 0 && !current.rawDate) {
        continue;
      }
      // Se o último adicionado também foi separador, descarta duplicata
      if (result.length > 0 && isBlankOrSeparatorRow(result[result.length - 1])) {
        continue;
      }
    }
    result.push(current.item);
  }

  // Se o último item da lista for separador, remove
  if (result.length > 0 && isBlankOrSeparatorRow(result[result.length - 1])) {
    result.pop();
  }

  return result;
}
