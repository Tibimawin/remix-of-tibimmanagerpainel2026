import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EditDialog } from '@/components/EditDialog';
import { CreateDialog } from '@/components/CreateDialog';
import { ExportButton } from '@/components/ExportButton';
import { ImportButton } from '@/components/ImportButton';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { toast } from '@/hooks/use-toast';
import { Edit, Trash, Eye, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSystemLogs } from '@/hooks/useSystemLogs';
import { useAutoNotifyCRUD } from '@/hooks/useActionNotifier';

interface DataTableProps {
  title?: string;
  description?: string;
  tableKey: string;
  columns: string[];
  formatters?: Record<string, (value: any, item?: any) => any>;
  onView?: (item: any) => void;
  onEdit?: (item: any) => void;
  sortOptions?: { label: string; value: string }[];
  defaultSort?: string;
  frontendSort?: {
    orderBy: string,
    orderDir: "asc" | "desc",
    sortFunction: (a: any, b: any, direction: "asc" | "desc") => number
  };
  bulkData?: any[] | null;
  bulkLoading?: boolean;
  bulkError?: string | null;
  onClearBulk?: () => void;
  refreshTrigger?: number;
  skipEditDialog?: boolean;
  goToPage?: 'first' | 'last';
}

export const DataTable: React.FC<DataTableProps & {
  frontendSort?: {
    orderBy: string,
    orderDir: "asc" | "desc",
    sortFunction: (a: any, b: any, direction: "asc" | "desc") => number
  };
}> = ({
  title, 
  description, 
  tableKey, 
  columns,
  formatters = {},
  onView,
  onEdit,
  sortOptions = [],
  defaultSort = 'id_desc',
  frontendSort,
  bulkData = null,
  bulkLoading = false,
  bulkError = null,
  onClearBulk,
  refreshTrigger,
  skipEditDialog = false,
  goToPage
}) => {
  const [data, setData] = useState<any[]>([]);
  const [allData, setAllData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState(defaultSort);
  const { config, isConfigured } = useConfig();
  const baserowService = useBaserowService();
  const { addLog } = useSystemLogs();
  const { notifyDelete, notifyImport } = useAutoNotifyCRUD(tableKey);
  const itemsPerPage = 20;

  const getOrderParam = (sort: string | undefined) => {
    if (!sort) return undefined;
    const [key, dir] = sort.split('_');
    const isDesc = dir === 'desc';
    switch (key) {
      case 'id':
        return isDesc ? '-id' : 'id';
      case 'nome':
        return isDesc ? '-Nome' : 'Nome';
      case 'categoria':
        return isDesc ? '-Categoria' : 'Categoria';
      default:
        return undefined;
    }
  };

  // Se usarmos dados bulk, eles devem ser paginados localmente!
  const currentData = useMemo(() => {
    if (bulkData && Array.isArray(bulkData)) {
      const startIdx = (page - 1) * itemsPerPage;
      return bulkData.slice(startIdx, startIdx + itemsPerPage);
    }
    return data;
  }, [data, bulkData, page]);

  const effectiveTotalCount = bulkData ? bulkData.length : totalCount;
  const effectiveTotalPages = bulkData
    ? Math.ceil(bulkData.length / itemsPerPage)
    : totalPages;

  // Ordenação local dos dados exibidos (fallback para casos em que o servidor não ordena)
  const displayData = React.useMemo(() => {
    // Se estamos usando bulkData, respeitar apenas a paginação local
    const base = currentData;

    if (!sortBy) return base;

    const [key, dir] = sortBy.split('_');
    const isDesc = dir === 'desc';

    const fieldName = key === 'id'
      ? 'id'
      : key === 'nome'
        ? 'Nome'
        : key === 'categoria'
          ? 'Categoria'
          : null;

    if (!fieldName) return base;

    const getComparable = (val: any, field: string) => {
      if (field === 'id') return Number(val) || 0;
      if (field === 'Nome') return (val || '').toString().toLowerCase();
      if (field === 'Categoria') {
        if (Array.isArray(val)) return (val[0] || '').toString().toLowerCase();
        return (val || '').toString().toLowerCase();
      }
      return (val || '').toString().toLowerCase();
    };

    return [...base].sort((a, b) => {
      const aVal = getComparable(a[fieldName], fieldName);
      const bVal = getComparable(b[fieldName], fieldName);
      if (aVal < bVal) return isDesc ? 1 : -1;
      if (aVal > bVal) return isDesc ? -1 : 1;
      return 0;
    });
  }, [currentData, sortBy]);

  const loadData = async (currentPage = page, search = searchTerm) => {
    if (!isConfigured) return;
    
    try {
      setLoading(true);
      const orderParam = getOrderParam(sortBy);
      console.log('Carregando dados paginados para tabela:', tableKey, 'página:', currentPage, 'busca:', search, 'ordem:', orderParam);
      
      const tableId = config.tableIds[tableKey as keyof typeof config.tableIds];
      console.log('Table ID:', tableId);
      
      if (!tableId) {
        console.warn(`ID da tabela ${tableKey} não configurado. Aguardando configuração...`);
        setData([]);
        setTotalCount(0);
        setTotalPages(1);
        return;
      }
      
      // Usar paginação real do servidor com busca
      const response = await baserowService.getTableData(tableId, currentPage, itemsPerPage, search, orderParam);
      console.log('Dados paginados carregados:', response);
      
      setData(response.results || []);
      setTotalCount(response.count || 0);
      setTotalPages(Math.ceil((response.count || 0) / itemsPerPage));
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error("Erro", {
        description: "Não foi possível carregar os dados da tabela.",
      });
      setData([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const loadAllDataForExport = async () => {
    if (!isConfigured) return;
    
    try {
      const tableId = config.tableIds[tableKey as keyof typeof config.tableIds];
      if (!tableId) return;
      
      console.log('Carregando todos os dados para exportação...');
      const response = await baserowService.getAllTableData(tableId);
      setAllData(response.results || []);
    } catch (error) {
      console.error('Erro ao carregar todos os dados:', error);
      setAllData(data); //fallback para dados da página atual
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      if (!isConfigured) return;

      if (goToPage === 'last') {
        const tableId = config.tableIds[tableKey as keyof typeof config.tableIds];
        if (!tableId) return;

        try {
          setLoading(true);
          const orderParam = getOrderParam(sortBy);
          // Buscar primeira página só para saber o count
          const response = await baserowService.getTableData(tableId, 1, itemsPerPage, searchTerm, orderParam);
          const count = response.count || 0;
          const lastPage = Math.ceil(count / itemsPerPage) || 1;

          // Agora ir para a última página
          setTotalCount(count);
          setTotalPages(lastPage);
          setPage(lastPage);

          // Carregar dados da última página
          const lastPageResponse = await baserowService.getTableData(tableId, lastPage, itemsPerPage, searchTerm, orderParam);
          setData(lastPageResponse.results || []);
        } finally {
          setLoading(false);
        }
      } else {
        // Comportamento normal - página 1
        setPage(1);
        loadData(1);
      }

      loadAllDataForExport();
    };

    initializeData();
  }, [isConfigured, refreshTrigger, tableKey, config, goToPage]);

  useEffect(() => {
    if (page !== 1 && !goToPage) {
      loadData();
    }
  }, [page]);

  // Efeito separado para busca com debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        loadData(1, searchTerm);
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Reset page para 1 ao trocar entre bulk e api paginado
  useEffect(() => {
    setPage(1);
  }, [!!bulkData]);

  const handleDelete = async (rowId: string) => {
    if (!confirm('Tem certeza que deseja deletar este registro?')) return;
    
    try {
      const tableId = config.tableIds[tableKey as keyof typeof config.tableIds];
      
      // Buscar informações do item antes de deletar para o log
      const itemToDelete = currentData.find(item => item.id === rowId);
      const itemName = itemToDelete?.Nome || itemToDelete?.name || `Registro ID ${rowId}`;
      
      await baserowService.deleteRow(tableId, rowId);
      
      // Registrar log da exclusão
      await addLog(
        'Registro deletado',
        `Deletou ${tableKey}: ${itemName}`
      );
      
      // Notificar exclusão
      notifyDelete(itemName);
      
      toast.success("Registro deletado com sucesso!");
      loadData();
      loadAllDataForExport();
    } catch (error) {
      console.error('Erro ao deletar registro:', error);
      toast.error("Erro ao deletar registro");
    }
  };

  const handleView = (item: any) => {
    setSelectedItem(item);
    setViewDialogOpen(true);
    if (onView) onView(item);
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
    if (onEdit) onEdit(item);
  };

  const handleEditSuccess = () => {
    loadData();
    loadAllDataForExport();
  };

  const handleCreateSuccess = () => {
    loadData();
    loadAllDataForExport();
  };

  const handleImportSuccess = () => {
    loadData();
    loadAllDataForExport();
  };

  const handleImport = async (dataToImport: any[]) => {
    if (!Array.isArray(dataToImport)) {
      console.error("Dados de importação devem ser um array.");
      return;
    }
    const tableId = config.tableIds[tableKey as keyof typeof config.tableIds];
    if (!tableId) {
      console.error("ID da tabela não encontrado para:", tableKey);
      return;
    }
    try {
      setLoading(true);
      for (const item of dataToImport) {
        await baserowService.createRow(tableId, item);
      }
      
      // Notificar importação
      notifyImport(`${dataToImport.length} registros importados`);
      
      handleImportSuccess();
    } catch (error) {
      console.error("Falha ao importar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (column: string, value: any, item?: any) => {
    if (formatters[column]) {
      return formatters[column](value, item);
    }
    return value || '-';
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  if (!isConfigured) {
    return (
      <Alert className="no-arrows">
        <AlertDescription className="no-arrows">
          Configure primeiro as credenciais da API na seção "Configurações".
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full overflow-x-hidden no-arrows">
      {/* Títulos da seção separados da tabela - só mostrar se title existe */}
      {title && (
        <div className="space-y-2 no-arrows mb-6">
          <h1 className="text-3xl font-bold text-foreground no-arrows">{title}</h1>
          {description && <p className="text-muted-foreground no-arrows">{description}</p>}
        </div>
      )}

      <div className="w-full bg-card border border-border rounded-lg shadow-sm no-arrows">
        <div className="p-4 sm:p-6 border-b border-border no-arrows">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 no-arrows">
            <div className="no-arrows">
              <h3 className="text-lg font-semibold no-arrows">Gerenciar {title || 'Dados'}</h3>
              <p className="text-sm text-muted-foreground mt-2 no-arrows">
                Visualize e gerencie os registros da tabela ({totalCount} registros)
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto no-arrows">
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full sm:w-64 no-arrows"
              />
              <div className="flex gap-2 no-arrows">
                <ExportButton 
                  data={allData.length > 0 ? allData : data} 
                  tableName={tableKey} 
                  columns={columns} 
                />
                <ImportButton 
                  tableKey={tableKey} 
                  onImport={handleImport} 
                />
                <Button onClick={() => setCreateDialogOpen(true)} className="no-arrows">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
                <Button onClick={() => loadData()} variant="outline" className="no-arrows">
                  Atualizar
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 no-arrows">
          {loading ? (
            <div className="text-center py-8 no-arrows">
              <p className="no-arrows">Carregando dados...</p>
            </div>
          ) : bulkLoading ? (
            <div className="text-center py-8 no-arrows">
              <p className="no-arrows">Carregando e ordenando todos os dados...</p>
            </div>
          ) : bulkError ? (
            <div className="text-center py-8 text-destructive no-arrows">
              <p className="no-arrows">{bulkError}</p>
              {onClearBulk && (
                <button
                  className="mt-2 text-xs px-3 py-1 bg-muted rounded hover:bg-muted-foreground/10 transition-colors"
                  onClick={onClearBulk}
                >
                  Voltar ao padrão
                </button>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto no-arrows">
              <Table className="no-arrows min-w-full">
                <TableHeader className="no-arrows">
                  <TableRow className="no-arrows">
                    {columns.map((column) => (
                      <TableHead key={column} className="no-arrows whitespace-nowrap">{column}</TableHead>
                    ))}
                    <TableHead className="no-arrows">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="no-arrows">
                  {displayData.map((item) => (
                    <TableRow key={item.id} className="no-arrows">
                      {columns.map((column) => (
                        <TableCell key={column} className="no-arrows">
                          <div className="max-w-xs truncate">
                            {formatValue(column, item[column], item)}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="no-arrows">
                        <div className="flex space-x-2 no-arrows">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleView(item)}
                            className="no-arrows"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="no-arrows"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="no-arrows"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {currentData.length === 0 && !loading && !bulkLoading && !bulkError && (
            <div className="text-center py-8 no-arrows">
              <p className="text-muted-foreground no-arrows">
                {searchTerm ? `Nenhum resultado encontrado para "${searchTerm}".` : 'Nenhum registro encontrado.'}
              </p>
            </div>
          )}

          {/* Paginação */}
          {(effectiveTotalPages > 1) && (
            <div className="mt-6 space-y-4 no-arrows">
              <Pagination className="no-arrows">
                <PaginationContent className="no-arrows">
                  <PaginationItem className="no-arrows">
                    <PaginationPrevious 
                      onClick={() => setPage(page - 1)}
                      className={`no-arrows ${page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                    />
                  </PaginationItem>
                  {/* Paginação adaptada ao total */}
                  {Array.from({ length: Math.min(5, effectiveTotalPages) }, (_, i) => {
                    let pageNumber;
                    if (effectiveTotalPages <= 5) {
                      pageNumber = i + 1;
                    } else {
                      const start = Math.max(1, Math.min(page - 2, effectiveTotalPages - 4));
                      pageNumber = start + i;
                    }
                    return (
                      <PaginationItem key={pageNumber} className="no-arrows">
                        <PaginationLink
                          onClick={() => setPage(pageNumber)}
                          isActive={pageNumber === page}
                          className="cursor-pointer no-arrows"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem className="no-arrows">
                    <PaginationNext 
                      onClick={() => setPage(page + 1)}
                      className={`no-arrows ${page === effectiveTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <div className="text-center text-sm text-muted-foreground no-arrows">
                Página {page} de {effectiveTotalPages} ({effectiveTotalCount} registros total)
              </div>
              {/* Navegação rápida */}
              <div className="flex justify-center items-center space-x-2 no-arrows">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="no-arrows"
                >
                  Primeira
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(effectiveTotalPages)}
                  disabled={page === effectiveTotalPages}
                  className="no-arrows"
                >
                  Última
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl no-arrows">
          <DialogHeader className="no-arrows">
            <DialogTitle className="no-arrows">Detalhes do {title}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 no-arrows">
              {columns.map((column) => (
                <div key={column} className="grid grid-cols-3 gap-4 no-arrows">
                  <div className="font-medium no-arrows">{column}:</div>
                  <div className="col-span-2 no-arrows">
                    {formatValue(column, selectedItem[column], selectedItem)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de edição - só mostrar se skipEditDialog for false */}
      {!skipEditDialog && selectedItem && (
        <EditDialog
          open={editDialogOpen}
          setOpen={setEditDialogOpen}
          item={selectedItem}
          tableKey={tableKey}
          onEditSuccess={handleEditSuccess}
        />
      )}

      {/* Dialog de criação */}
      <CreateDialog
        open={createDialogOpen}
        setOpen={setCreateDialogOpen}
        tableKey={tableKey}
        columns={columns}
        onCreateSuccess={handleCreateSuccess}
        title={title}
      />
    </div>
  );
};
