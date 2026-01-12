import React, { useMemo, useState } from 'react';
// @ts-ignore - Tipagem de FixedSizeList no pacote pode não expor o membro corretamente, mas o runtime funciona
import * as ReactWindow from 'react-window';
const List = (ReactWindow as any).FixedSizeList;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOptimizedDataTable } from '@/hooks/useOptimizedDataTable';
import { Edit, Trash, Eye, Search, ArrowUpDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VirtualizedTableProps {
  title?: string;
  description?: string;
  tableKey: string;
  columns: string[];
  formatters?: Record<string, (value: any, item?: any) => any>;
  onView?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  sortOptions?: { label: string; value: string }[];
  defaultSort?: string;
  pageSize?: number;
  itemHeight?: number;
}

const ROW_HEIGHT = 55;
const HEADER_HEIGHT = 50;
const VISIBLE_ROWS = 12;

export const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  title,
  description,
  tableKey,
  columns,
  formatters = {},
  onView,
  onEdit,
  onDelete,
  sortOptions = [],
  defaultSort = 'id_desc',
  pageSize = 150,
  itemHeight = ROW_HEIGHT
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState('');

  const {
    data,
    loading,
    error,
    hasMore,
    totalCount,
    searchTerm,
    sortBy,
    loadMore,
    handleSearch,
    handleSort,
    refresh
  } = useOptimizedDataTable({
    tableKey,
    columns,
    sortOptions,
    defaultSort,
    formatters,
    pageSize
  });

  // Debounced search handler
  const handleSearchChange = (value: string) => {
    setLocalSearchTerm(value);
    const timer = setTimeout(() => {
      handleSearch(value);
    }, 500);
    
    return () => clearTimeout(timer);
  };

  // Row renderer for virtualization
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = data[index];
    
    if (!item) {
      // Loading placeholder
      return (
        <div style={style} className="flex items-center justify-center p-4 border-b border-border">
          <div className="animate-pulse bg-muted rounded w-full h-12"></div>
        </div>
      );
    }

    return (
      <div style={style} className="flex items-center justify-between p-4 border-b border-border hover:bg-muted/50 transition-colors">
        <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
          {columns.map((column) => {
            const value = item[column];
            const formatter = formatters[column];
            const displayValue = formatter ? formatter(value, item) : value || '-';
            
            return (
              <div key={column} className="min-w-0">
                <div className="text-xs text-muted-foreground mb-1">{column}</div>
                <div className="text-sm font-medium truncate" title={typeof displayValue === 'string' ? displayValue : String(value)}>
                  {displayValue}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {onView && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onView(item)}
              className="h-8 w-8"
              title="Visualizar"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(item)}
              className="h-8 w-8"
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(item)}
              className="h-8 w-8 text-destructive hover:text-destructive"
              title="Excluir"
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Load more data when scrolling near the end
  const handleItemsRendered = ({ visibleStopIndex }: { visibleStopIndex: number }) => {
    if (hasMore && !loading && visibleStopIndex >= data.length - 5) {
      loadMore();
    }
  };

  const containerHeight = HEADER_HEIGHT + (VISIBLE_ROWS * itemHeight);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Erro</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refresh} variant="outline">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="text-sm text-muted-foreground">
            {totalCount.toLocaleString()} registros
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              value={localSearchTerm}
              onChange={(e) => {
                setLocalSearchTerm(e.target.value);
                handleSearchChange(e.target.value);
              }}
              className="pl-10"
            />
          </div>
          
          {sortOptions.length > 0 && (
            <Select value={sortBy} onValueChange={handleSort}>
              <SelectTrigger className="w-full sm:w-48">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {loading && data.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            Nenhum registro encontrado
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="grid gap-2 p-4 bg-muted/50 border-b border-border font-medium text-sm"
                 style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr) auto` }}>
              {columns.map((column) => (
                <div key={column} className="truncate">{column}</div>
              ))}
              <div className="w-24 text-center">Ações</div>
            </div>
            
            {/* Virtualized List */}
            <List
              height={containerHeight}
              width="100%"
              itemCount={data.length + (hasMore ? 5 : 0)} // Add loading rows
              itemSize={itemHeight}
              onItemsRendered={handleItemsRendered}
              className="scrollbar-thin scrollbar-track-background scrollbar-thumb-border"
            >
              {Row}
            </List>
            
            {loading && data.length > 0 && (
              <div className="flex items-center justify-center p-4 border-t border-border">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
                Carregando mais dados...
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};