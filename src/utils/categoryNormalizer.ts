/**
 * Utilitário para padronização e enriquecimento de categorias para conteúdos importados.
 *
 * Regras aplicadas:
 * 1. Separação automática de categorias aglutinadas/coladas (ex: 'ComédiaFamíliaLançamentos' -> 'Comédia, Família, Lançamentos').
 * 2. Se for Filme, deve SEMPRE conter a categoria 'Filmes' no início.
 * 3. Se for Série, deve SEMPRE conter a categoria 'Series' no início.
 * 4. Se for Dorama (qualquer variação ou gênero contendo 'dorama'), deve SEMPRE conter a categoria 'Doramas'.
 * 5. Remoção de dados espúrios de duração (ex: '107 min', '107 Minutos.') e menções a IMDb.
 * 6. Deve SEMPRE conter o ano de lançamento (ex: '2026', '2025', '2023') nas categorias.
 * 7. Preserva e padroniza a categoria 'Lançamentos' quando presente na origem ou para títulos recentes.
 */

export interface NormalizeCategoryOptions {
  tipo?: string | null;
  categorias?: string | string[] | null;
  ano?: string | number | null;
  dataDeLancamento?: string | null;
  titulo?: string | null;
  streamingPlatform?: string | null;
}

// Lista ordenada de categorias conhecidas (mais específicas/longas primeiro) para desmembramento
const KNOWN_CATEGORIES = [
  'Dorama Singapurense',
  'Dorama Tailandês',
  'Dorama Tailandes',
  'Dorama Taiwanês',
  'Dorama Taiwanes',
  'Dorama Japonês',
  'Dorama Japones',
  'Dorama Chinês',
  'Dorama Chines',
  'Dorama Coreano',
  'Dorama Dublado',
  'Doramas',
  'Dorama',
  'Novelas Mexicanas',
  'Novelas Nacionais',
  'Novelas Turcas',
  'Novelas',
  'Novela',
  'Ficção Científica',
  'Ficção científica',
  'Ficcao Cientifica',
  'Cinema TV',
  'TV Movie',
  'Ação e Aventura',
  'Ação & Aventura',
  'Sci-Fi & Fantasy',
  'Em Alta',
  'Destaques',
  'Lançamentos',
  'Lancamentos',
  'Lançamento',
  'Lancamento',
  'Documentário',
  'Documentario',
  'Ação',
  'Acao',
  'Aventura',
  'Animação',
  'Animacao',
  'Animes',
  'Anime',
  'Comédia',
  'Comedia',
  'Crime',
  'Policial',
  'Drama',
  'Família',
  'Familia',
  'Fantasia',
  'Faroeste',
  'Western',
  'Guerra',
  'História',
  'Historia',
  'Kids',
  'Infantil',
  'Desenhos',
  'Desenho',
  'Mistério',
  'Misterio',
  'Música',
  'Musica',
  'Musical',
  'Romance',
  'Suspense',
  'Terror',
  'Thriller',
  'Filmes',
  'Filme',
  'Séries',
  'Series',
  'Série',
  'Serie',
  'Nacional',
  'Nacionais',
  // Plataformas de Streaming
  'Prime Video',
  'Netflix',
  'Disney',
  'Apple',
  'HBO MAX',
  'Paramount',
  'Globo Play',
  'Viki Rakuten',
];

// Mapeamento canônico para acentuação e padronização visual no painel
const CANONICAL_NAMES: Record<string, string> = {
  'comedia': 'Comédia',
  'comédia': 'Comédia',
  'familia': 'Família',
  'família': 'Família',
  'lancamentos': 'Lançamentos',
  'lançamentos': 'Lançamentos',
  'lancamento': 'Lançamentos',
  'lançamento': 'Lançamentos',
  'acao': 'Ação',
  'ação': 'Ação',
  'aventura': 'Aventura',
  'animacao': 'Animação',
  'animação': 'Animação',
  'animes': 'Animes',
  'anime': 'Animes',
  'crime': 'Crime',
  'policial': 'Crime',
  'documentario': 'Documentário',
  'documentário': 'Documentário',
  'drama': 'Drama',
  'fantasia': 'Fantasia',
  'faroeste': 'Faroeste',
  'western': 'Faroeste',
  'ficcao cientifica': 'Ficção Científica',
  'ficção científica': 'Ficção Científica',
  'ficção cientifica': 'Ficção Científica',
  'sci-fi': 'Ficção Científica',
  'guerra': 'Guerra',
  'historia': 'História',
  'história': 'História',
  'kids': 'Kids',
  'infantil': 'Kids',
  'desenhos': 'Desenhos',
  'desenho': 'Desenhos',
  'misterio': 'Mistério',
  'mistério': 'Mistério',
  'musica': 'Música',
  'música': 'Música',
  'musical': 'Música',
  'romance': 'Romance',
  'suspense': 'Suspense',
  'terror': 'Terror',
  'thriller': 'Suspense',
  'cinema tv': 'Cinema TV',
  'tv movie': 'Cinema TV',
  'dorama': 'Doramas',
  'doramas': 'Doramas',
  'dorama chines': 'Dorama Chinês',
  'dorama chinês': 'Dorama Chinês',
  'dorama coreano': 'Dorama Coreano',
  'dorama dublado': 'Dorama Dublado',
  'dorama japones': 'Dorama Japonês',
  'dorama japonês': 'Dorama Japonês',
  'dorama tailandes': 'Dorama Tailandês',
  'dorama tailandês': 'Dorama Tailandês',
  'dorama taiwanes': 'Dorama Taiwanês',
  'dorama taiwanês': 'Dorama Taiwanês',
  'dorama singapurense': 'Dorama Singapurense',
  'novelas': 'Novelas',
  'novela': 'Novelas',
  'novelas mexicanas': 'Novelas Mexicanas',
  'novelas nacionais': 'Novelas Nacionais',
  'novelas turcas': 'Novelas Turcas',
  'em alta': 'Em Alta',
  'destaques': 'Destaques',
  'nacional': 'Nacional',
  'nacionais': 'Nacional',
  // Plataformas de Streaming
  'netflix': 'Netflix',
  'prime video': 'Prime Video',
  'amazon prime video': 'Prime Video',
  'primevideo': 'Prime Video',
  'amazon': 'Prime Video',
  'disney': 'Disney',
  'disney+': 'Disney',
  'disney plus': 'Disney',
  'apple': 'Apple',
  'apple tv': 'Apple',
  'apple tv+': 'Apple',
  'hbo max': 'HBO MAX',
  'hbo': 'HBO MAX',
  'max': 'HBO MAX',
  'paramount': 'Paramount',
  'paramount+': 'Paramount',
  'paramount plus': 'Paramount',
  'globo play': 'Globo Play',
  'globoplay': 'Globo Play',
  'viki': 'Viki Rakuten',
  'rakuten viki': 'Viki Rakuten',
  'viki rakuten': 'Viki Rakuten',
};

/**
 * Descola categorias que foram concatenadas sem separador (ex: 'ComédiaFamíliaLançamentos' -> ['Comédia', 'Família', 'Lançamentos']).
 */
export function splitGluedCategories(rawInput?: string | string[] | null): string[] {
  if (!rawInput) return [];

  let raw = '';
  if (Array.isArray(rawInput)) {
    raw = rawInput.filter(Boolean).map(c => String(c).trim()).join(', ');
  } else if (typeof rawInput === 'string') {
    raw = rawInput;
  }

  if (!raw.trim()) return [];

  // 1. Limpeza de prefixos colados de scraping do MaxPlus (ex: 'DoramaDorama Chinês' -> 'Dorama Chinês')
  raw = raw.replace(/DoramaDorama\s*/gi, 'Dorama ');

  // 2. Descolar maiúsculas que sucedem minúsculas ou dígitos com regex Unicode (ex: 'ComédiaFamíliaLançamentos' -> 'Comédia, Família, Lançamentos')
  raw = raw.replace(/(\p{Ll}|\d)(?=\p{Lu})/gu, '$1, ');

  // 3. Descolar siglas seguidas de palavras (ex: 'Cinema TVTerror' -> 'Cinema TV, Terror')
  raw = raw.replace(/\b(TV|HD|FHD|4K)(?=[A-ZÀ-ÖØ-ß][a-zà-öø-ÿ])/gu, '$1, ');

  // 4. Quebrar por vírgulas, barras, ponto-e-vírgula, pipes e quebras de linha
  const initialTokens = raw.split(/[,;\n\r/|]+/).map(t => t.trim()).filter(Boolean);

  const tokens: string[] = [];

  for (const token of initialTokens) {
    // Descartar menções de duração de filmes/episódios (ex: '107 min', '107 Minutos.', '90m', '2h 15m')
    if (
      /^\d+\s*(?:min|minutos|minuto|m)\.?$/i.test(token) ||
      /^\d+\s*h(\s*\d+\s*(?:min|m))?\.?$/i.test(token)
    ) {
      continue;
    }

    // Descartar menções a IMDb (ex: 'IMDb: 8.5')
    if (/^imdb/i.test(token)) {
      continue;
    }

    // Se o token ainda contiver categorias conhecidas aglutinadas mesmo em minúsculas
    let remaining = token;
    const extracted: string[] = [];

    while (remaining.length > 0) {
      const match = KNOWN_CATEGORIES.find(k => {
        const normK = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normRem = remaining.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normRem.startsWith(normK);
      });

      if (match) {
        extracted.push(match);
        remaining = remaining.slice(match.length).trim();
      } else {
        break;
      }
    }

    if (extracted.length > 1 && remaining.length === 0) {
      tokens.push(...extracted);
    } else {
      tokens.push(token);
    }
  }

  return tokens;
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
  const { tipo, categorias, ano, dataDeLancamento, titulo, streamingPlatform } = options;

  const tipoStr = (tipo || '').toLowerCase().trim();
  const isFilme = tipoStr.includes('filme') || tipoStr.includes('movie');
  const isSerie = tipoStr.includes('serie') || tipoStr.includes('tv');

  // 1. Separar e descolar categorias existentes (ex: 'ComédiaFamíliaLançamentos' -> ['Comédia', 'Família', 'Lançamentos'])
  const rawList = splitGluedCategories(categorias);

  const detectedYear = extractYear(ano, dataDeLancamento, titulo);
  const detectedMonth = extractMonth(dataDeLancamento);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 a 12

  // Verifica se o título original trazia menção a Lançamento (incluindo categorias coladas)
  const hadLancamento = rawList.some(cat => {
    const lower = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return lower === 'lancamento' || lower === 'lancamentos';
  });

  // Verifica se é Dorama (qualquer variação como Dorama, Doramas, Dorama Coreano, Dorama Chinês, etc.)
  const isDoramaCategory = (val: string) => {
    if (!val) return false;
    const norm = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return norm.includes('dorama') || norm.includes('kdrama') || norm.includes('k-drama');
  };

  const isDorama = rawList.some(isDoramaCategory) || 
    (typeof categorias === 'string' && isDoramaCategory(categorias)) ||
    (titulo ? isDoramaCategory(titulo) : false);

  // Limpa categorias e filtra menções de Lançamentos antigas ou redundâncias
  const filteredList: string[] = [];
  for (const cat of rawList) {
    const trimmed = cat.trim();
    if (!trimmed) continue;

    const lowerNormalized = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Se for menção a IMDb (ex: 'IMDb: 8.5'), ignorar
    if (/^imdb/i.test(trimmed)) {
      continue;
    }

    // Se for menção de duração (ex: '107 min', '107 Minutos.', '90m'), ignorar
    if (
      /^\d+\s*(?:min|minutos|minuto|m)\.?$/i.test(trimmed) ||
      /^\d+\s*h(\s*\d+\s*(?:min|m))?\.?$/i.test(trimmed)
    ) {
      continue;
    }

    // Se for palavra de lançamento, trataremos na regra de Lançamentos
    if (lowerNormalized === 'lancamento' || lowerNormalized === 'lancamentos') {
      continue;
    }

    // Se for variação isolada de Filme/Filmes ou Serie/Series, trataremos na inserção da categoria base
    if (isFilme && (lowerNormalized === 'filme' || lowerNormalized === 'filmes')) {
      continue;
    }
    if (isSerie && (lowerNormalized === 'serie' || lowerNormalized === 'series')) {
      continue;
    }

    // Se for palavra isolada 'dorama' ou 'doramas', tratamos na inserção obrigatória de 'Doramas'
    if (lowerNormalized === 'dorama' || lowerNormalized === 'doramas') {
      continue;
    }

    // Se já for um ano de 4 dígitos antigo ou diferente, mantemos apenas se for o ano detectado
    if (/^\d{4}$/.test(trimmed)) {
      continue; // Trataremos o ano correto abaixo
    }

    // Mapear para nome canônico padronizado se conhecido
    const canonical = CANONICAL_NAMES[lowerNormalized] || trimmed;

    if (!filteredList.some(c => c.toLowerCase() === canonical.toLowerCase())) {
      filteredList.push(canonical);
    }
  }

  const finalCategories: string[] = [];

  // 1. Categoria base obrigatória
  if (isFilme) {
    finalCategories.push('Filmes');
  } else if (isSerie) {
    finalCategories.push('Series');
  }

  // 1.1 Regra mandatória: ao importar Doramas, deve SEMPRE adicionar a categoria com o Nome "Doramas" em Categorias
  if (isDorama) {
    if (!finalCategories.some(c => c.toLowerCase() === 'doramas')) {
      finalCategories.push('Doramas');
    }
  }

  // 2. Adicionar as categorias intermediárias (gêneros, subcategorias como 'Dorama Chinês', etc.)
  for (const cat of filteredList) {
    const exists = finalCategories.some(c => c.toLowerCase() === cat.toLowerCase());
    if (!exists) {
      finalCategories.push(cat);
    }
  }

  // 3. Regra de Lançamentos:
  // Se a origem continha 'Lançamentos' (inclusive se vinha colado como em 'ComédiaFamíliaLançamentos'), preserva.
  // Também adiciona se for título recente do ano corrente.
  const isRecentInYear = detectedYear === currentYear && (detectedMonth ? Math.abs(currentMonth - detectedMonth) <= 1 : true);
  if (hadLancamento || isRecentInYear) {
    if (!finalCategories.some(c => c.toLowerCase() === 'lançamentos' || c.toLowerCase() === 'lancamentos')) {
      finalCategories.push('Lançamentos');
    }
  }

  // 4. Categoria Ano (ex: '2026', '2025', etc.)
  if (detectedYear) {
    const yearStr = String(detectedYear);
    if (!finalCategories.includes(yearStr)) {
      finalCategories.push(yearStr);
    }
  }

  // 5. Categoria de Plataforma de Streaming (ex: 'Prime Video', 'Netflix', 'Disney', 'Apple', etc.)
  if (streamingPlatform && typeof streamingPlatform === 'string' && streamingPlatform.trim()) {
    const platformTrimmed = streamingPlatform.trim();
    const platformCanonical = CANONICAL_NAMES[platformTrimmed.toLowerCase()] || platformTrimmed;
    if (!finalCategories.some(c => c.toLowerCase() === platformCanonical.toLowerCase())) {
      finalCategories.push(platformCanonical);
    }
  }

  return finalCategories.join(', ');
}
