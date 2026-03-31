import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Copy, RefreshCw, Trash2, Plus, Search, Link2, Clock, Loader2 } from 'lucide-react';

interface ProtectedChannel {
  id: string;
  channel_name: string;
  original_url: string;
  token: string;
  protected_url: string;
  expires_at: string;
  created_at: string;
}

const AdminProtectedChannels: React.FC = () => {
  const [channels, setChannels] = useState<ProtectedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ProtectedChannel | null>(null);
  const [generating, setGenerating] = useState(false);

  // Form states
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newDays, setNewDays] = useState('30');
  const [renewDays, setRenewDays] = useState('30');

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('protected_channels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChannels(data || []);
    } catch (err) {
      toast.error('Erro ao carregar canais protegidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const generateProtectedLink = async (url: string, channelName: string, days: number) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-protected-link', {
        body: { url, channelName, expiresInDays: days },
      });

      if (error) throw error;

      toast.success('Link protegido gerado!', {
        description: `Canal "${channelName}" protegido por ${days} dias`,
      });

      await fetchChannels();
      return data;
    } catch (err) {
      toast.error('Erro ao gerar link protegido', { description: String(err) });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!newUrl || !newName) {
      toast.error('Preencha todos os campos');
      return;
    }
    await generateProtectedLink(newUrl, newName, parseInt(newDays));
    setShowCreateDialog(false);
    setNewUrl('');
    setNewName('');
    setNewDays('30');
  };

  const handleRenew = async () => {
    if (!selectedChannel) return;
    // Delete old entry, create new one with same URL/name
    try {
      await (supabase as any).from('protected_channels').delete().eq('id', selectedChannel.id);
      await generateProtectedLink(selectedChannel.original_url, selectedChannel.channel_name, parseInt(renewDays));
      setShowRenewDialog(false);
      setSelectedChannel(null);
    } catch (err) {
      toast.error('Erro ao renovar link');
    }
  };

  const handleDelete = async () => {
    if (!selectedChannel) return;
    try {
      const { error } = await supabase
        .from('protected_channels')
        .delete()
        .eq('id', selectedChannel.id) as any;

      if (error) throw error;

      toast.success('Canal removido');
      setShowDeleteDialog(false);
      setSelectedChannel(null);
      await fetchChannels();
    } catch (err) {
      toast.error('Erro ao remover canal');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('URL copiada!');
  };

  // Filter & paginate
  const filtered = channels.filter((ch) => {
    const matchSearch =
      ch.channel_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ch.original_url.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'active') return matchSearch && !isExpired(ch.expires_at);
    if (statusFilter === 'expired') return matchSearch && isExpired(ch.expires_at);
    return matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Canais TV Protegidos
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Gerencie links protegidos com tokens JWT para canais de TV
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Gerar Link Protegido
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou URL..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando...</span>
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum canal protegido encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead>Canal</TableHead>
                  <TableHead>URL Original</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((ch) => {
                  const expired = isExpired(ch.expires_at);
                  return (
                    <TableRow key={ch.id} className="border-border/40">
                      <TableCell className="font-medium text-foreground">
                        {ch.channel_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {ch.original_url}
                      </TableCell>
                      <TableCell>
                        <Badge variant={expired ? 'destructive' : 'default'}
                          className={expired ? '' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}>
                          {expired ? 'Expirado' : 'Ativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(ch.expires_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(ch.protected_url)}
                            title="Copiar URL protegida">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            setSelectedChannel(ch);
                            setShowRenewDialog(true);
                          }} title="Renovar">
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedChannel(ch);
                              setShowDeleteDialog(true);
                            }} title="Remover">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                {filtered.length} canal(is) • Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
                <Button size="sm" variant="outline" disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}>Próximo</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Gerar Link Protegido
            </DialogTitle>
            <DialogDescription>
              Cole a URL original do canal e defina o tempo de expiração
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Canal</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: ESPN HD" />
            </div>
            <div>
              <Label>URL Original</Label>
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..." />
            </div>
            <div>
              <Label>Expiração (dias)</Label>
              <Select value={newDays} onValueChange={setNewDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="180">180 dias</SelectItem>
                  <SelectItem value="365">365 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
              Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Renovar Expiração
            </DialogTitle>
            <DialogDescription>
              Gerar novo token para "{selectedChannel?.channel_name}" com nova data de expiração
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Nova expiração (dias a partir de agora)</Label>
            <Select value={renewDays} onValueChange={setRenewDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="180">180 dias</SelectItem>
                <SelectItem value="365">365 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewDialog(false)}>Cancelar</Button>
            <Button onClick={handleRenew} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Renovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirmar Remoção</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o link protegido de "{selectedChannel?.channel_name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProtectedChannels;
