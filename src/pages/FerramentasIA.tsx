import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { Bot, Sparkles, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { OptimizationResults } from '@/components/OptimizationResults';
import { AIOptimizationService } from '@/services/AIOptimizationService';

interface OptimizationOption {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const FerramentasIA = () => {
  const { config } = useConfig();
  const baserowService = useBaserowService();
  
  const [optimizationOptions, setOptimizationOptions] = useState<OptimizationOption[]>([
    {
      id: 'nome',
      label: 'Corrigir Nome',
      description: 'Padronizar e corrigir nomes de filmes e séries',
      enabled: false
    },
    {
      id: 'sinopse',
      label: 'Gerar/Preencher Sinopse',
      description: 'Criar ou melhorar sinopses baseadas no nome do conteúdo',
      enabled: false
    },
    {
      id: 'tipo',
      label: 'Determinar Tipo',
      description: 'Classificar automaticamente como Filme, Série ou TV',
      enabled: false
    },
    {
      id: 'categorias',
      label: 'Sugerir Categorias',
      description: 'Sugerir gêneros e categorias apropriadas',
      enabled: false
    }
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Buscar dados de conteúdos
  const { data: contentData, isLoading, error } = useQuery({
    queryKey: ['content-for-ai', config?.tableIds?.conteudos],
    queryFn: async () => {
      if (!config?.tableIds?.conteudos) {
        console.log('Table ID não configurado');
        return [];
      }
      try {
        const response = await baserowService.getAllTableData(config.tableIds.conteudos);
        console.log('Dados carregados:', response);
        return response.results?.slice(0, 20) || []; // Limitar a 20 registros para teste
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        return [];
      }
    },
    enabled: !!config?.tableIds?.conteudos
  });

  const handleOptionToggle = (optionId: string) => {
    setOptimizationOptions(prev =>
      prev.map(option =>
        option.id === optionId
          ? { ...option, enabled: !option.enabled }
          : option
      )
    );
  };

  const handleExecuteOptimization = async () => {
    const enabledOptions = optimizationOptions.filter(opt => opt.enabled);
    
    if (enabledOptions.length === 0) {
      console.log("Selecione pelo menos uma opção para otimização.");
      return;
    }

    if (!contentData || contentData.length === 0) {
      console.log("Não há dados para processar.");
      return;
    }

    setIsProcessing(true);
    
    try {
      const aiService = new AIOptimizationService();
      const results = await aiService.optimizeContent(contentData, enabledOptions);
      
      setOptimizationResults(results);
      setShowResults(true);
      
      console.log(`${results.length} itens processados com sucesso.`);
    } catch (error) {
      console.error('Erro na otimização:', error);
      console.log("Ocorreu um erro ao processar os dados.");
    } finally {
      setIsProcessing(false);
    }
  };

  const hasEnabledOptions = optimizationOptions.some(opt => opt.enabled);

  if (showResults) {
    return (
      <OptimizationResults
        results={optimizationResults}
        onBack={() => setShowResults(false)}
        enabledOptions={optimizationOptions.filter(opt => opt.enabled)}
      />
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
            <Bot className="h-8 w-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Ferramentas de IA
            </h1>
            <p className="text-muted-foreground mt-1">
              Use inteligência artificial para otimizar seu conteúdo automaticamente
            </p>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {error && (
        <Card className="mb-6 border-red-500/20 bg-red-500/10">
          <CardContent className="p-4">
            <p className="text-red-400">Erro ao carregar dados: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="netflix-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              Conteúdos Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">
              {isLoading ? '...' : contentData?.length || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              Registros prontos para otimização
            </p>
          </CardContent>
        </Card>

        <Card className="netflix-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Opções Selecionadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {optimizationOptions.filter(opt => opt.enabled).length}
            </div>
            <p className="text-sm text-muted-foreground">
              de {optimizationOptions.length} disponíveis
            </p>
          </CardContent>
        </Card>

        <Card className="netflix-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-400" />
              Status IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {isProcessing ? 'Processando' : 'Pronta'}
            </div>
            <p className="text-sm text-muted-foreground">
              Sistema de otimização
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Configuração */}
      <Card className="netflix-card mb-8">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Bot className="h-6 w-6 text-purple-400" />
            Configurar Otimizações
          </CardTitle>
          <CardDescription>
            Selecione quais campos você deseja otimizar usando inteligência artificial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {optimizationOptions.map((option) => (
              <div
                key={option.id}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  option.enabled
                    ? 'border-purple-500/50 bg-purple-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id={option.id}
                    checked={option.enabled}
                    onCheckedChange={() => handleOptionToggle(option.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={option.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {option.label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!hasEnabledOptions && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Selecione pelo menos uma opção para continuar
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão de Execução */}
      <div className="flex justify-center">
        <Button
          onClick={handleExecuteOptimization}
          disabled={!hasEnabledOptions || isProcessing || isLoading}
          size="lg"
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Executar Otimização
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default FerramentasIA;
