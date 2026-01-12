import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Edit, Eye, Trash2, Plus, GripVertical } from 'lucide-react';
import { useConfig } from '@/contexts/ConfigContext';
import { useBaserowService } from '@/services/BaserowService';
import { CreateDialog } from './CreateDialog';
import { EditDialog } from './EditDialog';
import { ExportButton } from './ExportButton';
import { ImportButton } from './ImportButton';

interface DraggableDataTableProps {
  title: string;
  description: string;
  tableKey: string;
  columns: string[];
  formatters?: { [key: string]: (value: any, item?: any) => React.ReactNode | string | number | null | undefined };
  onView?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (rowId: string) => void;
  onCreate?: () => void;
  orderField: string;
  baserowService?: any; // recebe o serviço já memoizado da página
  refreshTrigger?: number; // ADICIONADO - para forçar re-fetch dos dados
}

export const DraggableDataTable: React.FC<DraggableDataTableProps> = ({
  title,
  description,
  tableKey,
  columns,
  formatters = {},
  onView,
  onEdit,
  onDelete,
  onCreate,
  orderField,
  baserowService,
  refreshTrigger, // novo
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tableId, setTableId] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const { config } = useConfig();

  useEffect(() => {
    if (config?.tableIds && config.tableIds[tableKey]) {
      setTableId(config.tableIds[tableKey]);
    }
  }, [config?.tableIds, tableKey]);

  const fetchData = useCallback(async () => {
    if (!tableId || !baserowService) return;
    setLoading(true);
    try {
      const response = await baserowService.getTableData(tableId, page, perPage);
      let results = response.results;
      if (search) {
        results = results.filter(item =>
          Object.values(item).some(val =>
            String(val).toLowerCase().includes(search.toLowerCase())
          )
        );
      }
      setData(results);
      setTotalRows(response.count);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [tableId, page, perPage, search, baserowService]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]); // ADICIONADO refreshTrigger como dependência

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const handleImport = async (dataToImport: any[]) => {
    if (!tableId || !Array.isArray(dataToImport)) return;
    try {
      setLoading(true);
      for (const item of dataToImport) {
        // Remove id if present, baserow will assign a new one
        const { id, ...rest } = item;
        await baserowService.createRow(tableId, rest);
      }
      fetchData();
    } catch (error) {
      console.error("Failed to import data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startDrag = (index: number) => {
    setIsDragging(true);
    setDraggedItemIndex(index);
  };

  const onDragOver = useCallback((e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const newData = [...data];
    const draggedItem = newData[draggedItemIndex];

    newData.splice(draggedItemIndex, 1);
    newData.splice(index, 0, draggedItem);

    setData(newData);
    setDraggedItemIndex(index);
  }, [data, draggedItemIndex]);

  const endDrag = useCallback(async () => {
    setIsDragging(false);
    setDraggedItemIndex(null);

    if (tableId) {
      try {
        setLoading(true);
        const updates = data.map((item, index) => ({
          id: item.id,
          [orderField]: (page - 1) * perPage + index + 1,
        }));

        for (const update of updates) {
          const { id, ...rowData } = update;
          await baserowService.updateRow(tableId, id, rowData);
        }

      } catch (error) {
        console.error("Erro ao atualizar a ordem:", error);
      } finally {
        setLoading(false);
        fetchData();
      }
    }
  }, [data, tableId, orderField, baserowService, fetchData, page, perPage]);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={handleSearchChange}
            className="max-w-xs"
          />
          <ExportButton data={data} tableName={tableKey} columns={columns} />
          <ImportButton tableKey={tableKey} onImport={handleImport} />
          <Button onClick={onCreate ? onCreate : () => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar
          </Button>
        </div>
      </div>

      <div className="border rounded-md">
        <Table ref={tableRef} className="w-full">
          <TableCaption>{totalRows} registros</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Ordem</TableHead>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 2} className="text-center py-4">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 2} className="text-center py-4">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow
                  key={row.id}
                  draggable="true"
                  onDragStart={() => startDrag(index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDragEnd={endDrag}
                  className={`hover:bg-secondary data-row ${isDragging ? 'dragging' : ''}`}
                >
                  <TableCell className="cursor-move">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column}>
                      {formatters[column] ? formatters[column](row[column], row) : row[column]}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium">
                    {onView && (
                      <Button variant="ghost" size="icon" onClick={() => onView(row)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button variant="ghost" size="icon" onClick={() => onEdit(row)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button variant="ghost" size="icon" onClick={() => onDelete(row.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-4">
        <div className="space-x-2">
          <Button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            size="sm"
            variant="outline"
          >
            Anterior
          </Button>
          <Button
            onClick={() => handlePageChange(page + 1)}
            disabled={page * perPage >= totalRows}
            size="sm"
            variant="outline"
          >
            Próximo
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {Math.ceil(totalRows / perPage)}
          </span>
        </div>
        <div className="space-x-2">
          <label htmlFor="perPage" className="text-sm font-medium">
            Itens por página:
          </label>
          <select
            id="perPage"
            value={perPage}
            onChange={(e) => handlePerPageChange(Number(e.target.value))}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      {!onCreate && (
        <CreateDialog
          open={createDialogOpen}
          setOpen={setCreateDialogOpen}
          tableKey={tableKey}
          columns={columns}
          onCreateSuccess={fetchData}
          title={title}
        />
      )}
    </div>
  );
};
