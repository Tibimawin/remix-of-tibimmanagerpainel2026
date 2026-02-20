

## Corrigir Parsing de Series no M3U Importer

### Problema
O parser M3U atual usa uma regex que exige **espaco entre S e E** (`S01 E01`), mas muitas listas M3U usam o formato **sem espaco** (`S01E01`). Isso faz com que entries como `3 Palavrinhas S01E01` sejam classificadas incorretamente como "Filme" em vez de "Episodio", e nao sao agrupadas por serie.

Formato da lista do usuario:
```
tvg-name="3 Palavrinhas S01E01" group-title="Series | Outras Produtoras"
```

### Solucao

Alterar a regex de deteccao de episodios no `parseM3UAdvanced` dentro de `src/components/M3UImporter.tsx` para suportar multiplos formatos:

**Antes (linha 285):**
```
/(.*?)\s+S(\d+)\s+E(\d+)/i
```

**Depois:**
```
/(.*?)\s+S(\d+)\s*E(\d+)/i
```

A mudanca e simples: `\s+` (espaco obrigatorio) vira `\s*` (espaco opcional) entre o numero da temporada e o E do episodio. Isso cobre ambos os formatos:
- `S01 E01` (com espaco)
- `S01E01` (sem espaco)

Alem disso, adicionar um fallback extra para o `group-title` -- quando contem "Series" ou "Serie", forcar o tipo para `Serie` mesmo antes da deteccao de episodio, garantindo que entries com `group-title="Series | ..."` sejam tratadas como serie.

### Detalhes Tecnicos

**Arquivo:** `src/components/M3UImporter.tsx`

1. **Linha 285** -- Atualizar regex de `\s+E` para `\s*E` para aceitar `S01E01` e `S01 E01`
2. **Linhas 275-280** -- Melhorar deteccao de tipo pelo `group-title` para tambem verificar a URL (se contem `/series/` na URL, marcar como serie)
3. Apos a correcao, o fluxo existente de `groupSeriesAndEpisodes` ja funciona corretamente -- ele agrupa episodios pelo `seriesName`, cria a entrada na tabela Conteudos com o nome da serie e a logo como Capa, e cadastra cada episodio na tabela Episodios com temporada e numero.

### Resultado Esperado

Para `3 Palavrinhas S01E02`:
- **Nome da Serie:** `3 Palavrinhas` -> cadastrado na tabela Conteudos
- **Capa:** valor do `tvg-logo` -> coluna Capa da tabela Conteudos
- **Temporada:** `1` (do S01)
- **Episodio:** `2` (do E02)
- **Link:** URL do episodio -> cadastrado na tabela Episodios

