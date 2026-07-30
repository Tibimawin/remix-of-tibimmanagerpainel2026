import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Save, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useGlobalSeriesUpdateConfig, DEFAULT_SERIES_UPDATE_CONFIG } from '@/hooks/useGlobalSeriesUpdateConfig';
import { BaserowService } from '@/services/BaserowService';
import { toast } from 'sonner';

const AdminSeriesUpdateConfig: React.FC = () => {
  const { seriesConfig, loading, saveSeriesConfig } = useGlobalSeriesUpdateConfig();
  const [sourceToken, setSourceToken] = useState('');
  const [sourceBaseUrl, setSourceBaseUrl] = useState('');
  const [sourceTableId, setSourceTableId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    setSourceToken(seriesConfig?.sourceToken ?? DEFAULT_SERIES_UPDATE_CONFIG.sourceToken);
    setSourceBaseUrl(seriesConfig?.sourceBaseUrl ?? DEFAULT_SERIES_UPDATE_CONFIG.sourceBaseUrl);
    setSourceTableId(seriesConfig?.sourceTableId ?? DEFAULT_SERIES_UPDATE_CONFIG.sourceTableId);
  }, [seriesConfig]);

  const isFilled = sourceToken.trim() && sourceBaseUrl.trim() && sourceTableId.trim();

  const handleSave = async () => {
    if (!isFilled) {
      toast.error('Preencha token, URL e ID da tabela.');
      return;
    }
    setIsSaving(true);
    try {
      await saveSeriesConfig({
        sourceToken: sourceToken.trim(),
        sourceBaseUrl: sourceBaseUrl.trim().replace(/\/$/, ''),
        sourceTableId: sourceTableId.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!isFilled) {
      toast.error('Preencha os campos antes de testar.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const service = new BaserowService(sourceToken.trim(), sourceBaseUrl.trim().replace(/\/$/, ''));
      await service.getTableData(sourceTableId.trim(), 1, 1);
      setTestResult('success');
      toast.success('Conexão com a tabela de episódios bem-sucedida!');
    } catch (error) {
      setTestResult('error');
      toast.error('Erro ao conectar com a tabela. Verifique os dados.');
    } finally {
      setIsTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Configurar Atualização de Séries</h2>
          <p className="text-sm text-muted-foreground">
            Define a tabela central de onde os novos episódios são carregados
          </p>
        </div>
        <Badge className="ml-auto bg-primary/10 text-primary border-primary/20">Configuração Global</Badge>
      </div>

      <Card className="modern-card border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Tabela de Origem dos Episódios
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Todos os usuários da página "Atualização de Séries" passam a ler desta tabela.
            Se nada for salvo, o sistema usa o padrão (tabela {DEFAULT_SERIES_UPDATE_CONFIG.sourceTableId}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="seriesBaseUrl" className="text-foreground font-medium">URL do Baserow</Label>
            <Input
              id="seriesBaseUrl"
              value={sourceBaseUrl}
              onChange={(e) => { setSourceBaseUrl(e.target.value); setTestResult(null); }}
              placeholder="Ex: http://213.199.56.115"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seriesToken" className="text-foreground font-medium">Token de Acesso</Label>
            <Input
              id="seriesToken"
              type="password"
              value={sourceToken}
              onChange={(e) => { setSourceToken(e.target.value); setTestResult(null); }}
              placeholder="Token do Baserow"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seriesTableId" className="text-foreground font-medium">ID da Tabela de Episódios</Label>
            <Input
              id="seriesTableId"
              value={sourceTableId}
              onChange={(e) => { setSourceTableId(e.target.value); setTestResult(null); }}
              placeholder="Ex: 3777"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Encontre este ID na URL da tabela no Baserow: .../table/<strong>ID</strong>/...
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted/30 border border-border/40 space-y-2">
            <p className="text-sm font-semibold text-foreground">Colunas esperadas na tabela:</p>
            <div className="flex flex-wrap gap-2">
              {['Titulo / Nome', 'Serie', 'Temporada', 'Episódio', 'Link', 'Sinopse'].map((col) => (
                <Badge key={col} variant="outline" className="text-xs">{col}</Badge>
              ))}
            </div>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${
              testResult === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-500'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}>
              {testResult === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {testResult === 'success' ? 'Tabela acessível com sucesso!' : 'Erro ao acessar a tabela.'}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleTest} disabled={isTesting || !isFilled} className="flex-1">
              {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
              Testar Conexão
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !isFilled} className="flex-1">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </div>

          {seriesConfig?.updatedAt && (
            <p className="text-xs text-muted-foreground text-center">
              Última atualização: {new Date(seriesConfig.updatedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSeriesUpdateConfig;
