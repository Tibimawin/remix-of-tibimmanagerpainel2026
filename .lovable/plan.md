
## Nova Página "Planos" — Gerenciamento via Baserow

### O que será feito

Criar uma página completa de gerenciamento de planos que lê e escreve dados numa tabela do **Baserow** (a mesma infraestrutura já usada pelo sistema). O admin configura o ID da tabela no painel admin, e a página do usuário consulta essa tabela em tempo real.

A tabela no Baserow terá as colunas:
- **Tag** — Single line text
- **Tipo** — Single line text
- **Mes** — Single line text
- **Valor** — Number
- **Telas** — Number
- **Total** — Number
- **Adulto** — Boolean

---

### Arquitetura

```text
Admin Panel (AdminDashboard)
  └── AdminSidebar → nova opção "Planos" (categoria "management")
  └── novo componente AdminPlanosConfig
      └── campo: ID da tabela de planos no Baserow
      └── salva em: globalConfig/planos (Firebase)

Página do Usuário (/planos)
  └── Lê o tableId de globalConfig/planos
  └── Busca os registros via BaserowService
  └── Exibe tabela com colunas: Tag, Tipo, Valor, Telas, Mes, Total, Adulto

Sidebar do Usuário
  └── Nova entrada "Planos" com href="/planos"
  └── Protegida por feature 'planos'

Configurações do Usuário (/configuracoes)
  └── Nova aba ou seção com campo do tableId de planos
  └── (Alternativa: apenas o admin configura via Admin Panel)
```

---

### Arquivos que serão criados/alterados

#### 1. `src/services/UserConfigService.ts`
Adicionar interface `GlobalPlanosConfig` e três métodos:
- `getGlobalPlanosConfig()` — lê `globalConfig/planos`
- `saveGlobalPlanosConfig(config)` — salva `globalConfig/planos`
- `onGlobalPlanosConfigChange(callback)` — listener em tempo real

```typescript
// Firestore path: globalConfig/planos
export interface GlobalPlanosConfig {
  tableId: string;       // ID da tabela de planos no Baserow
  updatedAt: string;
}
```

#### 2. `src/hooks/useGlobalPlanosConfig.ts` (novo)
Hook que consome `onGlobalPlanosConfigChange` e expõe:
- `planosConfig` — configuração atual
- `loading` — estado de carregamento
- `savePlanosConfig(tableId)` — salva no Firebase

#### 3. `src/components/AdminPlanosConfig.tsx` (novo)
Componente para o painel admin com:
- Campo de input para o **Table ID da tabela de Planos** no Baserow
- Badge "Configuração Global"
- Botão "Testar Conexão" (verifica se o ID funciona com o token/URL do `globalConfig/importSource`)
- Botão "Salvar"
- Exibe data/hora do último salvamento

#### 4. `src/components/admin/AdminSidebar.tsx`
Adicionar nova opção no menu `management`:
```typescript
{ id: 'planos-config', label: '📋 Configurar Planos', icon: CreditCard, category: 'management' }
```
E adicionar `'planos-config'` ao tipo `AdminView`.

#### 5. `src/pages/AdminDashboard.tsx`
- Importar `AdminPlanosConfig`
- Adicionar `case 'planos-config': return <AdminPlanosConfig />;` no `renderContent()`

#### 6. `src/pages/Planos.tsx` (novo)
Página do usuário com:
- Usa `useGlobalPlanosConfig` para obter o `tableId`
- Usa `useBaserowService` para buscar os registros da tabela
- Se `tableId` não configurado: exibe aviso "O administrador ainda não configurou a tabela de planos"
- Se configurado: exibe tabela com colunas Tag, Tipo, Valor, Telas, Mes, Total, Adulto
- Coluna **Adulto** renderizada como badge (Sim/Não)
- Coluna **Valor** e **Total** formatadas como moeda (R$)
- Filtro de busca por Tag ou Tipo
- Botão de refresh manual

#### 7. `src/components/Sidebar.tsx`
Adicionar "Planos" na lista `navigation`:
```typescript
{ name: 'Planos', href: '/planos', icon: CreditCard }
```

#### 8. `src/App.tsx`
Adicionar rota `/planos`:
```tsx
<Route path="/planos" element={
  <SimpleProtectedRoute>
    <Layout>
      <Planos />
    </Layout>
  </SimpleProtectedRoute>
} />
```

#### 9. `src/types/planTypes.ts` — AVAILABLE_FEATURES
Adicionar feature `'planos'` na lista para que possa ser controlada por permissões:
```typescript
{ id: 'planos', name: 'Planos', description: 'Visualizar tabela de planos disponíveis' }
```

---

### Fluxo Completo

```text
Admin acessa AdminDashboard → "Configurar Planos"
  ↓
Preenche o Table ID da tabela de Planos do Baserow
  ↓
Clica "Salvar" → Firebase: globalConfig/planos { tableId, updatedAt }

Usuário acessa /planos
  ↓
Hook lê globalConfig/planos em tempo real
  ↓
Usa o token/URL de globalConfig/importSource + tableId de globalConfig/planos
  ↓
Requisição via BaserowService → Baserow API
  ↓
Exibe tabela: Tag | Tipo | Valor | Telas | Mes | Total | Adulto
```

---

### Detalhes Técnicos

- O token e URL do Baserow virão de `globalConfig/importSource` (já configurado), apenas o `tableId` é específico para planos
- O componente admin reutiliza o mesmo padrão do `AdminImportConfig` existente
- A página `/planos` usa `useBaserowService` já existente no projeto
- A feature `'planos'` no `AVAILABLE_FEATURES` permite o admin controlar quem pode ver a página via sistema de permissões existente
- Paginação opcional: inicialmente carrega todos os registros (tabelas de planos tendem a ser pequenas)
