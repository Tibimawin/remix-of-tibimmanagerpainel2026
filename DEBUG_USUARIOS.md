# 🔍 Debug: Dados não aparecem nos Cards

## Problema Reportado
Os dados não estão aparecendo em:
- Total de Usuários
- Ativos  
- Vencendo

## ✅ Logs Adicionados

Adicionei logs detalhados no código para diagnosticar o problema:

```
🔄 useEffect disparado
🔍 Iniciando loadStats...
🔍 isConfigured: true/false
🔍 tableId: XXX
📡 Buscando dados...
✅ Resposta recebida
👥 Total de usuários encontrados
📊 Estatísticas calculadas
```

## 🔧 Como Verificar

### 1. Abra o Console do Navegador

```
1. Abra http://localhost:8080/usuarios
2. Pressione F12
3. Vá na aba "Console"
4. Recarregue a página (F5)
```

### 2. Verifique os Logs

Procure por mensagens com emoji:
- 🔄 = useEffect foi disparado
- 🔍 = Verificando configuração
- ⚠️ = Aviso (config não configurado)
- ❌ = Erro
- ✅ = Sucesso
- 📊 = Estatísticas calculadas

### 3. Possíveis Problemas e Soluções

#### ⚠️ "Config não está configurado ainda"
**Causa**: Variáveis de ambiente não carregadas

**Solução**:
```bash
# Verifique se tem arquivo .env na raiz
# Reinicie o servidor dev
Ctrl+C (no terminal do npm run dev)
npm run dev:all
```

#### ❌ "tableId não encontrado!"
**Causa**: ID da tabela 'usuarios' não está no config

**Solução**:
- Vá em Configurações
- Configure o ID da tabela de usuarios

#### 📡 Proxy não está rodando
**Erro**: `Failed to fetch` ou `ERR_CONNECTION_REFUSED`

**Solução**:
```bash
# Verifique se o proxy está rodando
# Terminal separado:
npm run dev:proxy

# OU rode tudo junto:
npm run dev:all
```

#### ✅ Dados recebidos mas não aparecem
**Verifique**:
- Se `stats.total` está sendo setado
- Se o componente está renderizando
- Se há algum erro de React

## 📋 Checklist Rápido

- [ ] Proxy rodando na porta 3001?
- [ ] Config.tableIds['usuarios'] existe?
- [ ] Console mostra "✅ Resposta recebida"?
- [ ] Console mostra "📊 Estatísticas calculadas"?
- [ ] Números aparecem nos logs mas não na tela?

## 🚨 Se Nada Funcionar

Cole no console e execute:

```javascript
// Verificar estado do componente
console.log('Config:', window.location.href);
console.log('localStorage:', localStorage);
```

## 📞 Próximo Passo

**Me envie o que aparece no console** após recarregar a página!

Especialmente procure por:
- Mensagens com ❌ (erros)
- A sequência completa de logs com 🔍📡✅📊
- Qualquer mensagem de erro vermelha
