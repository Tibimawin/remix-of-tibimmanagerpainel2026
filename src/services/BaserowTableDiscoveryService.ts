import { makeProxyRequest } from '@/utils/proxyRequest';
import { isDemoSessionActive } from '@/services/BaserowDemoData';
import { logger } from '@/utils/logger';

export interface BaserowTable {
  id: number | string;
  name: string;
  order?: number;
  database_id?: number;
}

export interface BaserowApplication {
  id: number | string;
  name: string;
  type?: string;
  tables: BaserowTable[];
}

export type TableKey =
  | 'conteudos'
  | 'episodios'
  | 'banners'
  | 'categorias'
  | 'categoriasTV'
  | 'categoriasAnime'
  | 'categoriaFilmes'
  | 'categoriaSeries'
  | 'categoriaDorama'
  | 'categoriaNovelas'
  | 'categoriaAnimes'
  | 'canaisTv'
  | 'jogosDia'
  | 'miniseries'
  | 'miniseriesEpisodios'
  | 'plataformas'
  | 'usuarios'
  | 'sessoes'
  | 'planos'
  | 'plano2'
  | 'carrosseu'
  | 'versao'
  | 'pedido'
  | 'avaliacao'
  | 'perfil'
  | 'meusAplicativos';

export interface TableDefinition {
  key: TableKey;
  label: string;
  category: 'principal' | 'tibim' | 'sistema';
  description: string;
  priority: number; // Maior prioridade ganha em ambiguidades
  exactSynonyms: string[];
  containsKeywords: string[];
  excludeKeywords?: string[]; // Palavras que anulam o match nesta chave
}

export interface DetectedTableMatch {
  key: TableKey;
  label: string;
  category: 'principal' | 'tibim' | 'sistema';
  tableId: string;
  tableName: string;
  confidence: 'high' | 'medium';
  selected: boolean;
}

export interface DiscoveryResult {
  databases: BaserowApplication[];
  selectedDatabaseId: string | number;
  matches: Record<TableKey, DetectedTableMatch | null>;
  unmatchedTables: BaserowTable[];
  totalMatched: number;
}

/**
 * Dicionário inteligente de sinônimos com prioridades e palavras excludentes.
 * Garante identificação precisa mesmo com variações no Baserow:
 * - "Pedidos" / "Perfis" / "Versao" / "Planos ou Plano"
 * - "Categorias Filmes" / "Categorias Series" / "Categorias Doramas" / "Categorias Novelas"
 */
export const TABLE_DEFINITIONS: TableDefinition[] = [
  // 1. Minisséries Episódios (Alta prioridade para não cair em episódios)
  {
    key: 'miniseriesEpisodios',
    label: 'Episódios de Minisséries',
    category: 'principal',
    description: 'Episódios de minisséries, novelas ou doramas',
    priority: 40,
    exactSynonyms: [
      'minisseries episodios',
      'miniseries episodios',
      'miniseries episodes',
      'episodios minisseries',
      'episodios de minisseries',
      'capitulos novelas',
      'capitulos de novelas',
      'miniseries_episodios',
    ],
    containsKeywords: ['minisserie episodio', 'miniseries episodio', 'episodio minisserie', 'episodios minisserie'],
  },
  // 2. Minisséries (Alta prioridade para não cair em conteúdos)
  {
    key: 'miniseries',
    label: 'Minisséries / Novelas',
    category: 'principal',
    description: 'Catálogo de minisséries e novelas',
    priority: 38,
    exactSynonyms: [
      'minisseries',
      'miniseries',
      'mini series',
      'miniserie',
    ],
    containsKeywords: ['minisserie', 'miniseries', 'mini series'],
    excludeKeywords: ['episodio', 'episodios', 'episode', 'episodes', 'capitulo', 'capitulos'],
  },
  // 3. Categorias Específicas do Modo Tibim (Prioridade 35 para NUNCA cair na genérica "Categorias")
  {
    key: 'categoriaFilmes',
    label: 'Categorias de Filmes',
    category: 'tibim',
    description: 'Categorias e gêneros específicos para filmes',
    priority: 35,
    exactSynonyms: [
      'categorias filmes',
      'categoria filmes',
      'categorias de filmes',
      'categoria de filmes',
      'categoria filme',
      'categorias filme',
      'generos filmes',
      'filmes categorias',
      'genero filmes',
    ],
    containsKeywords: ['categoria filme', 'categorias filme', 'categoria filmes', 'categorias filmes', 'generos filme'],
  },
  {
    key: 'categoriaSeries',
    label: 'Categorias de Séries',
    category: 'tibim',
    description: 'Categorias e gêneros específicos para séries',
    priority: 35,
    exactSynonyms: [
      'categorias series',
      'categoria series',
      'categorias de series',
      'categoria de series',
      'categoria serie',
      'categorias serie',
      'generos series',
      'series categorias',
      'genero series',
    ],
    containsKeywords: ['categoria serie', 'categorias serie', 'categoria series', 'categorias series', 'generos serie'],
  },
  {
    key: 'categoriaDorama',
    label: 'Categorias de Doramas',
    category: 'tibim',
    description: 'Categorias e gêneros específicos para doramas',
    priority: 35,
    exactSynonyms: [
      'categorias doramas',
      'categoria doramas',
      'categorias de doramas',
      'categoria de doramas',
      'categorias dorama',
      'categoria dorama',
      'doramas categorias',
      'dorama categorias',
      'doramas',
      'dorama',
    ],
    containsKeywords: ['categoria dorama', 'categorias dorama', 'categoria doramas', 'categorias doramas', 'dorama', 'doramas'],
  },
  {
    key: 'categoriaNovelas',
    label: 'Categorias de Novelas',
    category: 'tibim',
    description: 'Categorias e gêneros específicos para novelas',
    priority: 35,
    exactSynonyms: [
      'categorias novelas',
      'categoria novelas',
      'categorias de novelas',
      'categoria de novelas',
      'categoria novela',
      'categorias novela',
      'novelas categorias',
      'novela categorias',
      'novelas',
      'novela',
    ],
    containsKeywords: ['categoria novela', 'categorias novela', 'categoria novelas', 'categorias novelas', 'novela', 'novelas'],
  },
  {
    key: 'categoriaAnimes',
    label: 'Categorias de Animes (Tibim)',
    category: 'tibim',
    description: 'Categorias específicas para animes',
    priority: 35,
    exactSynonyms: [
      'categorias animes',
      'categoria animes',
      'categorias anime',
      'categoria anime',
      'categorias de animes',
      'categoria de animes',
      'animes categorias',
      'animes',
    ],
    containsKeywords: ['categoria anime', 'categorias anime', 'categoria animes', 'categorias animes'],
  },
  {
    key: 'categoriasTV',
    label: 'Categorias de TV',
    category: 'tibim',
    description: 'Categorias exclusivas para canais de TV',
    priority: 35,
    exactSynonyms: [
      'categorias tv',
      'categoria tv',
      'categorias de tv',
      'categoria de tv',
      'generos tv',
      'tv categorias',
      'canais categorias',
    ],
    containsKeywords: ['categoria tv', 'categorias tv', 'genero tv'],
  },
  {
    key: 'categoriasAnime',
    label: 'Categorias de Anime (Plural)',
    category: 'principal',
    description: 'Categorias de animes do modo Plural',
    priority: 34,
    exactSynonyms: ['categorias anime plural', 'categoria anime plural'],
    containsKeywords: ['anime plural'],
  },
  // 4. Pedidos (Tabela Pedidos do Baserow)
  {
    key: 'pedido',
    label: 'Pedidos de Conteúdo',
    category: 'tibim',
    description: 'Solicitações e pedidos de conteúdos enviados pelos usuários',
    priority: 30,
    exactSynonyms: [
      'pedidos',
      'pedido',
      'solicitacoes',
      'solicitacao',
      'requests',
      'pedidos de conteudo',
      'pedidos de clientes',
      'pedidos usuarios',
    ],
    containsKeywords: ['pedido', 'pedidos', 'solicitacao', 'solicitacoes'],
  },
  // 5. Perfis (Tabela Perfis do Baserow)
  {
    key: 'perfil',
    label: 'Perfis de Usuários',
    category: 'tibim',
    description: 'Perfis múltiplos vinculados a cada usuário/conta',
    priority: 30,
    exactSynonyms: [
      'perfis',
      'perfil',
      'profiles',
      'profile',
      'perfis de usuarios',
      'perfis de usuario',
      'perfis usuarios',
    ],
    containsKeywords: ['perfil', 'perfis', 'profile', 'profiles'],
  },
  // 6. Versão (Tabela Versão do Baserow)
  {
    key: 'versao',
    label: 'Versão do App',
    category: 'tibim',
    description: 'Controle de versão e atualizações do APK/app',
    priority: 30,
    exactSynonyms: [
      'versao',
      'versoes',
      'version',
      'app version',
      'versao do app',
      'versao do aplicativo',
      'atualizacao',
      'updates',
    ],
    containsKeywords: ['versao', 'versoes', 'version', 'app version'],
  },
  // 7. Planos Secundários (Plano 2)
  {
    key: 'plano2',
    label: 'Plano 2 (Secundário)',
    category: 'tibim',
    description: 'Tabela secundária de planos do Modo Tibim',
    priority: 28,
    exactSynonyms: ['plano2', 'plano 2', 'planos 2', 'planos2', 'segundo plano', 'plano secundario'],
    containsKeywords: ['plano 2', 'plano2', 'planos 2', 'planos2'],
  },
  // 8. Planos ou Plano (Tabela Planos do Baserow)
  {
    key: 'planos',
    label: 'Planos de Assinatura',
    category: 'sistema',
    description: 'Planos e assinaturas de acesso',
    priority: 25,
    exactSynonyms: [
      'planos',
      'plano',
      'plans',
      'plan',
      'pacotes',
      'assinaturas',
      'planos de assinatura',
      'tabela de planos',
    ],
    containsKeywords: ['plano', 'planos', 'pacote', 'pacotes'],
    excludeKeywords: ['plano 2', 'plano2', 'segundo plano'],
  },
  // 9. Jogos do Dia (Futebol / Esportes)
  {
    key: 'jogosDia',
    label: 'Jogos do Dia',
    category: 'principal',
    description: 'Partidas de futebol e agenda esportiva diária',
    priority: 22,
    exactSynonyms: [
      'jogos do dia',
      'jogos dia',
      'jogos',
      'futebol',
      'partidas',
      'jogosdia',
      'agenda esportiva',
      'matches',
      'jogos ao vivo',
    ],
    containsKeywords: ['jogos do dia', 'jogos dia', 'jogos', 'partidas', 'futebol'],
  },
  // 10. Canais de TV
  {
    key: 'canaisTv',
    label: 'Canais de TV',
    category: 'principal',
    description: 'Grade de canais de TV ao vivo e IPTV',
    priority: 22,
    exactSynonyms: [
      'canais tv',
      'canais de tv',
      'canais',
      'canaistv',
      'tv',
      'live tv',
      'emissoras',
      'channels',
      'grade tv',
      'iptv canais',
    ],
    containsKeywords: ['canais tv', 'canais de tv', 'canais', 'canaistv'],
    excludeKeywords: ['categoria', 'categorias'],
  },
  // 11. Banners / Slides
  {
    key: 'banners',
    label: 'Banners Principais',
    category: 'principal',
    description: 'Banners e destaques visuais do painel/app',
    priority: 20,
    exactSynonyms: [
      'banners',
      'banner',
      'destaques',
      'slides',
      'sliders',
      'carrossel principal',
      'banners principais',
    ],
    containsKeywords: ['banner', 'banners', 'destaque', 'destaques', 'slide', 'slides'],
  },
  // 12. Episódios Principais
  {
    key: 'episodios',
    label: 'Episódios',
    category: 'principal',
    description: 'Episódios de séries normais',
    priority: 18,
    exactSynonyms: ['episodios', 'episodio', 'episodes', 'episode', 'capitulos', 'eps'],
    containsKeywords: ['episodio', 'episodios', 'episodes', 'capitulo'],
    excludeKeywords: ['minisserie', 'minisseries', 'novela', 'novelas'],
  },
  // 13. Conteúdos (Filmes e Séries)
  {
    key: 'conteudos',
    label: 'Conteúdos (Filmes & Séries)',
    category: 'principal',
    description: 'Catálogo principal de filmes, séries e mídias',
    priority: 18,
    exactSynonyms: [
      'conteudos',
      'conteudo',
      'filmes',
      'series',
      'filmes e series',
      'catalogo',
      'catalogo filmes',
      'midias',
      'titulos',
      'acervo',
    ],
    containsKeywords: ['conteudo', 'conteudos', 'filmes', 'series', 'catalogo'],
    excludeKeywords: ['episodio', 'episodios', 'categoria', 'categorias', 'banner', 'banners'],
  },
  // 14. Categorias Gerais (Captura apenas quando não for categoria específica de nada)
  {
    key: 'categorias',
    label: 'Categorias (Gerais)',
    category: 'principal',
    description: 'Gêneros e categorias gerais de conteúdos',
    priority: 15,
    exactSynonyms: ['categorias', 'categoria', 'generos', 'genero', 'categories'],
    containsKeywords: ['categoria', 'categorias', 'genero', 'generos'],
    excludeKeywords: ['tv', 'anime', 'animes', 'filme', 'filmes', 'serie', 'series', 'dorama', 'doramas', 'novela', 'novelas'],
  },
  // 15. Usuários / Clientes
  {
    key: 'usuarios',
    label: 'Usuários',
    category: 'principal',
    description: 'Cadastro de usuários e clientes do aplicativo',
    priority: 20,
    exactSynonyms: ['usuarios', 'usuario', 'users', 'user', 'clientes', 'cliente', 'assinantes', 'membros'],
    containsKeywords: ['usuario', 'usuarios', 'cliente', 'clientes', 'assinante'],
    excludeKeywords: ['sessao', 'sessoes', 'session', 'sessions', 'perfil', 'perfis'],
  },
  // 16. Sessões / Dispositivos Ativos
  {
    key: 'sessoes',
    label: 'Sessões Ativas',
    category: 'principal',
    description: 'Sessões de logins e dispositivos conectados',
    priority: 20,
    exactSynonyms: [
      'sessoes',
      'sessao',
      'sessions',
      'session',
      'dispositivos ativos',
      'conexoes',
      'logins ativos',
      'acessos',
    ],
    containsKeywords: ['sessao', 'sessoes', 'session', 'dispositivo ativo', 'dispositivos'],
  },
  // 17. Plataformas de Streaming
  {
    key: 'plataformas',
    label: 'Plataformas',
    category: 'principal',
    description: 'Serviços de streaming (Netflix, Prime, Max, etc.)',
    priority: 15,
    exactSynonyms: [
      'plataformas',
      'plataforma',
      'streamings',
      'servicos de streaming',
      'players',
      'plataformas streaming',
    ],
    containsKeywords: ['plataforma', 'plataformas', 'streaming'],
  },
  // 18. Carrossel (Modo Tibim)
  {
    key: 'carrosseu',
    label: 'Carrossel (Modo Tibim)',
    category: 'tibim',
    description: 'Carrossel de itens destacados do Modo Tibim',
    priority: 15,
    exactSynonyms: ['carrosseu', 'carrossel', 'carrousel'],
    containsKeywords: ['carrosseu', 'carrossel'],
  },
  // 19. Avaliações
  {
    key: 'avaliacao',
    label: 'Avaliações',
    category: 'tibim',
    description: 'Notas, feedbacks e reviews de conteúdos',
    priority: 15,
    exactSynonyms: ['avaliacoes', 'avaliacao', 'feedbacks', 'reviews', 'ratings', 'notas'],
    containsKeywords: ['avaliacao', 'avaliacoes', 'feedback', 'review'],
  },
  // 20. Meus Aplicativos
  {
    key: 'meusAplicativos',
    label: 'Meus Aplicativos',
    category: 'tibim',
    description: 'Lista de apps disponibilizados para download',
    priority: 15,
    exactSynonyms: ['meus aplicativos', 'meus aplicatvos', 'aplicativos', 'apps', 'meus apps'],
    containsKeywords: ['aplicativo', 'aplicativos', 'app', 'apps'],
  },
];

/**
 * Normaliza um texto para comparação sem acentos, sem caixa alta e sem caracteres especiais.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Dados simulados de demonstração incluindo exatamente as tabelas do usuário.
 */
const MOCK_DEMO_DATABASES: BaserowApplication[] = [
  {
    id: 1,
    name: 'Banco de Dados Principal',
    type: 'database',
    tables: [
      { id: 101, name: 'Conteúdos', order: 1 },
      { id: 102, name: 'Episódios', order: 2 },
      { id: 103, name: 'Banners', order: 3 },
      { id: 104, name: 'Categorias', order: 4 },
      { id: 105, name: 'Categorias Filmes', order: 5 },
      { id: 106, name: 'Categorias Series', order: 6 },
      { id: 107, name: 'Categorias Doramas', order: 7 },
      { id: 108, name: 'Categorias Novelas', order: 8 },
      { id: 109, name: 'Categorias Animes', order: 9 },
      { id: 110, name: 'Canais de TV', order: 10 },
      { id: 111, name: 'Jogos do Dia', order: 11 },
      { id: 112, name: 'Minisséries', order: 12 },
      { id: 113, name: 'Episódios de Minisséries', order: 13 },
      { id: 114, name: 'Plataformas', order: 14 },
      { id: 115, name: 'Usuários', order: 15 },
      { id: 116, name: 'Sessões', order: 16 },
      { id: 117, name: 'Planos', order: 17 },
      { id: 118, name: 'Pedidos', order: 18 },
      { id: 119, name: 'Perfis', order: 19 },
      { id: 120, name: 'Versao', order: 20 },
      { id: 121, name: 'Carrossel', order: 21 },
      { id: 122, name: 'Avaliações', order: 22 },
      { id: 123, name: 'Meus Aplicativos', order: 23 },
    ],
  },
];

export const BaserowTableDiscoveryService = {
  /**
   * Conecta ao Baserow informado e busca todas as aplicações e tabelas do workspace.
   */
  async fetchDatabases(baseUrl: string, apiToken: string): Promise<BaserowApplication[]> {
    if (!baseUrl || !apiToken) {
      throw new Error('Preencha a URL do Baserow e o Token da API antes de buscar as tabelas.');
    }

    // Modo demonstração
    if (
      isDemoSessionActive() ||
      apiToken.startsWith('demo-') ||
      baseUrl.includes('demo')
    ) {
      logger.info('BaserowTableDiscovery: Modo demo ativo, retornando banco simulado');
      return MOCK_DEMO_DATABASES;
    }

    // Sanitizar baseUrl
    let cleanUrl = baseUrl.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    if (cleanUrl.endsWith('/api')) {
      cleanUrl = cleanUrl.slice(0, -4);
    }

    const endpoint = `${cleanUrl}/api/applications/`;

    logger.info('BaserowTableDiscovery: Consultando aplicações no Baserow', { endpoint });

    const response = await makeProxyRequest({
      url: endpoint,
      method: 'GET',
      token: apiToken.trim(),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Token de API do Baserow inválido ou sem permissão para ler o banco de dados (HTTP 401/403).');
      }
      if (response.status === 404) {
        throw new Error('Servidor Baserow respondeu 404. Verifique se a URL informada está correta.');
      }
      if (response.status === 0 || response.error?.includes('Timeout')) {
        throw new Error('Tempo limite esgotado ao conectar ao Baserow. Verifique se a URL está online.');
      }
      throw new Error(response.error || `Falha ao consultar Baserow (HTTP ${response.status})`);
    }

    const rawData = response.data;
    const applicationsList: any[] = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.results)
      ? rawData.results
      : [];

    const databaseApps: BaserowApplication[] = applicationsList
      .filter((app: any) => {
        return (
          app &&
          (app.type === 'database' || (Array.isArray(app.tables) && app.tables.length > 0))
        );
      })
      .map((app: any) => ({
        id: app.id,
        name: app.name || `Banco de Dados #${app.id}`,
        type: app.type || 'database',
        tables: Array.isArray(app.tables)
          ? app.tables.map((t: any) => ({
              id: t.id,
              name: t.name || `Tabela #${t.id}`,
              order: t.order,
              database_id: t.database_id,
            }))
          : [],
      }));

    if (databaseApps.length === 0) {
      throw new Error(
        'Nenhum banco de dados com tabelas foi encontrado neste token do Baserow. Verifique se o token tem acesso ao Workspace do banco.'
      );
    }

    return databaseApps;
  },

  /**
   * Analisa as tabelas de um banco de dados e mapeia cada uma para a respectiva chave do painel.
   */
  matchTables(tables: BaserowTable[]): {
    matches: Record<TableKey, DetectedTableMatch | null>;
    unmatchedTables: BaserowTable[];
    totalMatched: number;
  } {
    // Inicializar dinamicamente todas as chaves mapeáveis
    const matches: Record<TableKey, DetectedTableMatch | null> = {} as any;
    for (const def of TABLE_DEFINITIONS) {
      matches[def.key] = null;
    }

    const usedTableIds = new Set<string | number>();

    // Ordenar definições por prioridade decrescente para que regras mais específicas peguem primeiro
    const sortedDefs = [...TABLE_DEFINITIONS].sort((a, b) => b.priority - a.priority);

    for (const def of sortedDefs) {
      let bestMatch: { table: BaserowTable; confidence: 'high' | 'medium'; score: number } | null = null;

      for (const table of tables) {
        if (usedTableIds.has(table.id)) continue;

        const normalizedName = normalizeText(table.name);
        if (!normalizedName) continue;

        // Verificar exclusões (ex: "Categorias Filmes" não pode casar com "Categorias")
        if (def.excludeKeywords && def.excludeKeywords.some((kw) => normalizedName.includes(normalizeText(kw)))) {
          continue;
        }

        // 1. Match exato de sinônimo (Pontuação 100)
        const isExact = def.exactSynonyms.some((syn) => normalizeText(syn) === normalizedName);
        if (isExact) {
          const score = 100 + def.priority;
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { table, confidence: 'high', score };
          }
          continue;
        }

        // 2. Match por contenção de palavra-chave (Pontuação 70 + prioridade)
        const matchedKw = def.containsKeywords.find((kw) => {
          const normKw = normalizeText(kw);
          return (
            normalizedName.includes(normKw) ||
            normKw.includes(normalizedName)
          );
        });

        if (matchedKw) {
          const score = 70 + def.priority;
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { table, confidence: 'medium', score };
          }
        }
      }

      if (bestMatch) {
        matches[def.key] = {
          key: def.key,
          label: def.label,
          category: def.category,
          tableId: String(bestMatch.table.id),
          tableName: bestMatch.table.name,
          confidence: bestMatch.confidence,
          selected: true,
        };
        usedTableIds.add(bestMatch.table.id);
      }
    }

    const unmatchedTables = tables.filter((t) => !usedTableIds.has(t.id));
    const totalMatched = Object.values(matches).filter((m) => m !== null).length;

    return {
      matches,
      unmatchedTables,
      totalMatched,
    };
  },

  /**
   * Executa todo o processo: busca os bancos, seleciona o primeiro (ou id especificado) e gera o mapeamento.
   */
  async discover(baseUrl: string, apiToken: string, preferredDatabaseId?: string | number): Promise<DiscoveryResult> {
    const databases = await this.fetchDatabases(baseUrl, apiToken);

    let selectedDb = databases[0];
    if (preferredDatabaseId) {
      const found = databases.find((db) => String(db.id) === String(preferredDatabaseId));
      if (found) selectedDb = found;
    }

    const { matches, unmatchedTables, totalMatched } = this.matchTables(selectedDb.tables);

    return {
      databases,
      selectedDatabaseId: selectedDb.id,
      matches,
      unmatchedTables,
      totalMatched,
    };
  },
};
