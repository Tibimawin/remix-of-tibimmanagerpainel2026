## Plano

Vou corrigir o fluxo para que as funcionalidades marcadas manualmente em **Funcionalidades Habilitadas** sejam respeitadas no painel do usuário.

### 1. Corrigir a lógica central de permissões

No contexto global de permissões, ajustar `hasFeature(featureId)` para que:

- Se o admin habilitou a funcionalidade em `enabledFeatures`, ela seja liberada para o usuário.
- As funcionalidades grátis em assinatura expirada continuem liberadas normalmente.
- O estado de assinatura expirada não anule permissões manuais dadas pelo admin.

Ou seja, a regra passará a ser:

```text
liberado = feature está em enabledFeatures OU feature é grátis quando expirada
```

### 2. Corrigir inconsistência causada por expiração salva no documento de permissões

Hoje o app usa o documento `userPermissions` para sobrescrever `isSubscriptionExpired`, e isso pode marcar o usuário como expirado mesmo depois do admin salvar recursos.

Vou ajustar para que:

- O listener de `userPermissions` carregue apenas plano, limite e funcionalidades.
- A verificação de acesso/expiração continue centralizada no serviço do usuário.
- Campos antigos como `expiryDate` e `isActive` dentro de `userPermissions` não bloqueiem recursos habilitados manualmente.

### 3. Tornar o salvamento do admin mais seguro

No painel admin de permissões:

- Normalizar `enabledFeatures` sempre como array.
- Salvar permissões sem depender de dados antigos de expiração.
- Garantir que, após clicar em **Salvar Permissões**, o documento atualizado tenha as funcionalidades certas e o painel do usuário consiga receber a atualização em tempo real.

### 4. Manter o comportamento atual do painel

Não vou mudar a interface principal nem o jeito do admin habilitar recursos. O admin continuará usando os mesmos switches e o mesmo botão **Salvar Permissões**.

### Resultado esperado

Quando o admin ativar uma funcionalidade para um usuário e salvar:

- A funcionalidade aparece liberada no painel do usuário.
- Rotas protegidas por `PermissionGate` e `RouteFeatureGate` passam a abrir.
- Assinatura expirada ainda mostra os recursos grátis, mas não bloqueia mais liberações manuais feitas pelo admin.