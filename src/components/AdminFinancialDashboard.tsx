import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign, TrendingUp, Users, CreditCard, RefreshCw, Search,
  Calendar, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, BarChart3, ShieldCheck, Unlock,
  AlertCircle, Loader2
} from 'lucide-react';
import { db } from '@/config/firebase';
import { collection, query, orderBy, getDocs, doc, setDoc, getDoc, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface FinancialRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  planName: string;
  planPrice: number;
  accessDays: number;
  paymentMethod: string;
  paymentId: string;
  status: string;
  startDate: string;
  endDate: string;
  confirmedAt: string;
  source: string;
  isUpgrade?: boolean;
  createdAt?: string;
}

interface AutoPermissionLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  planName: string;
  planId: string;
  featuresCount: number;
  features: string[];
  grantedAt: string;
  source: string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 67%, 55%)',
];

const AdminFinancialDashboard: React.FC = () => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [permLogs, setPermLogs] = useState<AutoPermissionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');

  const reconcilePendingPayments = async (pendingRecords: FinancialRecord[], isManual = false) => {
    if (pendingRecords.length === 0) {
      if (isManual) toast.info('Nenhum pagamento pendente para verificar.');
      return;
    }

    console.log(`🔄 Iniciando reconciliação de ${pendingRecords.length} pagamentos pendentes...`);
    if (isManual) setIsReconciling(true);
    let reconciledCount = 0;

    try {
      const { AsaasPaymentService } = await import('@/services/AsaasPaymentService');
      const { FirebaseUserService } = await import('@/services/FirebaseUserService');
      const { PlansService } = await import('@/services/PlansService');

      const plans = await PlansService.getAllPlans();

      for (const record of pendingRecords) {
        if (!record.paymentId) continue;

        try {
          const asaasStatus = await AsaasPaymentService.getPaymentStatus(record.paymentId);
          console.log(`Status do pagamento ${record.paymentId} no Asaas:`, asaasStatus.status);

          if (asaasStatus.status === 'RECEIVED' || asaasStatus.status === 'CONFIRMED') {
            console.log(`✅ Pagamento confirmado para ${record.userName} (ID: ${record.paymentId})`);

            const confirmedTime = new Date().toISOString();
            
            // 1. Atualizar no Firestore
            await setDoc(doc(db, 'financialRecords', record.paymentId), {
              status: 'confirmed',
              confirmedAt: confirmedTime
            }, { merge: true });

            // 2. Estender o acesso
            await FirebaseUserService.extendUserAccess(record.userId, record.accessDays);

            // 3. Dar as permissões
            const permissionsRef = doc(db, 'userPermissions', record.userId);
            const permissionsDoc = await getDoc(permissionsRef);
            const currentPermissions = permissionsDoc.exists() ? permissionsDoc.data() : {};
            const currentFeatures = currentPermissions.enabledFeatures || [];

            if (record.isUpgrade) {
              const apiPlanFeatures = plans.find(p => p.name.includes('API'))?.features || ['minha-api'];
              const mergedFeatures = [...new Set([...currentFeatures, ...apiPlanFeatures, 'planos', 'minha-api'])];

              await setDoc(permissionsRef, {
                userId: record.userId,
                userEmail: record.userEmail,
                userName: record.userName,
                planId: 'upgrade-api',
                planName: record.planName,
                monthlyContentLimit: 999,
                enabledFeatures: mergedFeatures,
                currentMonthUsage: 0,
                lastUpdated: new Date().toISOString(),
                expiryDate: record.endDate,
                isActive: true
              }, { merge: true });

              await addDoc(collection(db, 'autoPermissionLogs'), {
                userId: record.userId,
                userEmail: record.userEmail,
                userName: record.userName,
                planName: record.planName,
                planId: 'upgrade-api',
                featuresCount: mergedFeatures.length,
                features: mergedFeatures,
                grantedAt: new Date().toISOString(),
                source: 'payment-upgrade-reconciled'
              });
            } else {
              const matchedPlan = plans.find(p => p.name === record.planName);
              if (matchedPlan) {
                const featuresWithPlanos = matchedPlan.features.includes('planos')
                  ? matchedPlan.features
                  : [...matchedPlan.features, 'planos'];

                await setDoc(permissionsRef, {
                  userId: record.userId,
                  userEmail: record.userEmail,
                  userName: record.userName,
                  planId: matchedPlan.id,
                  planName: matchedPlan.name,
                  monthlyContentLimit: matchedPlan.monthlyContentLimit,
                  enabledFeatures: featuresWithPlanos,
                  currentMonthUsage: 0,
                  lastUpdated: new Date().toISOString(),
                  expiryDate: record.endDate,
                  isActive: true
                }, { merge: true });

                await addDoc(collection(db, 'autoPermissionLogs'), {
                  userId: record.userId,
                  userEmail: record.userEmail,
                  userName: record.userName,
                  planName: matchedPlan.name,
                  planId: matchedPlan.id,
                  featuresCount: featuresWithPlanos.length,
                  features: featuresWithPlanos,
                  grantedAt: new Date().toISOString(),
                  source: 'payment-auto-reconciled'
                });
              }
            }

            reconciledCount++;
            toast.success(`Pagamento de R$ ${record.planPrice.toFixed(2)} (${record.userName}) reconciliado e acesso liberado!`);
          } else if (asaasStatus.status === 'OVERDUE' || asaasStatus.status === 'REFUNDED' || asaasStatus.status === 'CHARGEBACK') {
            await setDoc(doc(db, 'financialRecords', record.paymentId), {
              status: asaasStatus.status.toLowerCase(),
              confirmedAt: ''
            }, { merge: true });
            console.log(`❌ Pagamento cancelado/falhou para ${record.userName} (ID: ${record.paymentId}, Status Asaas: ${asaasStatus.status})`);
          }
        } catch (err) {
          console.error(`Erro ao reconciliar pagamento ${record.paymentId}:`, err);
        }
      }

      if (reconciledCount > 0) {
        const finSnapshot = await getDocs(query(collection(db, 'financialRecords'), orderBy('confirmedAt', 'desc')));
        const permSnapshot = await getDocs(query(collection(db, 'autoPermissionLogs'), orderBy('grantedAt', 'desc')));
        setRecords(finSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as FinancialRecord)));
        setPermLogs(permSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as AutoPermissionLog)));
      } else {
        if (isManual) toast.success('Todos os pagamentos pendentes estão em dia.');
      }
    } catch (error) {
      console.error('Erro na reconciliação de pagamentos:', error);
      if (isManual) toast.error('Erro ao reconciliar pagamentos.');
    } finally {
      if (isManual) setIsReconciling(false);
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const [finSnapshot, permSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'financialRecords'), orderBy('confirmedAt', 'desc'))),
        getDocs(query(collection(db, 'autoPermissionLogs'), orderBy('grantedAt', 'desc')))
      ]);
      const loadedRecords = finSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as FinancialRecord));
      setRecords(loadedRecords);
      setPermLogs(permSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as AutoPermissionLog)));

      // Iniciar reconciliação em segundo plano se houver pendências
      const pending = loadedRecords.filter(r => r.status === 'pending');
      if (pending.length > 0) {
        reconcilePendingPayments(pending, false);
      }
    } catch (error) {
      console.error('Erro ao carregar registros financeiros:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    let filtered = records;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.userEmail.toLowerCase().includes(term) ||
        r.userName.toLowerCase().includes(term) ||
        r.planName.toLowerCase().includes(term)
      );
    }

    if (periodFilter !== 'all') {
      const now = new Date();
      const daysBack = periodFilter === '7d' ? 7 : periodFilter === '30d' ? 30 : periodFilter === '90d' ? 90 : 365;
      const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(r => new Date(r.confirmedAt) >= cutoff);
    }

    return filtered;
  }, [records, searchTerm, periodFilter]);

  // Métricas
  const metrics = useMemo(() => {
    const confirmedRecords = filteredRecords.filter(r => r.status === 'confirmed');
    const totalRevenue = confirmedRecords.reduce((sum, r) => sum + r.planPrice, 0);
    const totalSubscribers = new Set(confirmedRecords.map(r => r.userId)).size;
    const monthlyPlans = confirmedRecords.filter(r => r.accessDays <= 31).length;
    const annualPlans = confirmedRecords.filter(r => r.accessDays > 31).length;
    const avgTicket = confirmedRecords.length > 0 ? totalRevenue / confirmedRecords.length : 0;

    // Último mês vs mês anterior
    const now = new Date();
    const thisMonth = confirmedRecords.filter(r => {
      const d = new Date(r.confirmedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = confirmedRecords.filter(r => {
      const d = new Date(r.confirmedAt);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });
    const thisMonthRevenue = thisMonth.reduce((s, r) => s + r.planPrice, 0);
    const lastMonthRevenue = lastMonth.reduce((s, r) => s + r.planPrice, 0);
    const revenueGrowth = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : thisMonthRevenue > 0 ? 100 : 0;

    return { totalRevenue, totalSubscribers, monthlyPlans, annualPlans, avgTicket, thisMonthRevenue, revenueGrowth };
  }, [filteredRecords]);

  // Dados para gráficos
  const chartData = useMemo(() => {
    const confirmedRecords = filteredRecords.filter(r => r.status === 'confirmed');
    
    // Receita por mês
    const monthlyMap: Record<string, number> = {};
    confirmedRecords.forEach(r => {
      const d = new Date(r.confirmedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + r.planPrice;
    });
    const monthlyRevenue = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => {
        const [y, m] = month.split('-');
        return { month: `${m}/${y}`, value };
      });

    // Planos distribuição
    const planMap: Record<string, number> = {};
    confirmedRecords.forEach(r => {
      planMap[r.planName] = (planMap[r.planName] || 0) + 1;
    });
    const planDistribution = Object.entries(planMap).map(([name, value]) => ({ name, value }));

    return { monthlyRevenue, planDistribution };
  }, [filteredRecords]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Carregando dados financeiros...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" />
            Controle Financeiro
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Visão completa de todas as assinaturas e receitas do painel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              const pending = records.filter(r => r.status === 'pending');
              reconcilePendingPayments(pending, true);
            }} 
            size="sm"
            disabled={isReconciling || loading}
            className="border-purple-500/20 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/30"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isReconciling ? 'animate-spin' : ''}`} />
            {isReconciling ? 'Reconciliando...' : 'Reconciliar Pix'}
          </Button>
          <Button variant="outline" onClick={loadRecords} size="sm" disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary bg-gradient-to-br from-card to-card/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receita Total</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  R$ {metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {metrics.revenueGrowth >= 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${metrics.revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {metrics.revenueGrowth.toFixed(1)}% vs mês anterior
                  </span>
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-card to-card/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Este Mês</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  R$ {metrics.thisMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Receita do mês atual</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-card to-card/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assinantes</p>
                <p className="text-2xl font-bold text-foreground mt-1">{metrics.totalSubscribers}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {filteredRecords.length} pagamento{filteredRecords.length !== 1 ? 's' : ''} total
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-card to-card/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticket Médio</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  R$ {metrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">{metrics.monthlyPlans} mensais</Badge>
                  <Badge variant="outline" className="text-xs">{metrics.annualPlans} anuais</Badge>
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <BarChart3 className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Receita Mensal */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Receita Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData.monthlyRevenue}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                Nenhum dado para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição de Planos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Planos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.planDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartData.planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.planDistribution.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Nenhum dado
              </div>
            )}
            <div className="space-y-2 mt-2">
              {chartData.planDistribution.map((plan, i) => (
                <div key={plan.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-foreground">{plan.name}</span>
                  </div>
                  <Badge variant="secondary">{plan.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros + Tabela */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Histórico de Assinaturas
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 w-[180px]"
                />
              </div>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo período</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  <SelectItem value="365d">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum registro financeiro encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">Os pagamentos confirmados aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredRecords.map((record) => {
                const getStatusIcon = (status: string) => {
                  switch (status) {
                    case 'confirmed':
                      return (
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </div>
                      );
                    case 'pending':
                      return (
                        <div className="p-2 bg-amber-500/10 rounded-lg animate-pulse">
                          <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                      );
                    default:
                      return (
                        <div className="p-2 bg-red-500/10 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        </div>
                      );
                  }
                };

                const getStatusBadge = (status: string) => {
                  switch (status) {
                    case 'confirmed':
                      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">Confirmado</Badge>;
                    case 'pending':
                      return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs animate-pulse">Pendente</Badge>;
                    default:
                      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{status || 'Cancelado'}</Badge>;
                  }
                };

                const getPaymentDateString = () => {
                  const dateStr = record.status === 'confirmed' ? record.confirmedAt : record.createdAt;
                  if (!dateStr) return 'Sem data';
                  try {
                    const d = new Date(dateStr);
                    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                  } catch {
                    return 'Data inválida';
                  }
                };

                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl gap-3 hover:bg-secondary/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getStatusIcon(record.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{record.userName}</span>
                          <Badge variant="outline" className="text-xs">{record.planName}</Badge>
                          {getStatusBadge(record.status)}
                          <Badge variant="secondary" className="text-xs">
                            {record.accessDays > 31 ? 'Anual' : 'Mensal'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{record.userEmail}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {record.accessDays} dias
                          </span>
                          <span>•</span>
                          <span>PIX</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-foreground">
                        R$ {record.planPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {getPaymentDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log de Permissões Auto-liberadas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Permissões Auto-liberadas após Pagamento
          </CardTitle>
          <CardDescription>
            Usuários que tiveram permissões liberadas automaticamente ao confirmar o pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permLogs.length === 0 ? (
            <div className="text-center py-10">
              <Unlock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma permissão auto-liberada ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Quando um usuário pagar, as permissões aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {permLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl gap-3 hover:bg-secondary/70 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{log.userName}</span>
                        <Badge variant="outline" className="text-xs">{log.planName}</Badge>
                        <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                          <Unlock className="h-3 w-3 mr-1" />
                          {log.featuresCount} features
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{log.userEmail}</span>
                        <span>•</span>
                        <span>Origem: {log.source === 'payment-auto' ? 'Pagamento automático' : log.source}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.grantedAt).toLocaleDateString('pt-BR')}
                      {' '}
                      {new Date(log.grantedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFinancialDashboard;
