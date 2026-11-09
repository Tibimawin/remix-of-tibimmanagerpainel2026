import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PermissionGate } from '@/components/PermissionGate';

const CategoriaAnimes = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const columns = ['Nome'];

  const sortOptions = [
    { label: 'Mais Recentes Primeiro (ID ↓)', value: 'id_desc' },
    { label: 'Mais Antigos Primeiro (ID ↑)', value: 'id_asc' },
    { label: 'Nome (A-Z)', value: 'nome_asc' },
    { label: 'Nome (Z-A)', value: 'nome_desc' },
  ];

  return (
    <PermissionGate feature="categoriaAnimes">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <DataTable
          title="Categorias Animes"
          description="Gerenciar categorias de Animes (Modo Tibim)"
          tableKey="categoriaAnimes"
          columns={columns}
          sortOptions={sortOptions}
          refreshTrigger={refreshTrigger}
          skipEditDialog={false}
        />
      </div>
    </PermissionGate>
  );
};

export default CategoriaAnimes;
