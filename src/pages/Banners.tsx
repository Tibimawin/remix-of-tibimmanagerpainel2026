import React, { useState, useMemo } from 'react';
import { DraggableDataTable } from '@/components/DraggableDataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditBannerDialog } from '@/components/EditBannerDialog';
import { CreateBannerDialog } from '@/components/CreateBannerDialog';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';

const Banners = () => {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { config } = useConfig();
  
  // Memoize baserowService to prevent recreation on every render
  const baserowService = useMemo(() => useBaserowService(), [config]);

  const columns = ['Nome', 'Imagem', 'ID', 'Categoria', 'Link', 'Externo?', 'Ordem'];

  const formatters = {
    Nome: (value: any, item?: any) => {
      return value || item?.Nome || '-';
    },
    ID: (value: any) => Number(value) || 0,
    Imagem: (value: any) => {
      if (!value) return '-';
      if (Array.isArray(value) && value.length > 0) {
        const imageUrl = value[0].url;
        return (
          <img 
            src={imageUrl} 
            alt="Banner" 
            className="w-16 h-8 md:w-20 md:h-12 object-cover rounded"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        );
      }
      if (typeof value === 'string' && value.startsWith('http')) {
        return (
          <img 
            src={value} 
            alt="Banner" 
            className="w-16 h-8 md:w-20 md:h-12 object-cover rounded"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        );
      }
      return '-';
    },
    Categoria: (value: any) => {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return value;
    },
    'Externo?': (value: any) => value ? '✓ Sim' : '✗ Não',
    Ordem: (value: any) => Number(value) || 0,
  };

  const handleView = (item: any) => {
    setSelectedItem(item);
    setViewDialogOpen(true);
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

  const handleDelete = async (rowId: string) => {
    if (!confirm('Tem certeza que deseja deletar este registro?')) return;
    try {
      const tableId = config.tableIds.banners;
      await baserowService.deleteRow(tableId, rowId);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Não foi possível deletar o banner.");
    }
  };

  return (
    <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
      {/* Passamos baserowService como prop para evitar re-renderização infinita */}
      <DraggableDataTable
        title="Anúncios & Banners"
        description="Gerenciar anúncios que aparecem no painel dos usuários - Arraste para reordenar"
        tableKey="banners"
        columns={columns}
        formatters={formatters}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={() => setCreateDialogOpen(true)}
        orderField="Ordem"
        baserowService={baserowService}
        refreshTrigger={refreshTrigger}
      />

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl mx-4">
          <DialogHeader>
            <DialogTitle>Detalhes do Banner</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 w-full overflow-x-hidden">
              {columns.map((column) => (
                <div key={column} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="font-medium">{column}:</div>
                  <div className="md:col-span-2 break-words">
                    {formatters[column] ? formatters[column](selectedItem[column], selectedItem) : (selectedItem[column] || '-')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EditBannerDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        item={selectedItem}
        onEditSuccess={handleEditSuccess}
      />

      <CreateBannerDialog
        open={createDialogOpen}
        setOpen={setCreateDialogOpen}
        onCreateSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default Banners;