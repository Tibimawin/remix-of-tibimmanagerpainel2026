import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Users, Coins, DollarSign, Activity, Plus, Minus, Search, RefreshCw,
  Save, ShieldCheck, CheckCircle2, Clock, Sparkles, AlertCircle, Phone, QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import {
  MasterCreditService,
  ResellerWholesaleConfig,
  ResellerWholesalePackage,
  MasterCreditTxDoc,
  DEFAULT_WHOLESALE_CONFIG
} from '@/services/MasterCreditService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

const fmtCurrency = (val?: number) =>
  typeof val === 'number'
    ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00';

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const AdminRevendas: React.FC = () => {
  const { adminUser } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'masters' | 'compras' | 'revendas' | 'precos'>('masters');

  // Overview metrics & masters
  const [overview, setOverview] = useState<{
    totalMasters: number;
    totalResellers: number;
    totalMasterCredits: number;
    totalResellerCredits: number;
    totalLinesCreated: number;
    totalWholesaleRevenue: number;
    mastersList: Array<{
      uid: string;
      email: string;
      name: string;
      resellerCreditBalance: number;
      resellerCount: number;
      linesCount: number;
      planName?: string;
    }>;
  }>({
    totalMasters: 0,
    totalResellers: 0,
    totalMasterCredits: 0,
    totalResellerCredits: 0,
    totalLinesCreated: 0,
    totalWholesaleRevenue: 0,
    mastersList: []
  });

  // Transactions
  const [transactions, setTransactions] = useState<MasterCreditTxDoc[]>([]);

  // Wholesale pricing configuration
  const [wholesaleConfig, setWholesaleConfig] = useState<ResellerWholesaleConfig>(DEFAULT_WHOLESALE_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);

  // Search filters
  const [searchMaster, setSearchMaster] = useState('');
  const [searchTx, setSearchTx] = useState('');

  // Manual Credit Adjustment Dialog
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, txs, cfg] = await Promise.all([
        MasterCreditService.getAdminResellerOverview(),
        MasterCreditService.getAllMasterTransactions(),
        MasterCreditService.getWholesaleConfig()
      ]);
      setOverview(ov);
      setTransactions(txs);
      setWholesaleConfig(cfg);
    } catch (e: any) {
      toast.error('Erro ao carregar dados de revendas: ' + (e?.message || ''));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSaveWholesaleConfig = async () => {
    setSavingConfig(true);
    try {
      await MasterCreditService.saveWholesaleConfig(wholesaleConfig);
      toast.success('Configurações de preços e pacotes de atacado salvas!');
    } catch (e: any) {
      toast.error('Erro ao salvar configurações: ' + (e?.message || ''));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleOpenAdjustDialog = (master: any) => {
    setSelectedMaster(master);
    setAdjustAmount(10);
    setAdjustType('add');
    setAdjustReason('');
    setAdjustDialogOpen(true);
  };

  const handleConfirmAdjust = async () => {
    if (!selectedMaster) return;
    const delta = adjustType === 'add' ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);
    if (delta === 0) {
      toast.error('Informe uma quantidade válida de créditos.');
      return;
    }
    setAdjusting(true);
    try {
      const newBal = await MasterCreditService.adminAdjustMasterCredits(
        selectedMaster.uid,
        delta,
        adjustReason || `Ajuste manual pelo Admin (${delta > 0 ? '+' : ''}${delta} créditos)`,
        adminUser?.email || 'admin'
      );
      toast.success(`Créditos atualizados com sucesso! Novo saldo: ${newBal}`);
      setAdjustDialogOpen(false);
      loadData();
    } catch (e: any) {
      toast.error('Erro ao ajustar créditos: ' + (e?.message || ''));
    } finally {
      setAdjusting(false);
    }
  };

  // Pacotes management
  const updatePackage = (index: number, field: keyof ResellerWholesalePackage, value: any) => {
    const list = [...wholesaleConfig.packages];
    list[index] = { ...list[index], [field]: value };
    setWholesaleConfig({ ...wholesaleConfig, packages: list });
  };

  const addPackage = () => {
    const nextCredits = 150;
    const nextPrice = 220;
    setWholesaleConfig({
      ...wholesaleConfig,
      packages: [
        ...wholesaleConfig.packages,
        { credits: nextCredits, price: nextPrice, label: `Pacote ${nextCredits} Créditos`, popular: false }
      ]
    });
  };

  const removePackage = (index: number) => {
    if (wholesaleConfig.packages.length <= 1) {
      toast.error('Mantenha pelo menos um pacote cadastrado.');
      return;
    }
    const list = wholesaleConfig.packages.filter((_, i) => i !== index);
    setWholesaleConfig({ ...wholesaleConfig, packages: list });
  };

  // Filtered lists
  const filteredMasters = overview.mastersList.filter(m => {
    const q = searchMaster.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const filteredTransactions = transactions.filter(t => {
    const q = searchTx.toLowerCase();
    return (
      (t.masterEmail || '').toLowerCase().includes(q) ||
      (t.masterName || '').toLowerCase().includes(q) ||
      (t.descricao || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Gestão de Revendas & Atacado de Créditos
          </h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe métricas de revendas, monitore compras de créditos e gerencie a tabela de preços de atacado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="modern-card border-border/40">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Revendedores Totais</p>
            <p className="text-2xl font-bold text-foreground">{overview.totalResellers}</p>
            <p className="text-[11px] text-muted-foreground">Cadastrados via indicação</p>
          </CardContent>
        </Card>

        <Card className="modern-card border-border/40">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Masters do Painel</p>
            <p className="text-2xl font-bold text-primary">{overview.totalMasters}</p>
            <p className="text-[11px] text-muted-foreground">Usuários com revendas/créditos</p>
          </CardContent>
        </Card>

        <Card className="modern-card border-border/40">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Estoque dos Masters</p>
            <p className="text-2xl font-bold text-amber-500">{overview.totalMasterCredits}</p>
            <p className="text-[11px] text-muted-foreground">Créditos disponíveis para repasse</p>
          </CardContent>
        </Card>

        <Card className="modern-card border-border/40">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Linhas Criadas</p>
            <p className="text-2xl font-bold text-emerald-500">{overview.totalLinesCreated}</p>
            <p className="text-[11px] text-muted-foreground">Clientes finais ativos/testes</p>
          </CardContent>
        </Card>

        <Card className="modern-card border-border/40 col-span-2 lg:col-span-1">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Faturamento Atacado</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {fmtCurrency(overview.totalWholesaleRevenue)}
            </p>
            <p className="text-[11px] text-muted-foreground">Venda direta Admin → Masters</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-xl">
          <TabsTrigger value="masters" className="gap-1.5">
            <Users className="w-4 h-4" />
            Masters & Estoque
          </TabsTrigger>
          <TabsTrigger value="compras" className="gap-1.5">
            <Coins className="w-4 h-4" />
            Compras de Créditos
          </TabsTrigger>
          <TabsTrigger value="precos" className="gap-1.5">
            <DollarSign className="w-4 h-4" />
            Preços de Atacado
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Masters & Estoque */}
        <TabsContent value="masters" className="space-y-4">
          <Card className="modern-card border-border/40">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Usuários Masters (Indicadores)</CardTitle>
                <CardDescription>
                  Usuários do painel que possuem revendedores indicados e saldo de estoque de créditos.
                </CardDescription>
              </div>
              <div className="w-full sm:w-64">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar master por nome ou email..."
                    value={searchMaster}
                    onChange={e => setSearchMaster(e.target.value)}
                    className="pl-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Master (Usuário)</TableHead>
                      <TableHead>Plano Atual</TableHead>
                      <TableHead className="text-center">Revendas</TableHead>
                      <TableHead className="text-center">Linhas Criadas</TableHead>
                      <TableHead className="text-center">Estoque de Créditos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMasters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                          Nenhum master encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMasters.map(m => (
                        <TableRow key={m.uid}>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-foreground text-sm">{m.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{m.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                              {m.planName || 'Sem plano'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-foreground">{m.resellerCount}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-foreground">{m.linesCount}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold gap-1">
                              <Coins className="w-3 h-3" />
                              {m.resellerCreditBalance} créditos
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAdjustDialog(m)}
                              className="text-xs gap-1.5"
                            >
                              <Coins className="w-3.5 h-3.5 text-amber-500" />
                              Ajustar Créditos
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Compras de Créditos */}
        <TabsContent value="compras" className="space-y-4">
          <Card className="modern-card border-border/40">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Quem Comprou / Recebeu Créditos</CardTitle>
                <CardDescription>
                  Histórico completo de recargas de créditos dos masters (inclusos no plano, atacado ou ajustes).
                </CardDescription>
              </div>
              <div className="w-full sm:w-64">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar por master ou descrição..."
                    value={searchTx}
                    onChange={e => setSearchTx(e.target.value)}
                    className="pl-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Master / Usuário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Créditos</TableHead>
                      <TableHead>Valor Pago</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                          Nenhuma transação de crédito registrada ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map(t => (
                        <TableRow key={t.id}>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-foreground text-sm">{t.masterName || 'Master'}</p>
                              <p className="text-xs text-muted-foreground font-mono">{t.masterEmail || '—'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {t.type === 'plano_incluso' ? '✨ Incluso no Plano' :
                               t.type === 'compra_atacado' ? '💰 Compra Atacado' :
                               t.type === 'distribuicao_revenda' ? '🤝 Repasse Revenda' :
                               t.type === 'ajuste_admin' ? '⚙️ Ajuste Admin' : t.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            <span className={t.type === 'distribuicao_revenda' ? 'text-destructive' : 'text-amber-500'}>
                              {t.type === 'distribuicao_revenda' ? `−${t.credits}` : `+${t.credits}`}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {t.value ? fmtCurrency(t.value) : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {t.descricao || '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {fmtDate(t.createdAt)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={t.status === 'pago' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}>
                              {t.status === 'pago' ? 'Confirmado' : t.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Configurações de Preços e Pacotes de Atacado (Admin) */}
        <TabsContent value="precos" className="space-y-4">
          <Card className="modern-card border-border/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Tabela de Preços e Pacotes de Atacado (Sua Margem)
                  </CardTitle>
                  <CardDescription>
                    Defina quanto os masters do painel pagam para comprar mais créditos de revenda com você.
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSaveWholesaleConfig}
                  disabled={savingConfig}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingConfig ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preço Unitário Base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border/40">
                <div className="space-y-2">
                  <Label htmlFor="creditPrice" className="text-sm font-semibold">
                    Preço Base por Crédito Avulso (R$)
                  </Label>
                  <Input
                    id="creditPrice"
                    type="number"
                    step="0.10"
                    value={wholesaleConfig.creditPrice}
                    onChange={e => setWholesaleConfig({ ...wholesaleConfig, creditPrice: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex: R$ 2,50 por crédito. Quando o usuário revende a R$ 5,00, você lucra R$ 2,50 e ele R$ 2,50.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsappAdmin" className="text-sm font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    Seu WhatsApp de Atendimento / Vendas
                  </Label>
                  <Input
                    id="whatsappAdmin"
                    value={wholesaleConfig.whatsappAdmin}
                    onChange={e => setWholesaleConfig({ ...wholesaleConfig, whatsappAdmin: e.target.value })}
                    placeholder="Ex: 5511999999999 (com DDD)"
                  />
                  <p className="text-xs text-muted-foreground">
                    O botão "Comprar Créditos" no painel do usuário abre conversa diretamente neste WhatsApp.
                  </p>
                </div>
              </div>

              {/* Dados do PIX do Admin */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-primary" />
                  Dados Bancários / Chave PIX do Administrador
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pixKey">Chave PIX</Label>
                    <Input
                      id="pixKey"
                      value={wholesaleConfig.pixKeyAdmin}
                      onChange={e => setWholesaleConfig({ ...wholesaleConfig, pixKeyAdmin: e.target.value })}
                      placeholder="Cole sua chave PIX aqui"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pixType">Tipo de Chave</Label>
                    <Input
                      id="pixType"
                      value={wholesaleConfig.pixKeyTypeAdmin || 'Chave Aleatória'}
                      onChange={e => setWholesaleConfig({ ...wholesaleConfig, pixKeyTypeAdmin: e.target.value })}
                      placeholder="Ex: CPF, CNPJ, Email, Celular ou Aleatória"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pixName">Nome do Favorecido / Titular</Label>
                    <Input
                      id="pixName"
                      value={wholesaleConfig.pixNameAdmin}
                      onChange={e => setWholesaleConfig({ ...wholesaleConfig, pixNameAdmin: e.target.value })}
                      placeholder="Ex: Nome da sua Empresa ou Titular"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="instructions">Instruções de Pagamento para o Master</Label>
                  <Textarea
                    id="instructions"
                    value={wholesaleConfig.instructions}
                    onChange={e => setWholesaleConfig({ ...wholesaleConfig, instructions: e.target.value })}
                    rows={2}
                    placeholder="Instruções exibidas para o cliente após escolher o pacote..."
                  />
                </div>
              </div>

              {/* Pacotes de Atacado */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Pacotes de Créditos de Atacado</h3>
                    <p className="text-xs text-muted-foreground">
                      Pacotes promocionais em quantidade oferecidos no modal "Comprar Créditos".
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={addPackage} className="gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Adicionar Pacote
                  </Button>
                </div>

                <div className="space-y-2">
                  {wholesaleConfig.packages.map((pkg, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card">
                      <div className="w-44 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Identificação</Label>
                        <Input
                          value={pkg.label}
                          onChange={e => updatePackage(idx, 'label', e.target.value)}
                          placeholder="Nome do pacote"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Créditos</Label>
                        <Input
                          type="number"
                          value={pkg.credits}
                          onChange={e => updatePackage(idx, 'credits', parseInt(e.target.value) || 0)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="w-32 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Preço Total (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={pkg.price}
                          onChange={e => updatePackage(idx, 'price', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-4">
                        <Switch
                          id={`pop-${idx}`}
                          checked={pkg.popular || false}
                          onCheckedChange={checked => updatePackage(idx, 'popular', checked)}
                        />
                        <Label htmlFor={`pop-${idx}`} className="text-xs cursor-pointer">
                          Destaque
                        </Label>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePackage(idx)}
                        className="ml-auto text-destructive hover:bg-destructive/10 text-xs h-8"
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual Credit Adjustment Modal */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              Ajustar Saldo de Créditos do Master
            </DialogTitle>
            <DialogDescription>
              {selectedMaster && (
                <span>
                  Usuário: <strong>{selectedMaster.name}</strong> ({selectedMaster.email})<br />
                  Saldo atual: <strong>{selectedMaster.resellerCreditBalance} créditos</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={adjustType === 'add' ? 'default' : 'outline'}
                onClick={() => setAdjustType('add')}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar Créditos
              </Button>
              <Button
                type="button"
                variant={adjustType === 'remove' ? 'destructive' : 'outline'}
                onClick={() => setAdjustType('remove')}
                className="gap-2"
              >
                <Minus className="w-4 h-4" /> Remover Créditos
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qty">Quantidade de Créditos</Label>
              <Input
                id="qty"
                type="number"
                min="1"
                value={adjustAmount}
                onChange={e => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Motivo do Ajuste</Label>
              <Input
                id="reason"
                placeholder="Ex: Compra confirmada via PIX / Bônus promocional"
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)} disabled={adjusting}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAdjust} disabled={adjusting} className="gap-2">
              <Save className="w-4 h-4" />
              {adjusting ? 'Salvando...' : 'Confirmar Ajuste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRevendas;
