import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PermissionGate } from '@/components/PermissionGate';

const CategoriaDorama = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const columns = ['Nome'];

  return (
    <PermissionGate feature="categoriaDorama">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <DataTable
          title="Categorias Dorama"
          description="Gerenciar categorias de Doramas (Modo Tibim)"
          tableKey="categoriaDorama"
          columns={columns}
          refreshTrigger={refreshTrigger}
          skipEditDialog={false}
        />
      </div>
    </PermissionGate>
  );
};

export default CategoriaDorama;
