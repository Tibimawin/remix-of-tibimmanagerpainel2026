
Objetivo

Criar um sistema de aviso de conteúdos novos para os usuários do painel sem depender do Firebase para esse recurso, usando a própria tabela de conteúdos do Baserow como fonte.

O que encontrei no projeto
- Hoje as notificações e anúncios existentes dependem bastante do Firebase/Firestore:
  - `src/components/UserNotifications.tsx`
  - `src/services/UpdateNotificationService.ts`
  - `src/services/AdminAnnouncementService.ts`
  - `src/hooks/useUserAnnouncements.ts`
- O dashboard do usuário já tem um local natural para isso:
  - `src/pages/Dashboard.tsx` já renderiza `UserAnnouncementsBanner`
- O projeto já tem infraestrutura para ler conteúdos do Baserow por usuário:
  - `src/contexts/ConfigContext.tsx`
  - `src/hooks/useUserConfig.ts`
  - `src/services/BaserowService.ts`

Minha sugestão
Como você respondeu que quer:
- Banner no dashboard
- Lista de novidades
- Popup ao entrar
- E “só automático agora”

eu sugiro implementar um sistema 100% cliente + Baserow, sem Firebase para esse caso.

Como vai funcionar

1. Detecção automática de novidade
- Ao entrar no painel, o app consulta a tabela `conteudos` do usuário no Baserow.
- Ele pega os conteúdos mais recentes.
- Compara com um marco salvo localmente do próprio usuário no navegador, por exemplo:
  - último ID visto
  - ou conjunto de IDs já conhecidos
  - ou timestamp da última checagem bem-sucedida

2. Três formas de aviso
- Banner no dashboard:
  - “Há X conteúdos novos no catálogo”
- Lista de novidades:
  - card/section com os últimos conteúdos novos detectados
- Popup ao entrar:
  - aparece apenas na primeira visita em que existirem novidades ainda não vistas

3. Persistência sem Firebase
- O estado de “já vi essas novidades” fica em `localStorage`
- Chave por usuário, algo como:
  - `new-content-seen:<userId>`
  - `new-content-popup-dismissed:<userId>:<hash-do-lote>`
- Isso evita writes no Firestore e não consome quota do Firebase

Arquitetura recomendada

1. Criar um hook novo para centralizar a lógica
Arquivo sugerido:
- `src/hooks/useNewContentNotifications.ts`

Responsabilidades:
- ler `userInfo` do auth
- ler config do usuário
- instanciar `BaserowService`
- buscar conteúdos recentes da tabela `conteudos`
- detectar novidades
- expor estado como:
  - `newItems`
  - `newCount`
  - `hasNewContent`
  - `loading`
  - `markAllAsSeen()`
  - `dismissPopup()`
  - `shouldShowPopup`

2. Priorizar baixo custo de leitura
Para não pesar:
- buscar só uma quantidade limitada de registros recentes, ex. 20 ou 30
- ordenar pelos mais novos, se o endpoint/campo suportar
- se não houver ordenação confiável, usar os primeiros resultados mais recentes disponíveis no padrão atual do Baserow da tabela

3. Criar UI separada e simples
Componentes sugeridos:
- `src/components/NewContentBanner.tsx`
- `src/components/NewContentDialog.tsx`
- `src/components/NewContentList.tsx`

Comportamento:
- Banner aparece no dashboard quando `hasNewContent`
- Popup abre uma vez por lote novo detectado
- Lista mostra os últimos itens novos com botão “marcar como visto”

4. Integrar no Dashboard
Arquivo:
- `src/pages/Dashboard.tsx`

Ordem sugerida:
```text
ExpirationWarningBanner
NewContentBanner
NewContentDialog
UserAnnouncementsBanner
restante do dashboard
```

Assim o aviso de catálogo novo vira prioridade, sem conflitar com os anúncios antigos.

Como detectar “novo conteúdo”
Sugestão mais segura para esta base:
- usar o `id` da linha do Baserow como referência principal
- salvar no localStorage os IDs já conhecidos
- quando vier uma nova busca:
  - qualquer item cujo `id` ainda não esteja salvo = novo
- ao marcar como visto:
  - adicionar esses IDs ao conjunto salvo

Por que prefiro isso
- não depende de campo de data existir corretamente
- não exige mudança de schema
- não usa backend
- funciona mesmo com diferentes estruturas de tabela

Limites e cuidados
- Esse controle será por navegador/dispositivo, não sincronizado entre dispositivos
- Se o usuário limpar cache/localStorage, as novidades podem aparecer de novo
- Se você quiser no futuro sincronizar entre dispositivos sem Firebase, o ideal será criar uma pequena tabela no Baserow ou migrar isso para Supabase

Implementação em etapas

Etapa 1
- Criar hook `useNewContentNotifications`
- Buscar conteúdos do Baserow
- Detectar novos IDs
- Salvar/ler estado por usuário no localStorage

Etapa 2
- Criar banner no dashboard com contador
- Exemplo: “12 conteúdos novos adicionados”

Etapa 3
- Criar popup ao entrar mostrando os últimos novos itens
- Botões:
  - “Ver novidades”
  - “Marcar como visto”

Etapa 4
- Criar lista persistente no dashboard com os novos conteúdos detectados
- Limitar exibição para não poluir, ex. 5 a 10 itens

Etapa 5
- Ligar tudo no `Dashboard.tsx`
- Garantir que, sem config do Baserow ou sem tabela de conteúdos, nada quebra

Detalhes técnicos
- Reaproveitar:
  - `useSimpleAuth`
  - `useConfig` ou `useUserConfig`
  - `BaserowService`
- Não reaproveitar a estrutura de `UserNotifications` para esse caso, porque ela está acoplada ao Firebase
- O estado do popup deve ser separado do estado “visto”
- Usar chaves de localStorage com `userInfo.id` para evitar misturar usuários no mesmo navegador

Arquivos envolvidos
- Novo: `src/hooks/useNewContentNotifications.ts`
- Novo: `src/components/NewContentBanner.tsx`
- Novo: `src/components/NewContentDialog.tsx`
- Novo: `src/components/NewContentList.tsx`
- Editar: `src/pages/Dashboard.tsx`

Resultado esperado
- Usuários passam a receber aviso de novos conteúdos sem usar Firebase
- Você evita aumentar a quota do Firestore para esse fluxo
- O sistema fica simples, barato e rápido para colocar no ar
- Depois, se quiser, dá para evoluir para persistência sincronizada entre dispositivos
