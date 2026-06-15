
## 1. Notificações — mensagem clara quando não há novas

**Onde:** sino em `src/components/Header.tsx` e `src/components/user/UserHeader.tsx`, e modal `src/components/UserNotifications.tsx`.

- Envolver o botão do sino com `Tooltip`:
  - `unreadCount === 0` → "Sem notificações novas"
  - `unreadCount > 0` → "{n} notificação(ões) não lida(s)"
- No topo do modal `UserNotifications`, exibir uma faixa:
  - `unreadCount === 0` → ícone `BellOff` + "Você não tem notificações novas".
  - `unreadCount > 0` → "Você tem {n} notificação(ões) não lida(s)".

## 2. Assinatura expirada — acesso parcial em vez de bloqueio total

Hoje `SimpleProtectedRoute` e `ProtectedRoute` mostram `AccessExpiredMessage` em tela cheia quando `hasAccess === false`, bloqueando tudo.

### Mudanças

**`src/hooks/useAccessControl.ts`**
- Manter `hasAccess` e expor `isExpired = !hasAccess && !isChecking && isAuthenticated`.

**`src/components/SimpleProtectedRoute.tsx` e `src/components/ProtectedRoute.tsx`**
- Remover o `return <AccessExpiredMessage />` que bloqueia toda a navegação.
- Sempre renderizar `children` quando autenticado; bloqueio passa a ser por rota/feature.

**Novo `src/components/SubscriptionExpiredBanner.tsx`**
- Banner fixo no topo do layout quando `isExpired === true`: "Sua assinatura expirou. Renove para liberar todas as funcionalidades." + botão "Renovar agora" (vai para `/planos` / fluxo de pagamento existente).
- Incluído no `Layout.tsx`.

**Nova lista `src/config/freeFeatures.ts`**
```ts
export const FREE_FEATURES_WHEN_EXPIRED = [
  'conteudos',
  'episodios',
  'configuracoes',
  'pedido',
  'carrosseu',
  'categoriaFilmes',
  'categoriaSeries',
  'categoriaDorama',
  'categoriaAnimes',
  'categoriaNovelas',
];
```

**`src/contexts/UserPermissionsContext.tsx`**
- `hasFeature(featureId)`:
  - Assinatura ativa → comportamento atual (`enabledFeatures.includes`).
  - Assinatura expirada → retorna `true` se `featureId ∈ FREE_FEATURES_WHEN_EXPIRED` (vale para todos os usuários, independente do plano anterior). Demais features retornam `false`.

**Guard nas páginas bloqueadas**
- Nas rotas cuja feature **não** é grátis: se `isExpired`, renderizar `AccessExpiredMessage` no lugar do conteúdo da página (reaproveitando o componente atual).
- Rotas das features grátis seguem normalmente.

**Sidebar (`src/components/user/UserSidebar.tsx`)**
- Já trata `hasAccess === false` com cadeado/CTA; passará a mostrar liberados naturalmente os itens grátis (porque `hasFeature` retorna `true` para eles).

## Comportamento final

- Login funciona normalmente mesmo com assinatura vencida.
- Banner persistente alertando da expiração + CTA renovar.
- Liberado para qualquer usuário expirado: Conteúdos, Episódios, Configurações, Pedidos, Carrossel, Categorias (Filmes/Séries/Dorama/Animes/Novelas).
- Demais rotas mostram `AccessExpiredMessage` ao entrar.
- Sino com tooltip claro quando não há notificações novas + faixa no modal.
