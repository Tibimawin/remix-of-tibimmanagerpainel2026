
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRealtimePeriodLogs } from '@/hooks/useRealtimePeriodLogs';

interface ActivityLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: string;
  details?: string;
}

interface DateRangeFilterProps {
  logs: ActivityLog[];
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ logs: fallbackLogs }) => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>(fallbackLogs);

  // Usar logs em tempo real do Firebase quando há intervalo de datas selecionado
  const { logs: periodLogs, isLoading: periodLoading } = useRealtimePeriodLogs(
    startDate && endDate ? startDate : undefined, 
    startDate && endDate ? endDate : undefined
  );

  const handleFilter = () => {
    if (!startDate || !endDate) {
      setFilteredLogs(fallbackLogs);
      return;
    }

    // Usar logs do Firebase quando disponíveis, senão usar filtro local
    if (periodLogs.length > 0) {
      setFilteredLogs(periodLogs);
    } else {
      const filtered = fallbackLogs.filter((log) => {
        const logDate = new Date(log.timestamp);
        return logDate >= startDate && logDate <= endDate;
      });
      setFilteredLogs(filtered);
    }
  };

  const clearFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setFilteredLogs(fallbackLogs);
  };

  const getActionType = (action: string) => {
    if (action.includes('login') || action.includes('Login')) return 'login';
    if (action.includes('criar') || action.includes('add') || action.includes('create')) return 'create';
    if (action.includes('editar') || action.includes('edit') || action.includes('update')) return 'edit';
    if (action.includes('deletar') || action.includes('delete') || action.includes('remove')) return 'delete';
    return 'other';
  };

  const getActionBadge = (action: string) => {
    const type = getActionType(action);
    const colors = {
      login: 'bg-blue-100 text-blue-800',
      create: 'bg-green-100 text-green-800',
      edit: 'bg-yellow-100 text-yellow-800',
      delete: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={colors[type]}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          Logs por Intervalo de Datas - Tempo Real
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            🔴 AO VIVO
          </Badge>
        </CardTitle>
        <CardDescription className="text-slate-400">
          Filtre os logs de atividade por período específico (Firebase)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex flex-col space-y-2">
            <label className="text-sm text-slate-300">Data Inicial</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal border-slate-600 bg-slate-700 text-white",
                    !startDate && "text-slate-400"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm text-slate-300">Data Final</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal border-slate-600 bg-slate-700 text-white",
                    !endDate && "text-slate-400"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-end space-x-2">
            <Button onClick={handleFilter} className="bg-blue-600 hover:bg-blue-700">
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
            <Button onClick={clearFilter} variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
              Limpar
            </Button>
          </div>
        </div>

        {periodLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Carregando logs do período selecionado...</p>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Usuário</TableHead>
                  <TableHead className="text-slate-300">Tipo de Ação</TableHead>
                  <TableHead className="text-slate-300">Data/Hora</TableHead>
                  <TableHead className="text-slate-300">Detalhes</TableHead>
                  <TableHead className="text-slate-300">Fonte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.slice(0, 20).map((log) => (
                  <TableRow key={log.id} className="border-slate-700">
                    <TableCell className="text-white">{log.userEmail}</TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="text-slate-300">{log.timestamp}</TableCell>
                    <TableCell className="text-slate-400">{log.details || log.action}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                        {startDate && endDate && periodLogs.length > 0 ? 'Firebase' : 'Legacy'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400">Nenhum log encontrado neste período.</p>
          </div>
        )}

        {filteredLogs.length > 20 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-400">
              Mostrando os primeiros 20 resultados de {filteredLogs.length} logs encontrados.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DateRangeFilter;
