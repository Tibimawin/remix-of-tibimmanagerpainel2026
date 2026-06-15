## Objetivo

Quando o usuário re-importar um conteúdo que já existe no Baserow, em vez de duplicar (ou atualizar só parcialmente), o sistema deve **atualizar todos os campos relevantes** com os dados mais novos da origem. Para séries, novos episódios/temporadas devem ser inseridos automaticamente, e episódios já existentes devem ter seus campos atualizados (não só o Link).

## Situação atual

Em `src/services/AutoImportService.ts > importContents`:

- **Conteúdo já existe** → faz `updateRow` mas só com 3 campos: `Link`, `Sinopse`, `Capa`. Resto fica desatualizado (ex: `Temporadas`, `Categoria`, `Capa de fundo`, `Data de Lançamento`, `Imdb`, `Idioma`, `TMDB ID`, `Views`).
- **Episódio já existe** → `updateRow` só com `Link`. `Nome`, `Sinopse`, vínculo `Conteudo` não atualizam.
- **Novos episódios** → já são criados (essa parte já funciona, então séries com novas temporadas/episódios já ganham os registros novos).

Logo o que falta é: **atualizar de fato todos os campos** quando o registro já existir.

## Mudanças propostas

Tudo em `src/services/AutoImportService.ts`, no método `importContents` (sem mexer em UI nem em outros fluxos).

### 1. Atualização completa do conteúdo existente

Substituir o `updateData` parcial por um objeto com todos os campos mapeados, usando o valor da origem e caindo para o valor atual só quando a origem vier vazia:

```text
Nome, Tipo, Categoria, Sinopse, Capa, Link, Idioma, Views,
Temporadas, Imdb, Data de Lançamento, Capa de fundo, TMDB ID
```

Regras:
- `Nome` e `Tipo` permanecem (não sobrescrever Tipo se vier vazio).
- `Temporadas`: sempre usar o valor da origem se presente — é o campo principal que o admin atualiza quando lança nova temporada.
- `TMDB ID`: se o registro existente já tiver, manter; caso contrário, executar a mesma busca TMDB usada na criação e preencher.
- Manter a função `cleanReadOnlyFields` já existente (documentada em `CORRECAO_BUG_READONLY.md`) antes de enviar ao Baserow.

### 2. Atualização completa do episódio existente

Substituir o update de apenas `Link` por:

```text
Nome, Serie, Temporada, Episódio, Link, Sinopse
```

(`Conteudo` não precisa ser reescrito a cada vez; só preencher no update se estiver faltando no registro existente, apontando para o `createdOrUpdatedContent.id`.)

### 3. Novos episódios continuam sendo criados

Sem mudança — o branch `else` já cria episódios inexistentes, então uma série com nova temporada (S04E01, S04E02…) recebe os registros novos automaticamente quando o usuário re-importa.

### 4. Logs

Atualizar os `console.log` de "atualizando" para indicar quais campos mudaram, mantendo o padrão atual de logs (útil para suporte).

## Fora do escopo

- Não muda UI, nem `ImportPreview`, nem `AutoImportScheduleService` (importação 100% automática agendada — pode ser ajustado num passo seguinte, se você quiser).
- Não toca em `BaserowService`, proxies, ou tipos.
- Não cria migrações nem mexe em backend.

## Validação

1. Importar uma série existente após o admin alterar `Temporadas` de 3 → 4 e adicionar novos episódios na origem: o registro de conteúdo deve refletir `Temporadas = 4` e os novos episódios devem aparecer; episódios antigos com Link novo devem ter Link atualizado.
2. Importar um filme existente após mudança de `Sinopse`/`Capa de fundo`/`Categoria`: todos os campos devem refletir o novo valor.
3. Importar um conteúdo inalterado: não deve gerar erro nem duplicar (mesmo comportamento atual de "encontrou existente").