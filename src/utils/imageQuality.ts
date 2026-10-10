/**
 * Utilitário de alta resolução para imagens do TMDb
 * Garante que posters e capas sejam importados na resolução máxima ('original')
 * em vez de miniaturas de baixa qualidade (como 'w185', 'w92', 'w300', etc.).
 */

/**
 * Converte URLs de posters/backdrops do TMDb em baixa resolução (ex: w92, w154, w185, w300, w500, w780)
 * para a resolução máxima ('original') utilizando o CDN de mídia do TMDb.
 * 
 * Exemplo:
 * De:   https://image.tmdb.org/t/p/w185/x0nvYzQpyJc5pdT9lMnkMuYAg0O.jpg
 * Para: https://media.themoviedb.org/t/p/original/x0nvYzQpyJc5pdT9lMnkMuYAg0O.jpg
 */
export function upgradeToHighResTmdbImage(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // 1. Se for apenas o caminho relativo do TMDb (ex: '/x0nvYzQpyJc5pdT9lMnkMuYAg0O.jpg')
  if (trimmed.startsWith('/') && trimmed.match(/\.(jpg|jpeg|png|webp)$/i)) {
    return `https://media.themoviedb.org/t/p/original${trimmed}`;
  }

  // 2. Se for uma URL do TMDb com qualquer dimensão (w92, w154, w185, w300, w342, w500, w780, w1280, etc.)
  // Detecta image.tmdb.org, media.themoviedb.org ou themoviedb.org
  const tmdbRegex = /^(https?:\/\/)?(image\.tmdb\.org|media\.themoviedb\.org|themoviedb\.org)\/t\/p\/([^/]+)\/(.+)$/i;
  const match = trimmed.match(tmdbRegex);
  if (match) {
    const filename = match[4];
    return `https://media.themoviedb.org/t/p/original/${filename}`;
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
