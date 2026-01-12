
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Save, Loader2 } from 'lucide-react';
import { useContentForm } from '@/hooks/useContentForm';

const AdicionarConteudo = () => {
  const {
    searchTerm,
    setSearchTerm,
    contentData,
    loading,
    saving,
    handleSearch,
    handleSave,
    updateContentData,
  } = useContentForm();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Adicionar Conteúdo</h1>
        <p className="text-muted-foreground mt-2">
          Busque conteúdos no TMDb e adicione ao seu banco de dados
        </p>
      </div>

      {/* Formulário de Busca */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Buscar Conteúdo</CardTitle>
          <CardDescription>
            Digite o nome do filme/série ou o ID do TMDb
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Ex: Vingadores, 299536, Breaking Bad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Dados */}
      {contentData && (
        <Card>
          <CardHeader>
            <CardTitle>Dados do Conteúdo</CardTitle>
            <CardDescription>
              Revise e edite os dados antes de salvar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome */}
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={contentData.nome}
                  onChange={(e) => updateContentData('nome', e.target.value)}
                />
              </div>

              {/* Tipo */}
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Select 
                  value={contentData.tipo} 
                  onValueChange={(value) => updateContentData('tipo', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Filme">Filme</SelectItem>
                    <SelectItem value="Série">Série</SelectItem>
                    <SelectItem value="TV">TV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Idioma */}
              <div>
                <Label htmlFor="idioma">Idioma *</Label>
                <Select 
                  value={contentData.idioma} 
                  onValueChange={(value) => updateContentData('idioma', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DUB">DUB</SelectItem>
                    <SelectItem value="LEG">LEG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Views */}
              <div>
                <Label htmlFor="views">Views</Label>
                <Input
                  id="views"
                  type="number"
                  value={contentData.views}
                  onChange={(e) => updateContentData('views', parseInt(e.target.value) || 0)}
                />
              </div>

              {/* Data de Lançamento */}
              <div>
                <Label htmlFor="data_lancamento">Data de Lançamento</Label>
                <Input
                  id="data_lancamento"
                  type="date"
                  value={contentData.data_lancamento}
                  onChange={(e) => updateContentData('data_lancamento', e.target.value)}
                />
              </div>

              {/* Duração */}
              <div>
                <Label htmlFor="duracao">Duração</Label>
                <Input
                  id="duracao"
                  value={contentData.duracao}
                  onChange={(e) => updateContentData('duracao', e.target.value)}
                />
              </div>

              {/* IMDb */}
              <div>
                <Label htmlFor="imdb">Avaliação IMDb</Label>
                <Input
                  id="imdb"
                  value={contentData.imdb}
                  onChange={(e) => updateContentData('imdb', e.target.value)}
                />
              </div>

              {/* Temporadas (se for série) */}
              {contentData.tipo === 'Série' && (
                <div>
                  <Label htmlFor="temporadas">Temporadas</Label>
                  <Input
                    id="temporadas"
                    type="number"
                    value={contentData.temporadas || 0}
                    onChange={(e) => updateContentData('temporadas', parseInt(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>

            {/* Categoria */}
            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                value={contentData.categoria}
                onChange={(e) => updateContentData('categoria', e.target.value)}
              />
            </div>

            {/* Link - Campo adicionado */}
            <div>
              <Label htmlFor="link">Link do Conteúdo</Label>
              <Input
                id="link"
                type="url"
                placeholder="https://exemplo.com/link-do-conteudo"
                value={contentData.link || ''}
                onChange={(e) => updateContentData('link', e.target.value)}
              />
            </div>

            {/* Sinopse - Campo adicionado */}
            <div>
              <Label htmlFor="sinopse">Sinopse</Label>
              <Textarea
                id="sinopse"
                rows={4}
                placeholder="Digite a sinopse do conteúdo..."
                value={contentData.sinopse}
                onChange={(e) => updateContentData('sinopse', e.target.value)}
              />
            </div>

            {/* URLs das Capas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="capa">URL da Capa</Label>
                <Input
                  id="capa"
                  value={contentData.capa}
                  onChange={(e) => updateContentData('capa', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="capa_fundo">URL da Capa de Fundo</Label>
                <Input
                  id="capa_fundo"
                  value={contentData.capa_fundo}
                  onChange={(e) => updateContentData('capa_fundo', e.target.value)}
                />
              </div>
            </div>

            {/* Preview das Capas */}
            {(contentData.capa || contentData.capa_fundo) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {contentData.capa && (
                  <div>
                    <Label>Preview da Capa</Label>
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <img 
                        src={contentData.capa} 
                        alt="Capa" 
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {contentData.capa_fundo && (
                  <div>
                    <Label>Preview da Capa de Fundo</Label>
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <img 
                        src={contentData.capa_fundo} 
                        alt="Capa de Fundo" 
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botão Salvar */}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                size="lg"
                className="min-w-[150px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar no Baserow
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdicionarConteudo;
