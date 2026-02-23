

## Correcao: Funcionalidade "Ignorar Duplicados" no importador M3U

### Problemas identificados

Existem 3 bugs que fazem a verificacao de duplicados falhar:

#### Bug 1: Falha silenciosa ao carregar conteudos existentes
Na linha 644-651, se o `getAllTableData` falhar (timeout, erro de rede, tabela grande demais), o erro e capturado silenciosamente e `existingNames` fica vazio. O resultado: ZERO duplicados sao detectados e tudo e importado novamente.

```
// Codigo atual - erro silencioso
try {
  const { results } = await baserowService.getAllTableData(config.tableIds.conteudos);
  existingNames = new Set(results.map(...));
} catch (error) {
  console.error('Erro ao buscar conteudos existentes:', error);
  // existingNames continua vazio = nenhum duplicado detectado!
}
```

#### Bug 2: `existingNames` nunca e atualizado durante a importacao
Apos importar uma serie ou lote de filmes, os nomes recem-criados nao sao adicionados ao `existingNames`. Se a propria lista M3U tiver itens repetidos internamente (ex: mesmo filme aparece 2 vezes na lista), ambos serao importados.

#### Bug 3: TMDB muda o nome do conteudo
A verificacao de duplicado usa o nome original do M3U (`series.name`, `filme.name`), mas o registro e salvo com o nome do TMDB (`tmdbData?.title`). Na proxima importacao, o nome no Baserow e diferente do nome no M3U, entao o duplicado nao e detectado.

Exemplo:
- M3U diz: "Homem Aranha De Volta ao Lar"
- TMDB retorna: "Homem-Aranha: De Volta ao Lar"
- Na segunda importacao, "Homem Aranha De Volta ao Lar" nao esta no `existingNames` porque la esta "homem-aranha: de volta ao lar"

---

### Solucao

#### 1. Tratar falha ao carregar existentes como erro bloqueante

**Arquivo:** `src/components/M3UImporter.tsx`

Quando `ignoreDuplicates` esta ativo e a busca de existentes falha, avisar o usuario e perguntar se deseja continuar sem verificacao ou cancelar. Nao continuar silenciosamente.

#### 2. Atualizar `existingNames` apos cada item/lote importado

**Arquivo:** `src/components/M3UImporter.tsx`

Apos criar series, filmes ou canais, adicionar os nomes recem-criados ao `existingNames` para evitar duplicados internos na mesma lista.

#### 3. Normalizar nomes para comparacao mais robusta

**Arquivo:** `src/components/M3UImporter.tsx`

Criar funcao de normalizacao que remove acentos, pontuacao e espacos extras para comparar nomes de forma mais tolerante. Isso resolve o problema do TMDB retornar nomes ligeiramente diferentes.

```
// Exemplo de normalizacao
"Homem Aranha De Volta ao Lar" -> "homem aranha de volta ao lar"
"Homem-Aranha: De Volta ao Lar" -> "homem aranha de volta ao lar"
```

#### 4. Adicionar log visivel de quantos existentes foram carregados

**Arquivo:** `src/components/M3UImporter.tsx`

Mostrar no progresso quantos conteudos existentes foram encontrados, para o usuario saber se a verificacao esta funcionando.

---

### Detalhes tecnicos

**Funcao de normalizacao de nomes:**
```
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, '')     // remove pontuacao
    .replace(/\s+/g, ' ')            // normaliza espacos
    .trim();
}
```

**Atualizacao do existingNames apos cada lote:**
- Series: adicionar `normalizeName(seriesData.Nome)` apos criar
- Filmes: adicionar todos os nomes do lote apos `createRowsBatch`
- Canais: adicionar todos os nomes do lote apos `createRowsBatch`

**Tratamento de erro ao buscar existentes:**
- Se falhar e `ignoreDuplicates` estiver ativo, mostrar toast de aviso
- Oferecer opcao de continuar sem verificacao ou cancelar
- Se continuar, desativar `ignoreDuplicates` para essa sessao

### Arquivos afetados

1. `src/components/M3UImporter.tsx` - Todas as correcoes acima

### Riscos

- Nenhum risco de perda de dados (a correcao so impede duplicacao)
- A normalizacao pode em casos raros considerar dois conteudos diferentes como iguais (ex: "O Filme 1" e "O Filme: 1"), mas isso e preferivel a duplicar

