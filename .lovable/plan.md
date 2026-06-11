## Objetivo
Corrigir o falso "já importado" no preview da Importação Automática. O critério passa a ser **estrito**: só marca como já importado se **Nome (normalizado) + TMDB ID** baterem com algum registro existente no Baserow de destino.

## O que muda em `src/components/ImportPreview.tsx`

1. **Tipo `ContentPreview`**
   - Adicionar campo opcional `"TMDB ID"?: string | number` (nome exato da coluna no Baserow).

2. **Snapshot do destino (`ExistingContentSnapshot`)**
   - Remover `titles`, `titleYears`, `imdbs`, `links`.
   - Manter apenas `titleTmdb: Set<string>` (chave `nomeNormalizado|tmdbId`) e `total`.

3. **Construção do snapshot** (loop sobre `allResults` ~linhas 492-502)
   - Para cada item: `tmdbId = String(item["TMDB ID"] ?? '').trim()`. Se `nome` e `tmdbId` presentes, `snapshot.titleTmdb.add(\`${normalizeText(nome)}|${tmdbId}\`)`.
   - Itens sem TMDB ID não entram no snapshot (logo, nunca marcam outros como duplicados).

4. **`previewHighlightMap`** (~linhas 152-209)
   - Calcular `tmdbId` do preview do mesmo jeito.
   - `isAlreadyImported = !!(normalizedTitle && tmdbId && existingContentSnapshot.titleTmdb.has(\`${normalizedTitle}|${tmdbId}\`))`.
   - `matchReasons` passa a ter no máximo `'Nome + TMDB ID já importados'`.
   - Manter detecção de `isDuplicateInPreview` como está.

5. **Fallback visual**
   - Se o preview não tem TMDB ID, **nunca** marcar como já importado (evita o falso positivo de hoje).

## Detalhes técnicos
- A leitura paginada do Baserow já traz todos os campos, então `"TMDB ID"` virá no objeto sem mudanças de request.
- A função `normalizeImdb` e `normalizeLink` ficam removidas se não houver outro uso (verificar antes de remover para não quebrar build).
- Comparação do TMDB ID feita como string trimada (sem normalização extra) para preservar IDs numéricos.

## Fora de escopo
- Não mexer no fluxo de seleção, contadores, botões "Selecionar só novos / página".
- Não alterar o UI dos cards além do que o `matchReasons` já controla.
