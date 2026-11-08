
import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { EditCategoriaDialog } from '@/components/EditCategoriaDialog';

const Categorias = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const columns = ['Nome'];
  
  const sortOptions = [
    { label: 'Nome (A-Z)', value: 'nome_asc' },
    { label: 'Nome (Z-A)', value: 'nome_desc' },
  ];

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setEditDialogOpen(false);
    setSelectedItem(null);
  };

  return (
    <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
      <DataTable
        title="Categorias"
        description="Gerenciar categorias de conteúdo"
        tableKey="categorias"
        columns={columns}
        sortOptions={sortOptions}
        defaultSort="nome_asc"
        onEdit={handleEdit}
        refreshTrigger={refreshTrigger}
        skipEditDialog={true}
      />

      <EditCategoriaDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        item={selectedItem}
        onEditSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default Categorias;
