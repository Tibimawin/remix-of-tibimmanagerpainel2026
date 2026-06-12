import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { EditCategoriaTVDialog } from '@/components/EditCategoriaTVDialog';
import { CreateCategoriaTVDialog } from '@/components/CreateCategoriaTVDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PermissionGate } from '@/components/PermissionGate';

const CategoriasTV = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
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

  const handleCreateSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setCreateDialogOpen(false);
  };

  return (
    <PermissionGate feature="categorias-tv">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Categorias TV</h1>
            <p className="text-muted-foreground">Gerenciar categorias de canais de TV</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Categoria
          </Button>
        </div>

        <DataTable
          title="Lista de Categorias"
          description="Categorias disponíveis para canais de TV"
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

        <CreateCategoriaTVDialog
          open={createDialogOpen}
          setOpen={setCreateDialogOpen}
          onCreateSuccess={handleCreateSuccess}
        />
      </div>
    </PermissionGate>
  );
};

export default CategoriasTV;
