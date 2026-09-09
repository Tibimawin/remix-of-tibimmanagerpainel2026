/**
 * Utilitário para padronização e enriquecimento de categorias para conteúdos importados.
 *
 * Regras aplicadas:
 * 1. Se for Filme, deve SEMPRE conter a categoria 'Filmes' no início.
 * 2. Se for Série, deve SEMPRE conter a categoria 'Series' no início.
 * 3. Deve SEMPRE conter o ano de lançamento (ex: '2026', '2023') nas categorias.
 * 4. A categoria 'Lançamentos' só pode existir para títulos do ano corrente (ex: 2026)
 *    e preferencialmente lançados no mês corrente ou marcados originalmente como lançamento.
 *    Para filmes de anos anteriores (ex: 2025, 2024, etc.), a categoria 'Lançamentos' é removida.
 */

export interface NormalizeCategoryOptions {
  tipo?: string | null;
  categorias?: string | string[] | null;
  ano?: string | number | null;
  dataDeLancamento?: string | null;
  titulo?: string | null;
}

/**
 * Extrai o ano (4 dígitos) de diversas fontes possíveis.
 */
export function extractYear(
  ano?: string | number | null,
  dataDeLancamento?: string | null,
  titulo?: string | null
): number | null {
  if (ano) {
    const yearMatch = String(ano).match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) return parseInt(yearMatch[1], 10);
  }

  if (dataDeLancamento) {
    const dateStr = String(dataDeLancamento).trim();
    // Padrão ISO YYYY-MM-DD
    const isoMatch = dateStr.match(/^(\d{4})/);
    if (isoMatch) return parseInt(isoMatch[1], 10);

    // Padrão BR DD/MM/YYYY
    const brMatch = dateStr.match(/\/(\d{4})$/);
    if (brMatch) return parseInt(brMatch[1], 10);

    const anyYear = dateStr.match(/\b(19\d{2}|20\d{2})\b/);
    if (anyYear) return parseInt(anyYear[1], 10);
  }

  if (titulo) {
    const titleMatch = String(titulo).match(/\b(19\d{2}|20\d{2})\b/);
    if (titleMatch) return parseInt(titleMatch[1], 10);
  }

  return null;
}

/**
 * Extrai o mês de lançamento (1 a 12), se disponível na data.
 */
export function extractMonth(dataDeLancamento?: string | null): number | null {
  if (!dataDeLancamento) return null;
  const dateStr = String(dataDeLancamento).trim();

  // Padrão ISO: YYYY-MM-DD
  const isoMatch = dateStr.match(/^\d{4}[-/](\d{1,2})/);
  if (isoMatch) {
    const m = parseInt(isoMatch[1], 10);
    if (m >= 1 && m <= 12) return m;
  }

  // Padrão BR: DD/MM/YYYY
  const brMatch = dateStr.match(/^\d{1,2}[/](\d{1,2})[/]\d{4}/);
  if (brMatch) {
    const m = parseInt(brMatch[1], 10);
    if (m >= 1 && m <= 12) return m;
  }

  return null;
}

/**
 * Normaliza e enriquece a lista de categorias segundo as regras do sistema.
 */
export function normalizeCategories(options: NormalizeCategoryOptions): string {
  const { tipo, categorias, ano, dataDeLancamento, titulo } = options;

  const tipoStr = (tipo || '').toLowerCase().trim();
  const isFilme = tipoStr.includes('filme') || tipoStr.includes('movie');
  const isSerie = tipoStr.includes('serie') || tipoStr.includes('tv');

  // Separar categorias existentes
  const rawList: string[] = [];
  if (Array.isArray(categorias)) {
    rawList.push(...categorias.map(c => String(c).trim()));
  } else if (typeof categorias === 'string' && categorias.trim() !== '') {
    // Quebra por vírgula, barra ou ponto-e-vírgula
    rawList.push(...categorias.split(/[,;/]+/).map(c => c.trim()));
  }

  const detectedYear = extractYear(ano, dataDeLancamento, titulo);
  const detectedMonth = extractMonth(dataDeLancamento);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 a 12

  // Verifica se o título original trazia menção a Lançamento
  const hadLancamento = rawList.some(cat => {
    const lower = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return lower === 'lancamento' || lower === 'lancamentos';
  });

  // Limpa categorias e filtra menções de Lançamentos antigas ou redundâncias
  const filteredList: string[] = [];
  for (const cat of rawList) {
    const trimmed = cat.trim();
    if (!trimmed) continue;

    const lowerNormalized = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Se for palavra de lançamento
    if (lowerNormalized === 'lancamento' || lowerNormalized === 'lancamentos') {
      continue; // Avaliaremos separadamente abaixo
    }

    // Se for variação isolada de Filme/Filmes ou Serie/Series, trataremos na inserção da categoria base
    if (isFilme && (lowerNormalized === 'filme' || lowerNormalized === 'filmes')) {
      continue;
    }
    if (isSerie && (lowerNormalized === 'serie' || lowerNormalized === 'series')) {
      continue;
    }

    // Se já for um ano de 4 dígitos antigo ou diferente, mantemos apenas se for o ano detectado
    if (/^\d{4}$/.test(trimmed)) {
      continue; // Trataremos o ano correto abaixo
    }

    filteredList.push(trimmed);
  }

  const finalCategories: string[] = [];

  // 1. Categoria base obrigatória
  if (isFilme) {
    finalCategories.push('Filmes');
  } else if (isSerie) {
    finalCategories.push('Series');
  }

  // 2. Adicionar as categorias intermediárias (gêneros, etc.)
  for (const cat of filteredList) {
    const exists = finalCategories.some(c => c.toLowerCase() === cat.toLowerCase());
    if (!exists) {
      finalCategories.push(cat);
    }
  }

  // 3. Categoria Ano (ex: '2026', '2023', etc.)
  if (detectedYear) {
    const yearStr = String(detectedYear);
    if (!finalCategories.includes(yearStr)) {
      finalCategories.push(yearStr);
    }
  }

  // 4. Regra de Lançamentos:
  // Apenas títulos do ano corrente podem ser considerados lançamentos.
  // Se for do ano corrente (ex: 2026), ganha/mantém "Lançamentos" se:
  // a) For lançado no mês atual (ex: mês 9), OU
  // b) Tinha a categoria Lançamentos na origem e é do ano atual, OU
  // c) Não temos o mês informado, mas é do ano atual e o usuário importou com flag de lançamento
  if (detectedYear === currentYear) {
    const isSameMonth = detectedMonth ? detectedMonth === currentMonth : false;
    const isRecentInYear = detectedMonth ? Math.abs(currentMonth - detectedMonth) <= 1 : true;

    if (isSameMonth || (hadLancamento && isRecentInYear)) {
      if (!finalCategories.some(c => c.toLowerCase() === 'lançamentos' || c.toLowerCase() === 'lancamentos')) {
        finalCategories.push('Lançamentos');
      }
    }
  }

  return finalCategories.join(', ');
}
