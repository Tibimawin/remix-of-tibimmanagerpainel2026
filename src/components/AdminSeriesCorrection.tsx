
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface SeriesData {
  id: string;
  name: string;
  originalName: string;
  correctedName: string;
  status: 'pending' | 'corrected' | 'ignored';
  lastUpdated: string;
}

export const AdminSeriesCorrection = () => {
  const [series, setSeries] = useState<SeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const fetchSeriesData = async (attempt = 0) => {
    try {
      setLoading(true);
      console.log(`Tentativa ${attempt + 1} de carregar dados das séries...`);
      
      // Busca séries que precisam de correção na tabela de Conteúdos do Baserow
      // Consideramos "pendente" itens onde o Nome parece precisar de ajuste 
      // ou séries recém importadas sem metadados completos.
      // Por enquanto, mantemos uma lista vazia ou buscamos do Baserow se configurado.
      const realData: SeriesData[] = [];
      
      setSeries(realData);
      setRetryCount(0);
      console.log('Dados das séries carregados (vazio por padrão até integração total):', realData);
      
    } catch (error) {
      console.error('Erro ao carregar séries:', error);
      
      if (attempt < maxRetries) {
        const nextAttempt = attempt + 1;
        setRetryCount(nextAttempt);
        console.log(`Tentando novamente em 2 segundos... (tentativa ${nextAttempt}/${maxRetries})`);
        
        setTimeout(() => {
          fetchSeriesData(nextAttempt);
        }, 2000);
      } else {
        toast.error('Erro ao carregar dados das séries após múltiplas tentativas');
        setRetryCount(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeriesData();
  }, []);

  const handleCorrectSeries = async (seriesId: string) => {
    setCorrecting(seriesId);
    
    try {
      console.log(`Corrigindo série ${seriesId}...`);
      
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSeries(prev => prev.map(s => 
        s.id === seriesId 
          ? { ...s, status: 'corrected' as const, lastUpdated: new Date().toISOString() }
          : s
      ));
      
      toast.success('Série corrigida com sucesso!');
      
    } catch (error) {
      console.error('Erro ao corrigir série:', error);
      toast.error('Erro ao corrigir série');
    } finally {
      setCorrecting(null);
    }
  };

  const handleIgnoreSeries = async (seriesId: string) => {
    try {
      setSeries(prev => prev.map(s => 
        s.id === seriesId 
          ? { ...s, status: 'ignored' as const, lastUpdated: new Date().toISOString() }
          : s
      ));
      
      toast.success('Série ignorada');
      
    } catch (error) {
      console.error('Erro ao ignorar série:', error);
      toast.error('Erro ao ignorar série');
    }
  };

  const filteredSeries = series.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.correctedName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: SeriesData['status']) => {
    switch (status) {
      case 'corrected':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Corrigida</Badge>;
      case 'ignored':
        return <Badge className="bg-gray-100 text-gray-800"><XCircle className="w-3 h-3 mr-1" />Ignorada</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando Correção de Séries
            {retryCount > 0 && (
              <Badge variant="outline">
                Tentativa {retryCount}/{maxRetries}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Carregando dados das séries...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Correção de Séries</CardTitle>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar séries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            onClick={() => fetchSeriesData()} 
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {filteredSeries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma série encontrada' : 'Nenhuma série para correção'}
              </p>
            </div>
          ) : (
            filteredSeries.map((seriesItem) => (
              <div key={seriesItem.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{seriesItem.originalName}</h4>
                    <p className="text-sm text-muted-foreground">
                      Sugestão: {seriesItem.correctedName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Atualizado: {new Date(seriesItem.lastUpdated).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(seriesItem.status)}
                  </div>
                </div>
                
                {seriesItem.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleCorrectSeries(seriesItem.id)}
                      disabled={correcting === seriesItem.id}
                    >
                      {correcting === seriesItem.id ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Corrigindo...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Corrigir
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleIgnoreSeries(seriesItem.id)}
                      disabled={correcting === seriesItem.id}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Ignorar
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
