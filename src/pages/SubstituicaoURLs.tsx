
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { RefreshCw, Link2, Database, FileText } from 'lucide-react';

const SubstituicaoURLs = () => {
  const baserowService = useBaserowService();
  const { config } = useConfig();

  // Estados para Conteúdos
  const [conteudosUrlAtual, setConteudosUrlAtual] = useState('');
  const [conteudosUrlNova, setConteudosUrlNova] = useState('');
  const [conteudosLoading, setConteudosLoading] = useState(false);

  // Estados para Episódios
  const [episodiosUrlAtual, setEpisodiosUrlAtual] = useState('');
  const [episodiosUrlNova, setEpisodiosUrlNova] = useState('');
  const [episodiosLoading, setEpisodiosLoading] = useState(false);

  const handleSubstituirConteudos = async () => {
    if (!conteudosUrlAtual.trim() || !conteudosUrlNova.trim()) {
      toast.error("Preencha tanto a URL atual quanto a nova URL.");
      return;
    }

    setConteudosLoading(true);
    
    try {
      console.log('Iniciando substituição de URLs em Conteúdos...');
      
      // Use either the direct conteudosTableId or fall back to tableIds.conteudos
      const tableId = config.conteudosTableId || config.tableIds.conteudos;
      if (!tableId) {
        toast.error("ID da tabela de conteúdos não configurado.");
        return;
      }
      
      // Buscar todos os conteúdos
      const response = await baserowService.getAllTableData(tableId);
      const conteudos = response.results || [];
      
      console.log(`Total de conteúdos encontrados: ${conteudos.length}`);
      
      // Filtrar apenas os que contêm a URL antiga
      const conteudosParaAtualizar = conteudos.filter(conteudo => 
        conteudo.Link && conteudo.Link.includes(conteudosUrlAtual)
      );
      
      console.log(`Conteúdos para atualizar: ${conteudosParaAtualizar.length}`);
      
      if (conteudosParaAtualizar.length === 0) {
        toast.info("Não foram encontrados conteúdos com a URL especificada.");
        return;
      }
      
      // Realizar as substituições
      let sucessos = 0;
      let erros = 0;
      
      for (const conteudo of conteudosParaAtualizar) {
        try {
          const novoLink = conteudo.Link.replace(new RegExp(conteudosUrlAtual.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), conteudosUrlNova);
          
          await baserowService.updateRow(tableId, conteudo.id.toString(), {
            Link: novoLink
          });
          
          sucessos++;
          console.log(`Conteúdo ${conteudo.id} atualizado com sucesso`);
        } catch (error) {
          console.error(`Erro ao atualizar conteúdo ${conteudo.id}:`, error);
          erros++;
        }
      }
      
      if (erros > 0) {
        toast.error(`${sucessos} conteúdos atualizados com sucesso. ${erros} erros.`);
      } else {
        toast.success(`${sucessos} conteúdos atualizados com sucesso.`);
      }
      
      // Limpar campos após sucesso
      if (sucessos > 0) {
        setConteudosUrlAtual('');
        setConteudosUrlNova('');
      }
      
    } catch (error) {
      console.error('Erro na substituição de URLs em Conteúdos:', error);
      toast.error("Ocorreu um erro ao processar a substituição de URLs.");
    } finally {
      setConteudosLoading(false);
    }
  };

  const handleSubstituirEpisodios = async () => {
    if (!episodiosUrlAtual.trim() || !episodiosUrlNova.trim()) {
      toast.error("Preencha tanto a URL atual quanto a nova URL.");
      return;
    }

    setEpisodiosLoading(true);
    
    try {
      console.log('Iniciando substituição de URLs em Episódios...');
      console.log('Config atual:', { 
        episodiosTableId: config.episodiosTableId, 
        tableIds: config.tableIds 
      });
      
      // Use either the direct episodiosTableId or fall back to tableIds.episodios
      const tableId = config.episodiosTableId || config.tableIds?.episodios;
      console.log('Table ID usado:', tableId);
      
      if (!tableId) {
        console.error("ID da tabela de episódios não configurado");
        toast.error("ID da tabela de episódios não configurado.");
        return;
      }
      
      // Buscar todos os episódios
      console.log('Buscando dados da tabela:', tableId);
      
      // Criar instância do baserowService para debug
      console.log('BaserowService config:', {
        apiToken: config.apiToken?.substring(0, 10) + '...',
        baseUrl: config.baseUrl
      });
      
      let response;
      try {
        console.log('=== INICIANDO CHAMADA API PARA EPISÓDIOS ===');
        console.log('Parâmetros da chamada:', { tableId, tipo: 'episódios' });
        
        response = await baserowService.getAllTableData(tableId);
        
        console.log('=== RESPOSTA DA API RECEBIDA ===');
        console.log('Response completo:', response);
        console.log('Response.results existe?', !!response?.results);
        console.log('Response.results length:', response?.results?.length || 0);
        
      } catch (apiError) {
        console.error('=== ERRO NA CHAMADA DA API ===');
        console.error('Erro completo:', apiError);
        console.error('Message:', apiError.message);
        console.error('Stack:', apiError.stack);
        toast.error(`Erro ao buscar dados da tabela de episódios: ${apiError.message}`);
        return;
      }
      
      const episodios = response.results || [];
      
      console.log(`Total de episódios encontrados: ${episodios.length}`);
      console.log('Primeiro episódio:', episodios[0]);
      
      // Filtrar apenas os que contêm a URL antiga
      const episodiosParaAtualizar = episodios.filter(episodio => {
        const hasLink = episodio.Link && typeof episodio.Link === 'string';
        const containsUrl = hasLink && episodio.Link.includes(episodiosUrlAtual);
        console.log(`Episódio ${episodio.id}: Link="${episodio.Link}", hasLink=${hasLink}, containsUrl=${containsUrl}`);
        return containsUrl;
      });
      
      console.log(`Episódios para atualizar: ${episodiosParaAtualizar.length}`);
      
      if (episodiosParaAtualizar.length === 0) {
        toast.info("Não foram encontrados episódios com a URL especificada.");
        return;
      }
      
      // Realizar as substituições
      let sucessos = 0;
      let erros = 0;
      
      for (const episodio of episodiosParaAtualizar) {
        try {
          const novoLink = episodio.Link.replace(new RegExp(episodiosUrlAtual.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), episodiosUrlNova);
          console.log(`Substituindo: "${episodio.Link}" -> "${novoLink}"`);
          
          await baserowService.updateRow(tableId, episodio.id.toString(), {
            Link: novoLink
          });
          
          sucessos++;
          console.log(`Episódio ${episodio.id} atualizado com sucesso`);
        } catch (error) {
          console.error(`Erro ao atualizar episódio ${episodio.id}:`, error);
          erros++;
        }
      }
      
      if (erros > 0) {
        toast.error(`${sucessos} episódios atualizados com sucesso. ${erros} erros.`);
      } else {
        toast.success(`${sucessos} episódios atualizados com sucesso.`);
      }
      
      // Limpar campos após sucesso
      if (sucessos > 0) {
        setEpisodiosUrlAtual('');
        setEpisodiosUrlNova('');
      }
      
    } catch (error) {
      console.error('Erro na substituição de URLs em Episódios:', error);
      toast.error("Ocorreu um erro ao processar a substituição de URLs.");
    } finally {
      setEpisodiosLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Link2 className="h-8 w-8 text-primary" />
          Substituição de URLs
        </h1>
        <p className="text-muted-foreground mt-2">
          Substitua partes das URLs em massa nas tabelas de Conteúdos e Episódios
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seção 1: Substituir URLs de Conteúdos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Substituir URLs de Conteúdos
            </CardTitle>
            <CardDescription>
              Substitua partes das URLs no campo Link da tabela de Conteúdos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="conteudos-url-atual">Base de URL atual</Label>
              <Input
                id="conteudos-url-atual"
                placeholder="fhd4.filme.com/seu-id-aqui"
                value={conteudosUrlAtual}
                onChange={(e) => setConteudosUrlAtual(e.target.value)}
                disabled={conteudosLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Parte da URL que será substituída
              </p>
            </div>
            
            <div>
              <Label htmlFor="conteudos-url-nova">Base de URL nova</Label>
              <Input
                id="conteudos-url-nova"
                placeholder="fhd4.filme.com/seu-id-aqui/FHD4"
                value={conteudosUrlNova}
                onChange={(e) => setConteudosUrlNova(e.target.value)}
                disabled={conteudosLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nova parte da URL que substituirá a anterior
              </p>
            </div>

            <Separator />

            <div className="bg-muted/30 p-3 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Exemplo de substituição:</h4>
              <div className="text-xs space-y-1 font-mono">
                <div><span className="text-muted-foreground">Original:</span> fhd4.filme.com/seu-id-aqui/tt123456.mp4</div>
                <div><span className="text-muted-foreground">Resultado:</span> fhd4.filme.com/seu-id-aqui/FHD4/tt123456.mp4</div>
              </div>
            </div>

            <Button 
              onClick={handleSubstituirConteudos}
              disabled={conteudosLoading || !conteudosUrlAtual.trim() || !conteudosUrlNova.trim()}
              className="w-full"
            >
              {conteudosLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Substituir em Conteúdos
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Seção 2: Substituir URLs de Episódios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Substituir URLs de Episódios
            </CardTitle>
            <CardDescription>
              Substitua partes das URLs no campo Link da tabela de Episódios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="episodios-url-atual">Base de URL atual</Label>
              <Input
                id="episodios-url-atual"
                placeholder="fhd4.filme.com/seu-id-aqui"
                value={episodiosUrlAtual}
                onChange={(e) => setEpisodiosUrlAtual(e.target.value)}
                disabled={episodiosLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Parte da URL que será substituída
              </p>
            </div>
            
            <div>
              <Label htmlFor="episodios-url-nova">Base de URL nova</Label>
              <Input
                id="episodios-url-nova"
                placeholder="fhd4.filme.com/seu-id-aqui/FHD4"
                value={episodiosUrlNova}
                onChange={(e) => setEpisodiosUrlNova(e.target.value)}
                disabled={episodiosLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nova parte da URL que substituirá a anterior
              </p>
            </div>

            <Separator />

            <div className="bg-muted/30 p-3 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Exemplo de substituição:</h4>
              <div className="text-xs space-y-1 font-mono">
                <div><span className="text-muted-foreground">Original:</span> fhd4.filme.com/seu-id-aqui/s01e01.mp4</div>
                <div><span className="text-muted-foreground">Resultado:</span> fhd4.filme.com/seu-id-aqui/FHD4/s01e01.mp4</div>
              </div>
            </div>

            <Button 
              onClick={handleSubstituirEpisodios}
              disabled={episodiosLoading || !episodiosUrlAtual.trim() || !episodiosUrlNova.trim()}
              className="w-full"
            >
              {episodiosLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Substituir em Episódios
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Avisos Importantes */}
      <Card className="mt-6 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
        <CardHeader>
          <CardTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Importante
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-700 dark:text-amber-300 space-y-2">
          <p>• Esta operação modifica permanentemente os links dos seus conteúdos</p>
          <p>• Apenas registros que contenham exatamente a URL especificada serão alterados</p>
          <p>• A substituição é feita usando correspondência exata da string fornecida</p>
          <p>• Recomendamos fazer backup dos dados antes de executar operações em massa</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubstituicaoURLs;
