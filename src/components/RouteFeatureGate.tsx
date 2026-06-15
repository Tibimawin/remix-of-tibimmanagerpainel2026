import React from 'react';
import { useLocation } from 'react-router-dom';
import { PermissionGate } from './PermissionGate';

const routeFeatures: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/conteudos': 'conteudos',
  '/episodios': 'episodios',
  '/banners': 'banners',
  '/categorias': 'categorias',
  '/categorias-tv': 'categorias-tv',
  '/categorias-anime': 'categorias-anime',
  '/duplicados': 'duplicados',
  '/duplicados-episodios': 'duplicados-episodios',
  '/usuarios': 'usuarios',
  '/sessoes': 'sessoes',
  '/plataformas': 'plataformas',
  '/produtos': 'produtos',
  '/suporte-ao-vivo': 'suporte-ao-vivo',
  '/atualizacao-series': 'atualizacao-series',
  '/importacao-automatica': 'importacao-automatica',
  '/configuracoes-auto-import': 'importacao-automatica',
  '/substituicao-urls': 'substituicao-urls',
  '/configuracoes': 'configuracoes',
  '/configuracoes-apis': 'configuracoes',
  '/configuracoes-seguranca': 'configuracoes',
  '/recursos': 'recursos',
  '/importar-m3u': 'importar-m3u',
  '/importar-canais-tv': 'importar-canais-tv',
  '/importar-conteudo': 'importar-m3u',
  '/estatisticas': 'estatisticas',
  '/adicionar-conteudo': 'adicionar-conteudo',
  '/precos-interno': 'precos-interno',
  '/sistema-indicacao': 'sistema-indicacao',
  '/relatorios-visualizacao': 'relatorios-visualizacao',
  '/perfil': 'perfil',
  '/historico-acoes': 'historico-acoes',
  '/gestao-dispositivos': 'gestao-dispositivos',
  '/ofertas': 'ofertas',
  '/limpeza-dados': 'clean-data',
  '/minha-api': 'minha-api',
  '/maxplus-import': 'maxplus-import',
  '/carrosseu': 'carrosseu',
  '/versao': 'versao',
  '/pedido': 'pedido',
  '/avaliacao': 'avaliacao',
  '/plano2': 'plano2',
  '/categoria-filmes': 'categoriaFilmes',
  '/categoria-series': 'categoriaSeries',
  '/categoria-dorama': 'categoriaDorama',
  '/categoria-animes': 'categoriaAnimes',
  '/categoria-novelas': 'categoriaNovelas',
  '/perfis': 'perfil',
  '/meus-aplicativos': 'meus-aplicativos',
};

const getFeatureForPath = (pathname: string): string | null => {
  if (pathname.startsWith('/oferta/')) return 'ofertas';
  return routeFeatures[pathname] ?? null;
};

export const RouteFeatureGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const feature = getFeatureForPath(pathname);

  if (!feature) return <>{children}</>;

  return (
    <PermissionGate feature={feature}>
      {children}
    </PermissionGate>
  );
};