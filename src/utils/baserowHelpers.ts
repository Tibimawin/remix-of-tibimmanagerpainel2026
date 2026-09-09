/**
 * Common column aliases/synonyms mapping for Baserow tables,
 * especially user management, content, and system tables.
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  nome: ['nome', 'name', 'usuario', 'usuário', 'cliente'],
  email: ['email', 'e-mail', 'mail'],
  senha: ['senha', 'password', 'pass'],
  status: ['status', 'situacao', 'situação', 'estado'],
  vencimento: ['vencimento', 'datavencimento', 'data de vencimento', 'datadevencimento', 'validade', 'expirydate', 'expiracao'],
  datacriacao: ['datacriacao', 'data criacao', 'data de criacao', 'data de criação', 'datadecriacao', 'createdat', 'created_at', 'criado_em', 'criado em', 'datapagamento', 'data pagamento', 'data de pagamento', 'pagamento'],
  limite: ['limite', 'telas', 'limitedetelas', 'limite de telas', 'maxtelas', 'telasimultanea'],
  moedas: ['moedas', 'coins', 'saldo', 'pontos'],
  id: ['id', 'idusuario', 'userid', 'identificador'],
  appid: ['appid', 'app_id', 'app id', 'aplicativo', 'app'],
  ultimoacesso: ['ultimoacesso', 'ultimo acesso', 'último acesso', 'ultimocheckin', 'ultimo checkin', 'lastlogin', 'last_login'],
  logins: ['logins', 'totallogins', 'login_count'],
  totaldedias: ['totaldedias', 'total de dias', 'dias', 'totaldias', 'accessdays', 'periodo'],
  favoritos: ['favoritos', 'favorites', 'favs'],
  historico: ['historico', 'histórico', 'history'],
  // Campos de Conteúdos e Mídias
  capa: ['capa', 'poster', 'imagem', 'thumbnail', 'foto', 'image', 'banner', 'cover'],
  sinopse: ['sinopse', 'synopsis', 'descricao', 'descrição', 'description', 'resumo', 'overview'],
  categoria: ['categoria', 'category', 'genero', 'gênero', 'genres', 'generos'],
  link: ['link', 'url', 'video', 'stream', 'player', 'arquivo', 'source', 'videourl'],
  tipo: ['tipo', 'type', 'format', 'formato', 'conteudo_tipo'],
  idioma: ['idioma', 'language', 'audio', 'áudio', 'legenda', 'dublado_legendado'],
  // Campos de Episódios
  temporada: ['temporada', 'season', 'temp', 'numero_temporada', 'temporada_num', 'season_number'],
  episodio: ['episodio', 'episódio', 'episode', 'ep', 'numero_episodio', 'episodio_num', 'episode_number']
};

/**
 * Helper utility to perform case-insensitive, normalized, and synonym-aware key lookups
 * on objects returned by Baserow, ensuring casing and naming mismatches do not break the UI.
 */
export const getValueByPossibleKeys = (item: any, column: string): any => {
  if (!item) return undefined;
  if (item[column] !== undefined && item[column] !== null) return item[column];

  const lowerCol = column.toLowerCase();
  const keys = Object.keys(item);

  // 1. Try exact match case-insensitively
  const matchedKey = keys.find(k => k.toLowerCase() === lowerCol);
  if (matchedKey && item[matchedKey] !== undefined && item[matchedKey] !== null) return item[matchedKey];

  // 2. Try matching normalized strings (removing spaces, underscores, and dashes)
  const normCol = lowerCol.replace(/[\s_-]/g, '');
  const matchedNormKey = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === normCol);
  if (matchedNormKey && item[matchedNormKey] !== undefined && item[matchedNormKey] !== null) return item[matchedNormKey];

  // 3. Try synonym mapping
  const synonyms = COLUMN_ALIASES[normCol];
  if (synonyms) {
    for (const syn of synonyms) {
      const synNorm = syn.toLowerCase().replace(/[\s_-]/g, '');
      const foundKey = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === synNorm);
      if (foundKey && item[foundKey] !== undefined && item[foundKey] !== null) {
        return item[foundKey];
      }
    }
  }

  // 4. Also check if the column itself is one of the aliases in any group
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some(a => a.toLowerCase().replace(/[\s_-]/g, '') === normCol)) {
      // Look for canonical and other aliases in item keys
      for (const alias of [canonical, ...aliases]) {
        const aNorm = alias.toLowerCase().replace(/[\s_-]/g, '');
        const found = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === aNorm);
        if (found && item[found] !== undefined && item[found] !== null) {
          return item[found];
        }
      }
    }
  }

  return undefined;
};

/**
 * Finds the matching key name from an array of existing database keys
 * for a given target field name, utilizing aliases and normalization.
 */
export const findMatchingKey = (existingKeys: string[], target: string): string | undefined => {
  if (!existingKeys || existingKeys.length === 0 || !target) return undefined;

  const targetLower = target.toLowerCase();
  const targetNorm = targetLower.replace(/[\s_-]/g, '');

  // 1. Exact case-insensitive match
  const exactMatch = existingKeys.find(k => k.toLowerCase() === targetLower);
  if (exactMatch) return exactMatch;

  // 2. Normalized match (no spaces, dashes, underscores)
  const normMatch = existingKeys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === targetNorm);
  if (normMatch) return normMatch;

  // 3. Synonym matching
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    const isTargetInGroup = canonical === targetNorm || aliases.some(a => a.toLowerCase().replace(/[\s_-]/g, '') === targetNorm);
    if (isTargetInGroup) {
      for (const alias of [canonical, ...aliases]) {
        const aNorm = alias.toLowerCase().replace(/[\s_-]/g, '');
        const found = existingKeys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === aNorm);
        if (found) return found;
      }
    }
  }

  return undefined;
};

/**
 * Maps expected form/frontend keys back to their actual database key casings
 * based on the keys present in the database item or existingKeys.
 */
export const mapToDatabaseKeys = (formData: any, existingKeys: string[]): any => {
  if (!existingKeys || existingKeys.length === 0 || !formData) return formData;
  const mapped: Record<string, any> = {};
  
  Object.keys(formData).forEach(key => {
    const matchedKey = findMatchingKey(existingKeys, key);
    if (matchedKey) {
      mapped[matchedKey] = formData[key];
    } else {
      mapped[key] = formData[key];
    }
  });
  
  return mapped;
};
