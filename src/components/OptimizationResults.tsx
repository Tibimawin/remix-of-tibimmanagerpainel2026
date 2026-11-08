
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { ArrowLeft, Check, X, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OptimizationResultsProps {
  results: any[];
  onBack: () => void;
  enabledOptions: Array<{ id: string; label: string }>;
}

export const OptimizationResults: React.FC<OptimizationResultsProps> = ({
  results,
  onBack,
  enabledOptions
}) => {
  const { config } = useConfig();
  const baserowService = useBaserowService();
  
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(results.map(r => r.id)));
  const [isApplying, setIsApplying] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleApplyChanges = async () => {
    if (selectedItems.size === 0) {
      toast.warning("Nenhum item selecionado para aplicar.");
      return;
    }

    setIsApplying(true);

    try {
      const selectedResults = results.filter(result => selectedItems.has(result.id));
      
      for (const result of selectedResults) {
        const updateData: any = {};
        
        if (result.optimized.Nome && result.optimized.Nome !== result.original.Nome) {
          updateData.Nome = result.optimized.Nome;
        }
        
        if (result.optimized.Sinopse && result.optimized.Sinopse !== result.original.Sinopse) {
          updateData.Sinopse = result.optimized.Sinopse;
        }
        
        if (result.optimized.Tipo && result.optimized.Tipo !== result.original.Tipo) {
          updateData.Tipo = result.optimized.Tipo;
        }
        
        if (result.optimized.Categoria && result.optimized.Categoria !== result.original.Categoria) {
          updateData.Categoria = result.optimized.Categoria;
        }

        if (Object.keys(updateData).length > 0) {
          await baserowService.updateRow(config.tableIds.conteudos, result.id, updateData);
        }
      }

      toast.success(`${selectedResults.length} itens foram atualizados com sucesso.`);
      onBack();
    } catch (error) {
      console.error('Erro ao aplicar alterações:', error);
      toast.error("Ocorreu um erro ao salvar as modificações.");
    } finally {
      setIsApplying(false);
    }
  };

  const getChangedFields = (result: any) => {
    const changes = [];
    
    if (result.optimized.Nome && result.optimized.Nome !== result.original.Nome) {
      changes.push('Nome');
    }
    if (result.optimized.Sinopse && result.optimized.Sinopse !== result.original.Sinopse) {
      changes.push('Sinopse');
    }
    if (result.optimized.Tipo && result.optimized.Tipo !== result.original.Tipo) {
      changes.push('Tipo');
    }
    if (result.optimized.Categoria && result.optimized.Categoria !== result.original.Categoria) {
      changes.push('Categoria');
    }
    
    return changes;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Resultados da Otimização</h1>
          <p className="text-muted-foreground">
            Revise as sugestões antes de aplicar as alterações
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="netflix-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-400">{results.length}</div>
            <p className="text-sm text-muted-foreground">Itens processados</p>
          </CardContent>
        </Card>
        
        <Card className="netflix-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-400">{selectedItems.size}</div>
            <p className="text-sm text-muted-foreground">Selecionados</p>
          </CardContent>
        </Card>
        
        <Card className="netflix-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-400">{enabledOptions.length}</div>
            <p className="text-sm text-muted-foreground">Campos otimizados</p>
          </CardContent>
        </Card>
        
        <Card className="netflix-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {results.filter(r => getChangedFields(r).length > 0).length}
            </div>
            <p className="text-sm text-muted-foreground">Com alterações</p>
          </CardContent>
        </Card>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSelectedItems(new Set(results.map(r => r.id)))}
          >
            Selecionar Todos
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedItems(new Set())}
          >
            Desmarcar Todos
          </Button>
        </div>
        
        <Button
          onClick={handleApplyChanges}
          disabled={selectedItems.size === 0 || isApplying}
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {isApplying ? 'Aplicando...' : `Aplicar Alterações (${selectedItems.size})`}
        </Button>
      </div>

      {/* Lista de Resultados */}
      <div className="space-y-4">
        {results.map((result) => {
          const changedFields = getChangedFields(result);
          const isSelected = selectedItems.has(result.id);
          const isExpanded = expandedItems.has(result.id);
          
          return (
            <Card key={result.id} className={`netflix-card ${isSelected ? 'ring-2 ring-purple-500' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItemSelection(result.id)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <div>
                      <CardTitle className="text-lg">{result.original.Nome}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        {changedFields.length > 0 ? (
                          changedFields.map(field => (
                            <Badge key={field} variant="secondary" className="text-xs">
                              {field}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Sem alterações
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleItemExpansion(result.id)}
                  >
                    {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="space-y-4">
                  {enabledOptions.map(option => {
                    const fieldMap: { [key: string]: string } = {
                      nome: 'Nome',
                      sinopse: 'Sinopse',
                      tipo: 'Tipo',
                      categorias: 'Categoria'
                    };
                    
                    const fieldName = fieldMap[option.id];
                    const original = result.original[fieldName];
                    const optimized = result.optimized[fieldName];
                    
                    if (!optimized || optimized === original) return null;
                    
                    return (
                      <div key={option.id} className="border rounded-lg p-4 bg-gray-800/50">
                        <h4 className="font-medium mb-2 text-purple-400">{option.label}</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-muted-foreground">Original</label>
                            <div className="p-2 bg-red-900/20 border border-red-500/30 rounded text-sm">
                              {original || '(vazio)'}
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-sm text-muted-foreground">Sugestão IA</label>
                            <div className="p-2 bg-green-900/20 border border-green-500/30 rounded text-sm">
                              {optimized}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
