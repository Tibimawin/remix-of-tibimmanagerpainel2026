import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PermissionGate } from '@/components/PermissionGate';

const CategoriaFilmes = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const columns = ['Nome'];

  return (
    <PermissionGate feature="categoriaFilmes">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <DataTable
          title="Categorias Filmes"
          description="Gerenciar categorias de Filmes (Modo Tibim)"
          tableKey="categoriaFilmes"
          columns={columns}
          refreshTrigger={refreshTrigger}
          skipEditDialog={false}
        />
      </div>
    </PermissionGate>
  );
};

export default CategoriaFilmes;
