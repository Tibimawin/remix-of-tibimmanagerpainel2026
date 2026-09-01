import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Save, TestTube, CheckCircle, XCircle, Loader2, Table2 } from 'lucide-react';
import { useGlobalJogosDiaConfig } from '@/hooks/useGlobalJogosDiaConfig';
import { testBaserowConnection } from '@/utils/proxyRequest';
import { toast } from 'sonner';

const AdminJogosDiaConfig: React.FC = () => {
  const { globalConfig, loading, saveGlobalJogosDiaConfig } = useGlobalJogosDiaConfig();

  const [sourceToken, setSourceToken] = useState('');
  const [sourceBaseUrl, setSourceBaseUrl] = useState('');
  const [contentTableId, setContentTableId] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'hourly'>('daily');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (globalConfig) {
      setSourceToken(globalConfig.sourceToken || '');
      setSourceBaseUrl(globalConfig.sourceBaseUrl || '');
      setContentTableId(globalConfig.contentTableId || '');
      setIsActive(!!globalConfig.isActive);
      setFrequency((globalConfig as any).frequency || 'daily');
    }
  }, [globalConfig]);

  const isFilled = sourceToken.trim() && sourceBaseUrl.trim() && contentTableId.trim();

  const handleSave = async () => {
    if (!isFilled) {
      toast.error('Preencha token, URL e o ID da tabela Origem Jogos.');
      return;
    }
    setIsSaving(true);
    try {
      await saveGlobalJogosDiaConfig({
        sourceToken: sourceToken.trim(),
        sourceBaseUrl: sourceBaseUrl.trim().replace(/\/$/, ''),
        contentTableId: contentTableId.trim(),
        episodeTableId: '', // Não usado para jogos
        episodeMatchType: 'exact',
        episodeKeyField: '',
        episodeSearchField: '',
        isActive,
        frequency,
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
      const result = await testBaserowConnection(
        sourceBaseUrl.trim().replace(/\/$/, ''),
        sourceToken.trim(),
        contentTableId.trim()
      );
      if (!result.success) throw new Error(result.error || 'Falha na conexão');
      setTestResult('success');
      toast.success(`Conexão OK! ${result.count || 0} jogos encontrados.`);
    } catch (error) {
      setTestResult('error');
      toast.error('Erro ao conectar com a tabela de Jogos do Dia.');
    } finally {
      setIsTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Origem dos Jogos do Dia
          {globalConfig && <Badge variant="secondary">Configurado</Badge>}
        </CardTitle>
        <CardDescription>
          Defina o Baserow de origem dos Jogos do Dia.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Token da API (origem)</Label>
            <Input
              type="password"
              value={sourceToken}
              onChange={(e) => setSourceToken(e.target.value)}
              placeholder="Token do Baserow de origem"
            />
          </div>
          <div className="space-y-2">
            <Label>URL Base (origem)</Label>
            <Input
              value={sourceBaseUrl}
              onChange={(e) => setSourceBaseUrl(e.target.value)}
              placeholder="http://seu-servidor.com"
            />
          </div>
          <div className="space-y-2">
            <Label>ID da Tabela — Jogos do Dia</Label>
            <Input
              value={contentTableId}
              onChange={(e) => setContentTableId(e.target.value)}
              placeholder="Ex: 4522"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Disponibilizar Jogos do Dia aos usuários</p>
            <p className="text-xs text-muted-foreground">
              Quando desativado, a página de Jogos do Dia fica indisponível para importação.
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Frequência de Importação Automática</p>
            <p className="text-xs text-muted-foreground">
              Define o intervalo entre as atualizações automáticas dos jogos.
            </p>
          </div>
          <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Frequência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">De hora em hora</SelectItem>
              <SelectItem value="daily">Diariamente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
            <span>📅</span>
            <span>Programação da Semana & Coluna "Data"</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Você pode cadastrar jogos de <strong>Hoje</strong>, <strong>Amanhã</strong> e de <strong>toda a semana</strong> na tabela de origem.
          </p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 pl-1">
            <li><strong>Coluna reconhecida:</strong> <code className="text-emerald-400 font-mono">Data</code> (tipo <em>Date</em> no Baserow) ou <code className="text-emerald-400 font-mono">Data Horario</code>.</li>
            <li><strong>Jogos de Hoje:</strong> Liberados com botão verde para importação imediata e processados pelo robô automático.</li>
            <li><strong>Jogos de Amanhã / Próximos Dias:</strong> Ficam visíveis na grade para os usuários consultarem, mas com botão de importação bloqueado 🔒 até o dia exato da partida.</li>
            <li><strong>Separadores de Dias / Eventos:</strong> Ao criar uma linha em branco na tabela (ou apenas com a Data), o painel renderizará automaticamente uma barra divisória elegante para separar os dias.</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Configuração
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={isTesting} className="gap-2">
            {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
            Testar Conexão
          </Button>
          {testResult === 'success' && (
            <span className="flex items-center gap-1 text-sm text-emerald-500">
              <CheckCircle className="h-4 w-4" /> Conexão bem-sucedida
            </span>
          )}
          {testResult === 'error' && (
            <span className="flex items-center gap-1 text-sm text-destructive">
              <XCircle className="h-4 w-4" /> Falha na conexão
            </span>
          )}
        </div>

        {globalConfig?.updatedAt && (
          <p className="text-xs text-muted-foreground">
            Última atualização: {new Date(globalConfig.updatedAt).toLocaleString('pt-BR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminJogosDiaConfig;
