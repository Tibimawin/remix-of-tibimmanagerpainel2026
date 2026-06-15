/**
 * Mapeamento centralizado de colunas do Baserow por modo de operação.
 *
 * Modo Thiago  (singular): colunas no singular — Filme, Serie, Episodios
 * Modo Francisco (plural): colunas no plural   — Filmes, Series, Episódios
 * Modo Tibim    (tibim):   estrutura própria    — Episódio, Visualizações, Selo, Elenco
 */

export type TypeMode = 'singular' | 'plural' | 'tibim';

export interface ColumnMap {
  // Conteúdos
  nome: string;
  tipo: string;
  categoria: string;
  sinopse: string;
  capa: string;
  link: string;
  idioma: string;
  views: string;
  temporadas: string;
  imdb: string;
  capaFundo: string;
  dataLancamento: string;
  tmdbId: string;
  ano: string;
  // Extras do Tibim
  visualizacoes?: string;
  selo?: string;
  elenco?: string;
  // Episódios
  episodioNome: string;
  episodioTemporada: string;
  episodioNumero: string;
  episodioLink: string;
  episodioSerie: string;
  // Canais TV
  canalNome: string;
  canalCapa: string;
  canalLink: string;
  canalCategoria: string;
  canalTipo: string;
  canalVisualizacoes?: string;
  canalSelo?: string;
  // Normalização de tipos
  tipoFilme: string;
  tipoSerie: string;
}

export const COLUMN_MAP: Record<TypeMode, ColumnMap> = {
  singular: {
    nome: 'Nome',
    tipo: 'Tipo',
    categoria: 'Categoria',
    sinopse: 'Sinopse',
    capa: 'Capa',
    link: 'Link',
    idioma: 'Idioma',
    views: 'Views',
    temporadas: 'Temporadas',
    imdb: 'Imdb',
    capaFundo: 'Capa de fundo',
    dataLancamento: 'Data de Lançamento',
    tmdbId: 'TMDB ID',
    ano: 'Ano',
    episodioNome: 'Nome',
    episodioTemporada: 'Temporada',
    episodioNumero: 'Episodios',
    episodioLink: 'Link',
    episodioSerie: 'Serie',
    canalNome: 'Nome',
    canalCapa: 'Capa',
    canalLink: 'Link',
    canalCategoria: 'Categoria',
    canalTipo: 'Tipo',
    tipoFilme: 'Filme',
    tipoSerie: 'Serie',
  },
  plural: {
    nome: 'Nome',
    tipo: 'Tipo',
    categoria: 'Categoria',
    sinopse: 'Sinopse',
    capa: 'Capa',
    link: 'Link',
    idioma: 'Idioma',
    views: 'Views',
    temporadas: 'Temporadas',
    imdb: 'Imdb',
    capaFundo: 'Capa de fundo',
    dataLancamento: 'Data de Lançamento',
    tmdbId: 'TMDB ID',
    ano: 'Ano',
    episodioNome: 'Nome',
    episodioTemporada: 'Temporada',
    episodioNumero: 'Episódios',
    episodioLink: 'Link',
    episodioSerie: 'Serie',
    canalNome: 'Nome',
    canalCapa: 'Capa',
    canalLink: 'Link',
    canalCategoria: 'Categoria',
    canalTipo: 'Tipo',
    tipoFilme: 'Filmes',
    tipoSerie: 'Series',
  },
  tibim: {
    nome: 'Nome',
    tipo: 'Tipo',
    categoria: 'Categoria',
    sinopse: 'Sinopse',
    capa: 'Capa',
    link: 'Link',
    idioma: 'Idioma',
    views: 'Views',
    temporadas: 'Temporadas',
    imdb: 'Imdb',
    capaFundo: 'Capa de fundo',
    dataLancamento: 'Data de Lançamento',
    tmdbId: 'TMDB ID',
    ano: 'Ano',
    // Extras exclusivos do Tibim em Conteúdos
    visualizacoes: 'Visualizações',
    selo: 'Selo',
    elenco: 'Elenco',
    // Episódios — coluna "Episódio" no singular
    episodioNome: 'Nome',
    episodioTemporada: 'Temporada',
    episodioNumero: 'Episódio',
    episodioLink: 'Link',
    episodioSerie: 'Serie',
    // Canais TV
    canalNome: 'Nome',
    canalCapa: 'Capa',
    canalLink: 'Link',
    canalCategoria: 'Categoria',
    canalTipo: 'Tipo',
    canalVisualizacoes: 'Visualizações',
    canalSelo: 'Selo',
    tipoFilme: 'Filme',
    tipoSerie: 'Serie',
  },
};

export const getColumnMap = (mode: TypeMode): ColumnMap => COLUMN_MAP[mode] ?? COLUMN_MAP.singular;
