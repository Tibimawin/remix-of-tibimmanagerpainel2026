import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/DataTable';
import { EditDialog } from '@/components/EditDialog';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { Users, TrendingUp, AlertTriangle, Activity, Shield } from 'lucide-react';

interface UserStats {
  total: number;
  active: number;
  blocked: number;
  expiringSoon: number;
}

const Usuarios = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    blocked: 0,
    expiringSoon: 0
  });
  const [loading, setLoading] = useState(true);

  const { config, isConfigured } = useConfig();
  const baserowService = useBaserowService();

  const columns = ['Nome', 'Email', 'Logins', 'Total de Dias', 'Data Pagamento', 'Dias Restantes', 'Ações'];

  const sortOptions = [
    { label: 'ID (Mais recentes primeiro)', value: 'id_desc' },
    { label: 'Nome (A-Z)', value: 'nome_asc' },
    { label: 'Nome (Z-A)', value: 'nome_desc' },
    { label: 'Logins (Maior primeiro)', value: 'logins_desc' },
    { label: 'Dias (Maior primeiro)', value: 'dias_desc' },
    { label: 'Restam (Maior primeiro)', value: 'restam_desc' },
    { label: 'Pagamento (Mais recente)', value: 'pagamento_desc' },
  ];

  // Calcular dias restantes
  const calculateDaysRemaining = (pagamento: string, totalDias: number) => {
    try {
      if (!pagamento || !totalDias) return 0;

      const paymentDate = new Date(pagamento);
      if (isNaN(paymentDate.getTime())) return 0;

      const hoje = new Date();
      const diffDays = Math.floor((hoje.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
      const restam = Math.max(0, totalDias - diffDays);
      return restam;
    } catch (error) {
      return 0;
    }
  };

  // Carregar estatísticas
  const loadStats = async () => {
    console.log('🔍 [Usuarios] Iniciando loadStats...');
    console.log('🔍 [Usuarios] isConfigured:', isConfigured);
    console.log('🔍 [Usuarios] config.tableIds:', config.tableIds);

    if (!isConfigured) {
      console.warn('⚠️ [Usuarios] Config não está configurado ainda');
      return;
    }

    if (!config.tableIds) {
      console.warn('⚠️ [Usuarios] config.tableIds não existe ainda');
      return;
    }

    try {
      setLoading(true);
      const tableId = config.tableIds['usuarios'];
      console.log('🔍 [Usuarios] tableId:', tableId);

      if (!tableId) {
        console.error('❌ [Usuarios] tableId não encontrado! tableIds disponíveis:', Object.keys(config.tableIds));
        return;
      }

      console.log('📡 [Usuarios] Buscando dados...');
      const response = await baserowService.getAllTableData(tableId);
      console.log('✅ [Usuarios] Resposta recebida:', response);

      const users = response.results || [];
      console.log('👥 [Usuarios] Total de usuários encontrados:', users.length);

      let total = users.length;
      let active = 0;
      let blocked = 0;
      let expiringSoon = 0;

      users.forEach((user: any) => {
        const diasRestantes = calculateDaysRemaining(user.Pagamento, Number(user.Dias) || 0);

        if (diasRestantes > 0) {
          active++;
          if (diasRestantes <= 7) {
            expiringSoon++;
          }
        } else {
          blocked++;
        }
      });

      console.log('📊 [Usuarios] Estatísticas calculadas:', { total, active, blocked, expiringSoon });
      setStats({ total, active, blocked, expiringSoon });
    } catch (error) {
      console.error('❌ [Usuarios] Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 [Usuarios] useEffect disparado - isConfigured:', isConfigured, 'refreshTrigger:', refreshTrigger);
    loadStats();
  }, [isConfigured, refreshTrigger]);

  const formatters = {
    Nome: (value: any) => value || '-',
    Email: (value: any) => value || '-',
    Logins: (value: any) => Number(value) || 0,
    'Total de Dias': (value: any, item: any) => {
      const dias = Number(item.Dias) || 0;
      return dias > 0 ? `${dias} dias` : '-';
    },
    'Data Pagamento': (value: any, item: any) => {
      try {
        if (!item.Pagamento) return '-';
        const date = new Date(item.Pagamento);
        if (isNaN(date.getTime())) return item.Pagamento || '-';
        return date.toLocaleDateString('pt-BR');
      } catch (error) {
        return '-';
      }
    },
    'Dias Restantes': (value: any, item: any) => {
      const restam = calculateDaysRemaining(item.Pagamento, Number(item.Dias) || 0);

      if (restam === 0) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">Expirado</span>;
      } else if (restam <= 7) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">{restam}d</span>;
      } else {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{restam}d</span>;
      }
    },
  } as Record<string, (value: any, item?: any) => any>;

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setEditDialogOpen(false);
    setSelectedItem(null);
  };

  // Calcular percentuais para barras de progresso
  const activePercentage = stats.total > 0 ? (stats.active / stats.total) * 100 : 0;
  const expiringPercentage = stats.total > 0 ? (stats.expiringSoon / stats.total) * 100 : 0;

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* Header com gradiente diagonal */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/30 via-fuchsia-900/20 to-pink-900/30 border border-purple-500/20 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhjNWM5YyIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/30">
              <Shield className="w-5 h-5 text-purple-300" />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-200 via-fuchsia-200 to-pink-200 bg-clip-text text-transparent">
              Gestão de Usuários
            </h1>
          </div>
          <p className="text-purple-200/70 font-medium ml-14">
            Monitore e gerencie todos os acessos do sistema
          </p>
        </div>
      </div>

      {/* Grid assimétrico de estatísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* Card Total - Maior e destaque */}
        <div className="lg:col-span-3 group">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 border border-violet-400/30 p-6 hover:border-violet-400/50 transition-all duration-300 h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-all duration-500"></div>
            <div className="relative flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-violet-400" />
                  <span className="text-sm font-semibold text-violet-300 uppercase tracking-wider">Total de Usuários</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-6xl font-black text-white tabular-nums">
                    {loading ? '...' : stats.total}
                  </h2>
                  <span className="text-violet-300/60 text-sm font-medium">usuários</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="px-2 py-1 rounded-md bg-violet-500/20 text-violet-200 font-medium">
                    Sistema completo
                  </div>
                </div>
              </div>
              <div className="relative w-24 h-24">
                <svg className="transform -rotate-90 w-24 h-24">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-violet-950/50" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset="0" className="text-violet-400 transition-all duration-1000" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-violet-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cards menores - 2 colunas cada */}
        <div className="lg:col-span-2 group">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/20 via-green-600/20 to-teal-600/20 border border-emerald-400/30 p-5 hover:border-emerald-400/50 transition-all duration-300 h-full">
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Ativos</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black text-white tabular-nums">{loading ? '...' : stats.active}</h3>
                <div className="w-full bg-emerald-950/50 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000" style={{ width: `${activePercentage}%` }}></div>
                </div>
                <p className="text-xs text-emerald-300/60">{activePercentage.toFixed(0)}% do total</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 group">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600/20 via-orange-600/20 to-yellow-600/20 border border-amber-400/30 p-5 hover:border-amber-400/50 transition-all duration-300 h-full">
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Vencendo</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black text-white tabular-nums">{loading ? '...' : stats.expiringSoon}</h3>
                <div className="w-full bg-amber-950/50 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-1000" style={{ width: `${expiringPercentage}%` }}></div>
                </div>
                <p className="text-xs text-amber-300/60">próximos 7 dias</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela com design moderno */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none"></div>
        <div className="relative p-6">
          <DataTable
            title=""
            description=""
            tableKey="usuarios"
            columns={columns}
            formatters={formatters}
            sortOptions={sortOptions}
            defaultSort="id_desc"
            onEdit={handleEdit}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>

      <EditDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        item={selectedItem}
        tableKey="usuarios"
        onEditSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default Usuarios;
