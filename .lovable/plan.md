## Objetivo

Quando o usuário importar novos episódios pela tela **Atualização de Séries**, o sistema deve atualizar sozinho a coluna **Temporadas** da série na tabela **Conteúdos**, para que os episódios novos apareçam no app sem edição manual.

## Como vai funcionar

1. Durante a importação, o serviço já procura a série correspondente na tabela de Conteúdos (busca pelo Nome) para vincular o episódio. Vou aproveitar essa mesma busca e guardar, por série, o **maior número de temporada** entre os episódios importados/atualizados.
2. Ao final da importação, para cada série tocada:
   - Lê o valor atual de `Temporadas` no registro de Conteúdos.
   - Se o maior número de temporada importado for **maior** que o atual, atualiza o campo. Se for igual ou menor, não mexe (nunca diminui).
3. O resumo da importação ganha uma linha extra: **"Séries com temporada atualizada: N"**, listando por exemplo `Silo: 2 → 3`.

## Detalhes técnicos

- `src/services/SeriesUpdateService.ts`
  - Novo mapa `seriesMaxSeason: Map<contentId, { nome, maxSeason }>` preenchido no loop de importação (usando o `Temporada` já normalizado e o `Conteudo` resolvido).
  - Cachear a busca por série (hoje é feita uma requisição por episódio) para evitar chamadas repetidas quando vários episódios são da mesma série — ganho de performance junto.
  - Nova etapa final `syncSeasonCounts()` que faz `updateRow` na tabela de Conteúdos apenas nos casos em que o número aumenta, respeitando o nome real da coluna (`Temporadas`, com fallback para `Temporada`/`Seasons` conforme o que existir na linha).
  - `ImportResult` ganha `seasonsUpdated: { nome, from, to }[]`.
- `src/pages/AtualizacaoSeries.tsx`
  - Exibe no card de resumo os itens de temporada atualizada e inclui a informação no toast de sucesso.

## Fora do escopo

- Não altera a lógica de deduplicação/upsert já existente.
- Não mexe na importação automática nem no importador MaxPlus (esses já gravam `Temporadas` no cadastro).
