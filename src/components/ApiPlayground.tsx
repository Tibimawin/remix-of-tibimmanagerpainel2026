import { useState } from "react";
import { Play, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ApiPlayground = () => {
  const [apiKey, setApiKey] = useState("");
  const [contentType, setContentType] = useState("filmes");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState("1");
  const [perPage, setPerPage] = useState("10");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<null | {
    status: number;
    duration: number;
    body: string;
  }>(null);

  const buildUrl = () => {
    const base = `${window.location.origin}/api/public-api`;
    const params = new URLSearchParams({ type: contentType, page, per_page: perPage });
    if (search.trim()) params.set("search", search.trim());
    return `${base}?${params.toString()}`;
  };

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setLoading(true);
    setResponse(null);
    const url = buildUrl();
    const start = performance.now();

    try {
      const res = await fetch(url, {
        headers: { "X-API-Key": apiKey.trim() },
      });
      const duration = Math.round(performance.now() - start);
      const text = await res.text();
      let formatted: string;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        formatted = text;
      }
      setResponse({ status: res.status, duration, body: formatted });
    } catch (err: any) {
      setResponse({
        status: 0,
        duration: Math.round(performance.now() - start),
        body: JSON.stringify({ error: err.message }, null, 2),
      });
    } finally {
      setLoading(false);
    }
  };

  const statusColor =
    response && response.status >= 200 && response.status < 300
      ? "text-emerald-500"
      : "text-destructive";

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">Playground — Teste ao Vivo</CardTitle>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
            Interativo
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Insira sua API Key e teste as chamadas diretamente aqui.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* API Key */}
        <div className="space-y-2">
          <Label htmlFor="playground-key">API Key</Label>
          <Input
            id="playground-key"
            type="password"
            placeholder="pk_live_sua_chave_aqui"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        {/* Parameters */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Tipo de conteúdo</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="filmes">Filmes</SelectItem>
                <SelectItem value="series">Séries</SelectItem>
                <SelectItem value="episodios">Episódios</SelectItem>
                <SelectItem value="canais">Canais TV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="playground-search">Busca (opcional)</Label>
            <Input
              id="playground-search"
              placeholder="Nome do conteúdo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="playground-page">Página</Label>
            <Input
              id="playground-page"
              type="number"
              min="1"
              value={page}
              onChange={(e) => setPage(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="playground-perpage">Por página</Label>
            <Input
              id="playground-perpage"
              type="number"
              min="1"
              max="100"
              value={perPage}
              onChange={(e) => setPerPage(e.target.value)}
            />
          </div>
        </div>

        {/* URL preview */}
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">Requisição</p>
          <code className="text-xs font-mono text-foreground break-all">
            GET {buildUrl()}
          </code>
        </div>

        {/* Send button */}
        <Button onClick={handleTest} disabled={loading || !apiKey.trim()} className="w-full sm:w-auto">
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {loading ? "Enviando..." : "Enviar Requisição"}
        </Button>

        {/* Response */}
        {response && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              {response.status >= 200 && response.status < 300 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <span className={`font-mono font-semibold ${statusColor}`}>
                {response.status || "Erro de rede"}
              </span>
              <Badge variant="outline" className="text-xs font-mono">
                {response.duration}ms
              </Badge>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 overflow-hidden">
              <div className="px-4 py-2 bg-muted border-b border-border">
                <span className="text-xs font-mono text-muted-foreground">Resposta JSON</span>
              </div>
              <pre className="p-4 overflow-x-auto text-sm font-mono text-foreground max-h-96 overflow-y-auto">
                <code>{response.body}</code>
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiPlayground;
