import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { EditCategoriaAnimeDialog } from '@/components/EditCategoriaAnimeDialog';
import { CreateCategoriaAnimeDialog } from '@/components/CreateCategoriaAnimeDialog';
import { Button } from '@/components/ui/button';
import { Plus, ImageOff } from 'lucide-react';

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

  // Formatter para mostrar preview da imagem de capa
  const formatters = {
    Capa: (value: string) => {
      if (!value) {
        return (
          <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-md">
            <ImageOff className="w-5 h-5 text-muted-foreground" />
          </div>
        );
      }
      return (
        <div className="relative group">
          <img
            src={value}
            alt="Capa"
            className="w-12 h-12 object-cover rounded-md border border-border cursor-pointer transition-transform hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden flex items-center justify-center w-12 h-12 bg-muted rounded-md">
            <ImageOff className="w-5 h-5 text-muted-foreground" />
          </div>
          {/* Tooltip com imagem maior */}
          <div className="absolute left-full ml-2 top-0 z-50 hidden group-hover:block">
            <div className="bg-popover border border-border rounded-lg shadow-lg p-1">
              <img
                src={value}
                alt="Preview"
                className="w-48 h-48 object-cover rounded-md"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.parentElement?.classList.add('hidden');
                }}
              />
            </div>
          </div>
        </div>
      );
    }
  };

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
        formatters={formatters}
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
