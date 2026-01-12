# 🔔 Central de Alertas do Admin - Notificações em Tempo Real

## 🎯 Funcionalidade Implementada

Criado um sistema de **Alertas em Tempo Real** no painel admin que monitora e notifica sobre:

1. 🚨 **Assinaturas Expiradas** (Crítico)
2. ⚠️ **Assinaturas Próximas do Vencimento** (1-7 dias)
3. 🤖 **Automações Rodando** (Informativo)

---

## 📍 Localização

A **Central de Alertas** aparece automaticamente no topo da página **Overview** do painel admin:

```
Painel Admin → Overview → Central de Alertas do Admin (topo da página)
```

---

## 🎨 Interface Visual

### Resumo de Alertas (Cards no Topo)
```
┌──────────────┬──────────────┬──────────────┐
│  🚨 Críticos │  ⚠️ Avisos   │  💡 Info     │
│      5       │      12      │      3       │
└──────────────┴──────────────┴──────────────┘
```

### Lista de Alertas
```
┌─────────────────────────────────────────────┐
│ 🚨 João Silva (joao@email.com)             │
│    Assinatura EXPIRADA! Expirou 3 dias atrás│
│    18/12/2025 às 09:30                      │
│                               [Ignorar]      │
├─────────────────────────────────────────────┤
│ ⚠️ Maria Santos (maria@email.com)          │
│    Assinatura expira em 5 dias              │
│    18/12/2025 às 09:31                      │
│                               [Ignorar]      │
├─────────────────────────────────────────────┤
│ 🤖 Pedro Costa (pedro@email.com)           │
│    Automação está importando conteúdos      │
│    18/12/2025 às 09:32                      │
│                               [Ignorar]      │
└─────────────────────────────────────────────┘
```

---

## 🔴 Tipos de Alertas

### 1️⃣ Assinatura Expirada (CRÍTICO)

**Quando aparece:**
- Usuário com `isActive = true`
- `expiryDate` já passou (dias restantes ≤ 0)

**Cor:** 🔴 Vermelho
**Ícone:** ⚠️ AlertTriangle
**Mensagem:** "Assinatura EXPIRADA! Expirou X dia(s) atrás"

**Comportamento Especial:**
- ✅ Mostra toast popup automático
- ✅ Toca som de alerta
- ✅ Animação pulsante no badge de contagem
- ✅ Dura 10 segundos no toast

### 2️⃣ Assinatura Expirando (AVISO)

**Quando aparece:**
- Usuário com `isActive = true`
- Faltam de 1 a 7 dias para expirar

**Cor:** 🟡 Amarelo/Âmbar
**Ícone:** ⏰ Clock
**Mensagem:** "Assinatura expira em X dia(s)"

**Comportamento:**
- ✅ Aparece na lista de alertas
- ✅ Não toca som (apenas aviso)
- ✅ Conta no resumo de "Avisos"

### 3️⃣ Automação Rodando (INFO)

**Quando aparece:**
- Usuário importou conteúdo nos últimos 5 minutos
- Detectado via logs de `autoImportLogs` com status 'success'

**Cor:** 🔵 Azul
**Ícone:** ⚡ Zap
**Mensagem:** "Automação está importando conteúdos"

**Comportamento:**
- ✅ Atualização em tempo real
- ✅ Mostra who está usando automação AGORA
- ✅ Conta no resumo de "Info"

---

## 🔊 Sistema de Som

### Controle de Som
```
┌──────────────┐
│ 🔔 Som On    │  ← Som habilitado (verde)
└──────────────┘

┌──────────────┐
│ 🔕 Som Off   │  ← Som desabilitado (vermelho)
└──────────────┘
```

### Quando o Som Toca:
- ✅ **Apenas** para alertas CRÍTICOS (assinatura expirada)
- ✅ Tom suave de 800Hz por 0.5 segundos
- ✅ Volume moderado (30%)
- ✅ Pode ser desligado pelo admin

### Tecnologia:
```typescript
const audioContext = new AudioContext();
const oscillator = audioContext.createOscillator();
oscillator.frequency.value = 800; // Tom agradável
oscillator.type = 'sine'; // Som suave
gainNode.gain.value = 0.3; // Volume 30%
```

---

## 📊 Monitoramento em Tempo Real

### 1. Monitoramento de Usuários

```typescript
// Listener Firebase em tempo real
onSnapshot(collection(db, 'users'), (snapshot) => {
  // Atualiza lista de usuários automaticamente
  // Recalcula alertas a cada mudança
});
```

**Detecta:**
- ✅ Novos usuários criados
- ✅ Mudanças em `expiryDate`
- ✅ Mudanças em `isActive`
- ✅ Extensões de acesso

### 2. Monitoramento de Automações

```typescript
// Query nos últimos 10 logs, ordenados por data
query(
  collection(db, 'autoImportLogs'),
  where('status', '==', 'success'),
  orderBy('timestamp', 'desc'),
  limit(10)
);
```

**Detecta:**
- ✅ Importações nos últimos 5 minutos
- ✅ Quais usuários estão importando AGORA
- ✅ Atualização constante

---

## 🎛️ Controles Disponíveis

### Botão "Som On/Off"
- Habilita/desabilita sons de alerta
- Estado salvo apenas durante a sessão
- Visual: Verde quando ligado, Vermelho quando desligado

### Botão "Mostrar/Ocultar Ignorados"
- Mostra alertas que foram ignorados
- Alertas ignorados aparecem com opacidade 50%
- Badge "Ignorado" é exibido

### Botão "Ignorar" (em cada alerta)
- Marca o alerta como ignorado
- Alerta some da lista ativa
- Pode ser visualizado com "Mostrar Ignorados"

---

## 📈 Contadores em Tempo Real

```
Críticos:  Conta alertas tipo 'expired'
Avisos:    Conta alertas tipo 'expiring'  
Info:      Conta alertas tipo 'automation-running'
```

**Atualização:**
- ✅ Recalcula a cada mudança nos dados
- ✅ Animação pulsante quando há críticos
- ✅ Badge vermelho com número total de alertas ativos

---

## 🔄 Fluxo de Funcionamento

```
┌────────────────────────────────────────────┐
│ 1. Admin abre painel (Overview)            │
└────────────┬───────────────────────────────┘
             │
             v
┌────────────────────────────────────────────┐
│ 2. Componente inicia listeners Firebase    │
│    • users collection                      │
│    • autoImportLogs collection             │
└────────────┬───────────────────────────────┘
             │
             v
┌────────────────────────────────────────────┐
│ 3. Dados chegam em tempo real              │
└────────────┬───────────────────────────────┘
             │
             v
┌────────────────────────────────────────────┐
│ 4. checkForAlerts() analisa cada usuário   │
│    • Calcula dias restantes                │
│    • Verifica automações rodando           │
│    • Cria alertas baseado em regras        │
└────────────┬───────────────────────────────┘
             │
             v
┌────────────────────────────────────────────┐
│ 5. Alertas CRÍTICOS?                       │
│    ├─ SIM: Toca som + Toast popup          │
│    └─ NÃO: Apenas adiciona na lista        │
└────────────┬───────────────────────────────┘
             │
             v
┌────────────────────────────────────────────┐
│ 6. Exibe alertas na interface              │
│    • Atualiza contadores                   │
│    • Ordena por severidade                 │
│    • Animações visuais                     │
└────────────────────────────────────────────┘
```

---

## 🎨 Cores e Estilos

### Severidade Crítica (Vermelho)
```css
bg-red-500/20 text-red-300 border-red-500/30
```

### Severidade Aviso (Amarelo)
```css
bg-amber-500/20 text-amber-300 border-amber-500/30
```

### Severidade Info (Azul)
```css
bg-blue-500/20 text-blue-300 border-blue-500/30
```

### Card Principal
```css
bg-gradient-to-br from-slate-900/50 via-slate-800/30 to-slate-900/50
border-slate-700/50
```

---

## 💡 Exemplos de Alertas

### Alerta Crítico
```
┌─────────────────────────────────────────────┐
│ 🚨 João Silva                               │
│    joao@email.com                           │
│    Assinatura EXPIRADA! Expirou 3 dias atrás│
│    18/12/2025 às 09:30                      │
│                               [Ignorar]      │
└─────────────────────────────────────────────┘

Toast Popup:
┌─────────────────────────────────────────────┐
│ 🚨 João Silva: Assinatura EXPIRADA!        │
│ Expirou 3 dia(s) atrás                      │
│                          [Ver Detalhes]      │
└─────────────────────────────────────────────┘
```

### Alerta de Aviso
```
┌─────────────────────────────────────────────┐
│ ⚠️ Maria Santos                             │
│    maria@email.com                          │
│    Assinatura expira em 5 dias              │
│    18/12/2025 às 09:31                      │
│                               [Ignorar]      │
└─────────────────────────────────────────────┘
```

### Alerta de Automação
```
┌─────────────────────────────────────────────┐
│ 🤖 Pedro Costa                              │
│    pedro@email.com                          │
│    Automação está importando conteúdos      │
│    18/12/2025 às 09:32                      │
│                               [Ignorar]      │
└─────────────────────────────────────────────┘
```

---

## 🚀 Vantagens da Implementação

✅ **Tempo Real**
- Updates instantâneos via Firebase listeners
- Não precisa refresh manual
- Admin vê mudanças ao vivo

✅ **Priorização Visual**
- Cores diferentes por severidade
- Ícones intuitivos
- Contadores separados

✅ **Notificações Inteligentes**
- Toast apenas para críticos
- Som opcional e controlável
- Duração apropriada (10s)

✅ **Controle Total**
- Pode ignorar alertas
- Pode desligar som
- Pode ver histórico (ignorados)

✅ **Performance**
- Queries otimizadas com limit()
- Apenas dados necessários
- Listeners eficientes

✅ **UX Profissional**
- Design moderno e clean
- Animações suaves
- Responsivo e acessível

---

## 📝 Logs de Debug

### Console Logs Gerados:
```javascript
// Quando detecta alerta crítico
"🚨 ALERTA CRÍTICO: João Silva - Expirado há 3 dias"

// Quando detecta aviso
"⚠️ AVISO: Maria Santos - Expira em 5 dias"

// Quando detecta automação
"🤖 INFO: Pedro Costa - Importando conteúdos"

// Quando ignora alerta
"✅ Alerta ignorado: expired-user123"

// Quando liga/desliga som
"🔊 Som de alertas: HABILITADO"
"🔇 Som de alertas: DESABILITADO"
```

---

## 🎯 Resultado Final

O administrador agora recebe **alertas proativos** sobre:

1. 🚨 **Assinaturas expiradas** → Ação urgente necessária
2. ⚠️ **Assinaturas expirando** → Planejamento antecipado 
3. 🤖 **Automações rodando** → Monitoramento de uso

**Tudo em tempo real, sem precisar verificar manualmente!** 🎉

---

**Data de Implementação:** 18/12/2025  
**Status:** ✅ Implementado e Funcional  
**Arquivo:** `src/components/AdminAlertCenter.tsx`
