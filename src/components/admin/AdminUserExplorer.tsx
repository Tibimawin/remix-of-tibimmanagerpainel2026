import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FirebaseUser, FirebaseUserService } from '@/services/FirebaseUserService';
import {
  Search, Users, Smartphone, Shield, CheckCircle2, XCircle, Clock,
  Copy, Check, UserPlus, RefreshCw, Calendar, MoreVertical, Edit3,
  ExternalLink, Sparkles, Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminUserExplorerProps {
  users: FirebaseUser[];
  onRefresh: () => Promise<void> | void;
  isRefreshing?: boolean;
  onNavigateToCreate?: () => void;
  onNavigateToAdvanced?: () => void;
}

export const AdminUserExplorer: React.FC<AdminUserExplorerProps> = ({
  users,
  onRefresh,
  isRefreshing = false,
  onNavigateToCreate,
  onNavigateToAdvanced,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'device'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<FirebaseUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    accessDays: 30,
    isActive: true,
  });

  const now = Date.now();

  const handleCopy = (text: string, id: string, label = 'Copiado!') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(label);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openEditModal = (user: FirebaseUser) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      accessDays: user.accessDays || 30,
      isActive: user.isActive ?? true,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setIsUpdating(true);
    try {
      await FirebaseUserService.updateUser(selectedUser.uid, {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        accessDays: Number(editFormData.accessDays) || 30,
        isActive: editFormData.isActive,
      });
      toast.success(`Usuário ${editFormData.name} atualizado com sucesso!`);
      setIsEditDialogOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao atualizar usuário:', err);
      toast.error('Erro ao salvar alterações do usuário.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickAddDays = async (user: FirebaseUser, extraDays = 30) => {
    try {
      const currentExpiry = user.expiryDate ? new Date(user.expiryDate) : new Date();
      const baseDate = currentExpiry.getTime() > now ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate.getTime() + extraDays * 24 * 60 * 60 * 1000);

      await FirebaseUserService.updateUser(user.uid, {
        expiryDate: newExpiry.toISOString(),
        accessDays: (user.accessDays || 0) + extraDays,
        isActive: true,
      });

      toast.success(`+${extraDays} dias adicionados para ${user.name || user.email}!`);
      onRefresh();
    } catch (err) {
      console.error('Erro ao estender dias:', err);
      toast.error('Não foi possível adicionar dias.');
    }
  };

  const handleToggleActive = async (user: FirebaseUser) => {
    try {
      const newStatus = !user.isActive;
      await FirebaseUserService.updateUser(user.uid, { isActive: newStatus });
      toast.success(newStatus ? `Usuário ativado!` : `Usuário desativado.`);
      onRefresh();
    } catch (err) {
      console.error('Erro ao alternar status:', err);
      toast.error('Erro ao alterar status do usuário.');
    }
  };

  // Helper to extract device info safely
  const getDeviceInfo = (user: FirebaseUser) => {
    if (!user.deviceInfo) return null;
    return {
      imei: user.deviceInfo.imei || null,
      dispositivo: user.deviceInfo.dispositivo || 'Dispositivo Desconhecido',
      ip: user.deviceInfo.ip || null,
      lastActivity: user.deviceInfo.lastActivity || null,
    };
  };

  // Calculate days remaining
  const calculateDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate) return 0;
    try {
      const expTime = new Date(expiryDate).getTime();
      return Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();

    return users.filter(user => {
      // Status filter
      if (statusFilter === 'active' && !user.isActive) return false;
      if (statusFilter === 'expired' && user.isActive) return false;
      if (statusFilter === 'device' && !user.deviceInfo?.imei) return false;

      // Text search
      if (!q) return true;
      const nameMatch = user.name?.toLowerCase().includes(q);
      const emailMatch = user.email?.toLowerCase().includes(q);
      const uidMatch = user.uid?.toLowerCase().includes(q);
      const imeiMatch = user.deviceInfo?.imei?.toLowerCase().includes(q);
      const deviceMatch = user.deviceInfo?.dispositivo?.toLowerCase().includes(q);
      const ipMatch = user.deviceInfo?.ip?.toLowerCase().includes(q);

      return Boolean(nameMatch || emailMatch || uidMatch || imeiMatch || deviceMatch || ipMatch);
    });
  }, [users, search, statusFilter]);

  const counts = useMemo(() => {
    const active = users.filter(u => u.isActive).length;
    const expired = users.length - active;
    const withDevice = users.filter(u => u.deviceInfo?.imei).length;
    return { total: users.length, active, expired, withDevice };
  }, [users]);

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Card */}
      <Card className="bg-card/40 border border-purple-500/15 backdrop-blur-md shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Base de Usuários & Aparelhos</span>
                <span className="text-xs font-mono text-muted-foreground ml-2 font-normal">
                  ({counts.total} clientes no banco)
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Consulte, gerencie acessos, estenda planos e rastreie os dispositivos e IMEIs conectados
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onNavigateToCreate && (
                <Button
                  size="sm"
                  onClick={onNavigateToCreate}
                  className="h-8 text-xs bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-medium shadow-sm shadow-purple-500/20"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  Cadastrar Cliente
                </Button>
              )}

              {onNavigateToAdvanced && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onNavigateToAdvanced}
                  className="h-8 text-xs border-purple-500/25 bg-background/50 hover:bg-purple-500/10 hover:text-purple-300"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                  Gestão Avançada / Massa
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => onRefresh()}
                disabled={isRefreshing}
                className="h-8 text-xs border-purple-500/25 bg-background/50 hover:bg-purple-500/10 hover:text-purple-300"
                title="Recarregar lista"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Search Bar & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/30 mt-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por nome, email, UID, IMEI, IP ou aparelho..."
                className="pl-9 h-9 text-xs bg-background/50 border-purple-500/20 focus-visible:ring-purple-500/30"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2 text-xs text-muted-foreground hover:text-foreground p-0.5"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
              {[
                { id: 'all', label: 'Todos', count: counts.total },
                { id: 'active', label: 'Ativos', count: counts.active, color: 'text-emerald-400' },
                { id: 'expired', label: 'Expirados', count: counts.expired, color: 'text-rose-400' },
                { id: 'device', label: 'Com IMEI', count: counts.withDevice, color: 'text-fuchsia-400' },
              ].map((tab) => {
                const isSelected = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`ml-1.5 text-[10px] font-bold tabular-nums ${tab.color || 'text-muted-foreground'}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>

        {/* Users Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent bg-muted/20 text-xs">
                  <TableHead className="text-muted-foreground font-semibold pl-4 sm:pl-6">Cliente</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Status & Validade</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Dispositivo / IMEI</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Total Logins</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right pr-4 sm:pr-6">Ações Rápidas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="w-10 h-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-foreground">Nenhum cliente encontrado</p>
                        <p className="text-xs text-muted-foreground">
                          {search ? `Nenhum resultado para "${search}".` : 'Nenhum usuário cadastrado com esse filtro.'}
                        </p>
                        {search && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSearch('')}
                            className="mt-2 text-xs border-purple-500/30"
                          >
                            Limpar Busca
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const daysRemaining = calculateDaysRemaining(user.expiryDate);
                    const isExpiringSoon = user.isActive && daysRemaining <= 7 && daysRemaining > 0;
                    const isExpired = !user.isActive || daysRemaining <= 0;
                    const dev = getDeviceInfo(user);

                    return (
                      <TableRow
                        key={user.uid}
                        className="border-border/30 hover:bg-muted/10 transition-colors group"
                      >
                        {/* Column 1: Client details */}
                        <TableCell className="pl-4 sm:pl-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-xs shrink-0">
                              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 max-w-[200px] sm:max-w-[240px]">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {user.name || 'Sem Nome'}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(user.email, `email-${user.uid}`, 'Email copiado!')}
                                  className="text-muted-foreground/60 hover:text-purple-300 transition-colors p-0.5 shrink-0"
                                  title="Copiar email"
                                >
                                  {copiedId === `email-${user.uid}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground/60 truncate block mt-0.5">
                                UID: {user.uid.slice(0, 10)}...
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Column 2: Status & Validity */}
                        <TableCell className="py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {user.isActive ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-2 py-0"
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-mono border-rose-500/30 text-rose-400 bg-rose-500/10 px-2 py-0"
                                >
                                  <XCircle className="w-2.5 h-2.5 mr-1" />
                                  Expirado
                                </Badge>
                              )}

                              <span
                                className={`text-xs font-mono tabular-nums font-semibold ${
                                  isExpired
                                    ? 'text-rose-400'
                                    : isExpiringSoon
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {daysRemaining > 0
                                  ? `${daysRemaining}d restantes`
                                  : `Vencido há ${Math.abs(daysRemaining)}d`}
                              </span>
                            </div>

                            <p className="text-[11px] text-muted-foreground font-mono">
                              Vence:{' '}
                              {user.expiryDate
                                ? new Date(user.expiryDate).toLocaleDateString('pt-BR')
                                : 'Não definida'}
                            </p>
                          </div>
                        </TableCell>

                        {/* Column 3: Device / Hardware */}
                        <TableCell className="py-3 text-xs">
                          {dev ? (
                            <div className="space-y-1 max-w-[200px]">
                              <div className="flex items-center gap-1.5 text-foreground font-medium truncate">
                                <Smartphone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                <span className="truncate">{dev.dispositivo}</span>
                              </div>
                              {dev.imei && (
                                <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                                  <span>IMEI: {dev.imei.slice(0, 12)}...</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(dev.imei!, `imei-${user.uid}`, 'IMEI copiado!')}
                                    className="hover:text-purple-300 p-0.5 shrink-0"
                                    title="Copiar IMEI completo"
                                  >
                                    {copiedId === `imei-${user.uid}` ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              )}
                              {dev.ip && (
                                <p className="text-[10px] font-mono text-muted-foreground/60">
                                  IP: {dev.ip}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs italic">Nenhum aparelho</span>
                          )}
                        </TableCell>

                        {/* Column 4: Logins */}
                        <TableCell className="py-3">
                          <span className="font-mono tabular-nums text-xs px-2 py-0.5 rounded bg-muted/30 border border-border/30 text-foreground">
                            {user.totalLogins || 0} logins
                          </span>
                        </TableCell>

                        {/* Column 5: Actions */}
                        <TableCell className="py-3 text-right pr-4 sm:pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick +30 Days Button */}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickAddDays(user, 30)}
                              className="h-7 text-[11px] font-mono px-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
                              title="Adicionar 30 dias de acesso imediatamente"
                            >
                              +30d
                            </Button>

                            {/* Edit Modal Button */}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(user)}
                              className="h-7 text-[11px] px-2 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200"
                              title="Editar usuário e plano"
                            >
                              <Edit3 className="w-3 h-3 mr-1" />
                              Editar
                            </Button>

                            {/* Toggle Active Button */}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleActive(user)}
                              className={`h-7 text-[11px] px-2 transition-colors ${
                                user.isActive
                                  ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                                  : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                              title={user.isActive ? 'Desativar acesso' : 'Ativar acesso'}
                            >
                              {user.isActive ? 'Bloquear' : 'Ativar'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer with summary */}
          <div className="py-3 px-4 sm:px-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground font-mono gap-2">
            <div>
              Exibindo <strong className="text-foreground tabular-nums">{filteredUsers.length}</strong> de{' '}
              <strong className="text-foreground tabular-nums">{users.length}</strong> clientes
            </div>
            <div className="flex items-center gap-3">
              <span>● {counts.active} ativos</span>
              <span>● {counts.withDevice} com aparelho</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-card/95 border-purple-500/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-purple-400" />
              Editar Acesso do Cliente
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ajuste nome, email, dias de validade e status da conta do assinante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs">Nome Completo</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="h-8 text-xs bg-background/50 border-purple-500/20"
                placeholder="Nome do cliente"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-email" className="text-xs">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="h-8 text-xs bg-background/50 border-purple-500/20"
                placeholder="cliente@email.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-days" className="text-xs">Dias de Acesso Cadastrados</Label>
              <Input
                id="edit-days"
                type="number"
                min={1}
                value={editFormData.accessDays}
                onChange={(e) => setEditFormData({ ...editFormData, accessDays: Number(e.target.value) })}
                className="h-8 text-xs bg-background/50 border-purple-500/20 font-mono tabular-nums"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <span className="text-xs text-foreground font-medium">Status da Assinatura</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditFormData({ ...editFormData, isActive: !editFormData.isActive })}
                className={`h-7 text-xs ${
                  editFormData.isActive
                    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                    : 'border-rose-500/40 text-rose-400 bg-rose-500/10'
                }`}
              >
                {editFormData.isActive ? 'Conta Ativa' : 'Conta Suspensa'}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/30">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isUpdating}
              className="text-xs border-border/40"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEdit}
              disabled={isUpdating}
              className="text-xs bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-medium"
            >
              {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
