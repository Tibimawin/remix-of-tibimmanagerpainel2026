import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PermissionGate } from '@/components/PermissionGate';

const Versao = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const columns = ['Versao', 'Link'];

  return (
    <PermissionGate feature="versao">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <DataTable
          title="Versão"
          description="Gerenciar links de atualizações da aplicação (Modo Tibim)"
          tableKey="versao"
          columns={columns}
          refreshTrigger={refreshTrigger}
          skipEditDialog={false}
        />
      </div>
    </PermissionGate>
  );
};

export default Versao;
