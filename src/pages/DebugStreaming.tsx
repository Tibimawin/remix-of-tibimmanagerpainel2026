import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bug, Play, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const DebugStreaming = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleDebug = async () => {
    if (!url) {
      toast.error('Insira um link de streaming para debugar');
      return;
    }

    setLoading(true);
    setDebugData(null);

    try {
      // Adiciona o parâmetro debug=true na URL
      const debugUrl = new URL(url);
      debugUrl.searchParams.set('debug', 'true');

      const response = await fetch(debugUrl.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      setDebugData(data);
      toast.success('Dados de debug carregados!');
    } catch (error: any) {
      console.error('Debug error:', error);
      toast.error(`Erro ao debugar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copiado para a área de transferência');
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-red-500/10 rounded-2xl">
          <Bug className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Debug de Streaming</h1>
          <p className="text-muted-foreground">Analise o fluxo de redirecionamento e cabeçalhos dos canais</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Entrada do Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Cole aqui o link do canal (ex: https://.../api/s/...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono text-xs"
            />
            <Button onClick={handleDebug} disabled={loading} className="shrink-0">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Analisar Link
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            Dica: Use links que começam com o domínio do seu painel e terminam com /api/s/...
          </p>
        </CardContent>
      </Card>

      {debugData && (
        <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Resumo da Resposta</CardTitle>
              <Badge variant={debugData.status >= 200 && debugData.status < 400 ? 'default' : 'destructive'}>
                Status {debugData.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Proxy Origem</span>
                  <p className="font-mono bg-muted p-2 rounded border border-border/50">{debugData.proxy}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">URL de Destino Final</span>
                  <div className="flex gap-2">
                    <p className="font-mono bg-muted p-2 rounded border border-border/50 truncate flex-1">{debugData.url}</p>
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(debugData.url)}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {debugData.headers?.location && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-600 mb-1">
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase">Redirecionamento Detectado</span>
                  </div>
                  <p className="text-xs font-mono break-all">{debugData.headers.location}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Cabeçalhos HTTP (Headers)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg border border-border/50 overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-background/50 border-b border-border/50">
                    <tr>
                      <th className="text-left p-2 text-muted-foreground">Header</th>
                      <th className="text-left p-2 text-muted-foreground">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {Object.entries(debugData.headers).map(([key, value]: [string, any]) => (
                      <tr key={key} className="hover:bg-background/30 transition-colors">
                        <td className="p-2 font-bold text-foreground/70">{key}</td>
                        <td className="p-2 text-muted-foreground break-all">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DebugStreaming;
