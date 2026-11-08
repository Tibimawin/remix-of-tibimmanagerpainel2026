import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PermissionGate } from '@/components/PermissionGate';

const Pedido = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const columns = ['Nome', 'Usuario'];

  return (
    <PermissionGate feature="pedido">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <DataTable
          title="Pedidos"
          description="Gerenciar pedidos dos usuários (Modo Tibim)"
          tableKey="pedido"
          columns={columns}
          refreshTrigger={refreshTrigger}
          skipEditDialog={false}
        />
      </div>
    </PermissionGate>
  );
};

export default Pedido;
