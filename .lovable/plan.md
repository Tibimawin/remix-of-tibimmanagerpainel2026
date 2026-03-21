

## Upgrade de Plano com Diferença de Preço (API)

### Resumo
Quando um usuário já tem um plano (ex: R$25) e quer a funcionalidade de API (plano de R$50), ele paga apenas a diferença (R$25). O sistema adiciona a feature `minha-api` às permissões existentes sem remover as outras.

### Alterações

#### 1. `src/components/PermissionGate.tsx`
Quando o gate bloqueia a feature `minha-api` e o usuário já tem um plano ativo, mostrar um botão **"Fazer Upgrade - R$ XX"** que calcula a diferença entre o preço do plano API (R$50) e o preço do plano atual. Ao clicar, abre o `AsaasPixPaymentDialog` com o valor da diferença e metadata indicando que é um upgrade.

#### 2. `src/components/AsaasPixPaymentDialog.tsx`
Adicionar suporte a uma prop opcional `isUpgrade` + `upgradeFromPlan`. Quando é upgrade:
- Após confirmação do pagamento, em vez de sobrescrever as permissões, **mesclar** as features do plano API com as features existentes do usuário
- Atualizar o `planName` para indicar o plano combinado (ex: "Plano X + API")
- Registrar no `financialRecords` e `autoPermissionLogs` como upgrade

#### 3. `src/pages/MinhaApi.tsx`
Na página da API, quando o usuário não tem a feature `minha-api`, mostrar um card de upgrade com o preço calculado (diferença) e botão de pagamento direto.

#### 4. `src/components/PlansPopup.tsx`
Para usuários que já têm plano, mostrar o plano API com o preço da diferença (ex: "R$ 25,00 upgrade") em vez do preço cheio.

### Fluxo

```text
Usuário com plano R$25 → acessa /minha-api
  → PermissionGate bloqueia (sem feature 'minha-api')
  → Mostra card: "Faça upgrade por R$ 25,00"
  → Clica → AsaasPixPaymentDialog com R$25
  → Paga via PIX
  → Sistema mescla features: plano atual + minha-api
  → Acesso liberado
```

### Arquivos modificados
- `src/components/PermissionGate.tsx` — lógica de upgrade com cálculo de diferença
- `src/components/AsaasPixPaymentDialog.tsx` — suporte a upgrade (merge de features)
- `src/pages/MinhaApi.tsx` — card de upgrade direto na página
- `src/components/PlansPopup.tsx` — mostrar preço de diferença para quem já tem plano

