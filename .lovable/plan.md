

## Correcao: Configuracao de Canais TV nao compartilhada entre admin e usuarios

### Problema identificado

A configuracao de origem dos Canais TV (token, URL e table ID) esta sendo salva **por usuario** no Firestore (`userConfigs/{userId}/canaisTvConfig`). Quando o admin configura no painel admin, os dados ficam apenas no documento do admin. Quando um usuario comum tenta importar canais, o sistema le o documento do proprio usuario, que nao tem essa configuracao.

### Causa raiz

- `AdminConfigContext` usa `useUserConfig()` que le de `userConfigs/{userId}`
- `useImportarCanaisTV` usa `useAdminConfig()` que depende do mesmo contexto per-user
- Nao existe um documento global para Canais TV como existe para importacao automatica (`globalConfig/importSource`)

### Solucao

Migrar a configuracao de Canais TV para usar o mesmo padrao global ja existente no sistema, similar ao que `globalConfig/importSource` faz.

---

### Mudancas necessarias

#### 1. Adicionar funcoes globais de Canais TV no `UserConfigService`

**Arquivo:** `src/services/UserConfigService.ts`

- Adicionar `saveGlobalCanaisTvConfig(config)` que salva em `globalConfig/canaisTvSource`
- Adicionar `getGlobalCanaisTvConfig()` para leitura pontual
- Adicionar `onGlobalCanaisTvConfigChange(callback)` para listener em tempo real (mesmo padrao do `onGlobalImportConfigChange`)

#### 2. Atualizar o `AdminConfigContext` para ler/escrever no documento global

**Arquivo:** `src/contexts/AdminConfigContext.tsx`

- Trocar de `useUserConfig()` para ler de `globalConfig/canaisTvSource` via `UserConfigService`
- Trocar `updateCanaisTvConfig()` para salvar no documento global
- Todos os usuarios (admin e comuns) passarao a ler o mesmo documento

#### 3. Atualizar `useImportarCanaisTV` (sem mudancas de interface)

**Arquivo:** `src/hooks/useImportarCanaisTV.ts`

- Nenhuma mudanca necessaria no hook em si, pois ele ja consome `adminConfig` do contexto
- A correcao no `AdminConfigContext` resolve automaticamente

#### 4. Atualizar a tela de configuracao admin de Canais TV

**Arquivo:** O componente que o admin usa para salvar token/URL/tableId de Canais TV
- Garantir que chame a funcao global em vez da per-user

---

### Detalhes tecnicos

**Estrutura Firestore apos correcao:**

```text
globalConfig/
  importSource/     (ja existe - config de importacao automatica)
  canaisTvSource/   (novo - config global de Canais TV)
    sourceToken: "..."
    sourceBaseUrl: "..."
    sourceTableId: "..."
    updatedAt: "..."
```

**Fluxo corrigido:**

```text
Admin salva config --> globalConfig/canaisTvSource (Firestore)
                                  |
Usuario abre "Importar Canais" --> Le globalConfig/canaisTvSource
                                  |
                         Usa token/URL/tableId para buscar canais
```

### Arquivos afetados

1. `src/services/UserConfigService.ts` - Adicionar funcoes globais de Canais TV
2. `src/contexts/AdminConfigContext.tsx` - Ler/escrever do documento global
3. Componente de configuracao admin de Canais TV (se existir separado)

### Riscos

- Dados ja salvos no documento do admin precisarao ser reconfigurados uma vez no painel admin apos a mudanca
- Nenhuma perda de dados para usuarios comuns (eles nunca tiveram a config)

