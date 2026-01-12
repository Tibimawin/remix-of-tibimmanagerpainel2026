# 🧪 Guia de Teste: Importação Automática

## 📋 Pré-requisitos

✅ Servidor rodando em: http://localhost:8080/
✅ Conta de usuário no sistema
✅ Configurações do Baserow configuradas

---

## 🔍 Passo a Passo para Testar

### 1️⃣ **Fazer Login**

1. Abrir: http://localhost:8080/login
2. Entrar com suas credenciais
3. Aguardar redirecionamento para Dashboard

---

### 2️⃣ **Acessar Configurações de Auto-Import**

1. Na URL, acessar: http://localhost:8080/configuracoes-auto-import
2. Você verá a página de "Importação Automática"

**O que deve aparecer:**
- ✅ Card grande com toggle ON/OFF (desativado por padrão)
- ✅ Alert laranja dizendo "Importação automática desativada"
- ✅ Card de informações sobre como funciona

---

### 3️⃣ **Ativar Importação Automática**

1. Clicar no **Switch verde** no canto direito do primeiro card
2. Aguardar toast de confirmação: "Importação automática ativada!"
3. O alert laranja deve desaparecer
4. Um novo card "Preferências de Importação" deve aparecer

---

### 4️⃣ **Configurar Preferências**

1. No card de Preferências, você verá checkboxes:
   - ☑️ Filmes
   - ☑️ Séries  
   - ☐ Canais de TV

2. Selecionar os tipos que você quer importar automaticamente
   - Por padrão, Filmes e Séries já vêm selecionados

3. Clicar em **"Salvar Preferências"**
4. Aguardar toast: "Configurações salvas com sucesso!"

---

### 5️⃣ **Verificar Logs no Console**

1. Abrir DevTools do navegador (F12)
2. Ir na aba **Console**
3. Procurar por logs com `[AUTO-IMPORT]`

**Logs esperados:**

```
🤖 [AUTO-IMPORT] Iniciando verificador de importação automática...
📡 [AUTO-IMPORT-CONFIG] Iniciando listener para: seu-email@example.com
✅ [AUTO-IMPORT-CONFIG] Configuração carregada: { isEnabled: true, contentTypes: Array(2) }
```

---

### 6️⃣ **Aguardar Primeira Verificação**

**Importante:** A primeira verificação ocorre **30 segundos** após o app carregar!

**No console, você verá:**
```
🔍 [AUTO-IMPORT] Verificando 1 agendamento(s)
⏰ [AUTO-IMPORT] Executando para: seu-email@example.com
🚀 [AUTO-IMPORT] Iniciando para seu-email@example.com (runId: ...)
```

**Possíveis resultados:**

✅ **Se tudo estiver OK:**
```
📦 [AUTO-IMPORT] 150 conteúdos no Baserow origem
✅ [AUTO-IMPORT] 10 conteúdo(s) correspondentes às preferências
✅ [AUTO-IMPORT] 1/10: Nome do Filme
✅ [AUTO-IMPORT] 2/10: Nome da Série
...
✅ [AUTO-IMPORT] Concluído: 8 importados, 2 pulados, 0 erros
📅 [AUTO-IMPORT] Próxima verificação: 16/12/2025 14:15:00
```

⚠️ **Se faltarem configurações:**
```
⚠️ [AUTO-IMPORT] Config Baserow inválida
```
→ **Solução:** Ir em Configurações e adicionar Token e URL do Baserow

⚠️ **Se limite atingido:**
```
⚠️ [AUTO-IMPORT] Limite mensal atingido
```
→ **Normal:** Sistema respeita limites

---

### 7️⃣ **Verificar Histórico na Página**

1. Voltar para a página: http://localhost:8080/configuracoes-auto-import
2. Rolar até o card **"Histórico Recente"**
3. Verificar se aparecem registros na tabela

**Colunas da tabela:**
- Data/Hora
- Conteúdo (nome)
- Tipo (Filme/Serie)
- Status (badge verde/laranja/vermelho)

**Badges possíveis:**
- 🟢 **Importado** (verde) - Conteúdo importado com sucesso
- 🟠 **Já existe** (cinza) - Conteúdo foi pulado (duplicata)
- 🔴 **Erro** (vermelho) - Erro ao importar

---

### 8️⃣ **Verificar Estatísticas**

No card de estatísticas (se tiver importado algo), você verá:
- 🕐 **Última Verificação:** Data/hora da última busca
- ✅ **Última Importação:** Quantos conteúdos foram importados
- ⚡ **Total Importado:** Total acumulado

---

### 9️⃣ **Verificar Conteúdos Importados**

1. Ir para a página de **Conteúdos**: http://localhost:8080/conteudos
2. Verificar se aparecem os conteúdos importados automaticamente
3. Eles devem estar lá sem você ter feito nada manualmente!

---

### 🔟 **Testar Desativação**

1. Voltar para: http://localhost:8080/configuracoes-auto-import
2. Clicar no switch para **DESATIVAR**
3. Alert laranja deve aparecer novamente
4. Toast: "Importação automática desativada"
5. Card de preferências deve desaparecer

**No console:**
```
📭 [AUTO-IMPORT] Nenhum usuário com importação automática ativada
```
(na próxima verificação)

---

## 🐛 Troubleshooting

### Problema 1: "Config Baserow inválida"

**Solução:**
1. Ir em: http://localhost:8080/configuracoes
2. Preencher:
   - Token da API
   - URL Base do Baserow
   - ID da Tabela de Conteúdos
3. Salvar
4. Voltar para auto-import e tentar novamente

---

### Problema 2: Nenhum log aparece no console

**Verificar:**
1. Página está aberta? (hook só roda com página aberta)
2. Console filtrado? (remover filtros)
3. Esperou 30 segundos? (primeira verificação demora)

---

### Problema 3: "Limite mensal atingido"

**Normal!** O sistema está funcionando corretamente.

**Para testar mesmo assim:**
- Ir no Firebase Console
- Collection: `userPermissions`
- Seu documento
- Editar: `currentMonthUsage = 0`
- Tentar novamente

---

### Problema 4: Tabela de histórico vazia

**Possíveis causas:**
1. Primeira vez usando (normal)
2. Nenhum conteúdo novo no Baserow origem
3. Todos os conteúdos já existem (duplicatas)

**Aguardar próxima verificação** ou verificar logs no console para detalhes.

---

## 📊 Verificar no Firebase Console

### Firestore → Collections

**1. `autoImportSchedules`**
- Deve ter um documento com seu `userId`
- Verificar campos:
  - `isEnabled`: true
  - `preferences.contentTypes`: ["Filme", "Serie"]
  - `nextRun`: próximo horário de verificação

**2. `autoImportLogs`**
- Deve ter registros de importações
- Filtrar por `userId` igual ao seu
- Ver status de cada importação

---

## ⏱️ Cronograma de Verificações

| Evento | Tempo |
|--------|-------|
| App carrega | 0s |
| Primeira verificação | 30s |
| Segunda verificação | 5min 30s |
| Terceira verificação | 10min 30s |
| ... | A cada 5 minutos |

---

## ✅ Checklist de Teste

### Teste Básico
- [ ] Login funcionando
- [ ] Página carrega sem erros
- [ ] Toggle ON/OFF funciona
- [ ] Preferências salvam
- [ ] Logs aparecem no console

### Teste de Importação
- [ ] Config do Baserow está válida
- [ ] Sistema detecta novos conteúdos
- [ ] Conteúdos são importados
- [ ] Duplicatas são evitadas
- [ ] Histórico aparece na tabela
- [ ] Conteúdos aparecem na página de Conteúdos

### Teste de Limites
- [ ] Sistema respeita limite mensal
- [ ] Para quando atinge limite
- [ ] Log informa corretamente

### Teste de Performance
- [ ] App não trava
- [ ] Console não fica muito poluído
- [ ] Verificações ocorrem no intervalo correto

---

## 🎯 Resultado Esperado Final

**Depois de tudo configurado:**

1. ✅ Toggle ATIVADO na página
2. ✅ Preferências salvas
3. ✅ Logs no console mostrando verificações
4. ✅ Histórico na tabela com registros
5. ✅ Conteúdos importados aparecendo na página de Conteúdos
6. ✅ Tudo funcionando automaticamente sem intervenção manual

---

## 📞 Em Caso de Problemas

Se algo não funcionar:
1. Verificar console do navegador (F12)
2. Verificar Firestore Console
3. Verificar se config do Baserow está correta
4. Recarregar página (F5)
5. Desativar e reativar o toggle

---

**Data:** 16/12/2025  
**Servidor:** http://localhost:8080/  
**Página de Teste:** http://localhost:8080/configuracoes-auto-import
