
import React from 'react';
import SystemMetricsCards from '@/components/SystemMetricsCards';
import { UserOffers } from '@/components/UserOffers';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { PermissionGate } from '@/components/PermissionGate';
import { useConfig } from '@/contexts/ConfigContext';
import ExpirationWarningBanner from '@/components/ExpirationWarningBanner';
import UserAnnouncementsBanner from '@/components/UserAnnouncementsBanner';

const Dashboard = () => {
  const { loading } = useUserPermissions();
  const { config, isConfigured } = useConfig();

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 modern-loading rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 modern-loading rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }



  return (
    <PermissionGate feature="dashboard">
      <div className="w-full space-y-6 animate-fade-in">
        {/* Banner de Expiração */}
        <ExpirationWarningBanner
          onRenewClick={() => {
            window.location.href = '/precos';
          }}
        />

        {/* Anúncios do Sistema */}
        <UserAnnouncementsBanner />

        {/* Header da Página */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-1 h-8 bg-gradient-to-b from-primary to-orange-500 rounded-full"></div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground font-medium">
                Visão geral e métricas do sistema
              </p>
            </div>
          </div>
        </div>


        {/* Métricas do Sistema */}
        <div className="space-y-6">
          <div className="modern-card p-6 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-1 h-6 bg-gradient-to-b from-primary to-orange-500 rounded-full"></div>
              <h2 className="text-xl font-bold text-foreground">Métricas do Sistema</h2>
            </div>
            <SystemMetricsCards />
          </div>
        </div>

        {/* Ofertas Especiais */}
        <div className="space-y-6">
          <div className="modern-card p-6 backdrop-blur-sm">
            <UserOffers />
          </div>
        </div>
      </div>
    </PermissionGate>
  );
};

export default Dashboard;
