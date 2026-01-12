
import { useState } from 'react';
import { contentSearchService, ContentData } from '@/services/ContentSearchService';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { toast } from 'sonner';

export const useContentForm = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const baserowService = useBaserowService();
  const { config } = useConfig();

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Digite o nome ou ID do conteúdo');
      return;
    }

    setLoading(true);
    setContentData(null);

    try {
      toast.info('Buscando no TMDb...');
      const data = await contentSearchService.searchByNameOrId(searchTerm);
      
      if (!data) {
        toast.error('Conteúdo não encontrado no TMDb');
        return;
      }

      // Adicionar os novos campos que podem estar vazios inicialmente
      const enhancedData = {
        ...data,
        link: data.link || '',
        sinopse: data.sinopse || ''
      };

      setContentData(enhancedData);
      toast.success('Conteúdo encontrado!');
      
    } catch (error) {
      console.error('Erro na busca:', error);
      toast.error('Erro ao buscar conteúdo');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!contentData) {
      toast.error('Nenhum conteúdo para salvar');
      return;
    }

    // Verificar se a configuração está disponível
    if (!config.tableIds.conteudos) {
      toast.error('Configuração da tabela de conteúdos não encontrada. Verifique as configurações.');
      return;
    }

    setSaving(true);

    try {
      toast.info('Verificando duplicatas...');
      
      // Verificar se já existe (buscar por nome) - usar o ID real da tabela
      const existingData = await baserowService.getAllTableData(config.tableIds.conteudos);
      const duplicate = existingData.results.find((item: any) => 
        item.Nome?.toLowerCase() === contentData.nome.toLowerCase() ||
        item.nome?.toLowerCase() === contentData.nome.toLowerCase()
      );

      if (duplicate) {
        toast.error('Este conteúdo já existe no banco de dados');
        return;
      }

      toast.info('Salvando no Baserow...');
      console.log('=== DADOS PARA SALVAR NO BASEROW ===');
      console.log('Content Data original:', JSON.stringify(contentData, null, 2));
      console.log('Table ID sendo usado:', config.tableIds.conteudos);
      
      // Mapear os campos para os nomes corretos do Baserow
      const baserowData = {
        'Nome': contentData.nome,
        'Capa': contentData.capa,
        'Capa Fundo': contentData.capa_fundo,
        'Views': contentData.views,
        'Idioma': contentData.idioma,
        'Tipo': contentData.tipo,
        'Sinopse': contentData.sinopse,
        'Categoria': contentData.categoria,
        'IMDb': contentData.imdb,
        'Data Lançamento': contentData.data_lancamento,
        'Duração': contentData.duracao,
        'Link': contentData.link,
      };
      
      // Adicionar temporadas se for série
      if (contentData.temporadas) {
        baserowData['Temporadas'] = contentData.temporadas;
      }
      
      console.log('Dados mapeados para Baserow:', JSON.stringify(baserowData, null, 2));
      
      // Usar o ID real da tabela em vez do nome
      await baserowService.createRow(config.tableIds.conteudos, baserowData);
      
      toast.success('Conteúdo salvo com sucesso!');
      
      // Limpar formulário
      setSearchTerm('');
      setContentData(null);
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar conteúdo');
    } finally {
      setSaving(false);
    }
  };

  const updateContentData = (field: keyof ContentData, value: any) => {
    if (!contentData) return;
    
    setContentData({
      ...contentData,
      [field]: value,
    });
  };

  return {
    searchTerm,
    setSearchTerm,
    contentData,
    loading,
    saving,
    handleSearch,
    handleSave,
    updateContentData,
  };
};
