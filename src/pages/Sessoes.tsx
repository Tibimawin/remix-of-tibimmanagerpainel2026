
import React, { useState, useMemo } from 'react';
import { DraggableDataTable } from '@/components/DraggableDataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditSessaoDialog } from '@/components/EditSessaoDialog';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';

const Sessoes = () => {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { config } = useConfig();

  // Memoize baserowService for stability
  const baserowService = useMemo(() => useBaserowService(), [config]);

  const columns = ['Categoria', 'Tipo'];

  const formatters = {
    Categoria: (value: any, item?: any) => {
      return value || item?.Categoria || '-';
    },
    Tipo: (value: any, item?: any) => {
      return value || item?.Tipo || '-';
    }
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

  const handleDelete = async (rowId: string) => {
    if (!confirm('Tem certeza que deseja deletar este registro?')) return;

    try {
      const tableId = config.tableIds.sessoes;
      await baserowService.deleteRow(tableId, rowId);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Não foi possível deletar o registro.");
    }
  };

  return (
    <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
      {/* Passar baserowService como prop */}
      <DraggableDataTable
        title="Sessões"
        description="Gerenciar sessões do sistema - Arraste para reordenar"
        tableKey="sessoes"
        columns={columns}
        formatters={formatters}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        orderField="Ordem"
        baserowService={baserowService}
        refreshTrigger={refreshTrigger}
      />

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl mx-4">
          <DialogHeader>
            <DialogTitle>Detalhes da Sessão</DialogTitle>
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

      <EditSessaoDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        item={selectedItem}
        onEditSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default Sessoes;
