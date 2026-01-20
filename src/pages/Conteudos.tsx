
import React, { useEffect, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { EditContentDialog } from '@/components/EditContentDialog';
import { SeriesUpdateDialog } from '@/components/SeriesUpdateDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { PermissionGate } from '@/components/PermissionGate';
import { useSeriesUpdater } from '@/hooks/useSeriesUpdater';
import { toast } from 'sonner';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';

const Conteudos = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedSort, setSelectedSort] = useState('id_desc');
  const [bulkData, setBulkData] = useState<any[] | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const baserowService = useBaserowService();
  const { config, isConfigured } = useConfig();
  
  const { loading: updateLoading, updateData, checkForUpdates, applyUpdates, setUpdateData } = useSeriesUpdater();

  const columns = ['Nome', 'Capa', 'Categoria', 'Sinopse', 'Link', 'Tipo', 'Idioma', 'Views', 'Temporadas', 'Ações'];
  
  const sortOptions = [
    { label: 'Mais recentes primeiro', value: 'id_desc' },
    { label: 'Mais antigos primeiro', value: 'id_asc' },
    { label: 'Nome (A-Z)', value: 'nome_asc' },
    { label: 'Nome (Z-A)', value: 'nome_desc' },
    { label: 'Categoria (A-Z)', value: 'categoria_asc' },
  ];
  
  const formatters = {
    Views: (value: any) => Number(value) || 0,
    Temporadas: (value: any) => Number(value) || 0,
    Capa: (value: any) => {
      if (!value) return '-';
      
      if (Array.isArray(value) && value.length > 0) {
        const imageUrl = value[0].url;
        return (
          <img 
            src={imageUrl} 
            alt="Capa" 
            className="w-12 h-12 object-cover rounded"
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
            alt="Capa" 
            className="w-12 h-12 object-cover rounded"
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
        const displayCategories = value.slice(0, 2);
        const result = displayCategories.join(', ');
        return value.length > 2 ? `${result}...` : result;
      }
      if (typeof value === 'string' && value.includes(',')) {
        const categories = value.split(',').map(cat => cat.trim());
        const displayCategories = categories.slice(0, 2);
        const result = displayCategories.join(', ');
        return categories.length > 2 ? `${result}...` : result;
      }
      return value || '-';
    },
    Sinopse: (value: any) => {
      if (!value) return '-';
      return value.length > 10 ? value.substring(0, 10) + '...' : value;
    },
    Link: (value: any) => {
      if (!value) return '-';
      return (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Ver Link
        </a>
      );
    },
    Tipo: (value: any) => value || '-',
    Idioma: (value: any) => value || '-',
    Ações: (value: any, item: any) => {
      if (item?.Tipo === 'Série') {
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUpdateSeries(item)}
            disabled={updateLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${updateLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
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

  const handleUpdateSeries = async (item: any) => {
    if (item.Tipo !== 'Série') {
      toast.error('Esta funcionalidade é apenas para séries');
      return;
    }
    
    const updateInfo = await checkForUpdates(item);
    if (updateInfo && updateInfo.newEpisodes.length > 0) {
      setUpdateDialogOpen(true);
    }
  };

  const handleApplyUpdates = async (selectedEpisodes: any[]) => {
    await applyUpdates(selectedEpisodes);
    setRefreshTrigger(prev => prev + 1);
    setUpdateDialogOpen(false);
  };

  const handleSortChange = (newSort: string) => {
    setSelectedSort(newSort);
    setRefreshTrigger(prev => prev + 1);
  };

  // Ordenação global: para Nome/Categoria, buscar tudo e ordenar localmente
  useEffect(() => {
    const runGlobalSort = async () => {
      try {
        setBulkError(null);
        // Para ordenação global, somente quando não for por ID
        if (selectedSort.startsWith('id_')) {
          setBulkData(null);
          setBulkLoading(false);
          return;
        }

        if (!isConfigured) return;
        setBulkLoading(true);

        const tableId = config.tableIds['conteudos' as keyof typeof config.tableIds];
        if (!tableId) {
          setBulkError('Tabela de conteúdos não configurada.');
          setBulkLoading(false);
          return;
        }

        const response = await baserowService.getAllTableData(tableId);
        const all = response.results || [];

        const [key, dir] = selectedSort.split('_');
        const isDesc = dir === 'desc';

        const getCatString = (val: any) => {
          if (Array.isArray(val)) return (val[0] || '').toString().toLowerCase();
          if (typeof val === 'string' && val.includes(',')) return val.split(',')[0].trim().toLowerCase();
          return (val || '').toString().toLowerCase();
        };

        const sorted = [...all].sort((a, b) => {
          let aVal: any;
          let bVal: any;
          if (key === 'nome') {
            aVal = (a.Nome || '').toString().toLowerCase();
            bVal = (b.Nome || '').toString().toLowerCase();
          } else if (key === 'categoria') {
            aVal = getCatString(a.Categoria);
            bVal = getCatString(b.Categoria);
          } else {
            aVal = (a[key] || '').toString().toLowerCase();
            bVal = (b[key] || '').toString().toLowerCase();
          }
          if (aVal < bVal) return isDesc ? 1 : -1;
          if (aVal > bVal) return isDesc ? -1 : 1;
          return 0;
        });

        setBulkData(sorted);
      } catch (err: any) {
        console.error('Erro na ordenação global:', err);
        setBulkError('Erro ao carregar todos os conteúdos para ordenar.');
      } finally {
        setBulkLoading(false);
      }
    };

    runGlobalSort();
  }, [selectedSort, isConfigured]);

  return (
    <PermissionGate feature="conteudos">
      <div className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Conteúdos</h1>
              <p className="text-muted-foreground">Gerenciar conteúdos da biblioteca</p>
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
          tableKey="conteudos"
          columns={columns}
          formatters={formatters}
          sortOptions={sortOptions}
          defaultSort={selectedSort}
          onEdit={handleEdit}
          refreshTrigger={refreshTrigger}
          // Ir para a última página para mostrar os mais recentes
          goToPage={'last'}
          skipEditDialog={true}
          bulkData={bulkData}
          bulkLoading={bulkLoading}
          bulkError={bulkError}
          onClearBulk={() => setBulkData(null)}
        />

        <EditContentDialog
          open={editDialogOpen}
          setOpen={setEditDialogOpen}
          item={selectedItem}
          onEditSuccess={handleEditSuccess}
        />

        <SeriesUpdateDialog
          open={updateDialogOpen}
          setOpen={setUpdateDialogOpen}
          updateData={updateData}
          onApplyUpdates={handleApplyUpdates}
          loading={updateLoading}
        />
      </div>
    </PermissionGate>
  );
};

export default Conteudos;
