import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Search, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useGlobalPlanosConfig } from '@/hooks/useGlobalPlanosConfig';
import { useConfig } from '@/contexts/ConfigContext';
import { UserConfigService } from '@/services/UserConfigService';
import { BaserowService } from '@/services/BaserowService';
import { toast } from 'sonner';

interface PlanoRow {
  id: number;
  Tag: string;
  Tipo: string;
  Mes: string;
  Valor: number;
  Telas: number;
  Total: number;
  Adulto: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

const Planos: React.FC = () => {
  const { planosConfig, loading: configLoading } = useGlobalPlanosConfig();
  const { config } = useConfig();
  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Usar o tableId do utilizador primeiro, depois o global do admin
  const tableId = config?.tableIds?.planos || planosConfig?.tableId || '';

  const fetchPlanos = useCallback(async () => {
    if (!tableId) return;
    setIsLoading(true);
    setError(null);
    try {
      const importConfig = await UserConfigService.getGlobalImportConfig();
      if (!importConfig) {
        setError('Configuração de acesso ao Baserow não encontrada. Contacte o administrador.');
        return;
      }
      const service = new BaserowService(importConfig.sourceToken, importConfig.sourceBaseUrl);
      const response = await service.getAllTableData(tableId);
      const rows = ((response as { results: any[]; count: number }).results || []).map((row: any) => ({
        id: row.id,
        Tag: row.Tag || '',
        Tipo: row.Tipo || '',
        Mes: row.Mes || '',
        Valor: Number(row.Valor) || 0,
        Telas: Number(row.Telas) || 0,
        Total: Number(row.Total) || 0,
        Adulto: Boolean(row.Adulto),
      }));
      setPlanos(rows);
    } catch (err) {
      setError('Erro ao carregar planos. Tente novamente.');
      toast.error('Erro ao carregar planos do Baserow.');
    } finally {
      setIsLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    if (tableId) {
      fetchPlanos();
    }
  }, [fetchPlanos, tableId]);

  const filtered = planos.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.Tag.toLowerCase().includes(q) ||
      p.Tipo.toLowerCase().includes(q) ||
      p.Mes.toLowerCase().includes(q)
    );
  });

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planos</h1>
          <p className="text-sm text-muted-foreground">Tabela de planos disponíveis</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPlanos}
          disabled={isLoading || !tableId}
          className="ml-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Sem configuração */}
      {!tableId ? (
        <Card className="modern-card border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-semibold text-lg">Tabela não configurada</p>
              <p className="text-muted-foreground text-sm mt-1">
                O administrador ainda não configurou a tabela de planos.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="modern-card border-border/40">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Lista de Planos
              {!isLoading && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {filtered.length} {filtered.length === 1 ? 'plano' : 'planos'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Dados carregados em tempo real do Baserow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por Tag, Tipo ou Mês..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Loading */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">Carregando planos...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">Nenhum plano encontrado</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {search ? 'Tente outra busca.' : 'A tabela está vazia.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/40">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 bg-muted/20">
                      <TableHead className="font-semibold text-foreground">Tag</TableHead>
                      <TableHead className="font-semibold text-foreground">Tipo</TableHead>
                      <TableHead className="font-semibold text-foreground">Mês</TableHead>
                      <TableHead className="font-semibold text-foreground text-right">Valor</TableHead>
                      <TableHead className="font-semibold text-foreground text-center">Telas</TableHead>
                      <TableHead className="font-semibold text-foreground text-right">Total</TableHead>
                      <TableHead className="font-semibold text-foreground text-center">Adulto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((plano) => (
                      <TableRow key={plano.id} className="border-border/40 hover:bg-muted/10 transition-colors">
                        <TableCell className="font-medium text-foreground">
                          {plano.Tag || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {plano.Tipo || <span className="italic">—</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {plano.Mes || <span className="italic">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground">
                          {formatCurrency(plano.Valor)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono text-xs">
                            {plano.Telas}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground font-semibold">
                          {formatCurrency(plano.Total)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={plano.Adulto
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : 'bg-green-500/10 text-green-500 border-green-500/20'
                            }
                            variant="outline"
                          >
                            {plano.Adulto ? 'Sim' : 'Não'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Planos;
