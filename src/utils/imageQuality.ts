/**
 * Utilitário de alta resolução para imagens do TMDb
 * Garante que posters e capas sejam importados na resolução máxima ('original')
 * em vez de miniaturas de baixa qualidade (como 'w185', 'w92', 'w300', etc.).
 */

/**
 * Converte URLs de posters/backdrops do TMDb em baixa resolução (ex: w92, w154, w185, w300, w500, w780)
 * para a resolução máxima ('original') utilizando o CDN de mídia do TMDb.
 * Usado para salvar no banco Baserow e no modal de detalhes.
 */
export function upgradeToHighResTmdbImage(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // 1. Se for apenas o caminho relativo do TMDb (ex: '/x0nvYzQpyJc5pdT9lMnkMuYAg0O.jpg')
  if (trimmed.startsWith('/') && trimmed.match(/\.(jpg|jpeg|png|webp)$/i)) {
    return `https://image.tmdb.org/t/p/original${trimmed}`;
  }

  // 2. Se for uma URL do TMDb com qualquer dimensão (w92, w154, w185, w300, w342, w500, w780, etc.)
  const tmdbRegex = /^(https?:\/\/)?(image\.tmdb\.org|media\.themoviedb\.org|themoviedb\.org)\/t\/p\/([^/]+)\/(.+)$/i;
  const match = trimmed.match(tmdbRegex);
  if (match) {
    const filename = match[4];
    return `https://image.tmdb.org/t/p/original/${filename}`;
  }

  return trimmed;
}

/**
 * Converte URLs de posters para uma resolução otimizada para CARDS e grades de catálogo (w342).
 * Garante carregamento ultrarrápido (~15KB-25KB por imagem) com alta nitidez nas miniaturas da grade
 * e evita telas vazias durante a rolagem, mantendo 'original' para o modal de detalhes e Baserow.
 */
export function getOptimizedCardImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('/') && trimmed.match(/\.(jpg|jpeg|png|webp)$/i)) {
    return `https://image.tmdb.org/t/p/w342${trimmed}`;
  }

  const tmdbRegex = /^(https?:\/\/)?(image\.tmdb\.org|media\.themoviedb\.org|themoviedb\.org)\/t\/p\/([^/]+)\/(.+)$/i;
  const match = trimmed.match(tmdbRegex);
  if (match) {
    const filename = match[4];
    return `https://image.tmdb.org/t/p/w342/${filename}`;
  }

  return trimmed;
}

/**
 * Normaliza qualquer objeto com imagem (como catálogo ou detalhes) para garantir alta resolução
 */
export function enrichWithHighResImage<T extends { imagem?: string }>(item: T): T {
  if (!item || !item.imagem) return item;
  return {
    ...item,
    imagem: upgradeToHighResTmdbImage(item.imagem),
  };
}
