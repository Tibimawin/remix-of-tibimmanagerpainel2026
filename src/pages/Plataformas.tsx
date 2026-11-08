
import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { EditPlataformaDialog } from '@/components/EditPlataformaDialog';

const Plataformas = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const columns = ['Categoria', 'Imagem'];
  
  const sortOptions = [
    { label: 'Categoria (A-Z)', value: 'categoria_asc' },
    { label: 'ID (Mais recentes primeiro)', value: 'id_desc' },
  ];
  
  const formatters = {
    Imagem: (value: any) => {
      if (!value) return '-';
      
      // Se o valor é um array com objetos de arquivo do Baserow
      if (Array.isArray(value) && value.length > 0) {
        const imageUrl = value[0].url;
        return (
          <img 
            src={imageUrl} 
            alt="Plataforma" 
            className="w-12 h-12 md:w-16 md:h-16 object-cover rounded"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        );
      }
      
      // Se é uma string com URL
      if (typeof value === 'string' && value.startsWith('http')) {
        return (
          <img 
            src={value} 
            alt="Plataforma" 
            className="w-12 h-12 md:w-16 md:h-16 object-cover rounded"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        );
      }
      
      return '-';
    },
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

  return (
    <div className="w-full overflow-x-hidden bg-background text-foreground px-4 sm:px-6 lg:px-8">
      <DataTable
        title="Plataformas"
        description="Gerenciar plataformas de streaming"
        tableKey="plataformas"
        columns={columns}
        formatters={formatters}
        sortOptions={sortOptions}
        defaultSort="categoria_asc"
        onEdit={handleEdit}
        refreshTrigger={refreshTrigger}
        skipEditDialog={true}
      />

      <EditPlataformaDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        item={selectedItem}
        onEditSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default Plataformas;
