import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PermissionGate } from '@/components/PermissionGate';

const CategoriaNovelas = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const columns = ['Nome'];

  return (
    <PermissionGate feature="categoriaNovelas">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <DataTable
          title="Categorias Novelas"
          description="Gerenciar categorias de Novelas (Modo Tibim)"
          tableKey="categoriaNovelas"
          columns={columns}
          refreshTrigger={refreshTrigger}
          skipEditDialog={false}
        />
      </div>
    </PermissionGate>
  );
};

export default CategoriaNovelas;
