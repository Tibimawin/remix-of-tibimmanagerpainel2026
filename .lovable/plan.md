

## Integração Asaas - Assinatura R$30/mês

### Resumo
Quando o acesso do usuário expira (ou está próximo de expirar), ele poderá pagar R$30 via Asaas (PIX, boleto ou cartão) para liberar mais 30 dias. Após o pagamento confirmado, o sistema atualiza automaticamente a `expiryDate` no Firebase.

---

### Como Funciona

```text
Acesso Expira
    |
    v
Tela "Acesso Expirado" (já existe)
    |  + Novo botão "Assinar R$30/mês"
    v
Página de Assinatura (/assinatura)
    |  - Exibe plano R$30/30 dias
    |  - Gera cobrança via Asaas (PIX, boleto, cartão)
    |  - Mostra QR Code PIX / link de pagamento
    v
Edge Function asaas-proxy
    |  - Cria cliente no Asaas (se não existe)
    |  - Cria cobrança de R$30
    v
Webhook Asaas (edge function)
    |  - Recebe confirmação de pagamento
    |  - Atualiza expiryDate (+30 dias) no Firebase
    |  - Ativa usuário automaticamente
    v
Usuário liberado!
```

---

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/asaas-proxy/index.ts` | Proxy seguro para API Asaas (criar cliente, cobrança, consultar status) |
| `supabase/functions/asaas-webhook/index.ts` | Recebe webhooks do Asaas quando pagamento é confirmado e atualiza Firebase |
| `src/services/AsaasService.ts` | Service frontend para chamar a edge function |
| `src/pages/Assinatura.tsx` | Página de assinatura com opções de pagamento |
| `src/hooks/useAssinatura.ts` | Hook para gerenciar fluxo de assinatura |

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/AccessExpiredMessage.tsx` | Adicionar botão "Assinar Agora - R$30/mês" que leva para `/assinatura` |
| `src/components/ExpirationWarningBanner.tsx` | Botão "Renovar Agora" leva para `/assinatura` |
| `src/App.tsx` | Adicionar rota `/assinatura` (acessível mesmo com acesso expirado) |
| `supabase/config.toml` | Registrar as duas edge functions |

---

### Detalhes Técnicos

#### 1. Edge Function `asaas-proxy`
- Recebe requests do frontend com `{ action, data }`
- Actions: `createCustomer`, `createPayment`, `getPayment`, `getPixQrCode`
- Usa secret `ASAAS_API_KEY` do Supabase
- Whitelist de endpoints permitidos

#### 2. Edge Function `asaas-webhook`
- Endpoint público (sem JWT) para receber notificações do Asaas
- Quando evento `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED`:
  - Busca o usuário pelo `externalReference` (uid do Firebase)
  - Chama `FirebaseUserService.extendUserAccess(uid, 30)` via Firebase Admin ou direct Firestore
  - Usa `FIREBASE_SERVICE_ACCOUNT` secret para acessar Firestore do servidor
- Valida autenticidade do webhook

#### 3. Página de Assinatura (`/assinatura`)
- Acessível mesmo com acesso expirado (rota especial, fora do SimpleProtectedRoute)
- Mostra o plano: "Acesso Completo - R$30/mês - 30 dias"
- Usuário escolhe forma de pagamento (PIX, Boleto, Cartão)
- Ao clicar, cria cobrança no Asaas
- PIX: mostra QR Code e código copia-e-cola
- Boleto: mostra link para boleto
- Cartão: redireciona para checkout Asaas
- Polling automático para verificar se pagamento foi confirmado
- Ao confirmar, redireciona para `/dashboard`

#### 4. Fluxo de Pagamento
1. Usuário clica "Assinar"
2. Frontend cria cliente no Asaas (nome, email, CPF)
3. Frontend cria cobrança com `externalReference = uid`
4. Exibe QR Code PIX ou link
5. Webhook do Asaas notifica confirmação
6. Edge function atualiza Firebase: `expiryDate = now + 30 dias`
7. Frontend detecta mudança e libera acesso

#### 5. Segurança
- API Key nunca exposta no frontend
- Webhook valida token de autenticação do Asaas
- `externalReference` vincula pagamento ao usuário

---

### Pré-requisitos

Antes de implementar, será necessário:
1. Adicionar a secret `ASAAS_API_KEY` no Supabase
2. Adicionar secrets do Firebase para a edge function de webhook (`FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, etc.)
3. Após deploy, configurar a URL do webhook no painel do Asaas

