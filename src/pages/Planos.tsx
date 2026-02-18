import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Search, RefreshCw, AlertCircle, Loader2, Monitor, Tv, Shield, ShieldOff, Pencil, Trash2, Sparkles } from 'lucide-react';
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

const getTipoBadge = (tipo: string) => {
  const t = (tipo || '').toLowerCase();
  if (t.includes('premium')) return { label: tipo, className: 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400' };
  if (t.includes('básico') || t.includes('basico') || t.includes('basic')) return { label: tipo, className: 'bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400' };
  if (t.includes('família') || t.includes('familia') || t.includes('family')) return { label: tipo, className: 'bg-violet-500/10 text-violet-600 border-violet-500/25 dark:text-violet-400' };
  if (t.includes('vip') || t.includes('gold')) return { label: tipo, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/25 dark:text-yellow-400' };
  return { label: tipo, className: 'bg-primary/10 text-primary border-primary/20' };
};

const PlanoCard: React.FC<{ plano: PlanoRow }> = ({ plano }) => {
  const badge = getTipoBadge(plano.Tipo);
  return (
    <Card className="modern-card border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group relative overflow-hidden">
      {/* Gradiente decorativo */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />

      <CardContent className="p-5 space-y-4 relative">
        {/* Header: Tag + NOVO + Tipo */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground text-base leading-tight">
              {plano.Tag || <span className="text-muted-foreground italic text-sm">Sem tag</span>}
            </span>
            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] px-1.5 py-0 animate-pulse" variant="outline">
              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
              NOVO
            </Badge>
          </div>
          {plano.Tipo && (
            <Badge variant="outline" className={`text-xs shrink-0 ${badge.className}`}>
              {badge.label}
            </Badge>
          )}
        </div>

        {/* Valores principais */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Valor</p>
            <p className="text-xl font-bold text-primary leading-none">{formatCurrency(plano.Valor)}</p>
          </div>
          <div className="bg-primary/8 rounded-xl p-3 text-center border border-primary/15">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total</p>
            <p className="text-xl font-bold text-foreground leading-none">{formatCurrency(plano.Total)}</p>
          </div>
        </div>

        {/* Detalhes: Mês, Telas, Adulto */}
        <div className="flex items-center gap-2 flex-wrap">
          {plano.Mes && (
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg px-2.5 py-1">
              <CreditCard className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{plano.Mes}</span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg px-2.5 py-1">
            <Monitor className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{plano.Telas} {plano.Telas === 1 ? 'tela' : 'telas'}</span>
          </div>
          <div className={`flex items-center gap-1 rounded-lg px-2.5 py-1 ${plano.Adulto ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
            {plano.Adulto
              ? <ShieldOff className="w-3 h-3 text-destructive" />
              : <Shield className="w-3 h-3 text-green-500" />
            }
            <span className={`text-xs font-medium ${plano.Adulto ? 'text-destructive' : 'text-green-500'}`}>
              {plano.Adulto ? 'Adulto' : 'Familiar'}
            </span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-1 border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => toast.info('Edição disponível em breve.')}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => toast.info('Remoção disponível em breve.')}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Planos: React.FC = () => {
  const { planosConfig, loading: configLoading } = useGlobalPlanosConfig();
  const { config } = useConfig();
  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    if (tableId) fetchPlanos();
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Planos</h1>
            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] animate-pulse" variant="outline">
              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
              NOVO
            </Badge>
          </div>
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
                Configure o ID da tabela de planos nas <strong>Configurações</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Search + count */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por Tag, Tipo ou Mês..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {!isLoading && (
              <Badge variant="outline" className="text-xs shrink-0">
                {filtered.length} {filtered.length === 1 ? 'plano' : 'planos'}
              </Badge>
            )}
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
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Carregando planos...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">Nenhum plano encontrado</p>
              <p className="text-muted-foreground text-sm mt-1">
                {search ? 'Tente outra busca.' : 'A tabela está vazia.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((plano) => (
                <PlanoCard key={plano.id} plano={plano} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Planos;
