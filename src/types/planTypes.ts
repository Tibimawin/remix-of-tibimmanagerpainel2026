
export interface UserPermissions {
  userId: string;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  monthlyContentLimit: number;
  enabledFeatures: string[];
  currentMonthUsage: number;
  lastUpdated: string;
  expiryDate?: string;
  isActive?: boolean;
}

export interface FeatureAccess {
  id: string;
  name: string;
  description: string;
}

export interface Plan {
  id: string;
  name: string;
  price: string;
  description: string;
  monthlyContentLimit: number;
  features: string[];
  blockingMessage?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const AVAILABLE_FEATURES: FeatureAccess[] = [
  // Principal
  { id: 'dashboard', name: 'Dashboard', description: 'Acesso ao painel principal' },

  // Conteúdo
  { id: 'conteudos', name: 'Gerenciar Conteúdos', description: 'Visualizar e editar conteúdos' },
  { id: 'episodios', name: 'Gerenciar Episódios', description: 'Visualizar e editar episódios' },
  { id: 'lista-m3u', name: 'Lista M3U', description: 'Gerenciar listas de reprodução M3U' },
  { id: 'banners', name: 'Gerenciar Banners', description: 'Criar e editar banners do sistema' },

  { id: 'categorias', name: 'Gerenciar Categorias', description: 'Organizar e editar categorias' },
  { id: 'categorias-tv', name: 'Categorias TV', description: 'Gerenciar categorias de canais de TV' },
  { id: 'categorias-anime', name: 'Categorias Anime', description: 'Gerenciar categorias de animes' },

  // Ferramentas
  { id: 'duplicados', name: 'Verificar Duplicados', description: 'Encontrar conteúdos duplicados' },
  { id: 'duplicados-episodios', name: 'Verificar Duplicados Episódios', description: 'Encontrar episódios duplicados' },
  { id: 'importacao-automatica', name: 'Importação Auto', description: 'Importar conteúdos manualmente da tabela origem' },
  { id: 'automacao', name: 'Automação', description: 'Importação automática agendada de conteúdos' },
  { id: 'substituicao-urls', name: 'Substituição de URLs', description: 'Substituição em massa de URLs' },
  { id: 'importar-m3u', name: 'Importar M3U', description: 'Importar listas M3U manualmente' },
  { id: 'adicionar-conteudo', name: 'Adicionar Conteúdo', description: 'Adicionar novos conteúdos manualmente' },
  { id: 'importar-canais-tv', name: 'Importar Canais TV', description: 'Importar canais de TV da tabela origem' },
  { id: 'atualizacao-series', name: 'Atualização de Series', description: 'Ferramenta para atualizar informações de series automaticamente' },
  { id: 'maxplus-import', name: 'MaxPlus Importação', description: 'Importar filmes e séries da API MaxPlus' },
  

  // Gerenciamento
  { id: 'usuarios', name: 'Gerenciar Usuários', description: 'Administrar usuários do sistema' },
  { id: 'sessoes', name: 'Gerenciar Sessões', description: 'Monitorar sessões ativas' },
  { id: 'plataformas', name: 'Gerenciar Plataformas', description: 'Configurar plataformas de streaming' },
  { id: 'produtos', name: 'Gerenciar Produtos', description: 'Administrar produtos disponíveis' },

  // Análises
  { id: 'estatisticas', name: 'Estatísticas', description: 'Visualizar estatísticas gerais' },
  { id: 'relatorios-visualizacao', name: 'Relatórios de Visualização', description: 'Relatórios detalhados de visualização' },
  { id: 'metricas-engajamento', name: 'Métricas de Engajamento', description: 'Análise de engajamento dos usuários' },

  // Configurações
  { id: 'recursos', name: 'Recursos', description: 'Gerenciar recursos disponíveis' },
  { id: 'precos-interno', name: 'Preços Interno', description: 'Configurar preços internos' },
  { id: 'configuracoes', name: 'Configurações', description: 'Configurações gerais do sistema' },
  { id: 'perfil', name: 'Perfil', description: 'Gerenciar perfil do usuário' },
  { id: 'historico-acoes', name: 'Histórico de Ações', description: 'Visualizar histórico pessoal de ações e desfazer ações recentes' },

  // Suporte
  { id: 'suporte-ao-vivo', name: 'Suporte ao Vivo', description: 'Chat de suporte em tempo real' },
  { id: 'priority-support', name: 'Suporte Prioritário', description: 'Suporte técnico prioritário' },

  // Ofertas
  { id: 'ofertas', name: 'Ofertas Especiais', description: 'Visualizar ofertas e promoções especiais' },

  // Extras
  { id: 'export', name: 'Exportar Dados', description: 'Exportar dados do sistema' },
  { id: 'logs', name: 'Logs do Sistema', description: 'Visualizar logs do sistema' },
  { id: 'clean-data', name: 'Limpeza de Dados', description: 'Remover todos os registros de uma tabela do Baserow' },
  
  // Segurança
  { id: 'gestao-dispositivos', name: 'Gestão de Dispositivos', description: 'Gerenciar dispositivos conectados e limites por usuário' },

  // Planos
  { id: 'planos', name: 'Planos', description: 'Visualizar tabela de planos disponíveis' }
];
