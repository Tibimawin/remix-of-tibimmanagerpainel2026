# Sistema de Notificações Push - Documentação

## 📱 Visão Geral

Sistema completo de notificações push integrado automaticamente em todas as operações CRUD do painel. As notificações são enviadas em tempo real quando ações são realizadas no sistema.

## 🎯 Funcionalidades

### Notificações Automáticas

O sistema notifica automaticamente sobre:

- ✅ **Criação** de registros (Conteúdos, Episódios, Usuários, etc.)
- ✏️ **Atualização** de registros
- 🗑️ **Exclusão** de registros
- 📥 **Importação** de dados em massa

### Categorias Configuráveis

- **Operações CRUD**: Criar, atualizar e deletar registros
- **Importações**: M3U, MaxPlus e outros dados
- **Gestão de Usuários**: Criação e modificação de usuários
- **Alertas de Segurança**: Tentativas de login e ações sensíveis
- **Sistema**: Atualizações e manutenção

## 🚀 Como Usar

### Para Usuários

1. **Ativação Inicial**
   - Ao acessar o painel, você verá um toast solicitando permissão para notificações
   - Clique em "Ativar" para conceder permissão
   - As notificações serão ativadas automaticamente

2. **Configuração**
   - Acesse: **Configurações → Segurança**
   - Ative/desative categorias específicas de notificações
   - Escolha quais tipos de ações deseja ser notificado

3. **Gerenciar Permissões**
   - As preferências são salvas localmente
   - Você pode alterar as permissões a qualquer momento
   - Para revogar permissões, use as configurações do navegador

### Para Desenvolvedores

#### Uso Básico - Hook `useAutoNotifyCRUD`

```typescript
import { useAutoNotifyCRUD } from '@/hooks/useActionNotifier';

// No seu componente
const { notifyCreate, notifyUpdate, notifyDelete, notifyImport } = useAutoNotifyCRUD('conteúdos');

// Ao criar um registro
await createRecord(data);
notifyCreate('Novo filme Avatar');

// Ao atualizar
await updateRecord(id, data);
notifyUpdate('Filme Avatar');

// Ao deletar
await deleteRecord(id);
notifyDelete('Filme Avatar');

// Ao importar
await importData(items);
notifyImport(`${items.length} registros importados`);
```

#### Uso Avançado - Hook `useActionNotifier`

```typescript
import { useActionNotifier } from '@/hooks/useActionNotifier';

const { notifyAction, requestPermission, getPermissionStatus } = useActionNotifier();

// Notificação personalizada
notifyAction({
  action: 'Login',
  entity: 'Usuário',
  details: 'João Silva fez login no sistema'
});

// Solicitar permissão manualmente
const granted = await requestPermission();

// Verificar status
const status = getPermissionStatus(); // 'granted' | 'denied' | 'default'
```

## 📋 Integração Automática

### Componentes já integrados:

✅ **DataTable.tsx** - Delete e Import
✅ **EditContentDialog.tsx** - Update de Conteúdos  
✅ **EditDialog.tsx** - Update de Usuários
✅ **EditEpisodioDialog.tsx** - Update de Episódios
✅ **CreateDialog.tsx** - Create de todos os tipos

### Páginas já integradas:

- `/conteudos` - Gerenciar conteúdos
- `/episodios` - Gerenciar episódios
- `/usuarios` - Gerenciar usuários
- `/banners` - Gerenciar banners
- `/categorias` - Gerenciar categorias
- `/sessoes` - Gerenciar sessões
- Todas as outras páginas CRUD

## 🔧 Arquitetura Técnica

### Arquivos Principais

```
src/
├── services/
│   └── PushNotificationService.ts  # Serviço principal de notificações
├── hooks/
│   └── useActionNotifier.ts        # Hooks para notificações
├── components/
│   ├── NotificationSettings.tsx    # Interface de configuração
│   ├── DataTable.tsx               # Integrado com notificações
│   ├── EditContentDialog.tsx       # Integrado com notificações
│   ├── EditDialog.tsx              # Integrado com notificações
│   ├── EditEpisodioDialog.tsx      # Integrado com notificações
│   └── CreateDialog.tsx            # Integrado com notificações
└── public/
    └── firebase-messaging-sw.js    # Service Worker para notificações em background
```

### Service Worker

O sistema utiliza um Service Worker para receber notificações mesmo quando o navegador está em background:

```javascript
// public/firebase-messaging-sw.js
// Registrado automaticamente pelo PushNotificationService
```

### Fluxo de Notificação

1. **Ação no Sistema** → Usuário cria/edita/deleta registro
2. **Hook Triggered** → `useAutoNotifyCRUD` captura a ação
3. **Service Chamado** → `PushNotificationService.notifyAction()`
4. **Notificação Criada** → Notificação nativa do navegador
5. **Toast Exibido** → Feedback visual no painel

## 🎨 Personalização

### Adicionar Nova Categoria

```typescript
// Em NotificationSettings.tsx, adicione ao array categories:
{
  id: 'nova-categoria',
  label: 'Minha Categoria',
  description: 'Descrição da categoria',
  icon: IconComponent,
  enabled: true
}
```

### Customizar Mensagens

```typescript
// No componente, personalize a mensagem:
notifyCreate('Descrição customizada do que foi criado');
notifyUpdate('Descrição do que foi alterado');
```

### Integrar em Nova Página

```typescript
import { useAutoNotifyCRUD } from '@/hooks/useActionNotifier';

// No topo do componente
const { notifyCreate, notifyUpdate, notifyDelete } = useAutoNotifyCRUD('nome-da-entidade');

// Nas funções de CRUD
const handleCreate = async (data) => {
  await createRecord(data);
  notifyCreate(data.nome);
};
```

## 🔒 Segurança e Privacidade

- ✅ Permissões solicitadas explicitamente
- ✅ Dados armazenados localmente (não em servidor)
- ✅ Token FCM criptografado
- ✅ Usuário controla categorias ativas
- ✅ Pode revogar permissões a qualquer momento

## 🐛 Troubleshooting

### Notificações não aparecem

1. Verifique se as permissões foram concedidas
2. Verifique as configurações do navegador
3. Teste em modo anônimo (sem extensões)
4. Verifique console do navegador para erros

### Service Worker não registra

```javascript
// Verificar no console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

### Notificações silenciosas

- Verifique configurações do sistema operacional
- Verifique modo "Não Perturbe"
- Verifique configurações específicas do site

## 📱 Compatibilidade

### Navegadores Suportados

- ✅ Chrome 50+
- ✅ Firefox 44+
- ✅ Edge 17+
- ✅ Safari 16+ (macOS Ventura+)
- ✅ Opera 37+

### Não Suportado

- ❌ Internet Explorer
- ❌ Safari iOS < 16.4

## 🚀 Próximas Melhorias

- [ ] Notificações por email
- [ ] Histórico de notificações
- [ ] Notificações agendadas
- [ ] Notificações baseadas em eventos
- [ ] Push notifications em PWA
- [ ] Suporte a notificações com ações
- [ ] Integração com Telegram/WhatsApp

## 📞 Suporte

Para dúvidas ou problemas, acesse:
- **Configurações → Segurança** para gerenciar notificações
- **Suporte Prioritário** para assistência dedicada
