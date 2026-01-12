// Tipos para o sistema de Importação Zynner

export interface BaserowConfig {
    token: string;
    id_conteudo: string;
    id_episodio: string;
    coluna_Nome_Conteudo: string;
    user_vps: number;
    url_base: string;
}

export interface Conteudo {
    id?: string;
    Nome: string;
    Capa: string;
    "Capa de fundo": string;
    Categoria: string;
    Sinopse: string;
    Link: string;
    Tipo: "Filme" | "Serie";
    Idioma: "DUB" | "LEG";
    Views: number;
    Temporadas: number;
    Imdb: string;
    "Data de Lançamento": string;
    "Duração": string;
}

export interface Episodio {
    Nome: string;
    Link: string;
    Temporada: number;
    Episódio: number;
}

export interface TMDBSearchResult {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    backdrop_path: string | null;
    overview: string;
    vote_average: number;
    release_date?: string;
    first_air_date?: string;
    media_type?: 'movie' | 'tv';
    genre_ids?: number[];
}

export interface TMDBDetails {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    backdrop_path: string | null;
    overview: string;
    vote_average: number;
    release_date?: string;
    first_air_date?: string;
    runtime?: number;
    episode_run_time?: number[];
    genres: { id: number; name: string }[];
    number_of_seasons?: number;
    seasons?: Season[];
    external_ids?: {
        imdb_id: string | null;
    };
}

export interface Season {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    air_date: string | null;
}

export interface ConteudoParaImportar {
    titulo: string;
    tipo: "Filme" | "Serie";
    categoriaPrincipal: string;
    tmdbData?: TMDBDetails;
    linkValidado?: string;
    servidor?: string;
    idioma: "DUB" | "LEG";
    episodios?: Episodio[];
    status: 'pendente' | 'encontrado' | 'validado' | 'pronto' | 'erro';
    erro?: string;
}

export type TelaImportacao =
    | 'formulario'
    | 'busca'
    | 'edicao'
    | 'cadastro'
    | 'completo';

export interface EstadoImportacao {
    telaAtual: TelaImportacao;
    listaOriginal: string[];
    conteudosParaImportar: ConteudoParaImportar[];
    indiceAtual: number;
    carregando: boolean;
    progresso: {
        total: number;
        processados: number;
        sucesso: number;
        erros: number;
    };
}
