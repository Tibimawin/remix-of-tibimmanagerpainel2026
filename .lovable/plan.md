## Diagnóstico

Sintoma: no Safari do iPhone, login (email/senha **e** Google) entra no painel por um instante e volta para `/login`.

Esse comportamento — login aceito, painel pisca, redireciona — é assinatura clássica de **falha de persistência da sessão Firebase no Safari iOS**, especialmente dentro do iframe da preview do Lovable, onde o WebKit (ITP) restringe `localStorage`/cookies de terceiros. Pontos do código que confirmam o cenário:

- `src/config/firebase.ts` chama `setPersistence(auth, browserLocalPersistence)` **sem await** após `getAuth`. Se o Safari falhar a persistência (private mode, ITP, storage particionado no iframe), o catch só faz `console.warn` e o login segue com persistência em memória.
- `src/contexts/SimpleAuthContext.tsx` (linhas 76–85): quando `onAuthStateChanged` dispara com `firebaseUser === null`, **limpa o `localStorage` e zera `userInfo`**. Em iOS, logo após o `signInWithEmailAndPassword`/`signInWithPopup`, o listener pode ser chamado com `null` (sessão não persistiu) → `isAuthenticated` vira `false`.
- `src/components/SimpleProtectedRoute.tsx` usa `useSessionValidator`, que ao detectar `!isAuthenticated` faz `navigate('/login', { replace: true })`. Resultado: o painel some imediatamente após aparecer.
- `loginWithGoogle` usa `signInWithPopup`. Em Safari mobile, popups são bloqueados ou abrem em outra aba e perdem o callback — quase nunca funcionam de forma confiável.

## Passo 0 — Validar primeiro no domínio publicado

Antes de qualquer alteração, peço que você teste no **URL publicado** (`https://pixel-perfect-clone-4083.lovable.app`) em vez da preview. A preview roda em iframe de outro domínio e o Safari iOS bloqueia storage de terceiros, o que sozinho pode causar exatamente esse "pisca e sai". Se no publicado funcionar, o problema é só ambiente de preview e não precisa de mudança no código.

## Plano de correção (se persistir no publicado)

Mudanças mínimas e cirúrgicas, **só no fluxo de auth** — sem mexer em nenhuma outra tela.

### 1. `src/config/firebase.ts` — garantir persistência antes do login
- Exportar uma `Promise` `authReady` que resolve depois de `setPersistence(auth, browserLocalPersistence)`.
- Em caso de falha, tentar fallback para `browserSessionPersistence` (Safari private mode aceita) e só depois para `inMemoryPersistence`.

### 2. `src/contexts/SimpleAuthContext.tsx` — não derrubar sessão recém-criada
- `await authReady` antes do `signInWithEmailAndPassword` / `signInWithPopup`.
- No `onAuthStateChanged`, quando `firebaseUser === null`:
  - Adicionar um *grace period* (~1500 ms) checando se acabamos de fazer login (flag `justLoggedIn` em memória + timestamp em `simple-auth-status`).
  - Só limpar `localStorage`/`userInfo` se realmente não houver sessão Firebase após esse intervalo.
- Marcar `justLoggedIn = true` ao final de `login()` e `loginWithGoogle()`, limpando o flag depois de ~5 s.

### 3. `loginWithGoogle` — usar redirect em mobile
- Detectar mobile (`/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)`).
- Em mobile: usar `signInWithRedirect` + `getRedirectResult` no mount do provider.
- Em desktop: manter `signInWithPopup`.
- Garantir o domínio publicado em **Authorized domains** do Firebase Auth.

### 4. `SimpleProtectedRoute` / `useSessionValidator` — evitar redirect prematuro
- No `useSessionValidator`, esperar o mesmo grace period (não navegar para `/login` no primeiro tick em que `!isAuthenticated` se ainda houver flag `justLoggedIn` ou `simple-auth-status` no localStorage).

### Detalhes técnicos
```text
firebase.ts
  export const authReady: Promise<void> =
    setPersistence(auth, browserLocalPersistence)
      .catch(() => setPersistence(auth, browserSessionPersistence))
      .catch(() => setPersistence(auth, inMemoryPersistence))
      .then(() => {});

SimpleAuthContext.login()
  await authReady;
  ...signInWithEmailAndPassword...
  sessionStorage.setItem('auth-just-logged-in', String(Date.now()));

onAuthStateChanged(null) →
  const ts = Number(sessionStorage.getItem('auth-just-logged-in') || 0);
  if (Date.now() - ts < 5000) return; // ignora flip transitório
  // só então limpa localStorage e userInfo
```

## O que **não** vou alterar
- Lógica de permissões, plano, expiração, `ProtectedRoute`, manutenção.
- UI da tela de login.
- Nada fora dos arquivos: `src/config/firebase.ts`, `src/contexts/SimpleAuthContext.tsx`, `src/hooks/useSessionValidator.tsx`, `src/components/SimpleProtectedRoute.tsx`.

## Validação
- Testar no publicado em Safari iOS: login email/senha → painel deve permanecer.
- Testar login com Google em Safari iOS: deve redirecionar para Google e voltar autenticado.
- Conferir no Chrome desktop que nada quebrou (popup do Google continua).