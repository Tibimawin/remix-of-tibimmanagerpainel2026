import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PermissionGate } from '@/components/PermissionGate';

const Carrosseu = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const columns = ['ID'];

  return (
    <PermissionGate feature="carrosseu">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <DataTable
          title="Carrossel"
          description="Gerenciar itens do Carrossel (Modo Tibim)"
          tableKey="carrosseu"
          columns={columns}
          refreshTrigger={refreshTrigger}
          skipEditDialog={false}
        />
      </div>
    </PermissionGate>
  );
};

export default Carrosseu;
