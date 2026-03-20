

## Diagnóstico: Indicações não aparecem no painel

### Causa raiz identificada

No arquivo `src/pages/Cadastro.tsx`, linhas 112-117, o código que cria a indicação tem um **`catch {}` vazio** que engole silenciosamente qualquer erro:

```typescript
if (referrerUid) {
  const { ReferralService } = await import('@/services/ReferralService');
  try {
    await ReferralService.createReferral(referrerUid, user.uid);
  } catch {}  // <-- ERRO SILENCIADO AQUI
}
```

Isso significa que se `createReferral` falhar por qualquer motivo (permissão Firestore, referrer inexistente, erro de rede), o usuário nunca saberá e a indicação nunca será registrada.

Possíveis causas de falha dentro de `createReferral`:
1. **O `referrerUid` não existe no Firestore** -- se o UID passado no `?ref=` não corresponde a um usuário real, `getUserById` retorna `null` mas o código continua e tenta gravar com dados incompletos
2. **Regras de segurança do Firestore** bloqueiam a escrita na coleção `referrals` para o usuário recém-criado (que está autenticado como o novo usuário, não como o referrer)
3. **`getAllReferrals()`** pode falhar por permissões, já que o novo usuário pode não ter acesso de leitura à coleção inteira

### Plano de correção

#### 1. Adicionar log e feedback de erro no cadastro
Em `src/pages/Cadastro.tsx`, substituir o `catch {}` vazio por tratamento de erro com `console.error` e `toast.warning`, para que pelo menos o problema seja visível.

#### 2. Tornar a criação de referral mais robusta
Em `src/services/ReferralService.ts`, no método `createReferral`:
- Validar que o `referrerUid` existe no Firestore antes de prosseguir (se não existir, lançar erro claro)
- Tratar o caso onde `getUserById` retorna `null` para o referred (pode haver delay no Firestore)

#### 3. Adicionar retry com delay
No `Cadastro.tsx`, adicionar um pequeno delay (1-2 segundos) antes de chamar `createReferral`, para garantir que o documento do usuário já foi propagado no Firestore.

### Arquivos modificados
- `src/pages/Cadastro.tsx` -- error handling + delay antes de criar referral
- `src/services/ReferralService.ts` -- validação do referrer + logs

### Detalhes técnicos

```text
Fluxo atual (com bug):
  1. createUserWithEmailAndPassword() → ok
  2. createUserRecord() → grava doc no Firestore
  3. createReferral() → pode falhar silenciosamente
     └─ catch {} ← erro engolido

Fluxo corrigido:
  1. createUserWithEmailAndPassword() → ok
  2. createUserRecord() → grava doc no Firestore
  3. await delay(1500ms)
  4. createReferral() → com validações
     └─ catch (err) → console.error + toast.warning
         + retry 1x se falhar
```

