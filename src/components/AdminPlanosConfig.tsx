import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Save, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useGlobalPlanosConfig } from '@/hooks/useGlobalPlanosConfig';
import { UserConfigService } from '@/services/UserConfigService';
import { BaserowService } from '@/services/BaserowService';
import { toast } from 'sonner';

const AdminPlanosConfig: React.FC = () => {
  const { planosConfig, loading, savePlanosConfig } = useGlobalPlanosConfig();
  const [tableId, setTableId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (planosConfig?.tableId) {
      setTableId(planosConfig.tableId);
    }
  }, [planosConfig]);

  const handleSave = async () => {
    if (!tableId.trim()) {
      toast.error('Informe o ID da tabela de planos.');
      return;
    }
    setIsSaving(true);
    try {
      await savePlanosConfig(tableId.trim());
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!tableId.trim()) {
      toast.error('Informe o ID da tabela antes de testar.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const importConfig = await UserConfigService.getGlobalImportConfig();
      if (!importConfig) {
        toast.error('Configuração de origem não encontrada. Configure em "Config. Importação" primeiro.');
        setTestResult('error');
        return;
      }
      const service = new BaserowService(importConfig.sourceToken, importConfig.sourceBaseUrl);
      await service.getTableData(tableId.trim(), 1, 1);
      setTestResult('success');
      toast.success('Conexão com a tabela de planos bem-sucedida!');
    } catch (error) {
      setTestResult('error');
      toast.error('Erro ao conectar com a tabela. Verifique o ID e tente novamente.');
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
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Configurar Tabela de Planos</h2>
          <p className="text-sm text-muted-foreground">Configure o ID da tabela do Baserow que contém os planos disponíveis</p>
        </div>
        <Badge className="ml-auto bg-primary/10 text-primary border-primary/20">
          Configuração Global
        </Badge>
      </div>

      <Card className="modern-card border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Tabela de Planos no Baserow
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            O token e URL de acesso ao Baserow serão os mesmos da configuração de importação global.
            Apenas o ID da tabela é específico para planos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tableId" className="text-foreground font-medium">
              ID da Tabela de Planos
            </Label>
            <Input
              id="tableId"
              value={tableId}
              onChange={(e) => {
                setTableId(e.target.value);
                setTestResult(null);
              }}
              placeholder="Ex: 123456"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Encontre este ID na URL da tabela no Baserow: .../table/<strong>ID</strong>/...
            </p>
          </div>

          {/* Estrutura esperada */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/40 space-y-2">
            <p className="text-sm font-semibold text-foreground">Colunas esperadas na tabela:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Tag', type: 'texto' },
                { name: 'Tipo', type: 'texto' },
                { name: 'Mes', type: 'texto' },
                { name: 'Valor', type: 'número' },
                { name: 'Telas', type: 'número' },
                { name: 'Total', type: 'número' },
                { name: 'Adulto', type: 'boolean' },
              ].map((col) => (
                <Badge key={col.name} variant="outline" className="text-xs">
                  <span className="font-semibold">{col.name}</span>
                  <span className="ml-1 text-muted-foreground">({col.type})</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Resultado do teste */}
          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${
              testResult === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-500'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}>
              {testResult === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {testResult === 'success' ? 'Tabela acessível com sucesso!' : 'Erro ao acessar a tabela.'}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !tableId.trim()}
              className="flex-1"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              Testar Conexão
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !tableId.trim()}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>

          {planosConfig?.updatedAt && (
            <p className="text-xs text-muted-foreground text-center">
              Última atualização: {new Date(planosConfig.updatedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPlanosConfig;
