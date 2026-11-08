import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  CreditCard, Search, RefreshCw, AlertCircle, Loader2,
  Monitor, Shield, ShieldOff, Pencil, Trash2, Sparkles, Plus
} from 'lucide-react';
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

// ─── Edit Dialog ──────────────────────────────────────────────────────────────
interface EditPlanoDialogProps {
  plano: PlanoRow | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: PlanoRow) => void;
}

const EditPlanoDialog: React.FC<EditPlanoDialogProps> = ({ plano, open, onClose, onSave }) => {
  const [form, setForm] = useState<PlanoRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plano) setForm({ ...plano });
  }, [plano]);

  if (!form) return null;

  const set = (field: keyof PlanoRow, value: any) =>
    setForm(prev => prev ? { ...prev, [field]: value } : prev);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            Editar Plano
          </DialogTitle>
          <DialogDescription>Altere os campos e clique em Guardar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tag">Tag</Label>
              <Input id="tag" value={form.Tag} onChange={e => set('Tag', e.target.value)} placeholder="Ex: Mensal" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <Input id="tipo" value={form.Tipo} onChange={e => set('Tipo', e.target.value)} placeholder="Ex: Premium" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mes">Mês / Período</Label>
            <Input id="mes" value={form.Mes} onChange={e => set('Mes', e.target.value)} placeholder="Ex: 1 mês" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input id="valor" type="number" step="0.01" value={form.Valor} onChange={e => set('Valor', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="total">Total (R$)</Label>
              <Input id="total" type="number" step="0.01" value={form.Total} onChange={e => set('Total', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telas">Telas</Label>
              <Input id="telas" type="number" min="1" value={form.Telas} onChange={e => set('Telas', parseInt(e.target.value) || 1)} />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/20">
            <Switch
              id="adulto"
              checked={form.Adulto}
              onCheckedChange={val => set('Adulto', val)}
            />
            <div>
              <Label htmlFor="adulto" className="cursor-pointer">Conteúdo Adulto</Label>
              <p className="text-xs text-muted-foreground">Permite acesso a conteúdo adulto</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Create Dialog ────────────────────────────────────────────────────────────
const emptyForm = (): Omit<PlanoRow, 'id'> => ({
  Tag: '', Tipo: '', Mes: '', Valor: 0, Telas: 1, Total: 0, Adulto: false,
});

interface CreatePlanoDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: Omit<PlanoRow, 'id'>) => Promise<void>;
}

const CreatePlanoDialog: React.FC<CreatePlanoDialogProps> = ({ open, onClose, onCreate }) => {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(emptyForm()); }, [open]);

  const set = (field: keyof typeof form, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleCreate = async () => {
    setSaving(true);
    try {
      await onCreate(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Novo Plano
          </DialogTitle>
          <DialogDescription>Preencha os campos para criar um novo plano.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-tag">Tag</Label>
              <Input id="c-tag" value={form.Tag} onChange={e => set('Tag', e.target.value)} placeholder="Ex: Mensal" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-tipo">Tipo</Label>
              <Input id="c-tipo" value={form.Tipo} onChange={e => set('Tipo', e.target.value)} placeholder="Ex: Premium" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-mes">Mês / Período</Label>
            <Input id="c-mes" value={form.Mes} onChange={e => set('Mes', e.target.value)} placeholder="Ex: 1 mês" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-valor">Valor (R$)</Label>
              <Input id="c-valor" type="number" step="0.01" value={form.Valor} onChange={e => set('Valor', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-total">Total (R$)</Label>
              <Input id="c-total" type="number" step="0.01" value={form.Total} onChange={e => set('Total', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-telas">Telas</Label>
              <Input id="c-telas" type="number" min="1" value={form.Telas} onChange={e => set('Telas', parseInt(e.target.value) || 1)} />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/20">
            <Switch id="c-adulto" checked={form.Adulto} onCheckedChange={val => set('Adulto', val)} />
            <div>
              <Label htmlFor="c-adulto" className="cursor-pointer">Conteúdo Adulto</Label>
              <p className="text-xs text-muted-foreground">Permite acesso a conteúdo adulto</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving || !form.Tag}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Criar Plano
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Plan Card ────────────────────────────────────────────────────────────────
interface PlanoCardProps {
  plano: PlanoRow;
  onEdit: (plano: PlanoRow) => void;
  onDelete: (plano: PlanoRow) => void;
}

const PlanoCard: React.FC<PlanoCardProps> = ({ plano, onEdit, onDelete }) => {
  const badge = getTipoBadge(plano.Tipo);
  return (
    <Card className="modern-card border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />

      <CardContent className="p-5 space-y-4 relative">
        {/* Header */}
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

        {/* Valores */}
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

        {/* Detalhes */}
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
            onClick={() => onEdit(plano)}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(plano)}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const Planos: React.FC = () => {
  const { planosConfig, loading: configLoading } = useGlobalPlanosConfig();
  const { config } = useConfig();
  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingPlano, setEditingPlano] = useState<PlanoRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Delete state
  const [deletingPlano, setDeletingPlano] = useState<PlanoRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Create state
  const [createOpen, setCreateOpen] = useState(false);

  const tableId = config?.tableIds?.planos || planosConfig?.tableId || '';

  const getService = useCallback(async () => {
    const importConfig = await UserConfigService.getGlobalImportConfig();
    if (!importConfig) throw new Error('Configuração de acesso ao Baserow não encontrada.');
    return new BaserowService(importConfig.sourceToken, importConfig.sourceBaseUrl);
  }, []);

  const fetchPlanos = useCallback(async () => {
    if (!tableId) return;
    setIsLoading(true);
    setError(null);
    try {
      const service = await getService();
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
  }, [tableId, getService]);

  useEffect(() => {
    if (tableId) fetchPlanos();
  }, [fetchPlanos, tableId]);

  const handleEditSave = async (updated: PlanoRow) => {
    try {
      const service = await getService();
      await service.updateRow(tableId, String(updated.id), {
        Tag: updated.Tag,
        Tipo: updated.Tipo,
        Mes: updated.Mes,
        Valor: updated.Valor,
        Telas: updated.Telas,
        Total: updated.Total,
        Adulto: updated.Adulto,
      });
      setPlanos(prev => prev.map(p => p.id === updated.id ? updated : p));
      toast.success('Plano actualizado com sucesso!');
    } catch {
      toast.error('Erro ao actualizar plano.');
      throw new Error('update failed');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPlano) return;
    setDeleting(true);
    try {
      const service = await getService();
      await service.deleteRow(tableId, String(deletingPlano.id));
      setPlanos(prev => prev.filter(p => p.id !== deletingPlano.id));
      toast.success('Plano eliminado com sucesso!');
      setDeleteOpen(false);
      setDeletingPlano(null);
    } catch {
      toast.error('Erro ao eliminar plano.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async (data: Omit<PlanoRow, 'id'>) => {
    try {
      const service = await getService();
      const created = await service.createRow(tableId, data);
      const newRow: PlanoRow = {
        id: created.id,
        Tag: created.Tag || data.Tag,
        Tipo: created.Tipo || data.Tipo,
        Mes: created.Mes || data.Mes,
        Valor: Number(created.Valor ?? data.Valor),
        Telas: Number(created.Telas ?? data.Telas),
        Total: Number(created.Total ?? data.Total),
        Adulto: Boolean(created.Adulto ?? data.Adulto),
      };
      setPlanos(prev => [newRow, ...prev]);
      toast.success('Plano criado com sucesso!');
    } catch {
      toast.error('Erro ao criar plano.');
      throw new Error('create failed');
    }
  };

  const openEdit = (plano: PlanoRow) => { setEditingPlano(plano); setEditOpen(true); };
  const openDelete = (plano: PlanoRow) => { setDeletingPlano(plano); setDeleteOpen(true); };

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
        <div className="ml-auto flex items-center gap-2">
          {tableId && (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Plano
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPlanos}
            disabled={isLoading || !tableId}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

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

          {/* Content */}
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
                <PlanoCard key={plano.id} plano={plano} onEdit={openEdit} onDelete={openDelete} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <CreatePlanoDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      {/* Edit Dialog */}
      <EditPlanoDialog
        plano={editingPlano}
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditingPlano(null); }}
        onSave={handleEditSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" />
              Eliminar Plano
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que quer eliminar o plano{' '}
              <strong>"{deletingPlano?.Tag || deletingPlano?.Tipo}"</strong>?
              Esta acção não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Planos;
