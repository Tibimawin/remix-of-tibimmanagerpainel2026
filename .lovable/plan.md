## Problema

Usuários com assinatura expirada continuam usando funcionalidades pagas porque a regra atual de permissões **ignora a expiração** quando o admin habilitou a feature no plano.

Em `src/contexts/UserPermissionsContext.tsx`, `hasFeature` faz:

```ts
if (enabled) return true;                          // ← libera mesmo expirado
if (isSubscriptionExpired) return isFreeFeatureWhenExpired(featureId);
return false;
```

O comentário no arquivo confirma o comportamento atual:
> "Liberações manuais do admin sempre são respeitadas, mesmo com assinatura expirada."

Ou seja, `enabledFeatures` do plano sempre vence, e a `expiryDate` em `users/{uid}` não bloqueia nada. Resultado: usuário aparece como "Expirado" no admin, mas continua usando tudo do plano.

## Correção (Opção A — bloqueio por feature)

Inverter a regra: **expiração tem prioridade sobre `enabledFeatures`**. Quando expirado, só liberar features de `FREE_FEATURES_WHEN_EXPIRED` (Conteúdos, Episódios, Configurações, Pedido, Carrossel, Categorias). Todas as outras ficam bloqueadas via `hasFeature`, o que já esconde/desabilita itens na sidebar e nos gates de UI existentes.

### Mudanças

1. **`src/contexts/UserPermissionsContext.tsx`**
   - `hasFeature`: nova regra
     ```ts
     if (isSubscriptionExpired) return isFreeFeatureWhenExpired(featureId);
     return permissions?.enabledFeatures?.includes(featureId) ?? false;
     ```
   - `canAccessPremiumFeatures`: retornar `false` quando `isSubscriptionExpired`.
   - `canAddMoreContent`: retornar `false` quando `isSubscriptionExpired` (usuário expirado não adiciona conteúdo).
   - Remover/atualizar o comentário antigo que dizia o contrário.

2. **Revalidação de expiração mais rápida**
   - Hoje `isSubscriptionExpired` só é recalculado a cada 5 min. Um usuário logado no momento da expiração fica com acesso por até 5 min.
   - Reduzir intervalo para **60s** e revalidar também em `window` `focus` e `document` `visibilitychange` (quando o usuário volta pra aba).
   - Continua usando `FirebaseUserService.checkUserAccess` (compara `expiryDate` com `now` e `isActive`). Sem novos índices, sem novas queries.

### Comportamento resultante

- Usuário com assinatura ativa: sem mudança — usa tudo do plano.
- Usuário expirado: banner de renovação (já existe no Layout) + acesso apenas às features grátis + sidebar/itens pagos automaticamente desabilitados via `hasFeature`.
- Ao renovar (admin ou pagamento): em ≤ 60s (ou ao focar a aba) as features do plano voltam sozinhas, sem logout.

### Fora de escopo (não muda)

- `enabledFeatures` no Firestore.
- `SimpleProtectedRoute` / `ProtectedRoute` continuam permitindo navegação (bloqueio é por feature).
- Fluxo de pagamento, admin, sidebar, banner.

### Arquivos editados

- `src/contexts/UserPermissionsContext.tsx`

### Como validar

1. No admin, setar `expiryDate` de um usuário de teste no passado.
2. Logar como esse usuário: sidebar mostra só features de `FREE_FEATURES_WHEN_EXPIRED`; banner de assinatura expirada aparece.
3. Tentar acessar rota paga direto pela URL (ex.: `/importar-m3u`): a página carrega mas controles gated por `hasFeature` ficam bloqueados.
4. Renovar no admin (expiryDate futuro) → em até 60s ou ao focar a aba, features do plano voltam.
