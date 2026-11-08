import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PermissionGate } from '@/components/PermissionGate';

const CategoriaSeries = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const columns = ['Nome'];

  return (
    <PermissionGate feature="categoriaSeries">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <DataTable
          title="Categorias Séries"
          description="Gerenciar categorias de Séries (Modo Tibim)"
          tableKey="categoriaSeries"
          columns={columns}
          refreshTrigger={refreshTrigger}
          skipEditDialog={false}
        />
      </div>
    </PermissionGate>
  );
};

export default CategoriaSeries;
