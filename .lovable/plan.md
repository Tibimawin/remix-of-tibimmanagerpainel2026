

## Plano de otimizacao da importacao M3U

### Problema
A importacao M3U e extremamente lenta para listas grandes porque cada item gera 1 requisicao HTTP individual ao Baserow, passando por um proxy. Com TMDB ativado, sao 3 requisicoes por item. Uma lista de 5.000 itens pode levar de 10 minutos a mais de 1 hora.

### Diagnostico detalhado

**Velocidades atuais estimadas:**
- Sem TMDB: ~50-150ms por item (1 req HTTP + 50ms delay)
- Com TMDB: ~500-800ms por item (3 reqs HTTP + 300ms delay)
- Lista de 10.000 itens com TMDB: ~1-2 horas

**Gargalos identificados:**
1. `createRow()` envia 1 item por vez ao Baserow
2. O Baserow tem API de batch-create (ate 200 rows por chamada) que nao e usada
3. Delays fixos de 50ms/300ms entre cada item
4. TMDB faz 2 chamadas (search + details) para cada item, sem cache

---

### Mudancas propostas

#### 1. Adicionar `createRowsBatch()` ao BaserowService
Criar um novo metodo que use a API `/api/database/rows/table/{id}/batch/` do Baserow para criar ate 200 registros por chamada.

**Arquivo:** `src/services/BaserowService.ts`
- Adicionar metodo `createRowsBatch(tableId, rows[])` que envia ate 200 rows por requisicao
- Manter retry com backoff (similar ao `deleteRowsBatch` que ja existe)

**Impacto:** Reduz 200 requisicoes HTTP para 1 unica requisicao.

#### 2. Refatorar importacao de filmes e canais para usar batch
Os filmes e canais sao independentes entre si, entao podem ser agrupados e enviados em lotes.

**Arquivo:** `src/components/M3UImporter.tsx`
- Acumular filmes em buffer de 50-100 itens
- Enviar o buffer inteiro via `createRowsBatch()`
- Fazer o mesmo para canais TV
- Manter o progresso visual atualizado por lote

**Impacto estimado:** Importacao de 1.000 filmes passa de ~2 min para ~10-20 segundos.

#### 3. Refatorar importacao de episodios para usar batch
Episodios de uma mesma serie podem ser agrupados e enviados em lote.

**Arquivo:** `src/components/M3UImporter.tsx`
- Apos criar a serie, agrupar todos os episodios dela
- Enviar em lotes de ate 100 episodios via `createRowsBatch()`

**Impacto:** Uma serie com 200 episodios passa de 200 requisicoes para 2.

#### 4. Cache de TMDB por sessao
Evitar buscas repetidas ao TMDB para itens com o mesmo titulo.

**Arquivo:** `src/components/M3UImporter.tsx`
- Criar um `Map<string, TMDBResult>` no inicio da importacao
- Antes de chamar `fetchTMDBMetadata()`, verificar se ja foi buscado
- Reduzir delay do TMDB de 300ms para 150ms (o rate limit do TMDB e 40 req/10s)

**Impacto:** Listas com muitos episodios da mesma serie economizam dezenas de chamadas TMDB.

#### 5. Buscar TMDB em paralelo (ate 3 simultaneos)
Em vez de buscar TMDB sequencialmente, fazer ate 3 buscas em paralelo.

**Arquivo:** `src/components/M3UImporter.tsx`
- Usar `Promise.all` com chunks de 3 itens para buscar TMDB
- Respeitar rate limit do TMDB com delay entre chunks

**Impacto:** Velocidade de enriquecimento TMDB triplica.

#### 6. Reduzir delays fixos
Os delays atuais (50ms sem TMDB, 300ms com TMDB) sao conservadores demais.

**Arquivo:** `src/components/M3UImporter.tsx`
- Sem TMDB + batch: sem delay (o batch ja e uma unica requisicao)
- Com TMDB: delay de 100ms entre chamadas individuais (dentro do rate limit)

---

### Estimativa de velocidade apos otimizacao

| Cenario | Antes | Depois |
|---------|-------|--------|
| 1.000 filmes sem TMDB | ~2-3 min | ~10-15 seg |
| 1.000 filmes com TMDB | ~10-13 min | ~2-3 min |
| 5.000 itens mistos sem TMDB | ~8-12 min | ~1-2 min |
| 5.000 itens mistos com TMDB | ~40-60 min | ~8-12 min |

### Resumo de arquivos afetados

1. `src/services/BaserowService.ts` - Adicionar `createRowsBatch()`
2. `src/components/M3UImporter.tsx` - Refatorar `handleImport()` para usar batch, cache TMDB, e paralelismo

### Riscos e consideracoes

- O endpoint de batch-create do Baserow precisa ser testado via proxy (Vercel/Supabase) para garantir que funciona corretamente
- O progresso visual sera atualizado por lote em vez de por item (menos granular, mas ainda informativo)
- Series continuam sendo criadas individualmente porque precisamos do ID retornado para vincular episodios
- A funcionalidade de retomada (resume) continua funcionando, salvando progresso a cada lote

