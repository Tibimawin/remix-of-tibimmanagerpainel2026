import React from 'react';
import UserActionHistory from '@/components/UserActionHistory';
import { PermissionGate } from '@/components/PermissionGate';

const HistoricoAcoes = () => {
  return (
    <PermissionGate feature="historico-acoes">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <UserActionHistory />
      </div>
    </PermissionGate>
  );
};

export default HistoricoAcoes;