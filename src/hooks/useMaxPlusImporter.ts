
import { useState } from 'react';
import { toast } from 'sonner';
import { useSystemLogs } from '@/hooks/useSystemLogs';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { maxPlusService, ScrapedContent } from '@/services/MaxPlusService';

export const useMaxPlusImporter = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedContent | null>(null);
  const { addLog } = useSystemLogs();
  const baserowService = useBaserowService();
  const { config } = useConfig();

  const handleFieldChange = (field: keyof ScrapedContent, value: string | number) => {
    setScrapedData(prev => {
        if (!prev) return null;
        return { ...prev, [field]: value };
    });
  };

  const handleSearch = async () => {
    console.log('handleSearch called with:', searchTerm);
    
    if (!searchTerm) {
      toast.error('Por favor, insira um termo de pesquisa.');
      return;
    }
    
    setLoading(true);
    setScrapedData(null);
    toast('Buscando conteúdo...', { description: `Buscando por "${searchTerm}"...` });

    try {
      console.log('Calling maxPlusService.searchContent with:', searchTerm);
      const data = await maxPlusService.searchContent(searchTerm);
      console.log('Search result:', data);

      if (!data) {
        toast.error('Nenhum resultado encontrado', { description: `Não foi possível encontrar "${searchTerm}".` });
        setLoading(false);
        return;
      }
      
      setScrapedData(data);
      toast.success('Conteúdo encontrado com sucesso!');
      console.log('Data set to state:', data);

    } catch (error) {
      console.error("Erro na busca:", error);
      toast.error('Ocorreu um erro ao processar a busca.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportContent = async () => {
    if (!scrapedData) return;
    toast('Importando conteúdo...');
    try {
      const payload = {
        'Nome': scrapedData.nome,
        'Link': scrapedData.tipo === 'Filme' ? scrapedData.streamLink : scrapedData.linkCapa,
        'Categoria': scrapedData.categoria,
        'Sinopse': scrapedData.sinopse,
        'Tipo': scrapedData.tipo,
        'Views': '0',
        'Idioma': scrapedData.idioma,
        'Temporadas': scrapedData.temporadas,
      };
      await baserowService.createRow(config.tableIds.conteudos, payload);
      toast.success('Conteúdo importado com sucesso!');
      addLog('Importou conteúdo do MaxPlus', `Nome: ${scrapedData.nome}`);
      setScrapedData(null);
      setSearchTerm('');
    } catch (error) {
      console.error('Erro ao importar conteúdo:', error);
      toast.error('Falha ao importar conteúdo.', { description: String(error) });
    }
  };
  
  const handleImportContentAndEpisodes = async () => {
    if (!scrapedData || !scrapedData.episodios) {
      console.error('Dados insuficientes para importação:', { scrapedData, episodios: scrapedData?.episodios });
      toast.error('Dados insuficientes para importação de episódios.');
      return;
    }
    
    console.log('Iniciando importação de série e episódios:', {
      nome: scrapedData.nome,
      totalEpisodios: scrapedData.episodios.length,
      userAgent: navigator.userAgent
    });
    
    toast('Importando série e episódios...');
    
    try {
        const contentPayload = {
            'Nome': scrapedData.nome,
            'Link': scrapedData.linkCapa,
            'Categoria': scrapedData.categoria,
            'Sinopse': scrapedData.sinopse,
            'Tipo': scrapedData.tipo,
            'Views': '0',
            'Idioma': scrapedData.idioma,
            'Temporadas': scrapedData.temporadas,
        };
        
        console.log('Criando conteúdo principal:', contentPayload);
        const createdContent = await baserowService.createRow(config.tableIds.conteudos, contentPayload);
        console.log('Conteúdo criado com ID:', createdContent.id);
        
        addLog('Importou série do MaxPlus', `Nome: ${scrapedData.nome}`);

        // Importar episódios um por vez para detectar falhas específicas
        let episodiosImportados = 0;
        for (let i = 0; i < scrapedData.episodios.length; i++) {
            const episodio = scrapedData.episodios[i];
            try {
                const episodePayload = {
                    'Nome': episodio.nome,
                    'Temporada': episodio.temporada,
                    'Episódio': episodio.episodio,
                    'Link': episodio.link,
                    'Conteudo': [createdContent.id]
                };
                
                console.log(`Importando episódio ${i + 1}/${scrapedData.episodios.length}:`, episodePayload);
                await baserowService.createRow(config.tableIds.episodios, episodePayload);
                episodiosImportados++;
                
                // Pequena pausa para evitar sobrecarga em dispositivos móveis
                if (i < scrapedData.episodios.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (episodeError) {
                console.error(`Erro ao importar episódio ${i + 1}:`, episodeError);
                // Continuar com os próximos episódios mesmo se um falhar
            }
        }
        
        if (episodiosImportados === scrapedData.episodios.length) {
            toast.success('Série e episódios importados com sucesso!');
        } else {
            toast.success(`Série importada! ${episodiosImportados}/${scrapedData.episodios.length} episódios importados.`);
        }
        
        addLog('Importou episódios do MaxPlus', `Série: ${scrapedData.nome}, Episódios: ${episodiosImportados}/${scrapedData.episodios.length}`);
        setScrapedData(null);
        setSearchTerm('');
    } catch (error) {
        console.error('Erro ao importar conteúdo e episódios:', error);
        toast.error('Falha ao importar.', { description: String(error) });
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    loading,
    scrapedData,
    handleSearch,
    handleImportContent,
    handleImportContentAndEpisodes,
    handleFieldChange,
  };
};
