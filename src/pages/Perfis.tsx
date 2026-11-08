import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PermissionGate } from '@/components/PermissionGate';

const Perfis = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const columns = ['Usuario_Email', 'Nome', 'Avatar', 'IsKids', 'Pin', 'IsKids + Pin', 'PinPerfil'];

  const formatters = {
    IsKids: (value: any) => value === true || value === 'true' ? 'Sim' : 'Não',
    PinPerfil: (value: any) => Number(value) || 0,
  };

  return (
    <PermissionGate feature="perfil">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <DataTable
          title="Perfis"
          description="Gerenciar perfis de visualização (Modo Tibim)"
          tableKey="perfil"
          columns={columns}
          formatters={formatters}
          refreshTrigger={refreshTrigger}
          skipEditDialog={false}
        />
      </div>
    </PermissionGate>
  );
};

export default Perfis;
