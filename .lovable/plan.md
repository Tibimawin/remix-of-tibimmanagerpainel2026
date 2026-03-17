

## Plano: Sistema de Indicação com Ganhos (10%) e Solicitação de Saque

### Resumo

Reformular o sistema de indicação para que, quando um indicado assinar um plano, o indicador ganhe automaticamente 10% do valor. O usuário acumula saldo e pode solicitar saque (mínimo R$5) preenchendo Nome, CPF, E-mail e Pix. O admin recebe e aprova/rejeita essas solicitações.

### O que existe hoje
- `ReferralService` já rastreia indicações no Firestore (`referrals` collection) com status `registered`/`subscribed`
- `FirebaseUserService.extendUserAccess` já chama `ReferralService.updateSubscriptionStatusByReferred` quando uma assinatura é ativada
- Taxa atual é 33% hardcoded -- precisa mudar para 10%
- Não existe sistema de saldo acumulado nem solicitação de saque

### Mudanças necessárias

#### 1. Atualizar ReferralService (`src/services/ReferralService.ts`)
- Mudar `REFERRAL_RATE` de 0.33 para 0.10
- Adicionar campo `earnedTotal` no Referral (acumulado de ganhos por indicado)
- Ao atualizar status para `subscribed`, calcular 10% do valor do plano e salvar como `earningPerPayment`
- Adicionar método `getEarningsByReferrer(uid)` que soma todos os ganhos
- Adicionar método `getWithdrawableBalance(uid)` que calcula saldo disponível (ganhos - saques aprovados)

#### 2. Criar WithdrawalService (`src/services/WithdrawalService.ts`)
- Nova collection Firestore: `withdrawalRequests`
- Interface `WithdrawalRequest`: id, referrerUid, referrerEmail, name, cpf, email, pixKey, amount, status (pending/approved/rejected), createdAt, updatedAt, adminNotes
- Métodos:
  - `createRequest(data)` -- valida saldo mínimo R$5
  - `getRequestsByUser(uid)` -- histórico do usuário
  - `getAllRequests()` -- para admin
  - `updateStatus(id, status, adminNotes)` -- admin aprova/rejeita

#### 3. Atualizar página do usuário (`src/pages/SistemaIndicacao.tsx`)
- Mudar descrição de 33% para 10%
- Adicionar card de **Saldo disponível** mostrando ganhos acumulados
- Na tabela de indicações, mostrar coluna "Ganho" com o valor que cada indicado gerou
- Adicionar seção **Solicitar Saque** com formulário: Nome, CPF, E-mail, Chave Pix, Valor (mínimo R$5)
- Adicionar seção **Histórico de Saques** com status de cada solicitação

#### 4. Atualizar painel admin (`src/components/AdminReferrals.tsx`)
- Adicionar aba/seção **Solicitações de Saque**
- Tabela com: nome, cpf, email, pix, valor, data, status
- Botões Aprovar/Rejeitar com campo de notas
- Mostrar indicações do solicitante para verificação
- Adicionar estatísticas: total de saques pendentes, total aprovado

#### 5. Automação de ganhos
- Em `ReferralService.updateSubscriptionStatusByReferred`, ao marcar como `subscribed`, registrar o ganho automaticamente (10% do `monthlyPayout` base ou do valor real do plano)
- O campo `monthlyPayout` no referral passa a refletir 10% em vez de 33%

### Arquivos envolvidos
- **Editar**: `src/services/ReferralService.ts` (taxa 10%, campo de ganhos)
- **Criar**: `src/services/WithdrawalService.ts` (CRUD de saques)
- **Editar**: `src/pages/SistemaIndicacao.tsx` (saldo, formulário de saque, histórico)
- **Editar**: `src/components/AdminReferrals.tsx` (seção de saques para admin)

### Fluxo completo
1. Usuário A compartilha link de indicação
2. Usuário B se registra via link -- referral criado com status `registered`
3. Usuário B assina um plano (pagamento confirmado via Asaas) -- `extendUserAccess` dispara `updateSubscriptionStatusByReferred` que marca `subscribed` e calcula 10% = R$3,00 (se plano R$30)
4. Usuário A vê na página de indicações: saldo acumulado R$3,00
5. Quando saldo >= R$5, Usuário A preenche formulário de saque e envia
6. Admin vê solicitação no painel, verifica indicações, aprova
7. Usuário A vê status "Aprovado" no histórico de saques

