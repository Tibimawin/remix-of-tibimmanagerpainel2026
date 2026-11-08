# 🚀 Guia de Deploy no Vercel

## 📋 Resumo

Este projeto agora funciona **automaticamente** tanto em desenvolvimento quanto em produção!

### 🏠 Desenvolvimento Local
- **Proxy**: Servidor Node.js local na porta 3001
- **Comando**: `npm run dev:all`
- **Vantagens**: Melhor debug, logs detalhados, mais rápido

### ☁️ Produção (Vercel)
- **Proxy**: Serverless Function do Vercel (`/api/baserow-proxy`)
- **Deploy**: Automático via Git
- **Vantagens**: Sem servidor adicional, escalável, serverless

## 🎯 Como Funciona

### Detecção Automática de Ambiente

O sistema detecta automaticamente em qual ambiente está rodando:

```typescript
// Em desenvolvimento (localhost)
🌐 [PROXY] Usando Proxy Local (Desenvolvimento)
→ http://localhost:3001/api/baserow-proxy

// Em produção (Vercel)
🌐 [PROXY] Usando Vercel Serverless Function (Produção)
→ /api/baserow-proxy
```

### Arquivos Principais

1. **`api/baserow-proxy.js`** - Serverless function do Vercel (produção)
2. **`server/proxy.js`** - Servidor proxy local (desenvolvimento)
3. **`src/config/proxyConfig.ts`** - Configuração que detecta ambiente
4. **`vercel.json`** - Configuração do Vercel

## 📦 Como Fazer Deploy

### Primeira Vez

1. **Instale o Vercel CLI** (se ainda não tiver):
```bash
npm i -g vercel
```

2. **Faça login**:
```bash
vercel login
```

3. **Deploy**:
```bash
vercel --prod
```

### Deploys Subsequentes

**Opção 1: Via Git (Recomendado)**
```bash
git add .
git commit -m "Atualização"
git push origin main
```
→ O Vercel detecta automaticamente e faz deploy!

**Opção 2: Via CLI**
```bash
vercel --prod
```

## ✅ Checklist Pré-Deploy

- [ ] Código commitado no Git
- [ ] Variáveis de ambiente configuradas no Vercel:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - Etc...
- [ ] Testado localmente com `npm run build && npm run preview`

## 🔧 Configuração de Variáveis no Vercel

1. Vá para o painel do Vercel
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione todas as variáveis do `.env`

**Importante**: No Vercel, use `VITE_` como prefixo para variáveis públicas!

## 🧪 Testar Antes do Deploy

### Build Local
```bash
npm run build
```

### Preview do Build
```bash
npm run preview
```

Isso inicia um servidor na porta 4173 simulando produção.

## 📊 Monitoramento

### Logs do Vercel

Ver logs em tempo real:
```bash
vercel logs
```

Ver logs de uma função específica:
```bash
vercel logs api/baserow-proxy
```

### Console do Navegador

Em produção, você ainda verá logs no console:
```
🌐 [PROXY] Usando Vercel Serverless Function (Produção)
🌐 [VERCEL PROXY] Nova requisição: { url: '...', method: 'POST' }
✅ [VERCEL PROXY] Sucesso!
```

## ❗ Troubleshooting

### Erro: "Failed to fetch" em Produção

**Causa**: A serverless function não está respondendo

**Solução**:
1. Verifique os logs: `vercel logs`
2. Verifique se `api/baserow-proxy.js` foi deployado
3. Teste o endpoint: `https://seu-app.vercel.app/api/baserow-proxy`

### Erro: "CORS" em Produção

**Causa**: Headers CORS não configurados

**Solução**: Já configurado em `api/baserow-proxy.js`:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
```

### Dados em Branco Após Deploy

**Causa**: Variáveis de ambiente não configuradas

**Solução**:
1. Vá em **Settings** → **Environment Variables** no Vercel
2. Adicione todas as variáveis necessárias
3. Redeploy: `vercel --prod --force`

## 🎉 Benefícios da Nova Arquitetura

### Desenvolvimento
- ✅ Debug fácil com logs detalhados
- ✅ Hot reload rápido
- ✅ Testes locais sem deploy

### Produção
- ✅ **Zero configuração extra**: Não precisa configurar servidor separado
- ✅ **Escalável**: Serverless functions escalam automaticamente
- ✅ **Confiável**: Mesma infraestrutura do Vercel
- ✅ **Econômico**: Paga apenas pelo uso (tier gratuito generoso)
- ✅ **Rápido**: Edge functions próximas aos usuários

## 📝 Comandos Úteis

```bash
# Desenvolvimento completo (frontend + proxy)
npm run dev:all

# Build de produção
npm run build

# Preview do build (simula produção)
npm run preview

# Deploy para produção
vercel --prod

# Ver logs em tempo real
vercel logs --follow

# Deletar deployment específico
vercel remove [deployment-url]
```

## 🔐 Segurança

### Em Desenvolvimento
- Proxy local aceita qualquer origem (CORS: *)
- Apenas acessível em localhost

### Em Produção
- CORS configurado para aceitar qualquer origem
- **Recomendação**: Limitar CORS para seu domínio específico:

```javascript
// Em api/baserow-proxy.js
res.setHeader('Access-Control-Allow-Origin', 'https://seu-dominio.vercel.app');
```

## 📚 Próximos Passos

1. ✅ Configurar variáveis de ambiente no Vercel
2. ✅ Fazer primeiro deploy
3. ✅ Testar todas as funcionalidades
4. ✅ Configurar domínio customizado (opcional)
5. ✅ Habilitar Analytics do Vercel (opcional)

---

**Desenvolvido com ❤️ - Pronto para Produção!**
