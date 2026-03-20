

# Sistema de API Pública para Usuários — Sem Edge Functions

## Resumo

Cada usuário gera sua própria API Key no painel. Essa chave é usada para acessar conteúdos via uma **Vercel Serverless Function** (`api/public-api.js`) que valida a chave, busca dados no Baserow com o token admin (server-side), e retorna JSON limpo. Nenhuma Edge Function do Supabase é usada.

## Arquitetura

```text
Site/App do Usuário                Vercel Serverless              Baserow
─────────────────                  ─────────────────              ───────
GET /api/public-api                api/public-api.js
  ?api_key=pk_live_xxx     ──►     1. Valida chave no Firestore
  &endpoint=conteudos              2. Verifica rate limit
                                   3. Busca no Baserow (token admin)  ──►  Dados
                             ◄──   4. Filtra campos sensíveis         ◄──
  JSON response              ◄──   5. Retorna JSON paginado
```

## Etapas

### 1. Criar `src/services/ApiKeyService.ts`

Serviço Firebase para gerenciar API Keys:
- `generateApiKey(userId, name)` — gera chave `pk_live_` + UUID, salva na coleção `apiKeys` do Firestore
- `listUserKeys(userId)` — lista chaves do usuário
- `revokeKey(keyId)` — desativa uma chave
- `getKeyStats(keyId)` — retorna estatísticas de uso

Campos na coleção `apiKeys`: `key`, `userId`, `userEmail`, `name`, `active`, `createdAt`, `lastUsedAt`, `requestCount`, `rateLimit` (padrão 60/min)

### 2. Criar `api/public-api.js` (Vercel Serverless Function)

Endpoint público que:
- Recebe `api_key` e `endpoint` via query params
- Valida a chave usando Firebase Admin SDK (via REST API do Firestore, sem SDK pesado)
- Se válida: busca dados no Baserow usando token admin hardcoded no server (env var)
- Atualiza `lastUsedAt` e `requestCount` no Firestore
- Rate limiting simples: rejeita se `requestCount` do último minuto excede o limite
- Endpoints suportados: `conteudos`, `episodios`, `categorias`, `busca`
- Retorna JSON paginado, sem campos sensíveis

Precisa configurar no `vercel.json` o timeout maior para essa function.

### 3. Criar página `src/pages/MinhaApi.tsx`

Interface do usuário com:
- Botão "Gerar Nova API Key" (máximo 3 por usuário)
- Lista de chaves com ações: copiar, revogar, regenerar
- Estatísticas: total de requisições, última utilização
- Documentação inline com exemplos de uso (curl, JavaScript fetch, Python)
- Área de teste rápido (inserir endpoint e ver resultado ao vivo)

### 4. Adicionar rota e menu

- **`src/App.tsx`**: Nova rota `/minha-api` protegida com `SimpleProtectedRoute`
- **`src/components/user/UserSidebar.tsx`**: Novo item "Integração API" com ícone `Key`, na categoria principal, com badge "new"

### 5. Atualizar `vercel.json`

Adicionar config para `api/public-api.js` com timeout de 30s.

## Detalhes Técnicos

- O token do Baserow fica apenas no server (Vercel env var `BASEROW_ADMIN_TOKEN`), nunca exposto ao cliente
- A validação da API Key no `public-api.js` usa a REST API do Firestore (`https://firestore.googleapis.com/v1/...`) com a service account key, sem precisar do Firebase Admin SDK completo
- Alternativamente, pode-se usar a Firestore REST API com a API key pública para queries na coleção `apiKeys` (com regras de segurança adequadas)
- Dados retornados são filtrados: remove campos como IPs, tokens, senhas, dados internos
- Paginação: `?page=1&size=20` (padrão 20, máximo 100)

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/services/ApiKeyService.ts` | Criar — CRUD de API Keys no Firestore |
| `api/public-api.js` | Criar — Gateway Vercel que valida key e busca no Baserow |
| `src/pages/MinhaApi.tsx` | Criar — UI de gerenciamento de keys + docs |
| `src/App.tsx` | Editar — Adicionar rota `/minha-api` |
| `src/components/user/UserSidebar.tsx` | Editar — Adicionar item "Integração API" no menu |
| `vercel.json` | Editar — Config da nova function |

