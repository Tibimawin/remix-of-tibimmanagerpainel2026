export * from './types';
export { PremierArenaBanner } from './PremierArenaBanner';
export { ChampionsStadiumBanner } from './ChampionsStadiumBanner';
export { CyberNeonBanner } from './CyberNeonBanner';
export { StoriesMatchBanner } from './StoriesMatchBanner';
export { SuperClasicoBanner } from './SuperClasicoBanner';
export { VipGoldBanner } from './VipGoldBanner';
export { MinimalistCleanBanner } from './MinimalistCleanBanner';
export { FeedSquareBanner } from './FeedSquareBanner';
export { FireStadiumBanner } from './FireStadiumBanner';
export { GridMultiJogosBanner } from './GridMultiJogosBanner';
export { ClassicBroadcastBanner } from './ClassicBroadcastBanner';

export interface SportsModelDef {
  id: string;
  name: string;
  description: string;
  ratio: string;
  badge?: string;
  badgeColor?: string;
}

export const SPORTS_MODELS: SportsModelDef[] = [
  {
    id: 'premier',
    name: '1. Premier Arena',
    description: 'Transmissão clássica com cards chanfrados',
    ratio: '4:5',
    badge: 'NOVO ✨',
    badgeColor: 'bg-red-600'
  },
  {
    id: 'champions',
    name: '2. Noite de Champions',
    description: 'Estádio azul noite com brilho de estrelas',
    ratio: '4:5',
    badge: 'NOVO ✨',
    badgeColor: 'bg-blue-600'
  },
  {
    id: 'cyber',
    name: '3. Cyber Neon Stadium',
    description: 'Glow neon ciano e rosa estilo eSports / CazéTV',
    ratio: '4:5',
    badge: 'NOVO ✨',
    badgeColor: 'bg-cyan-500 text-black'
  },
  {
    id: 'stories',
    name: '4. Stories 9:16',
    description: 'Status do WhatsApp e Instagram Stories',
    ratio: '9:16',
    badge: 'MOBILE 📱',
    badgeColor: 'bg-purple-600'
  },
  {
    id: 'superclasico',
    name: '5. Super Clássico Hero',
    description: 'Destaque gigante no jogo principal da rodada',
    ratio: '4:5',
    badge: 'DUELO 🔥',
    badgeColor: 'bg-amber-500 text-black'
  },
  {
    id: 'vipgold',
    name: '6. VIP Black & Gold',
    description: 'Edição luxo dourada com coroas e selos 4K',
    ratio: '4:5',
    badge: 'VIP GOLD 👑',
    badgeColor: 'bg-amber-400 text-black'
  },
  {
    id: 'minimalist',
    name: '7. Minimalist Clean',
    description: 'Apple Sports & The Athletic editorial limpo',
    ratio: '4:5',
    badge: 'CLEAN ⚪',
    badgeColor: 'bg-neutral-600'
  },
  {
    id: 'feedsquare',
    name: '8. Feed 1:1 Quadrado',
    description: 'Post quadrado para Feed do Instagram e Telegram',
    ratio: '1:1',
    badge: 'FEED 1:1 📸',
    badgeColor: 'bg-emerald-600'
  },
  {
    id: 'fire',
    name: '9. Estádio em Chamas',
    description: 'Clima de decisão, fumaça e brasas alaranjadas',
    ratio: '4:5',
    badge: 'FOGO 💥',
    badgeColor: 'bg-orange-600'
  },
  {
    id: 'gridmulti',
    name: '10. Grade Multi-Jogos',
    description: '2 Colunas para rodadas com muitos jogos',
    ratio: '4:5',
    badge: 'GRADE 📋',
    badgeColor: 'bg-indigo-600'
  },
  {
    id: 'classic',
    name: '11. Clássico Original',
    description: 'Banner padrão com cartelas brancas clássicas',
    ratio: '4:5'
  }
];
