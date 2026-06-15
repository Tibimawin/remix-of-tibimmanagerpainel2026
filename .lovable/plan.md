## Objetivo

Fazer com que toda a tela de Importação Automática caiba na viewport: header com botões (Atualizar, Importar Todos, Importar), filtros, grid de preview e paginação — todos visíveis ao mesmo tempo, sem scroll horizontal nem necessidade de zoom out. O container de Preview não pode "estourar" para fora da área útil à direita.

## Diagnóstico do problema atual

Ao revisar `src/components/ImportPreview.tsx`:

1. **Cards grandes demais** — grid usa breakpoints `2xl:grid-cols-10` mas em telas comuns (1366–1440px) cai em `xl:grid-cols-8` ou `lg:grid-cols-6`, deixando cada card com ~180–200px de largura. Isso empurra a altura do bloco para além da viewport, escondendo paginação e o footer de ação (linhas ~960, ~1090, ~1198).
2. **Container Card sem max-width nem `min-w-0`** — o `Card` raiz (linha 660) e o grid interno tendem a expandir além do espaço do conteúdo principal quando a sidebar/menu está aberta, escondendo botões à direita.
3. **Header com muitos botões em linha** (linhas 660–740) — "Atualizar Cache", "Importar Todos" e a busca dividem a mesma linha sem wrap controlado, encostando na borda.
4. **Footer de ação (Importar) e paginação** (linhas 1090–1216) ficam empilhados depois do grid; com grid alto, ambos saem da viewport.

## Mudanças propostas (somente UI, sem mexer em lógica)

### 1. Reduzir tamanho dos cards

Em `src/components/ImportPreview.tsx`:

- Trocar o grid (linhas 855 e 960) para densidade maior em telas médias:
  - de `grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10`
  - para `grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-11 2xl:grid-cols-13`
- Manter `gap-1 p-1` (já compacto).
- Reduzir tipografia do título do card de `text-[10.5px]` para `text-[9.5px]` e meta de `text-[9.5px]` para `text-[8.5px]` (linhas 1060–1075) para acomodar card menor sem quebrar.

### 2. Garantir que o container não estoure para fora

- No `Card` raiz (linha 660), adicionar `w-full min-w-0` para nunca passar do container pai.
- Envolver a área do grid em wrapper com `min-w-0 overflow-hidden` para que os cards encolham ao invés de empurrar a largura.
- Em `src/pages/ImportacaoAutomatica.tsx`, garantir que o pai do `<ImportPreview />` tenha `min-w-0` (necessário em flexbox para permitir encolhimento).

### 3. Altura do grid limitada + scroll interno

Em vez de o grid crescer infinitamente e empurrar paginação/botões para fora:

- Dar ao grid um `max-h-[calc(100vh-380px)] overflow-y-auto` (margem para header da página + header do card + filtros + footer).
- Assim a paginação e os botões "Importar Selecionados" ficam sempre fixos na parte inferior visível do card.

### 4. Header e footer mais compactos

- Header do card (linha 660): permitir wrap dos botões (`flex-wrap`) e reduzir gap para `gap-2`. Em telas estreitas, busca vai para linha de baixo.
- Footer de paginação + ação (linhas 1090, 1198): reduzir padding de `px-6 py-4` para `px-4 py-2` e juntar paginação + botão "Importar Selecionados" na mesma linha quando couber.

## Wireframe do resultado esperado

```text
┌─────────────────────────────────────────────────────────────────┐
│ Importação Automática                          [Sair] [Config]  │
├─────────────────────────────────────────────────────────────────┤
│ Preview de Conteúdos          [Atualizar] [Importar Todos] [⌕] │
│ Filtros: [Tipo▾] [Status▾] [Limpar]                             │
├─────────────────────────────────────────────────────────────────┤
│ ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐  ← cards menores  │
│ │  ││  ││  ││  ││  ││  ││  ││  ││  ││  ││  │     (11 colunas)  │
│ └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘                   │
│ ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐                   │
│ │  ││  ││  ││  ││  ││  ││  ││  ││  ││  ││  │  (scroll interno) │
│ └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘                   │
├─────────────────────────────────────────────────────────────────┤
│ « ‹ 1 2 3 4 5 › »   320 itens  ·  12 selecionados [Importar →] │
└─────────────────────────────────────────────────────────────────┘
              ↑ tudo visível, sem precisar rolar nem zoom
```

Comparado ao atual:

```text
┌─────────────────────────────────────┐
│ [Atualizar][Importar...           ▒│ ← botão cortado à direita
│ Filtros...                         ▒│
│ ┌────┐┌────┐┌────┐┌────┐┌────┐    ▒│ ← cards grandes
│ │    ││    ││    ││    ││    │    ▒│
│ │    ││    ││    ││    ││    │    ▒│
│ └────┘└────┘└────┘└────┘└────┘    ▒│
│ ┌────┐┌────┐┌────┐...               │
│   (continua além da viewport)       │
│   paginação e botão Importar        │
│   escondidos abaixo da dobra        │
└─────────────────────────────────────┘
```

## Arquivos afetados

- `src/components/ImportPreview.tsx` — densidade do grid, alturas, paddings, `min-w-0`, scroll interno.
- `src/pages/ImportacaoAutomatica.tsx` — `min-w-0` no wrapper do `<ImportPreview />` (1 linha).

## Fora do escopo

- Nenhuma mudança em lógica de import, paginação, seleção, deduplicação, ou Baserow.
- Sem alteração de cores/tema.
