/**
 * Dados simulados e persistência em memória para o Modo Demonstração (Demo Mode).
 * Permite navegação completa, testes de telas e edição simulada sem tocar no banco de dados real.
 */

export interface DemoRow {
  id: number;
  order?: string;
  [key: string]: any;
}

const INITIAL_CONTEUDOS: DemoRow[] = [
  {
    id: 101,
    Nome: 'Duna: Parte 2',
    'Nome Original': 'Dune: Part Two',
    Tipo: 'Filme',
    Categoria: 'Ficção Científica',
    Ano: '2024',
    Classificacao: '14',
    Duracao: '166 min',
    Avaliacao: '8.6',
    Capa: 'https://image.tmdb.org/t/p/w500/czembW0Rk1Ke7lCJGahbOhdCuhV.jpg',
    Fundo: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s52002.jpg',
    Sinopse: 'Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família.',
    Trailer: 'https://www.youtube.com/watch?v=Way9Dexny3w',
    Status: 'Ativo',
    Views: '14200'
  },
  {
    id: 102,
    Nome: 'Deadpool & Wolverine',
    'Nome Original': 'Deadpool & Wolverine',
    Tipo: 'Filme',
    Categoria: 'Ação / Comédia',
    Ano: '2024',
    Classificacao: '18',
    Duracao: '128 min',
    Avaliacao: '8.0',
    Capa: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    Fundo: 'https://image.tmdb.org/t/p/original/yD3rGf9b6nC5029e061801c80d4c82c2a138ffce.jpg',
    Sinopse: 'Wolverine está se recuperando quando cruza o caminho do tagarela Deadpool. Juntos, eles formam uma aliança inesperada.',
    Trailer: 'https://www.youtube.com/watch?v=73_1biulkYk',
    Status: 'Ativo',
    Views: '28400'
  },
  {
    id: 103,
    Nome: 'Stranger Things',
    'Nome Original': 'Stranger Things',
    Tipo: 'Serie',
    Categoria: 'Suspense / Ficção',
    Ano: '2022',
    Classificacao: '16',
    Duracao: '4 Temporadas',
    Avaliacao: '8.7',
    Capa: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    Fundo: 'https://image.tmdb.org/t/p/original/56v2KjUmULeSTUmKuKiFuSc34Pk.jpg',
    Sinopse: 'Quando um jovem garoto desaparece, uma pequena cidade descobre um mistério envolvendo experimentos secretos e forças sobrenaturais.',
    Trailer: 'https://www.youtube.com/watch?v=b9EkMc79ZSU',
    Status: 'Ativo',
    Views: '35100'
  },
  {
    id: 104,
    Nome: 'A Casa do Dragão',
    'Nome Original': 'House of the Dragon',
    Tipo: 'Serie',
    Categoria: 'Fantasia / Drama',
    Ano: '2024',
    Classificacao: '18',
    Duracao: '2 Temporadas',
    Avaliacao: '8.5',
    Capa: 'https://image.tmdb.org/t/p/w500/t9Xke5724fqW326qOoVTqi6YTr1.jpg',
    Fundo: 'https://image.tmdb.org/t/p/original/etjAeqVGTT5pcTXvd1821q81j3k.jpg',
    Sinopse: 'A história da família Targaryen cerca de 200 anos antes dos eventos de Game of Thrones.',
    Trailer: 'https://www.youtube.com/watch?v=DotnJ7tTA34',
    Status: 'Ativo',
    Views: '41900'
  },
  {
    id: 105,
    Nome: 'Oppenheimer',
    'Nome Original': 'Oppenheimer',
    Tipo: 'Filme',
    Categoria: 'Drama / Biografia',
    Ano: '2023',
    Classificacao: '16',
    Duracao: '180 min',
    Avaliacao: '8.9',
    Capa: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    Fundo: 'https://image.tmdb.org/t/p/original/rLb2cwF3Pazuxaj0sytQ3Ki3gu.jpg',
    Sinopse: 'O físico J. Robert Oppenheimer lidera o Projeto Manhattan na criação da primeira arma nuclear durante a Segunda Guerra Mundial.',
    Trailer: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
    Status: 'Ativo',
    Views: '19750'
  }
];

const INITIAL_EPISODIOS: DemoRow[] = [
  {
    id: 201,
    Serie: 'Stranger Things',
    Temporada: '1',
    Episodio: '1',
    Nome: 'Capítulo Um: O Desaparecimento de Will Byers',
    Capa: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    Link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    Duracao: '48 min'
  },
  {
    id: 202,
    Serie: 'Stranger Things',
    Temporada: '1',
    Episodio: '2',
    Nome: 'Capítulo Dois: A Esquisita de Maple Street',
    Capa: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    Link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    Duracao: '55 min'
  },
  {
    id: 203,
    Serie: 'A Casa do Dragão',
    Temporada: '1',
    Episodio: '1',
    Nome: 'Os Herdeiros do Dragão',
    Capa: 'https://image.tmdb.org/t/p/w500/t9Xke5724fqW326qOoVTqi6YTr1.jpg',
    Link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    Duracao: '66 min'
  }
];

const INITIAL_CANAIS_TV: DemoRow[] = [
  {
    id: 301,
    Nome: 'Globo SP HD',
    Categoria: 'Abertos',
    Logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/TV_Globo_2021.svg/300px-TV_Globo_2021.svg.png',
    StreamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    Status: 'Online',
    EPG: 'tvg-id="globo.sp"'
  },
  {
    id: 302,
    Nome: 'ESPN Brasil HD',
    Categoria: 'Esportes',
    Logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/300px-ESPN_wordmark.svg.png',
    StreamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    Status: 'Online',
    EPG: 'tvg-id="espn.br"'
  },
  {
    id: 303,
    Nome: 'HBO Signature',
    Categoria: 'Filmes e Séries',
    Logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/HBO_logo.svg/300px-HBO_logo.svg.png',
    StreamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    Status: 'Online',
    EPG: 'tvg-id="hbo.sig"'
  },
  {
    id: 304,
    Nome: 'Discovery Channel HD',
    Categoria: 'Documentários',
    Logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Discovery_Channel_2019.svg/300px-Discovery_Channel_2019.svg.png',
    StreamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    Status: 'Online',
    EPG: 'tvg-id="discovery"'
  }
];

const INITIAL_CATEGORIAS: DemoRow[] = [
  { id: 401, Nome: 'Ação', Tipo: 'Filmes', Total: '128' },
  { id: 402, Nome: 'Comédia', Tipo: 'Filmes', Total: '85' },
  { id: 403, Nome: 'Ficção Científica', Tipo: 'Geral', Total: '64' },
  { id: 404, Nome: 'Drama', Tipo: 'Séries', Total: '112' },
  { id: 405, Nome: 'Animes', Tipo: 'Animes', Total: '94' },
  { id: 406, Nome: 'Esportes', Tipo: 'Canais TV', Total: '42' }
];

const INITIAL_BANNERS: DemoRow[] = [
  {
    id: 501,
    Titulo: 'Duna: Parte 2 nos Cinemas e Streaming',
    Imagem: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s52002.jpg',
    Link: '101',
    Posicao: '1',
    Status: 'Ativo'
  },
  {
    id: 502,
    Titulo: 'Deadpool & Wolverine - Já Disponível',
    Imagem: 'https://image.tmdb.org/t/p/original/yD3rGf9b6nC5029e061801c80d4c82c2a138ffce.jpg',
    Link: '102',
    Posicao: '2',
    Status: 'Ativo'
  }
];

const INITIAL_JOGOS_DIA: DemoRow[] = [
  {
    id: 601,
    TimeCasa: 'Real Madrid',
    TimeFora: 'Barcelona',
    Campeonato: 'La Liga - El Clásico',
    Horario: '16:00',
    Data: new Date().toISOString().split('T')[0],
    LogoCasa: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/150px-Real_Madrid_CF.svg.png',
    LogoFora: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/150px-FC_Barcelona_%28crest%29.svg.png',
    Canal: 'ESPN / Disney+'
  },
  {
    id: 602,
    TimeCasa: 'Flamengo',
    TimeFora: 'Palmeiras',
    Campeonato: 'Brasileirão Série A',
    Horario: '20:30',
    Data: new Date().toISOString().split('T')[0],
    LogoCasa: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Flamengo_braz_logo.svg/150px-Flamengo_braz_logo.svg.png',
    LogoFora: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Palmeiras_logo.svg/150px-Palmeiras_logo.svg.png',
    Canal: 'Premiere / Globo'
  }
];

const INITIAL_MINISERIES: DemoRow[] = [
  {
    id: 701,
    Nome: 'Amor Inesperado (Dorama Curto)',
    Capitulos: '24',
    Ano: '2024',
    Capa: 'https://image.tmdb.org/t/p/w500/t9Xke5724fqW326qOoVTqi6YTr1.jpg',
    Status: 'Completa'
  }
];

// Catálogo demonstrativo para MaxPlus
export const DEMO_MAXPLUS_CATALOG = [
  {
    nome: 'Gladiador II',
    imagem: 'https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg',
    link: 'demo://maxplus/gladiador-2',
    genres: 'Ação, Drama, Aventura'
  },
  {
    nome: 'Wicked',
    imagem: 'https://image.tmdb.org/t/p/w500/xDGbZ0JJ3mYaGKy4Nzd9Kph6M9L.jpg',
    link: 'demo://maxplus/wicked',
    genres: 'Fantasia, Música, Romance'
  },
  {
    nome: 'Arcane: League of Legends',
    imagem: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn397rHumwfqv.jpg',
    link: 'demo://maxplus/arcane',
    genres: 'Animação, Ficção Científica, Ação'
  },
  {
    nome: 'Moana 2',
    imagem: 'https://image.tmdb.org/t/p/w500/4YZpsylmjHbqeWzjKpUEF8gcLUV.jpg',
    link: 'demo://maxplus/moana-2',
    genres: 'Animação, Aventura, Família'
  },
  {
    nome: 'Cobra Kai',
    imagem: 'https://image.tmdb.org/t/p/w500/m7tG5E123umZxm9FiH1fq8W78vK.jpg',
    link: 'demo://maxplus/cobra-kai',
    genres: 'Ação, Drama, Comédia'
  },
  {
    nome: 'Beetlejuice Beetlejuice',
    imagem: 'https://image.tmdb.org/t/p/w500/kKgQzkUCUmgnqzAz0ROVuJwPkqs.jpg',
    link: 'demo://maxplus/beetlejuice-2',
    genres: 'Comédia, Fantasia, Terror'
  },
  {
    nome: 'Pinguim (The Penguin)',
    imagem: 'https://image.tmdb.org/t/p/w500/aP3v1QZpYp9v2p0hF8bWbV9b2p.jpg',
    link: 'demo://maxplus/penguin',
    genres: 'Crime, Drama'
  },
  {
    nome: 'Fallout',
    imagem: 'https://image.tmdb.org/t/p/w500/AnsZu4c0wYm0iE9y0m6F3m8A9q9.jpg',
    link: 'demo://maxplus/fallout',
    genres: 'Ficção Científica, Ação, Aventura'
  }
];

// Conteúdos para a tela de Importação Automática
export const DEMO_AUTO_IMPORT_CONTENTS = [
  {
    id: 'demo-import-1',
    Titulo: 'Furiosa: Uma Saga Mad Max',
    Nome: 'Furiosa: Uma Saga Mad Max',
    Tipo: 'Filme' as const,
    Ano: '2024',
    Genero: 'Ação, Ficção Científica, Aventura',
    Categoria: 'Ação',
    Poster: 'https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xUMZ51.jpg',
    Capa: 'https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xUMZ51.jpg',
    Sinopse: 'Quando o mundo entra em colapso, a jovem Furiosa é sequestrada do Lugar Verde de Muitas Mães e cai nas mãos de uma grande Horda de Motoqueiros liderada pelo Senhor da Guerra Dementus.',
    Link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    Idioma: 'Dublado / Legendado',
    Imdb: '7.8'
  },
  {
    id: 'demo-import-2',
    Titulo: 'Divertida Mente 2',
    Nome: 'Divertida Mente 2',
    Tipo: 'Filme' as const,
    Ano: '2024',
    Genero: 'Animação, Comédia, Família',
    Categoria: 'Animação',
    Poster: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
    Capa: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
    Sinopse: 'Com a chegada da adolescência, a sala de comando de Riley passa por uma demolição para dar espaço a algo totalmente inesperado: novas emoções!',
    Link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    Idioma: 'Dublado',
    Imdb: '7.9'
  },
  {
    id: 'demo-import-3',
    Titulo: 'O Senhor dos Anéis: Os Anéis de Poder',
    Nome: 'O Senhor dos Anéis: Os Anéis de Poder',
    Tipo: 'Serie' as const,
    Ano: '2024',
    Genero: 'Fantasia, Aventura, Drama',
    Categoria: 'Séries',
    Poster: 'https://image.tmdb.org/t/p/w500/mYLOqiStMxDK3fYZFirgrMt8z5d.jpg',
    Capa: 'https://image.tmdb.org/t/p/w500/mYLOqiStMxDK3fYZFirgrMt8z5d.jpg',
    Sinopse: 'Em uma época de relativa paz, um grupo de heróis enfrenta o ressurgimento do mal na Terra-média.',
    Link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    Idioma: 'Dublado / Legendado',
    Imdb: '7.0',
    Temporadas: '2'
  },
  {
    id: 'demo-import-4',
    Titulo: 'The Boys',
    Nome: 'The Boys',
    Tipo: 'Serie' as const,
    Ano: '2024',
    Genero: 'Ação, Ficção Científica, Comédia',
    Categoria: 'Séries',
    Poster: 'https://image.tmdb.org/t/p/w500/7Ns6tO3aYjppI5Lo8hvmOtEBgQA.jpg',
    Capa: 'https://image.tmdb.org/t/p/w500/7Ns6tO3aYjppI5Lo8hvmOtEBgQA.jpg',
    Sinopse: 'Um grupo de vigilantes se propõe a derrotar super-heróis corruptos que abusam de seus superpoderes.',
    Link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    Idioma: 'Dublado',
    Imdb: '8.7',
    Temporadas: '4'
  },
  {
    id: 'demo-import-5',
    Titulo: 'Demon Slayer: Kimetsu no Yaiba',
    Nome: 'Demon Slayer: Kimetsu no Yaiba',
    Tipo: 'Serie' as const,
    Ano: '2024',
    Genero: 'Animação, Ação, Fantasia',
    Categoria: 'Animes',
    Poster: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
    Capa: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
    Sinopse: 'Tanjiro Kamado, um garoto de bom coração que vende carvão para viver, encontra sua família massacrada por um demônio.',
    Link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    Idioma: 'Dublado / Legendado',
    Imdb: '8.6',
    Temporadas: '4'
  },
  {
    id: 'demo-import-6',
    Titulo: 'Beleza Verdadeira (True Beauty)',
    Nome: 'Beleza Verdadeira (True Beauty)',
    Tipo: 'Serie' as const,
    Ano: '2020',
    Genero: 'Comédia, Romance, Drama',
    Categoria: 'Dorama',
    Poster: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
    Capa: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
    Sinopse: 'Uma estudante insegura aprende a dominar a arte da maquiagem e se torna a garota mais popular da escola.',
    Link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    Idioma: 'Legendado',
    Imdb: '8.0',
    Temporadas: '1'
  }
];

// Estado mantido na memória da sessão
class DemoDatabaseState {
  private tables: Record<string, DemoRow[]> = {};
  private nextId = 1000;

  constructor() {
    this.reset();
  }

  reset() {
    this.tables = {
      conteudos: [...INITIAL_CONTEUDOS],
      episodios: [...INITIAL_EPISODIOS],
      canaisTv: [...INITIAL_CANAIS_TV],
      categorias: [...INITIAL_CATEGORIAS],
      banners: [...INITIAL_BANNERS],
      jogosDia: [...INITIAL_JOGOS_DIA],
      miniseries: [...INITIAL_MINISERIES],
      usuarios: [
        { id: 801, Nome: 'Usuário Teste 1', Email: 'teste1@exemplo.com', Vencimento: '2026-12-31', Status: 'Ativo' },
        { id: 802, Nome: 'Usuário Teste 2', Email: 'teste2@exemplo.com', Vencimento: '2026-06-15', Status: 'Ativo' },
      ],
      sessoes: [
        { id: 901, Usuario: 'Usuário Teste 1', Dispositivo: 'Smart TV Samsung', IP: '189.40.12.3', UltimoAcesso: 'Hoje às 14:32' }
      ]
    };
  }

  private resolveKey(tableIdOrName: string): string {
    const s = String(tableIdOrName).toLowerCase();
    if (s.includes('conteudo') || s === '99901') return 'conteudos';
    if (s.includes('episodio') || s === '99902') return 'episodios';
    if (s.includes('banner') || s === '99903') return 'banners';
    if (s.includes('categoria') || s === '99904') return 'categorias';
    if (s.includes('usuario') || s === '99905') return 'usuarios';
    if (s.includes('sessao') || s.includes('sessoes') || s === '99906') return 'sessoes';
    if (s.includes('canal') || s.includes('canaistv') || s === '99908') return 'canaisTv';
    if (s.includes('jogo') || s === '99909') return 'jogosDia';
    if (s.includes('miniserie') || s === '99910') return 'miniseries';
    return 'conteudos';
  }

  getTable(tableIdOrName: string, searchTerm?: string): { results: DemoRow[]; count: number } {
    const key = this.resolveKey(tableIdOrName);
    let items = this.tables[key] || [];

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item => {
        return Object.values(item).some(val => 
          String(val).toLowerCase().includes(term)
        );
      });
    }

    return {
      results: [...items],
      count: items.length
    };
  }

  addRow(tableIdOrName: string, data: any): DemoRow {
    const key = this.resolveKey(tableIdOrName);
    const newRow: DemoRow = {
      id: ++this.nextId,
      ...data
    };
    if (!this.tables[key]) this.tables[key] = [];
    this.tables[key].unshift(newRow);
    return newRow;
  }

  updateRow(tableIdOrName: string, rowId: string | number, data: any): DemoRow {
    const key = this.resolveKey(tableIdOrName);
    const numId = Number(rowId);
    const list = this.tables[key] || [];
    const index = list.findIndex(r => r.id === numId);
    if (index >= 0) {
      list[index] = { ...list[index], ...data };
      return list[index];
    }
    return { id: numId, ...data };
  }

  deleteRow(tableIdOrName: string, rowId: string | number): boolean {
    const key = this.resolveKey(tableIdOrName);
    const numId = Number(rowId);
    if (this.tables[key]) {
      this.tables[key] = this.tables[key].filter(r => r.id !== numId);
    }
    return true;
  }

  deleteBatch(tableIdOrName: string, ids: (string | number)[]): void {
    const key = this.resolveKey(tableIdOrName);
    const setIds = new Set(ids.map(Number));
    if (this.tables[key]) {
      this.tables[key] = this.tables[key].filter(r => !setIds.has(r.id));
    }
  }
}

export const demoDatabase = new DemoDatabaseState();

export const isDemoSessionActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('tibim-demo-mode') === 'true';
};
