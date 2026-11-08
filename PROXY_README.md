# Sistema de Proxy Baserow - Documentação Atualizada

## 📖 Visão Geral

Este projeto usa um **proxy unificado** que funciona tanto em desenvolvimento quanto em produção, eliminando a necessidade de servidores adicionais.

## 🏗️ Arquitetura

### Desenvolvimento (localhost):
```
Frontend → /api/baserow-proxy → Vite Proxy → Vercel Proxy (Produção) → Baserow
```

### Produção (Vercel):
```
Frontend → /api/baserow-proxy → Vercel Serverless Function → Baserow
```

## 🚀 Como Usar

### Desenvolvimento:
```bash
npm run dev
```

Isso é tudo! O Vite automaticamente redireciona as chamadas `/api/*` para a produção do Vercel.

### Produção:
```bash
vercel --prod
```

O Vercel gerencia automaticamente o roteamento para as serverless functions.

## 📁 Estrutura de Arquivos

```
projeto/
├── api/
│   └── baserow-proxy.js          # Serverless function do Vercel (PRODUÇÃO)
├── src/
│   ├── config/
│   │   └── proxyConfig.ts        # Configuração unificada
│   └── services/
│       └── BaserowService.ts     # Cliente que usa o proxy
├── vite.config.ts                # Proxy config para dev
└── vercel.json                   # Config do Vercel
```

## 🔧 Configuração

### proxyConfig.ts
```typescript
export const BASEROW_PROXY_CONFIG = {
    PROXY_URL: '/api/baserow-proxy',
    get ACTIVE_PROXY_URL() {
        return this.PROXY_URL;
    }
};
```

### vite.config.ts
```typescript
proxy: {
  '/api': {
    target: 'https://tibimmanagerpainel2026.vercel.app',
    changeOrigin: true,
    secure: true
  }
}
```

## ✅ Benefícios

1. **Simplicidade**: Um único comando para desenvolvimento
2. **Confiabilidade**: Sem erros de conexão recusada
3. **Consistência**: Mesmo comportamento em todos ambientes
4. **Manutenção**: Menos código, menos problemas

## 🐛 Solução de Problemas

### Erro: ERR_CONNECTION_REFUSED
- **Causa**: Tentando acessar proxy local que não existe mais
- **Solução**: Certifique-se que está usando a versão atualizada do `proxyConfig.ts`

### Proxy não funciona
- **Solução**: Reinicie o servidor Vite (`npm run dev`)
- Verifique se o `vite.config.ts` tem a configuração de proxy correta

## 📝 Changelog

### v3.0 (2025-12-14) - Proxy Unificado
- ✅ Removido proxy local
- ✅ Configurado Vite para usar proxy de produção em dev
- ✅ Simplificado `proxyConfig.ts`
- ✅ Atualizado logs no `BaserowService.ts`

### v2.0 (Anterior)
- Sistema dual de proxies (local + Vercel)

## 🔗 Links Relacionados

- [Documentação Completa da Solução](./SOLUCAO_PROXY_FINAL.md)
- [Vercel Serverless Functions](https://vercel.com/docs/serverless-functions)
- [Vite Proxy Config](https://vitejs.dev/config/server-options.html#server-proxy)

---

**Última Atualização**: 2025-12-14  
**Versão**: 3.0
