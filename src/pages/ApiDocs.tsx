import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, Code2, Key, Shield, Zap, BookOpen, Terminal, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import ApiPlayground from "@/components/ApiPlayground";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const CodeBlock = ({ code, language = "bash" }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-lg overflow-hidden border border-border bg-muted/50">
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
        <span className="text-xs font-mono text-muted-foreground">{language}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs">
          {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-foreground"><code>{code}</code></pre>
    </div>
  );
};

const EndpointSection = ({ method, path, description, params, responseExample, children }: {
  method: string; path: string; description: string;
  params?: { name: string; type: string; required: boolean; desc: string }[];
  responseExample?: string; children?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-border">
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-mono text-xs">{method}</Badge>
            <code className="text-sm font-mono text-foreground">{path}</code>
          </div>
          <p className="text-sm text-muted-foreground mt-2 ml-7">{description}</p>
        </CardHeader>
      </button>
      {open && (
        <CardContent className="pt-0 space-y-4">
          {params && params.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Parâmetros</h4>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted"><th className="px-4 py-2 text-left font-medium">Nome</th><th className="px-4 py-2 text-left font-medium">Tipo</th><th className="px-4 py-2 text-left font-medium">Obrigatório</th><th className="px-4 py-2 text-left font-medium">Descrição</th></tr></thead>
                  <tbody>
                    {params.map(p => (
                      <tr key={p.name} className="border-t border-border">
                        <td className="px-4 py-2 font-mono text-xs">{p.name}</td>
                        <td className="px-4 py-2"><Badge variant="outline" className="text-xs">{p.type}</Badge></td>
                        <td className="px-4 py-2">{p.required ? <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Sim</Badge> : <Badge variant="outline" className="text-xs">Não</Badge>}</td>
                        <td className="px-4 py-2 text-muted-foreground">{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {responseExample && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Resposta de exemplo</h4>
              <CodeBlock code={responseExample} language="json" />
            </div>
          )}
          {children}
        </CardContent>
      )}
    </Card>
  );
};

const ApiDocs = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Documentação da API</h1>
            </div>
          </div>
          <Link to="/login">
            <Button size="sm">Acessar Painel <ExternalLink className="h-3 w-3 ml-2" /></Button>
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {/* Hero */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">v1.0</Badge>
            <Badge variant="outline">REST API</Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">API Pública de Conteúdos</h2>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Integre seus conteúdos em qualquer plataforma externa. Acesse filmes, séries, episódios e canais de TV via requisições HTTP simples.
          </p>
        </div>

        {/* Quick start cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Key, title: "1. Obtenha sua chave", desc: "Gere uma API Key no painel em Minha API" },
            { icon: Terminal, title: "2. Faça uma requisição", desc: "Use curl, fetch ou qualquer client HTTP" },
            { icon: Zap, title: "3. Receba os dados", desc: "JSON com todos os campos dos conteúdos" },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-border">
              <CardContent className="pt-6">
                <Icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Authentication */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold">Autenticação</h3>
          </div>
          <p className="text-muted-foreground">
            Todas as requisições devem incluir sua API Key no header <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">X-API-Key</code>.
            A chave tem o formato <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">pk_live_xxxxxxxx</code>.
          </p>
          <CodeBlock code={`curl -H "X-API-Key: pk_live_sua_chave_aqui" \\
  "https://seu-dominio.com/api/public-api?type=filmes"`} />

          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Assinatura obrigatória</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    A API só funciona enquanto sua assinatura estiver ativa e o recurso <strong>minha-api</strong> estiver habilitado no seu plano.
                    Se a assinatura expirar, todas as chamadas retornarão <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">403 Forbidden</code>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Base URL */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold">URL Base</h3>
          <CodeBlock code="https://seu-dominio.com/api/public-api" />
          <p className="text-sm text-muted-foreground">Substitua <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">seu-dominio.com</code> pelo domínio do seu painel.</p>
        </section>

        <Separator />

        {/* Endpoints */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold">Endpoints</h3>
          </div>

          <div className="space-y-3">
            <EndpointSection
              method="GET"
              path="/api/public-api?type=filmes"
              description="Retorna a lista de filmes cadastrados no painel."
              params={[
                { name: "type", type: "string", required: true, desc: "Tipo de conteúdo: filmes" },
                { name: "page", type: "number", required: false, desc: "Página (padrão: 1)" },
                { name: "per_page", type: "number", required: false, desc: "Itens por página (padrão: 25, máx: 100)" },
                { name: "search", type: "string", required: false, desc: "Busca por nome" },
              ]}
              responseExample={`{
  "success": true,
  "data": [
    {
      "id": "12345",
      "Nome": "Filme Exemplo",
      "Link": "https://...",
      "Capa": "https://...",
      "Categoria": "Ação",
      "Favoritos": 42,
      "UID": "abc123"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total": 150,
    "total_pages": 6
  }
}`}
            />

            <EndpointSection
              method="GET"
              path="/api/public-api?type=series"
              description="Retorna a lista de séries com informações de temporadas."
              params={[
                { name: "type", type: "string", required: true, desc: "Tipo de conteúdo: series" },
                { name: "page", type: "number", required: false, desc: "Página (padrão: 1)" },
                { name: "per_page", type: "number", required: false, desc: "Itens por página (padrão: 25)" },
                { name: "search", type: "string", required: false, desc: "Busca por nome" },
              ]}
              responseExample={`{
  "success": true,
  "data": [
    {
      "id": "67890",
      "Nome": "Série Exemplo",
      "Capa": "https://...",
      "Categoria": "Drama",
      "Temporadas": 3,
      "UID": "def456"
    }
  ],
  "pagination": { "page": 1, "per_page": 25, "total": 80, "total_pages": 4 }
}`}
            />

            <EndpointSection
              method="GET"
              path="/api/public-api?type=episodios"
              description="Retorna episódios. Pode filtrar por série específica."
              params={[
                { name: "type", type: "string", required: true, desc: "Tipo de conteúdo: episodios" },
                { name: "serie_id", type: "string", required: false, desc: "ID da série para filtrar episódios" },
                { name: "page", type: "number", required: false, desc: "Página (padrão: 1)" },
                { name: "per_page", type: "number", required: false, desc: "Itens por página (padrão: 25)" },
              ]}
              responseExample={`{
  "success": true,
  "data": [
    {
      "id": "ep001",
      "Nome": "Episódio 1 - Piloto",
      "Link": "https://...",
      "Temporada": 1,
      "Numero": 1,
      "Serie": "67890"
    }
  ],
  "pagination": { "page": 1, "per_page": 25, "total": 24, "total_pages": 1 }
}`}
            />

            <EndpointSection
              method="GET"
              path="/api/public-api?type=canais"
              description="Retorna canais de TV ao vivo."
              params={[
                { name: "type", type: "string", required: true, desc: "Tipo de conteúdo: canais" },
                { name: "page", type: "number", required: false, desc: "Página (padrão: 1)" },
                { name: "per_page", type: "number", required: false, desc: "Itens por página (padrão: 25)" },
                { name: "search", type: "string", required: false, desc: "Busca por nome do canal" },
              ]}
              responseExample={`{
  "success": true,
  "data": [
    {
      "id": "ch001",
      "Nome": "Canal Exemplo HD",
      "Link": "https://...",
      "Logo": "https://...",
      "Categoria": "Esportes"
    }
  ],
  "pagination": { "page": 1, "per_page": 25, "total": 200, "total_pages": 8 }
}`}
            />
          </div>
        </section>

        <Separator />

        {/* Error codes */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold">Códigos de Erro</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted"><th className="px-4 py-3 text-left font-medium">Código</th><th className="px-4 py-3 text-left font-medium">Significado</th><th className="px-4 py-3 text-left font-medium">Solução</th></tr></thead>
              <tbody>
                {[
                  ["400", "Parâmetro 'type' ausente ou inválido", "Envie type=filmes, series, episodios ou canais"],
                  ["401", "API Key ausente ou inválida", "Verifique o header X-API-Key"],
                  ["403", "Assinatura expirada ou sem permissão", "Renove sua assinatura ou faça upgrade para o plano API"],
                  ["429", "Rate limit excedido", "Aguarde antes de fazer novas requisições"],
                  ["500", "Erro interno do servidor", "Tente novamente ou entre em contato"],
                ].map(([code, meaning, solution]) => (
                  <tr key={code} className="border-t border-border">
                    <td className="px-4 py-3"><Badge variant="outline" className="font-mono">{code}</Badge></td>
                    <td className="px-4 py-3">{meaning}</td>
                    <td className="px-4 py-3 text-muted-foreground">{solution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Separator />

        {/* Code examples */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold">Exemplos de Código</h3>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">JavaScript (fetch)</h4>
              <CodeBlock language="javascript" code={`const response = await fetch(
  "https://seu-dominio.com/api/public-api?type=filmes&page=1&per_page=10",
  {
    headers: { "X-API-Key": "pk_live_sua_chave" }
  }
);
const { data, pagination } = await response.json();
console.log(data);`} />
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Python (requests)</h4>
              <CodeBlock language="python" code={`import requests

resp = requests.get(
    "https://seu-dominio.com/api/public-api",
    params={"type": "filmes", "page": 1, "per_page": 10},
    headers={"X-API-Key": "pk_live_sua_chave"}
)
data = resp.json()
print(data["data"])`} />
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">cURL</h4>
              <CodeBlock language="bash" code={`curl -s -H "X-API-Key: pk_live_sua_chave" \\
  "https://seu-dominio.com/api/public-api?type=series&search=breaking" | jq .`} />
            </div>
          </div>
        </section>

        {/* Playground */}
        <Separator />
        <section className="space-y-4">
          <ApiPlayground />
        </section>

        <Separator />

        {/* CTA */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 text-center space-y-4">
            <h3 className="text-xl font-bold">Pronto para começar?</h3>
            <p className="text-muted-foreground">Crie sua conta, assine o plano com API e gere sua chave em minutos.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/cadastro"><Button>Criar Conta</Button></Link>
              <Link to="/precos-publico"><Button variant="outline">Ver Planos</Button></Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground py-8">
          <p>© {new Date().getFullYear()} — Documentação da API Pública</p>
        </footer>
      </div>
    </div>
  );
};

export default ApiDocs;
