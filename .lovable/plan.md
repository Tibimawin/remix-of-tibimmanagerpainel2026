

## Remover funcionalidade "Lista M3U" (Gerar listas M3U)

Remover completamente a funcionalidade de gerar listas M3U personalizadas do sistema. Esta e a funcionalidade que permite ao usuario gerar/exportar listas M3U a partir dos conteudos cadastrados -- **nao** a de importar M3U.

### Arquivos a modificar

1. **`src/App.tsx`**
   - Remover o import de `ListaM3U`
   - Remover a rota `/lista-m3u`

2. **`src/components/Sidebar.tsx`**
   - Remover o item `{ name: 'Lista M3U', href: '/lista-m3u', icon: FileText }`

3. **`src/components/user/UserSidebar.tsx`**
   - Remover o objeto de navegacao com `id: 'lista-m3u'`

4. **`src/components/user/UserHeader.tsx`**
   - Remover a entrada `'/lista-m3u'` do mapa de rotas

5. **`src/components/AdminUserPermissions.tsx`**
   - Remover `'lista-m3u'` das listas de features dos planos (Basico, Profissional, Empresarial)

6. **`src/pages/ListaM3U.tsx`**
   - Deletar o arquivo inteiro

### O que NAO sera tocado

- `src/pages/ImportarM3U.tsx` -- funcionalidade de **importar** M3U permanece intacta
- `src/components/M3UImporter.tsx` -- componente de importacao permanece
- `src/pages/Recursos.tsx` -- a referencia la e sobre "Importar Lista M3U", nao sobre gerar, entao permanece
