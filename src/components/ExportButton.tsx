import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  data: any[];
  tableName: string;
  columns: string[];
}

export const ExportButton: React.FC<ExportButtonProps> = ({ data, tableName, columns }) => {
  const [loading, setLoading] = useState(false);

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const exportToCSV = () => {
    try {
      setLoading(true);
      
      if (data.length === 0) {
        // toast({
        //   title: "Aviso",
        //   description: "Não há dados for exportar.",
        // });
        return;
      }

      // Criar cabeçalhos CSV
      const headers = columns.join(',');
      
      // Converter dados para CSV
      const csvRows = data.map(item => {
        return columns.map(column => {
          let value = item[column] || '';
          
          // Tratamento especial para diferentes tipos de dados
          if (Array.isArray(value)) {
            value = value.join(';'); // Usar ; para separar arrays
          } else if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          } else if (typeof value === 'string' && value.includes(',')) {
            value = `"${value}"`; // Escapar vírgulas
          }
          
          return value;
        }).join(',');
      });

      const csvContent = [headers, ...csvRows].join('\n');
      
      // Download do arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${tableName}_export_${getCurrentDate()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // toast({
      //   title: "Sucesso",
      //   description: `Dados exportados para ${tableName}_export_${getCurrentDate()}.csv`,
      // });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      // toast({
      //   title: "Erro",
      //   description: "Não foi possível exportar os dados em CSV.",
      //   variant: "destructive",
      // });
    } finally {
      setLoading(false);
    }
  };

  const exportToJSON = () => {
    try {
      setLoading(true);
      
      if (data.length === 0) {
        // toast({
        //   title: "Aviso",
        //   description: "Não há dados para exportar.",
        // });
        return;
      }

      // Filtrar dados apenas com as colunas necessárias
      const filteredData = data.map(item => {
        const filteredItem: any = {};
        columns.forEach(column => {
          filteredItem[column] = item[column];
        });
        return filteredItem;
      });

      const jsonContent = JSON.stringify(filteredData, null, 2);
      
      // Download do arquivo
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${tableName}_export_${getCurrentDate()}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // toast({
      //   title: "Sucesso",
      //   description: `Dados exportados para ${tableName}_export_${getCurrentDate()}.json`,
      // });
    } catch (error) {
      console.error('Erro ao exportar JSON:', error);
      // toast({
      //   title: "Erro",
      //   description: "Não foi possível exportar os dados em JSON.",
      //   variant: "destructive",
      // });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          <Download className="h-4 w-4 mr-2" />
          {loading ? 'Exportando...' : 'Exportar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportToCSV}>
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          Exportar JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
