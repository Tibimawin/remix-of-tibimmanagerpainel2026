# Rodar o painel em outro ambiente

Objetivo: ter o projeto funcionando fora da Lovable (AI Studio, Vercel, local) com as variáveis de ambiente corretas.

## Variáveis a preencher

Firebase (publicáveis, já usadas pelo painel):

```
VITE_FIREBASE_API_KEY=AIzaSyBN7cODHg978T4S2jPvrBsr5sqwZhGidtU
VITE_FIREBASE_AUTH_DOMAIN=tibimmanagerpainelvercel.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tibimmanagerpainelvercel
VITE_FIREBASE_STORAGE_BUCKET=tibimmanagerpainelvercel.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=915232934037
VITE_FIREBASE_APP_ID=1:915232934037:web:e9386fab78107ba226339c
VITE_VERCEL_PROXY_BASE=https://tibimmanagerpainel2026-git-main-apktibim-1235s-projects.vercel.app
VITE_DEBUG_ERRORS=false
```

Backend (Supabase/Lovable Cloud): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e
`VITE_SUPABASE_PROJECT_ID` são geridos por este projeto. Copie-os do arquivo `.env` do
projeto (aba de arquivos) para o outro ambiente — sem eles, as telas que usam o backend
(chat, funções, storage) ficam quebradas.

## O que eu faço no projeto

1. Atualizar `.env.example` com comentários explicando cada variável e quais são
   obrigatórias vs. opcionais (hoje é só uma lista de chaves vazias).
2. Adicionar um bloco no `README.md` com o passo a passo: copiar `.env.example` para
   `.env`, preencher, `bun install`, `bun run dev`, e o que muda em deploy na Vercel
   (mesmas variáveis em Project Settings → Environment Variables).
3. Conferir se algum ponto do código quebra sem variável definida e documentar o
   fallback existente (Firebase e proxy já têm valores padrão embutidos).

## Detalhes técnicos

- Vite injeta `VITE_*` em build time: mudar variável exige rebuild, não basta reiniciar.
- As rotas `api/*.js` (baserow-proxy, stream-proxy, m3u-proxy, asaas-proxy) são funções
  serverless da Vercel; em outro host sem suporte a essas rotas, o painel precisa apontar
  `VITE_VERCEL_PROXY_BASE` para o deploy Vercel existente.
- Nenhuma mudança de lógica de negócio: apenas documentação e exemplo de ambiente.
