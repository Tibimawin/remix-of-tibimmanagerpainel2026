
import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { EditCategoriaTVDialog } from '@/components/EditCategoriaTVDialog';

const CategoriasTV = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const columns = ['Categoria'];
  
  const sortOptions = [
    { label: 'Categoria (A-Z)', value: 'Categoria_asc' },
    { label: 'Categoria (Z-A)', value: 'Categoria_desc' },
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
        title="Categorias TV"
        description="Gerenciar categorias de canais de TV"
        tableKey="categoriasTV"
        columns={columns}
        sortOptions={sortOptions}
        defaultSort="Categoria_asc"
        onEdit={handleEdit}
        refreshTrigger={refreshTrigger}
        skipEditDialog={true}
      />

      <EditCategoriaTVDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        item={selectedItem}
        onEditSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default CategoriasTV;
