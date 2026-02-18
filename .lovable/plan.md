
# Corrigir Logout Automático Durante Importação M3U

## Problema Identificado

Existem 3 causas raiz para o logout automático indesejado:

**Causa 1 - useSessionManager expira a sessão em 1 hora:**
O arquivo `src/hooks/useSessionManager.ts` possui um timer de expiração de 60 minutos. Durante uma importação longa, se o usuário não mover o mouse (pois a importação roda sozinha sem interação), o sistema considera a sessão inativa e chama `logout()` automaticamente.

**Causa 2 - Firebase Auth sem persistência local explícita:**
O `src/config/firebase.ts` inicializa o Firebase Auth sem chamar `setPersistence(browserLocalPersistence)`. Isso pode fazer com que, ao recarregar a página, o Firebase demore para restaurar o token ou use persistência de sessão em vez de local.

**Causa 3 - useSessionValidator redireciona para login imediatamente:**
O `src/hooks/useSessionValidator.tsx` redireciona para `/login` assim que `isAuthenticated` vira `false`, sem aguardar a restauração da sessão pelo Firebase (que pode demorar alguns milissegundos). Isso cria uma janela de logout falso.

---

## Solução Proposta

### 1. Remover o timer de expiração do useSessionManager

O `useSessionManager.ts` deve **parar de fazer logout automático por inatividade**. A sessão deve ser controlada apenas pelo Firebase Auth. O hook vai continuar existindo (pode ser usado para outras finalidades), mas o `checkSession` não vai mais forçar logout.

**Mudanças em `src/hooks/useSessionManager.ts`:**
- Remover a constante `SESSION_DURATION` e a lógica de `checkSession` que chama `logout()`
- Remover o `setInterval` que verifica a sessão a cada 30 segundos
- Manter apenas o `updateSessionTimestamp` como utilitário passivo

### 2. Configurar Firebase Auth com persistência local explícita

**Mudanças em `src/config/firebase.ts`:**
- Importar `setPersistence` e `browserLocalPersistence` do Firebase Auth
- Chamar `setPersistence(auth, browserLocalPersistence)` logo após `getAuth(app)`

Isso garante que o token Firebase é armazenado no `localStorage` e restaurado automaticamente ao recarregar a página, nunca pedindo login novamente a não ser que o usuário faça logout manual.

### 3. Corrigir o useSessionValidator para não redirecionar durante carregamento

**Mudanças em `src/hooks/useSessionValidator.tsx`:**
- Adicionar uma verificação do estado de `isLoading` do contexto de autenticação
- Só redirecionar para `/login` se `isAuthenticated === false` **e** `isLoading === false`
- Isso evita o redirecionamento falso durante os milissegundos em que o Firebase ainda está restaurando a sessão após um reload

### 4. Proteger a importação M3U contra interrupções por logout

**Mudanças em `src/components/M3UImporter.tsx`:**
- Adicionar um `useEffect` que detecta quando `isImporting === true` e salva uma flag no `sessionStorage` (`'m3u-import-active': 'true'`)
- Durante a importação ativa, inibir qualquer redirecionamento do `useSessionValidator`
- Ao finalizar ou parar a importação, remover a flag

---

## Arquivos a Modificar

```text
src/config/firebase.ts
  - Adicionar setPersistence(auth, browserLocalPersistence)

src/hooks/useSessionManager.ts
  - Remover timer de logout automático por inatividade
  - Manter apenas utilitários de timestamp

src/hooks/useSessionValidator.tsx
  - Aguardar isLoading === false antes de redirecionar
  - Verificar flag de importação ativa no sessionStorage

src/components/M3UImporter.tsx
  - Salvar flag no sessionStorage quando importação está ativa
  - Remover flag ao finalizar/pausar/parar importação
```

---

## Fluxo Após a Correção

```text
Usuario faz login
       ↓
Firebase salva token no localStorage (persistencia local)
       ↓
Usuario começa importação M3U
       ↓
sessionStorage['m3u-import-active'] = 'true'
       ↓
Importação roda por 2+ horas
       ↓
Sem logout automático (timer removido)
       ↓
Token Firebase renovado automaticamente em background
       ↓
Importação finaliza normalmente
       ↓
Usuario recarrega página → Firebase restaura sessão do localStorage
       ↓
Nenhum pedido de login!
```

---

## Resultado Esperado

- Usuarios permanecem logados indefinidamente enquanto não clicarem em "Sair"
- Importações longas não são interrompidas por logout automático
- Recarregar a página não pede login novamente
- Logout manual continua funcionando normalmente
