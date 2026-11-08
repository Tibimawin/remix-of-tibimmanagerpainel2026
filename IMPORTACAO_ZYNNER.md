# 🎬 Importação Zynner - Sistema Automático de Filmes e Séries

Sistema completo de importação automática de filmes e séries para o painel de gerenciamento.

## 📋 Funcionalidades

### 1. **Busca Automática no TMDB**
- Busca de filmes e séries por nome
- Dados completos: sinopse, capa, backdrop, gêneros, nota IMDb
- Detecção automática de duplicatas no Baserow

### 2. **Validação de Links de Streaming**
- **24 servidores de filmes** testados automaticamente
- **29 servidores de séries** testados automaticamente
- Validação em tempo real usando elemento `<video>`
- Suporte para DUB e LEG

### 3. **Geração Automática de Episódios**
- Criação automática de todos os episódios de séries
- Baseado nas temporadas do TMDB
- Filtragem de temporadas especiais
- Cadastro em lotes de 99 episódios

### 4. **Cadastro em Lote no Baserow**
- Cadastro automático de conteúdo
- Cadastro automático de episódios
- Progress tracking em tempo real

## 🎯 Fluxo de Trabalho

### **Tela 1: Formulário Inicial**
- Campo de texto para lista de nomes (separados por vírgula)
- Seleção de tipo (Filme/Série)
- Seleção de categoria principal
- 28 categorias disponíveis

### **Tela 2: Resultados da Busca**
- Card visual com poster e backdrop
- Informações: título, gêneros, nota, data
- Botões para selecionar idioma (DUB/LEG)
- Opção de pular item

### **Tela 3: Validação de Links**
- Testa automaticamente todos os servidores
- Mostra servidor/link validado
- Para séries: mostra contador de episódios
- Loading durante validação (5s timeout por servidor)

### **Tela 4: Cadastro Final**
- Resumo: total de conteúdos e episódios
- Lista de itens prontos
- Botão de cadastro em lote
- Auto-reload após sucesso

## 📂 Estrutura de Arquivos

```
src/
├── types/
│   └── importacao.ts                 # TypeScript types
├── config/
│   └── importacaoZynner.ts          # Configurações e servidores
├── services/
│   └── TMDBService.ts               # Serviço TMDB (expandido)
├── hooks/
│   └── useImportacaoZynner.ts       # Lógica principal
├── components/
│   └── importacao/
│       ├── FormularioInicial.tsx    # Tela 1
│       ├── ResultadosBusca.tsx      # Tela 2
│       ├── FormularioEdicao.tsx     # Tela 3
│       └── CadastroFinal.tsx        # Tela 4
└── pages/
    └── ImportarConteudo.tsx         # Página principal
```

## 🔧 Configurações

### Baserow
```typescript
{
  token: 'bOs1UqfA6YdpGV5yqGgSeK9WimkFhXbB',
  id_conteudo: '1894',
  id_episodio: '1893',
  coluna_Nome_Conteudo: '13833',
  user_vps: 1,
  url_base: 'http://213.199.56.115'
}
```

### TMDB Token
```typescript
Bearer eyJhbGciOiJIUzI1NiJ9...
```

## 🎨 Design

- **Tema escuro** com gradientes
- **Cor principal**: `#76ff03` (verde limão)
- **Background**: `#121212` / `#1e1e1e`
- **Animações suaves**: fade-in, slideUp
- **Badges**: NEW, BETA, ALERT
- **Progress bar** integrada

## 📊 Dados Cadastrados

### Conteúdo (Table 1894)
```typescript
{
  Nome: string,
  Capa: string,              // w780
  "Capa de fundo": string,   // original
  Categoria: string,         // Gêneros + categoria principal
  Sinopse: string,
  Link: string,              // URL completa (filme) ou "vazio" (série)
  Tipo: "Filme" | "Serie",
  Idioma: "DUB" | "LEG",
  Views: 0,
  Temporadas: number,
  Imdb: string,              // vote_average
  "Data de Lançamento": string, // DD/MM/YYYY
  "Duração": string          // "XX min"
}
```

### Episódios (Table 1893)
```typescript
{
  Nome: string,              // Nome da série
  Link: string,              // URL do episódio
  Temporada: number,
  Episódio: number
}
```

## 🚀 Como Usar

1. **Acesse** `/importar-conteudo`
2. **Cole** a lista de títulos separados por vírgula
3. **Selecione** o tipo (Filme/Série)
4. **Escolha** a categoria
5. **Clique** em "Ler Lista e Processar"
6. Para cada item:
   - Revise o resultado do TMDB
   - Selecione DUB ou LEG
   - Aguarde validação
   - Confirme os dados
7. **Cadastre** tudo de uma vez

## 🔍 Validação de Vídeo

```typescript
async function verificarVideo(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = url;
    
    const timeout = setTimeout(() => {
      video.remove();
      resolve(false);
    }, 5000); // 5s timeout
    
    video.onloadeddata = () => {
      clearTimeout(timeout);
      video.remove();
      resolve(true);
    };
    
    video.onerror = () => {
      clearTimeout(timeout);
      video.remove();
      resolve(false);
    };
    
    video.load();
  });
}
```

## 📝 Formatos de Link

### Filmes
```
{servidor}{imdb_id}.mp4
{servidor}{imdb_id}LEG.mp4
```

Exemplo:
```
http://fhd1.oneplayer.site/toktergfer32tgdsvsdven/FHD1/tt1234567.mp4
```

### Séries
```
{servidor}{tmdb_id}/{temporada}x{episodio}.mp4
{servidor}{tmdb_id}/{temporada}x{episodio}LEG.mp4
```

Exemplo:
```
http://shd2.oneplayer.site/token/SHD2/1396/1x1.mp4
```

## 🎯 Categorias Disponíveis

- APPLE, Series
- Animes
- Novela
- Doramas (Dublado/Legendado/Coreano)
- Marvel (Filmes/Series)
- Lançamentos
- Netflix (Filmes/Series)
- HBO MAX (Filmes/Series)
- Disney (Filmes/Series)
- Prime Video (Filmes/Series)
- Globo Play (Filmes/Series)
- WARNER Filmes
- MBC (Series/Dorama)
- ABC Serie
- Paramount+ Serie
- Filmes Variados
- 2024, Lancamento

## 🎯 Features Implementadas

✅ Busca multi-search no TMDB  
✅ Validação automática de links  
✅ Geração de episódios  
✅ Detecção de duplicatas  
✅ Progress tracking  
✅ Cadastro em lote  
✅ Loading states  
✅ Error handling  
✅ Design responsivo  
✅ Dark mode  
✅ Animações  

## 📱 Navegação

- **Menu**: Ferramentas → Importação Zynner
- **Badge**: NEW
- **Ícone**: DatabaseZap
- **URL**: `/importar-conteudo`

## 🔐 Permissões

Feature: `importar-conteudo`

---

**Desenvolvido para o painel TibimManagerPain2025** 🚀
