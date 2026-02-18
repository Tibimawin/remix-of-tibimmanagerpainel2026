
## Adicionar "Planos" ao Menu Lateral do Utilizador

### Problema
O item "Planos" foi adicionado ao `Sidebar.tsx` (painel admin interno) mas **não foi adicionado** ao `UserSidebar.tsx`, que é o sidebar real que aparece aos utilizadores nas rotas `/dashboard`, `/conteudos`, etc.

### Solução

**Ficheiro:** `src/components/user/UserSidebar.tsx`

Adicionar o item "Planos" ao array `menuItems` na **linha 446** (logo após o item `sistema-indicacao`), na categoria `'management'`:

```typescript
{
  id: 'planos',
  label: 'Planos',
  href: '/planos',
  icon: CreditCard,
  category: 'management',
  description: 'Visualizar tabela de planos',
  feature: 'planos'
},
```

Também na **linha 607**, adicionar `'planos'` à exceção de `sistema-indicacao` para que o item apareça sem precisar de ativar permissão manualmente:

```typescript
const hasAccess = item.id === 'sistema-indicacao' || item.id === 'planos' ? true : hasFeature(item.feature);
```

Desta forma o item "Planos" aparece imediatamente no menu de todos os utilizadores, sem precisar de configurar permissões individualmente.

### Resumo das alterações

| Ficheiro | O que muda |
|---|---|
| `src/components/user/UserSidebar.tsx` | Adicionar item "Planos" ao `menuItems` + exceção de permissão na linha 607 |
