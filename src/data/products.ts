export interface ProductItem {
  id: string;
  nome: string;
  subtitulo: string;
  preco: number;
  precoOriginal?: number;
  categoria: string;
  badge?: string;
  badgeColor?: string;
  imagem?: string;
  descricao: string;
  descricaoCompleta: string[];
  beneficios: { title: string; desc: string }[];
  especificacoes: { label: string; value: string }[];
  downloadsDisponiveis?: {
    type: 'conteudos' | 'episodios';
    label: string;
    description: string;
    icon: string;
  }[];
}

export const PRODUCTS_CATALOG: ProductItem[] = [
  {
    id: 'source_csv_full',
    nome: 'Carga Total do Painel (Acervo Completo)',
    subtitulo: 'Acesso instantâneo a todos os conteúdos e episódios sincronizados em alta velocidade',
    preco: 10.00,
    precoOriginal: 29.90,
    categoria: 'Bancos de Dados',
    badge: 'MAIS VENDIDO',
    badgeColor: 'from-amber-500 to-orange-500',
    descricao: 'Receba todos os filmes, séries, animes, novelas e episódios completos do painel em planilhas CSV prontas para carregar no seu Baserow em 1 minuto.',
    descricaoCompleta: [
      'A Carga Total do Painel é a solução definitiva para quem deseja popular seu catálogo de forma instantânea sem precisar esperar dias por requisições de API.',
      'Você receberá os arquivos prontos com capas em alta definição, sinopses detalhadas, anos de lançamento, temporadas, IDs e vinculações de episódios totalmente formatados.',
      'Basta fazer o download do CSV e subir direto na sua tabela do Baserow com o clique de um botão.'
    ],
    beneficios: [
      {
        title: 'Zero Bloqueios de API',
        desc: 'Suba dezenas de milhares de títulos sem esgotar seus limites de requisições por minuto.'
      },
      {
        title: 'Filmes, Séries, Novelas e Animes',
        desc: 'Catálogo massivo e atualizado com capas, sinopses, gêneros e metadados completos.'
      },
      {
        title: 'Episódios & Temporadas Estruturados',
        desc: 'Planilha complementar com todos os episódios numerados e prontos para vincular.'
      },
      {
        title: 'Codificação UTF-8 Perfeita',
        desc: 'Formatado com padrão internacional para que títulos e acentuações abram perfeitamente no Baserow ou Excel.'
      }
    ],
    especificacoes: [
      { label: 'Formato de Entrega', value: 'Arquivos .CSV Otimizados (UTF-8)' },
      { label: 'Compatibilidade', value: 'Baserow, Excel, Google Sheets, Bancos SQL' },
      { label: 'Tipo de Acesso', value: 'Vitalício pós-confirmação PIX' },
      { label: 'Tamanho Estimado', value: '50.000+ Registros Prontos' }
    ],
    downloadsDisponiveis: [
      {
        type: 'conteudos',
        label: 'Tabela de Conteúdos (.CSV)',
        description: 'Filmes, Séries, Novelas e Animes com metadados e capas',
        icon: 'film'
      },
      {
        type: 'episodios',
        label: 'Tabela de Episódios (.CSV)',
        description: 'Temporadas e episódios vinculados por ID de série',
        icon: 'tv'
      }
    ]
  },
  {
    id: 'backup_nuvem_auto',
    nome: 'Módulo Backup em Nuvem Automático',
    subtitulo: 'Segurança total e rotinas automáticas de cópia de segurança para o seu Baserow',
    preco: 20.00,
    precoOriginal: 49.90,
    categoria: 'Segurança & Nuvem',
    badge: 'LANÇAMENTO',
    badgeColor: 'from-emerald-600 to-teal-600',
    descricao: 'Rotinas automáticas diárias e semanais de cópia de segurança do seu catálogo do Baserow com histórico de versões e restauração em 1 clique.',
    descricaoCompleta: [
      'O Módulo Backup em Nuvem Automático foi desenvolvido para blindar a sua operação contra perdas acidentais de dados, exclusões indevidas ou falhas de sincronização.',
      'Como funciona na prática: O sistema se conecta periodicamente com a sua base de dados do Baserow de forma invisível em horários programados (ex: de madrugada), gera um snapshot completo e compactado de todas as suas tabelas (Filmes, Séries, Episódios, Banners e Categorias) e armazena em uma nuvem segura e criptografada.',
      'Se acontecer qualquer imprevisto ou você precisar voltar a uma versão anterior do seu catálogo, basta acessar o painel de restauração e clicar em "Restaurar Backup" para recuperar todos os seus registros instantaneamente.'
    ],
    beneficios: [
      {
        title: 'Rotinas Programadas e Automáticas',
        desc: 'Backups diários ou semanais executados de forma silenciosa sem você precisar se preocupar.'
      },
      {
        title: 'Histórico Completo de Snapshots',
        desc: 'Acesse cópias dos últimos 7 a 30 dias com data, hora e contagem exata de registros salvos.'
      },
      {
        title: 'Restauração com 1 Clique (Rollback)',
        desc: 'Recupere seu catálogo inteiro ou tabelas específicas em segundos sem perda de informações.'
      },
      {
        title: 'Armazenamento Criptografado em Nuvem',
        desc: 'Seus dados protegidos e isolados com total privacidade e disponibilidade 24/7.'
      }
    ],
    especificacoes: [
      { label: 'Frequência de Backup', value: 'Diária Automática (03:00) / Manual Instantânea' },
      { label: 'Retenção de Cópias', value: 'Últimos 30 Snapshots com Versionamento' },
      { label: 'Tempo de Restauração', value: 'Média de 30 a 60 segundos' },
      { label: 'Compatibilidade', value: 'Baserow Cloud & Self-Hosted' }
    ]
  }
];
