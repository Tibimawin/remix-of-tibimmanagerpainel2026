
import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { EditEpisodioDialog } from '@/components/EditEpisodioDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PermissionGate } from '@/components/PermissionGate';

const Episodios = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedSort, setSelectedSort] = useState('id_desc');

  const columns = ['Nome', 'Temporada', 'Episódio', 'Link'];
  
  const sortOptions = [
    { label: 'Mais recentes primeiro', value: 'id_desc' },
    { label: 'Mais antigos primeiro', value: 'id_asc' },
    { label: 'Nome (A-Z)', value: 'nome_asc' },
    { label: 'Nome (Z-A)', value: 'nome_desc' },
    { label: 'Temporada (Maior primeiro)', value: 'temporada_desc' },
    { label: 'Episódio (Maior primeiro)', value: 'episodio_desc' },
  ];
  
  const formatters = {
    Temporada: (value: any) => Number(value) || 0,
    Episódio: (value: any) => Number(value) || 0,
    Link: (value: any) => {
      if (!value) return '-';
      const shortUrl = value.length > 20 ? value.substring(0, 20) + '...' : value;
      return (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
          title={value}
        >
          {shortUrl}
        </a>
      );
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

  const handleSortChange = (newSort: string) => {
    setSelectedSort(newSort);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <PermissionGate feature="episodios">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Episódios</h1>
              <p className="text-muted-foreground">Gerenciar episódios das séries</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ordenar por:</span>
              <Select value={selectedSort} onValueChange={handleSortChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <DataTable
          key={`${selectedSort}-${refreshTrigger}`}
          tableKey="episodios"
          columns={columns}
          formatters={formatters}
          sortOptions={sortOptions}
          defaultSort={selectedSort}
          onEdit={handleEdit}
          refreshTrigger={refreshTrigger}
          skipEditDialog={true}
          goToPage={selectedSort.includes('asc') ? 'last' : 'first'}
        />

        <EditEpisodioDialog
          open={editDialogOpen}
          setOpen={setEditDialogOpen}
          item={selectedItem}
          onEditSuccess={handleEditSuccess}
        />
      </div>
    </PermissionGate>
  );
};

export default Episodios;
