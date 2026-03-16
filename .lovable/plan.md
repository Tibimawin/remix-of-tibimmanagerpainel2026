
Problema real identificado

O erro atual não vem do fluxo novo de proxy que já foi corrigido para a limpeza. Ele vem de um segundo caminho antigo ainda ativo no projeto:

```text
Frontend
  ├─ Limpeza de dados -> usa BaserowService -> /api/baserow-proxy
  └─ Importação automática / preview -> usa https://api-baserow.vercel.app/api/baserow
                                     -> bloqueado por CORS
```

Do I know what the issue is?
Sim.

O que está acontecendo
- O fluxo de limpeza já usa a arquitetura nova centralizada (`BASEROW_PROXY_CONFIG` + `/api/baserow-proxy`).
- Mas `src/components/ImportPreview.tsx` e `src/services/AutoImportService.ts` ainda fazem `fetch` direto para `https://api-baserow.vercel.app/api/baserow?...`.
- Esse endpoint antigo responde sem os headers CORS necessários para a origem `https://tibimmanagerpainel.vercel.app`, então o navegador bloqueia a requisição antes mesmo da resposta útil chegar.
- Por isso aparecem os erros:
  - `Erro ao buscar preview`
  - `Erro ao buscar categorias`
  - falhas na importação automática

Arquivos que precisam ser corrigidos
1. `src/components/ImportPreview.tsx`
2. `src/services/AutoImportService.ts`
3. Possivelmente aproveitar `src/utils/proxyRequest.ts` como utilitário comum para eliminar chamadas duplicadas.

Plano de implementação

1. Unificar o proxy da importação com o proxy central
- Substituir em `ImportPreview.tsx` a função `makeApiRequest` para usar o proxy centralizado em vez de `api-baserow.vercel.app`.
- Em vez de montar URL com query string:
  - enviar `POST` para `BASEROW_PROXY_CONFIG.ACTIVE_PROXY_URL`, ou
  - preferencialmente usar `makeProxyRequest(...)` de `src/utils/proxyRequest.ts`.

2. Corrigir o `AutoImportService`
- Trocar os dois trechos legados que usam:
  - `const proxyUrl = 'https://api-baserow.vercel.app/api/baserow'`
- Migrar esses pontos para o mesmo utilitário central.
- Isso inclui:
  - carregamento paginado do cache em `loadAllContent`
  - `setSourceService(...).makeRequest(...)`

3. Padronizar comportamento de métodos e body
- Garantir que GET/POST/PATCH/PUT/DELETE usem o mesmo formato de payload:
  - `url`
  - `method`
  - `token`
  - `body`
- Isso evita diferenças entre preview, autoimport e limpeza.

4. Remover dependência do endpoint legado
- Eliminar toda referência a `https://api-baserow.vercel.app/api/baserow` do frontend.
- Assim o sistema inteiro passa a depender só da estratégia já usada no resto do projeto.

5. Melhorar tratamento de erro nas telas afetadas
- Em `ImportPreview.tsx`, mostrar mensagem mais clara quando o proxy falhar.
- No `AutoImportService`, preservar logs úteis, mas com contexto do proxy central para facilitar próximos diagnósticos.

6. Verificação após implementação
- Confirmar por busca no código que não restou nenhuma referência a `api-baserow.vercel.app`.
- Validar os cenários:
  - preview da importação
  - carregamento de categorias
  - importação automática
  - limpeza de dados continua funcionando

Detalhes técnicos
- Hoje existem duas arquiteturas concorrentes no projeto:
  - nova: `src/config/proxyConfig.ts` + `src/utils/proxyRequest.ts` + `/api/baserow-proxy`
  - antiga: `https://api-baserow.vercel.app/api/baserow?...`
- O conserto correto é consolidar tudo na arquitetura nova, não tentar “remendar” CORS no endpoint antigo do frontend.
- A documentação da Vercel confirma que preflight `OPTIONS` precisa devolver explicitamente `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods` e `Access-Control-Allow-Headers`; como esse endpoint antigo não está sob controle confiável do app atual, a melhor solução é parar de usá-lo.

Resultado esperado
- O preview de importação volta a carregar.
- A busca de categorias deixa de falhar.
- A importação automática usa o mesmo proxy estável da limpeza.
- O projeto fica com uma única estratégia de proxy, reduzindo regressões.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
  <lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>
