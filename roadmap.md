# Roadmap — Módulo de Revendas (créditos)

Arquitetura acordada: portal dedicado de revendas em `/revendas-creditos/*` (roda própria),
revenda indicada por usuário master do painel; 1 crédito = 30 dias; PIX direto no Asaas
do master; linhas gravadas na tabela `usuarios` do Baserow do master marcadas com
`revenda_id`; teste de 1h sem custo.

## Fase 1 — Servidor (api/xtream.js, handler v6) — deploy VPS
- [x] Endpoints `/reseller-*`: signup, state, lines, line (cria/renova, desconta crédito), teste 1h, pix (gera cobrança), pix-status (credita), webhook Asaas, transactions
- [x] Verificação de identidade da revenda via Firebase ID token (identitytoolkit)
- [x] Escrita em `resellers`, `resellerTransactions`, `xtreamUserMapping` e Baserow do master
- [x] Teste de lógica de créditos (scripts/test-reseller-credits.mjs)
- [x] Pacote xtream-api-v6.zip + LEIA-ME para upload na VPS

## Fase 2 — Painel master: aba "Minhas Revendas"
- [x] Página `/minhas-revendas` com feature `minhas-revendas` (permissão de plano)
- [x] Config: chave Asaas do master, preço do crédito, pacotes, host DNS, WhatsApp
- [x] Link de indicação com cópia
- [x] Lista de revendas (saldo, status, ajuste de saldo, bloquear) e transações

## Fase 3 — Portal da revenda `/revendas-creditos/*`
- [x] Login e cadastro com `?ref=` (ResellerAuthContext próprio, isolado do painel)
- [x] Layout dedicado + dashboard com saldo
- [x] Comprar créditos: pacotes → PIX (QR + copia e cola) com polling de confirmação
- [x] Minhas linhas: criar linha (1 crédito), teste 1h, renovar (1 crédito), copiar links M3U/Xtream e enviar por WhatsApp
- [x] Guard no SimpleAuthContext para não vazar sessão da revenda no painel

## Pendente / depende de fora
- Deploy do handler v6 na VPS (usuário sobe xtream-handler.js + pm2 restart; conferir /handler-version = v6)
- Ativar a feature "Minhas Revendas" nos planos desejados
- Webhook do Asaas apontando para https://api.tibimmanagerpainel.shop/reseller-webhook (opcional; o portal também confirma por polling)
