
## Problema Identificado

Atualmente, a configuração de origem (token, URL, IDs de tabela de conteúdos e episódios) está **hardcoded** em dois lugares:

1. **`src/pages/ImportacaoAutomatica.tsx`** — linha 43-51 — `defaultImportConfig` com valores fixos
2. **`src/services/AutoImportScheduleService.ts`** — linha 30-36 — `SOURCE_CONFIG` hardcoded usado na automação automática em background

O que o usuário quer: **o admin salva a configuração de origem no painel, e isso reflete automaticamente para todos os usuários** (tanto na importação manual quanto na automação).

---

## Arquitetura da Solução

A ideia é criar um documento único no Firebase chamado **`globalConfig/importSource`** que o admin escreve e todos os usuários leem.

```text
Firebase Firestore
├── userConfigs/{userId}         ← config individual de cada usuário (destino)
├── autoImportSchedules/{userId} ← agendamentos
└── globalConfig/importSource    ← NOVO: config de origem global do admin
    ├── sourceToken
    ├── sourceBaseUrl
    ├── contentTableId
    ├── episodeTableId
    ├── episodeMatchType
    ├── episodeKeyField
    ├── episodeSearchField
    ├── isActive
    └── updatedAt
```

---

## Arquivos que serão alterados

### 1. `src/services/UserConfigService.ts`
Adicionar dois métodos estáticos:
- `getGlobalImportConfig()` — lê o documento `globalConfig/importSource`
- `saveGlobalImportConfig(config)` — salva o documento `globalConfig/importSource`
- `onGlobalImportConfigChange(callback)` — listener em tempo real

### 2. `src/hooks/useUserConfig.ts`
- Substituir `updateImportConfig` para salvar em `globalConfig/importSource` em vez de `userConfigs/{userId}.importConfig`
- Adicionar novo hook separado `useGlobalImportConfig` para leitura em tempo real

### 3. `src/components/AdminImportConfig.tsx`
- A aba "Importação Automática" já salva via `updateImportConfig` — apenas ajustar para usar o novo destino global
- Mostrar badge "Configuração Global" igual à aba de Canais TV

### 4. `src/pages/ImportacaoAutomatica.tsx`
- Remover o `defaultImportConfig` hardcoded
- Carregar a config de origem do Firebase (`globalConfig/importSource`) em vez de usar valores fixos
- Se não houver config salva, mostrar mensagem informando que o admin ainda não configurou a origem

### 5. `src/services/AutoImportScheduleService.ts`
- Remover o `SOURCE_CONFIG` hardcoded
- Dentro de `executeAutoImport`, buscar a config de origem do Firebase (`getGlobalImportConfig()`) antes de executar
- Se não houver config global, logar e abortar com mensagem clara

---

## Fluxo Completo Após a Mudança

```text
Admin preenche campos na aba "Importação Automática"
            ↓
Clica "Salvar Configuração"
            ↓
Firebase: globalConfig/importSource ← salvo

Usuário abre "Importação Automática"
            ↓
Lê globalConfig/importSource em tempo real
            ↓
Campos de origem preenchidos automaticamente (somente leitura para o usuário)
            ↓
Usuário clica "Importar" → usa a config global do admin

Automação em background (AutoImportScheduleService)
            ↓
executeAutoImport → lê globalConfig/importSource
            ↓
Usa token/URL/IDs configurados pelo admin
```

---

## Detalhes Técnicos

- O documento `globalConfig/importSource` é único no Firebase (não por usuário)
- O admin escreve, todos os usuários leem — sem exposição de credenciais no código
- `AutoImportScheduleService` já roda do lado do cliente (browser), então pode usar `getDoc` normalmente
- Se `globalConfig/importSource` não existir ainda, exibir aviso amigável ao usuário: *"O administrador ainda não configurou a origem dos conteúdos"*
- Na página do usuário, os campos de origem ficam visíveis mas em modo somente leitura (o usuário vê de onde vem, mas não pode editar)
- A aba "Canais TV" já usa Firebase e não precisa mudar
