

## Importacao via DNS/IPTV - Fonte por URL com usuario e senha

### O que o usuario quer

Em vez de baixar um arquivo M3U manualmente e fazer upload, o sistema deve permitir conectar diretamente a uma fonte IPTV usando:
- **URL do servidor** (ex: `http://appmyflix.com.br`)
- **Usuario** (ex: `tibimteste`)
- **Senha** (ex: `151215`)

O sistema monta automaticamente a URL `http://servidor/get.php?username=X&password=Y&type=m3u_plus`, busca o conteudo M3U e processa normalmente com o importador existente.

### Como vai funcionar

```text
Usuario preenche: URL + Usuario + Senha
         |
Sistema monta: http://url/get.php?username=X&password=Y&type=m3u_plus
         |
Faz fetch da URL (via proxy para evitar CORS)
         |
Recebe o conteudo M3U como texto
         |
Passa para o mesmo parseM3UAdvanced() que ja existe
         |
Segue o fluxo normal: preview -> importacao
```

### Vantagem principal
Quando houver atualizacao na fonte, basta clicar "Buscar" novamente com as mesmas credenciais -- nao precisa baixar arquivo de novo.

---

### Mudancas tecnicas

#### 1. Atualizar `src/components/M3UImporter.tsx`

**Adicionar opcao de fonte (arquivo vs URL/DNS):**
- Novo estado `sourceType`: `'file'` ou `'dns'`
- Novos estados: `dnsUrl`, `dnsUsername`, `dnsPassword`
- Radio buttons no topo para escolher entre "Arquivo M3U" e "Fonte DNS/IPTV"

**Adicionar UI de credenciais DNS:**
- Quando `sourceType === 'dns'`, mostrar 3 campos: URL do servidor, Usuario, Senha
- Botao "Buscar Lista" que monta a URL e faz fetch

**Adicionar funcao `handleFetchDNS`:**
- Monta a URL: `${dnsUrl}/get.php?username=${dnsUsername}&password=${dnsPassword}&type=m3u_plus`
- Faz fetch via proxy Vercel (`/api/baserow-proxy` reutilizado ou novo endpoint simples)
- Recebe o texto M3U
- Chama `parseM3UAdvanced(content)` -- mesmo parser do arquivo
- Segue o fluxo normal (preview, importacao)

**Botao "Processar e Visualizar":**
- Quando fonte e DNS, usa o conteudo buscado em vez do arquivo
- O resto do fluxo permanece identico

#### 2. Criar proxy para buscar M3U de URLs externas

**Arquivo:** `api/m3u-proxy.js` (Vercel serverless function)

Necessario para evitar CORS. O proxy recebe a URL completa e retorna o conteudo M3U como texto.

```text
POST /api/m3u-proxy
Body: { url: "http://appmyflix.com.br/get.php?username=X&password=Y&type=m3u_plus" }
Retorna: conteudo M3U como texto
```

#### 3. Salvar credenciais DNS opcionalmente

**Arquivo:** `src/services/UserConfigService.ts`

Salvar as credenciais DNS no Firestore do usuario (`userConfigs/{userId}/dnsConfig`) para que ele nao precise digitar toda vez. Campos:
- `dnsUrl`
- `dnsUsername`
- `dnsPassword`
- `lastFetchedAt`

### Arquivos afetados

1. `src/components/M3UImporter.tsx` - Adicionar UI de fonte DNS e logica de fetch
2. `api/m3u-proxy.js` - Novo proxy Vercel para buscar M3U de URLs externas (evitar CORS)
3. `src/services/UserConfigService.ts` - Metodo para salvar/carregar credenciais DNS do usuario

### Riscos e consideracoes

- **CORS**: Buscar URLs externas direto do navegador sera bloqueado. O proxy Vercel resolve isso
- **Seguranca**: As credenciais DNS sao do usuario e ficam salvas no Firestore dele (mesmo padrao das API keys TMDB/OMDB)
- **Listas grandes**: O fetch pode demorar para listas muito grandes. Sera adicionado indicador de loading
- **Compatibilidade**: O formato `get.php?username=X&password=Y&type=m3u_plus` e o padrao de paineis Xtream Codes, que e o mais comum no mercado IPTV
