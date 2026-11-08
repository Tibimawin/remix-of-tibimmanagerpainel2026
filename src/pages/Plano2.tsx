import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PermissionGate } from '@/components/PermissionGate';

const Plano2 = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const columns = ['Nome do Plano', 'Tipo', 'Valor', 'Dias', 'Telas', 'Tag'];

  return (
    <PermissionGate feature="plano2">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <DataTable
          title="Planos 2"
          description="Gerenciar planos adicionais (Modo Tibim)"
          tableKey="plano2"
          columns={columns}
          refreshTrigger={refreshTrigger}
          skipEditDialog={false}
        />
      </div>
    </PermissionGate>
  );
};

export default Plano2;
