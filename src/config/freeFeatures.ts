/**
 * Features liberadas gratuitamente quando a assinatura do usuário está expirada.
 * Valem para todos os usuários, independente do plano anterior.
 */
export const FREE_FEATURES_WHEN_EXPIRED: string[] = [
  'conteudos',
  'episodios',
  'configuracoes',
  'pedido',
  'carrosseu',
  'categoriaFilmes',
  'categoriaSeries',
  'categoriaDorama',
  'categoriaAnimes',
  'categoriaNovelas',
];

export const isFreeFeatureWhenExpired = (featureId: string): boolean =>
  FREE_FEATURES_WHEN_EXPIRED.includes(featureId);