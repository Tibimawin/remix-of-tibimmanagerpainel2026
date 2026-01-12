import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Film, Loader2 } from 'lucide-react';
import { CATEGORIES } from '@/services/MaxPlusImportService';
import { MaxPlusContentCard } from '@/components/MaxPlusContentCard';
import { MaxPlusDetailsModal } from '@/components/MaxPlusDetailsModal';
import { useMaxPlusImport } from '@/hooks/useMaxPlusImport';

const MaxPlusImport = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const {
    contents,
    selectedContent,
    loading,
    detailsLoading,
    importProgress,
    searchQuery,
    setSearchQuery,
    loadCategory,
    searchContent,
    loadDetails,
    closeDetails,
    importMovie,
    importSeriesWithEpisodes,
  } = useMaxPlusImport();

  const handleCategoryClick = (categoryUrl: string) => {
    setSelectedCategory(categoryUrl);
    setSearchQuery('');
    loadCategory(categoryUrl);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedCategory(null);
    searchContent(searchQuery);
  };

  const handleContentClick = async (contentId: string) => {
    await loadDetails(contentId);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Film className="w-8 h-8" />
          MaxPlus Importação
        </h1>
        <p className="text-muted-foreground">
          Busque e importe filmes e séries diretamente para o seu Baserow
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar filmes ou séries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={loading || !searchQuery.trim()}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Buscar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
          <CardDescription>
            Selecione uma categoria para explorar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Badge
                key={category.url}
                variant={selectedCategory === category.url ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/10 transition-colors px-4 py-2"
                onClick={() => handleCategoryClick(category.url)}
              >
                {category.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[2/3] w-full" />
              <CardContent className="p-3">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : contents.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {contents.map((content) => (
            <MaxPlusContentCard
              key={content.id}
              content={content}
              onClick={() => handleContentClick(content.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery 
                ? 'Nenhum resultado encontrado' 
                : 'Selecione uma categoria ou faça uma busca para começar'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Modal */}
      <MaxPlusDetailsModal
        content={selectedContent}
        open={!!selectedContent && !detailsLoading}
        onClose={closeDetails}
        onImportMovie={importMovie}
        onImportSeriesWithEpisodes={importSeriesWithEpisodes}
        importProgress={importProgress}
      />
    </div>
  );
};

export default MaxPlusImport;
