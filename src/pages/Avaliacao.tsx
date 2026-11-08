import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PermissionGate } from '@/components/PermissionGate';

const Avaliacao = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const columns = ['Usuario', 'ConteudoID', 'Nota'];

  return (
    <PermissionGate feature="avaliacao">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <DataTable
          title="Avaliações"
          description="Gerenciar avaliações feitas pelos usuários (Modo Tibim)"
          tableKey="avaliacao"
          columns={columns}
          refreshTrigger={refreshTrigger}
          skipEditDialog={false}
        />
      </div>
    </PermissionGate>
  );
};

export default Avaliacao;
