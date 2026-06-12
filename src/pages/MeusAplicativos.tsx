import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PermissionGate } from '@/components/PermissionGate';

const MeusAplicativos = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const columns = ['Nome', 'Capa', 'Link', 'Pacote', 'Tipo'];

  return (
    <PermissionGate feature="meus-aplicativos">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <DataTable
          title="Meus Aplicativos"
          description="Gerenciar aplicativos disponíveis (Modo Tibim)"
          tableKey="meusAplicativos"
          columns={columns}
          refreshTrigger={refreshTrigger}
          skipEditDialog={false}
        />
      </div>
    </PermissionGate>
  );
};

export default MeusAplicativos;
