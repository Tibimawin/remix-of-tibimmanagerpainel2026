

## Sistema de Proteção de Links para Canais TV

### Conceito
Quando canais TV são importados, o link original é substituído por uma URL protegida com token JWT. O usuário final nunca vê o link real. O admin controla a data de expiração dos tokens pelo painel.

### Arquitetura

```text
Importação TV                Admin Painel
     │                            │
     ▼                            ▼
Edge Function              Página "Links Protegidos"
generate-protected-link    (gerenciar expiração/renovar)
     │                            │
     ▼                            ▼
Baserow (salva URL proxy)  Supabase (metadados + URLs originais)
                                  │
Player do Usuário ──────────────▶ Edge Function video-proxy
                                  (valida JWT → faz proxy do stream)
```

### Alterações

#### 1. Migração Supabase — Tabela `protected_channels`

```sql
CREATE TABLE protected_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name text NOT NULL,
  original_url text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE protected_channels ENABLE ROW LEVEL SECURITY;
-- RLS: apenas service_role (edge functions) acessa
```

#### 2. Edge Function `generate-protected-link`

- Recebe `{ url, channelName, expiresInDays }` via POST
- Gera JWT com HMAC SHA-256 usando `SUPABASE_SERVICE_ROLE_KEY` como secret
- Payload: `{ url, exp, iat }`
- Salva na tabela `protected_channels` (nome, URL original, token, expiração)
- Retorna `{ token, protectedUrl }` — a URL protegida aponta para `video-proxy?token=xxx`

#### 3. Edge Function `video-proxy`

- Recebe `?token=xxx` via GET
- Verifica e decodifica o JWT
- Se válido: faz fetch da URL original e retorna o stream (proxy transparente)
- Se expirado/inválido: retorna 403

#### 4. Modificar `useImportarCanaisTV.ts` — Importação automática com proteção

- No `importarCanal` e `importarTodos`, antes de salvar no Baserow:
  - Chamar `generate-protected-link` para cada canal
  - Salvar no Baserow o `protectedUrl` em vez do `Link` original
- Expiração padrão configurável pelo admin (ex: 30 dias)

#### 5. Nova página Admin — `LinksProtegidos.tsx`

- Lista todos os canais protegidos da tabela `protected_channels`
- Mostra: Nome, URL original (truncada), Status (Ativo/Expirado com badge), Expiração
- Ações: Copiar URL protegida, Renovar expiração (gera novo token), Remover
- Busca por texto, filtro por status, paginação
- DatePicker para selecionar nova expiração ao renovar

#### 6. Rota admin + Sidebar

- Adicionar rota `/admin/links-protegidos` em `App.tsx` com `AdminProtectedRoute`
- Adicionar item no menu admin sidebar

### Arquivos modificados/criados
- **Migração SQL** — tabela `protected_channels`
- `supabase/functions/generate-protected-link/index.ts` — gerar JWT + salvar
- `supabase/functions/video-proxy/index.ts` — validar JWT + proxy stream
- `src/hooks/useImportarCanaisTV.ts` — chamar proteção antes de importar
- `src/pages/LinksProtegidos.tsx` — página admin de gerenciamento
- `src/App.tsx` — nova rota admin
- `src/components/admin/AdminSidebar.tsx` — link no menu

