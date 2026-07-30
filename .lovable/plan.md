## Plano: Corrigir `public/firebase-messaging-sw.js`

### Problema
O service worker atual está hardcoded com as configurações de outro projeto Firebase (`streming-d89c7`). Isso faz com que as notificações push tentem registrar no projeto errado, causando falhas de autenticação e assinatura no Firebase Cloud Messaging.

### Solução proposta
Service workers são arquivos estáticos que não conseguem ler variáveis de ambiente do Vite em tempo de execução. Portanto, a correção será trocar os valores hardcoded para os do projeto atual, mantendo o arquivo compatível com a configuração do frontend (`src/config/firebase.ts`).

### Alterações
1. **Atualizar `public/firebase-messaging-sw.js`**
   - Substituir `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` e `appId` pelos valores do projeto `tibimmanagerpainelvercel` (mesmos usados como fallback no frontend).
   - Manter a lógica de background messages e notification click intacta.

2. **Validar compatibilidade da versão do SDK**
   - Verificar se a versão `9.0.0` do compat SDK no service worker ainda é compatível com o projeto Firebase atual. Se necessário, atualizar para a mesma versão usada pelo frontend.

3. **Verificação pós-implantação**
   - Após o deploy na Vercel, inspecionar o service worker publicado em `https://SEU-DOMINIO-VERCEL/firebase-messaging-sw.js` para confirmar que os valores estão corretos.
   - Observar os logs do console para garantir que não aparecem mais erros de projeto incompatível.

### Próximo passo
Aprova aí que eu aplico a correção no arquivo.