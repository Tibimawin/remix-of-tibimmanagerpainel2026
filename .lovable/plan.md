
Objetivo: deixar o Preview dos Conteúdos mais forte em 3 frentes que você priorizou: visual premium, produtividade e mais detalhes, sem quebrar seu fluxo atual de clicar no card para selecionar.

Recomendação principal

Eu recomendo evoluir o preview para um modelo de “seleção rápida + detalhes secundários”:

1. Card continua selecionando com 1 clique.
2. Um botão discreto de “Ver detalhes” abre um painel lateral.
3. O card passa a mostrar melhor o estado do conteúdo: pronto para importar, incompleto, sem capa, sem link, etc.
4. A barra superior e inferior ficam mais úteis para seleção em massa e importação.

O que eu faria

1. Melhorar o card visual
- Reforçar hierarquia do card com:
  - título mais legível
  - badges de tipo, idioma, ano e nota
  - categoria em chips mais curtos
  - overlay mais limpo
- Destacar seleção com borda, glow e check mais evidente.
- Melhorar fallback visual quando não houver capa.
- Mostrar badge de status de qualidade:
  - Completo
  - Sem link
  - Sem capa
  - Sem sinopse

2. Adicionar detalhes sem mudar o clique principal
- Como você quer manter “clicar = selecionar”, os detalhes devem abrir por ação secundária:
  - botão de olho no hover
  - ou botão “Detalhes” no rodapé do card
- Esse painel lateral mostraria:
  - capa + backdrop
  - nome completo
  - tipo / idioma / ano / IMDb
  - categorias
  - sinopse completa
  - link
  - temporadas
  - data de lançamento
- No painel, incluir ações rápidas:
  - selecionar/desselecionar
  - importar só este item

3. Melhorar produtividade
- Trocar “Selecionar página” por um bloco mais forte de seleção:
  - selecionar página
  - limpar seleção
  - mostrar total selecionado
- Adicionar “Selecionar filtrados” como melhoria opcional.
- Deixar a barra de ações sempre clara:
  - quantos itens existem
  - quantos estão visíveis
  - quantos estão selecionados
- Tornar o CTA final mais objetivo:
  - Importar selecionados
  - Ver todos e importar
  - Importar este item no painel de detalhes

4. Melhorar leitura e confiança dos dados
- Hoje o preview já usa vários campos, mas há inconsistência entre `IMDb` e `Imdb`.
- Eu padronizaria os campos exibidos no preview antes de renderizar:
  - nota
  - ano
  - idioma
  - categorias
  - link
  - sinopse
- Também adicionaria indicadores visuais de conteúdo incompleto para evitar importar item ruim sem perceber.

5. Melhorar cabeçalho do preview
- Manter busca, filtros e ordenação, mas com resumo visual melhor:
  - total de conteúdos
  - filmes
  - séries
  - carregando categorias
  - filtros ativos
- Opcional: mini cards de métricas no topo do preview.

Prioridade sugerida

Fase 1: ganho mais rápido
- upgrade visual dos cards
- badges de qualidade
- CTA e seleção mais claros
- padronização dos campos exibidos

Fase 2: maior valor
- painel lateral de detalhes
- ação “importar este item”
- resumo mais completo da seleção

Fase 3: produtividade extra
- selecionar filtrados
- atalhos rápidos
- métricas mais ricas no topo

Arquivos mais prováveis
- `src/components/ImportPreview.tsx` como foco principal
- `src/pages/ImportacaoAutomatica.tsx` apenas para pequenos ajustes de integração, se necessário

Detalhes técnicos
- Reaproveitar componentes já existentes do projeto:
  - `Card`, `Badge`, `Button`, `ScrollArea`, `Skeleton`, `Progress`
  - `Sheet` ou `Dialog` para detalhes
- Criar uma camada de normalização dos dados dentro do preview para resolver campos alternativos como `IMDb` vs `Imdb`.
- Separar o preview em subpartes para ficar mais fácil manter:
  - toolbar do preview
  - grid de cards
  - card individual
  - painel de detalhes
  - barra de ações
- Manter a API atual de importação (`onStartImport`) para não mexer no fluxo já funcionando.

Resultado esperado
- Preview mais bonito e mais profissional
- Seleção mais rápida para importar em lote
- Mais contexto antes de importar
- Menos erro por conteúdo incompleto
- Fluxo preservado: clique continua selecionando direto

Se eu fosse implementar, começaria pelo combo mais valioso:
`cards premium + status de qualidade + painel lateral de detalhes sem alterar o clique principal`
