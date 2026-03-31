

## Correção do Erro 403 na Importação Automática

### Diagnóstico

O erro `Proxy retornou 403 ()` acontece quando o Baserow rejeita a requisição com status 403 (Forbidden). Isso ocorre intermitentemente por estas razões:

1. **Token expirado ou inválido temporariamente** — o Baserow pode invalidar sessões/tokens periodicamente
2. **Rate limiting do Baserow** — muitas requisições simultâneas (o `ImportPreview` faz 3 chamadas em paralelo via `Promise.all` para contar filmes, séries e total)
3. **Sem retry automático** — quando o proxy recebe 403 do Baserow, ele simplesmente repassa o erro sem tentar novamente

### Solução

Implementar **retry automático com backoff** no `makeProxyRequest` e melhorar o tratamento do 403 no `ImportPreview`.

### Alterações

#### 1. `src/utils/proxyRequest.ts` — Adicionar retry com backoff exponencial

- Adicionar lógica de retry (até 3 tentativas) para erros 403 e 429 (rate limit)
- Esperar 1s, 2s, 4s entre tentativas (backoff exponencial)
- Logar cada tentativa para debug

#### 2. `src/components/ImportPreview.tsx` — Melhorar tratamento de erro

- No `fetchTypeCounts`, evitar `Promise.all` simultâneo — fazer as 3 chamadas sequencialmente com pequeno delay para não sobrecarregar o Baserow
- Na mensagem de erro, mostrar um botão "Tentar novamente" mais claro
- Adicionar tratamento específico para 403: "Token pode estar expirado ou Baserow está temporariamente indisponível"

#### 3. `api/baserow-proxy.js` — Retry server-side

- Quando o Baserow retornar 403, fazer 1 retry automático no próprio proxy antes de devolver o erro ao cliente
- Isso resolve casos onde o 403 é temporário (token refresh do Baserow)

### Resumo técnico

```text
Cliente (ImportPreview)
  → makeProxyRequest (retry 3x com backoff)
    → api/baserow-proxy.js (retry 1x server-side para 403)
      → Baserow API
```

- Chamadas paralelas no `fetchTypeCounts` passam a ser sequenciais com delay de 300ms
- Retry client-side: 3 tentativas, backoff 1s/2s/4s, para status 403 e 429
- Retry server-side: 1 tentativa extra para 403

