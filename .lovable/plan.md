## Objetivo

Quando um usuário importar conteúdos/episódios de **Minisséries**, o link gravado no Baserow não será o link original, e sim um link camuflado do seu domínio, que só funciona enquanto a assinatura dele estiver ativa. Se vencer, o link para; se renovar, volta a funcionar (sem reimportar).

## Como vai funcionar

```text
Player  ->  https://<seu-dominio>/api/s/<userToken>/<linkId>
                     |
                     v
            Proxy na Vercel
             1. valida userToken -> usuario ativo?
             2. assinatura vencida? -> 403
             3. busca link original pelo linkId (Postgres)
             4. faz stream do conteudo original
             5. registra o acesso (bytes, IP, user agent)
```

O link original nunca aparece para o usuário final: o proxy faz o streaming (com suporte a Range para vídeo e reescrita de playlists .m3u8).

## Banco (Lovable Cloud / Postgres — sem custo de quota Firebase)

- `cloaked_links` — id curto, url original, nome do conteúdo, dono (usuário), origem (miniseries), status, contadores.
- `cloak_users` — espelho leve do usuário: id do Firebase, e-mail, token público, `expires_at` (data da assinatura), ativo/bloqueado.
- `cloak_access_logs` — cada acesso: link, usuário, data, IP, user agent, status (ok/expirado/bloqueado), bytes servidos.
- Índices para consulta rápida e agregações por dia/usuário.

Como a autenticação hoje é Firebase (não Supabase Auth), o acesso a essas tabelas será feito só pelo servidor (proxy Vercel + funções admin) com chave de serviço; RLS fica fechado para o cliente.

## Sincronização da assinatura

- Sempre que o usuário faz login e quando o admin altera o plano/validade, gravamos/atualizamos o registro dele em `cloak_users` com o `expiryDate` atual.
- O proxy consulta apenas o Postgres — zero leitura no Firebase por request.
- Renovou no painel → `expires_at` atualiza → todos os links dele voltam a funcionar automaticamente (mesma URL).

## Importação de Minisséries

- No fluxo de importação da variante `miniseries`, antes de gravar no Baserow, cada `Link` é registrado em `cloaked_links` (em lote) e substituído pela URL camuflada.
- Reimportar o mesmo link do mesmo usuário reaproveita o mesmo id (sem duplicar).
- Importação Automática padrão e Atualização de Séries continuam iguais.

## Painel Admin — nova seção "Links Protegidos"

Aba própria no Admin Dashboard com:
- **Visão geral**: total de links, links ativos, acessos hoje/7 dias, tráfego (bytes), usuários com camuflagem ativa.
- **Usuários**: lista com status da assinatura, data de expiração, nº de links, acessos, último acesso; ações de bloquear/desbloquear e rotacionar token (invalida os links antigos daquele usuário).
- **Links**: busca por nome/URL, dono, criado em, acessos, status; ver URL original, desativar link.
- **Tráfego**: gráfico de acessos por dia e tabela dos últimos acessos (data, usuário, link, IP, status).

## Detalhes técnicos

- `api/stream-proxy.js` na Vercel (`/api/s/:userToken/:linkId` via rewrite no `vercel.json`), com suporte a `Range`, `HEAD` e reescrita de manifestos HLS para que os segmentos também passem pelo proxy.
- `api/cloak-admin.js` para as consultas agregadas do painel (protegido por chave de admin).
- Acesso ao Postgres a partir da Vercel usando a URL de conexão/service key — precisará de uma variável de ambiente nova na Vercel (te passo o nome e o valor no final).
- Nenhuma leitura/escrita adicional no Firestore nesse fluxo.

## Ordem de execução

1. Migração das 3 tabelas + índices.
2. Serviço `CloakService` (registrar links, sincronizar usuário, consultas do admin).
3. Proxy `api/stream-proxy.js` + rewrite no `vercel.json`.
4. Integração na importação de Minisséries.
5. Sincronização de assinatura no login e nas alterações do admin.
6. Nova aba "Links Protegidos" no painel admin.
7. Instruções de deploy e variáveis na Vercel.
