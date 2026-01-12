import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { EditCategoriaAnimeDialog } from '@/components/EditCategoriaAnimeDialog';
import { CreateCategoriaAnimeDialog } from '@/components/CreateCategoriaAnimeDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const CategoriasAnime = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const columns = ['Nome', 'id2', 'Capa', 'Tipo'];
  
  const sortOptions = [
    { label: 'Nome (A-Z)', value: 'Nome_asc' },
    { label: 'Nome (Z-A)', value: 'Nome_desc' },
    { label: 'Tipo (A-Z)', value: 'Tipo_asc' },
    { label: 'Tipo (Z-A)', value: 'Tipo_desc' },
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
    <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categorias Anime</h1>
          <p className="text-muted-foreground">Gerenciar categorias de animes</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      <DataTable
        title="Lista de Categorias"
        description="Categorias disponíveis para animes"
        tableKey="categoriasAnime"
        columns={columns}
        sortOptions={sortOptions}
        defaultSort="Nome_asc"
        onEdit={handleEdit}
        refreshTrigger={refreshTrigger}
        skipEditDialog={true}
      />

      <EditCategoriaAnimeDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        item={selectedItem}
        onEditSuccess={handleEditSuccess}
      />

      <CreateCategoriaAnimeDialog
        open={createDialogOpen}
        setOpen={setCreateDialogOpen}
        onCreateSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default CategoriasAnime;
