# Duplicatas: Conteúdos — correção de bugs e nova interface

## O que analisei

A página `Duplicados.tsx` usa o hook `useOptimizedDuplicates`. Encontrei problemas reais nos dois arquivos.

## Bugs encontrados

1. **Varredura incompleta (silenciosa).** O hook lê no máximo 5.000 registros. Se a tabela tiver mais, duplicatas ficam de fora e a tela diz "nenhum duplicado encontrado". O hook já expõe `expandSearch`, `totalRecords` e `hasMoreData`, mas a página **não usa nada disso** — o usuário nem sabe que a busca foi limitada.
2. **Paginação com salto de páginas.** O loop dispara 3 requisições em paralelo e avança `page += batchesProcessed`. Se uma requisição falhar (`allSettled` rejeitado), a página dela é pulada para sempre — registros somem da análise. A condição `totalProcessed + batchSize*(i+1) <= limit` também impede buscar o último lote parcial.
3. **Chave de agrupamento frágil.** A chave é `Nome|Link` com os campos vazios removidos. Um item sem Link vira chave só com o nome e **não agrupa** com o mesmo título que tem Link → duplicata não detectada. Também não normaliza acentos/pontuação nem lê colunas com variação de caixa (o projeto já tem `getValueByPossibleKeys` para isso, mas o hook acessa `record[field]` direto).
4. **Progresso quebrado.** Divisão por zero quando não há registros (`NaN%`) e valores acima de 100%.
5. **Risco de apagar todas as cópias.** Nada impede marcar e excluir os N registros de um grupo, ficando com zero.
6. **Exclusão lenta e sem feedback.** Apaga um a um em loop mesmo existindo `deleteRowsBatch` no serviço; sem barra de progresso e sem cancelar. Depois disso refaz a varredura inteira em vez de remover os itens já apagados da lista.
7. **Seleção não é limpa** ao reexecutar a varredura, então IDs já removidos continuam marcados.
8. **Campos exibidos errados.** O card mostra `record.Data`, coluna que não existe no conteúdo (é "Data de Lançamento"), sempre aparecendo `-`.
9. **Travamento de render.** Todos os grupos são renderizados de uma vez; com centenas de grupos a página congela. Sem busca, sem filtro, sem paginação.

## O que vou fazer

### Correções (hook)
- Reescrever a paginação: sequencial-com-lotes confiável, sem pular página em caso de falha, com retry; buscar até o fim real da tabela (limite configurável, com opção "carregar tudo").
- Nova chave de agrupamento: leitura de coluna tolerante a caixa/acentos via `getValueByPossibleKeys`, normalização (minúsculas, sem acentos, espaços colapsados) e **modo de comparação selecionável**: só Nome, Nome+Tipo, Nome+Link ou Link.
- Corrigir cálculo de progresso (0–100, sem NaN) e expor contagem real de registros lidos.
- Remoção local dos registros apagados (sem re-scan completo).

### Correções (página)
- Exclusão em lote via `deleteRowsBatch`, em blocos, com barra de progresso e botão cancelar.
- Proteção "manter sempre 1": não permitir excluir todas as cópias de um grupo (aviso claro).
- Ações rápidas: "Selecionar todas as cópias exceto a mais antiga", "exceto a de mais Views", limpar seleção, e seleção por grupo.
- Limpar seleção ao reexecutar a varredura.

### Interface nova
- Barra de topo com resumo: grupos duplicados, registros excedentes, registros analisados, aviso quando a varredura foi limitada + botão "Analisar mais".
- Controles: campo de busca por nome, seletor de critério de comparação, ordenação (mais cópias / A-Z), e paginação/virtualização dos grupos (ex.: 20 por página) para não travar.
- Grupos em cards recolhíveis, com miniatura da capa quando existir, badges de Tipo/Categoria/Views e destaque visual da cópia recomendada para manter.
- Estados de carregando/vazio/erro consistentes com o design system (tokens semânticos, sem cores fixas).

## Detalhes técnicos

Arquivos afetados: `src/hooks/useOptimizedDuplicates.ts` (reescrita da varredura e do agrupamento), `src/pages/Duplicados.tsx` (nova UI e fluxo de exclusão), possivelmente um componente novo `src/components/duplicados/GrupoDuplicado.tsx`. Sem mudanças de banco de dados; continua consumindo o Baserow pelo `BaserowService` existente.
