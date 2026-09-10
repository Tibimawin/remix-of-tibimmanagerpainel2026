import React, { useState, useMemo, useEffect } from 'react';
import { useMaxPlus } from '@/hooks/useMaxPlus';
import { MAXPLUS_CATEGORIES, MaxPlusCatalogItem } from '@/services/maxplusApi';
import { MaxPlusCard } from '@/components/maxplus/MaxPlusCard';
import { MaxPlusDetailsDialog } from '@/components/maxplus/MaxPlusDetailsDialog';
import { MaxPlusBatchBar } from '@/components/maxplus/MaxPlusBatchBar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  Search, 
  Film, 
  Layers, 
  Flame, 
  Tv, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Compass
} from 'lucide-react';

const MaxPlus: React.FC = () => {
  const {
    items,
    filteredItems,
    loading,
    error,
    selectedCategoryUrl,
    searchQuery,
    setSearchQuery,
    selectedItems,
    detailsModalOpen,
    detailsLoading,
    currentDetails,
    selectedCatalogItem,
    importProgress,
    isImporting,
    importedTitles,
    loadingImportedCheck,
    isItemImported,
    filterMode,
    setFilterMode,
    importedCountOnScreen,
    loadCategory,
    handleSearch,
    openDetails,
    closeDetails,
    toggleSelectItem,
    toggleSelectAll,
    importMovie,
    importSeries,
    importSelectedBatch,
    currentPage,
    hasMorePages,
    goToPage,
  } = useMaxPlus();

  const [inputSearchTerm, setInputSearchTerm] = useState('');
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Paginação e Filtro das Categorias
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryGroup, setCategoryGroup] = useState<'all' | 'principais' | 'doramas' | 'novelas' | 'generos'>('all');
  const [categoryPage, setCategoryPage] = useState(1);
  const CATEGORIES_PER_PAGE = 8;

  // Filtragem das categorias por busca e grupo
  const filteredCategories = useMemo(() => {
    return MAXPLUS_CATEGORIES.filter(cat => {
      const matchSearch = !categorySearch.trim() || 
        cat.name.toLowerCase().includes(categorySearch.toLowerCase().trim());
      if (!matchSearch) return false;

      if (categoryGroup === 'principais') {
        return ['Destaques', 'Lançamentos', 'Filmes', 'Séries', 'Em Alta'].includes(cat.name);
      }
      if (categoryGroup === 'doramas') {
        return cat.name.toLowerCase().includes('dorama');
      }
      if (categoryGroup === 'novelas') {
        return cat.name.toLowerCase().includes('novela');
      }
      if (categoryGroup === 'generos') {
        return !['Destaques', 'Lançamentos', 'Filmes', 'Séries', 'Em Alta'].includes(cat.name) &&
               !cat.name.toLowerCase().includes('dorama') &&
               !cat.name.toLowerCase().includes('novela');
      }
      return true;
    });
  }, [categorySearch, categoryGroup]);

  const totalCategoryPages = Math.max(1, Math.ceil(filteredCategories.length / CATEGORIES_PER_PAGE));

  // Categorias da página atual
  const paginatedCategories = useMemo(() => {
    const start = (categoryPage - 1) * CATEGORIES_PER_PAGE;
    return filteredCategories.slice(start, start + CATEGORIES_PER_PAGE);
  }, [filteredCategories, categoryPage]);

  // Ajustar página de categorias caso a busca reduza o total
  useEffect(() => {
    if (categoryPage > totalCategoryPages) {
      setCategoryPage(1);
    }
  }, [categoryPage, totalCategoryPages]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSearchTerm.trim()) {
      handleSearch(inputSearchTerm);
    }
  };

  const handleCategorySelect = (url: string) => {
    setInputSearchTerm('');
    setJumpPageInput('');
    loadCategory(url, 1);
  };

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput.trim(), 10);
    if (!isNaN(target) && target >= 1) {
      goToPage(target);
      setJumpPageInput('');
    }
  };

  const activeCategory = MAXPLUS_CATEGORIES.find(c => c.url === selectedCategoryUrl);
  const pendingCountOnScreen = Math.max(0, items.length - importedCountOnScreen);

  // Categorias com paginação do catálogo disponível (todas exceto Destaques único da home)
  const isPaginatedCategory = Boolean(selectedCategoryUrl && selectedCategoryUrl !== 'http://apps.zynner.site/');

  // Janela dinâmica de números de página
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = start + 4;
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  }, [currentPage]);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 pb-28">
      {/* Barra Superior de Título */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#232738]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00d2ff]/20 via-[#6366f1]/20 to-[#00d2ff]/10 border border-[#00d2ff]/30 flex items-center justify-center shadow-lg shadow-[#00d2ff]/10">
            <Sparkles className="w-6 h-6 text-[#00d2ff]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                MaxPlus
              </h1>
              <Badge className="bg-gradient-to-r from-[#00d2ff] to-[#6366f1] text-slate-950 font-black text-[11px] px-2.5 py-0.5 border-0 shadow-md">
                Importador Automático
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Puxador em tempo real de filmes, séries, animes e doramas com link MP4 e capas direto para o Baserow
            </p>
          </div>
        </div>

        {/* Formulário de Busca com Enter */}
        <form onSubmit={onSearchSubmit} className="relative w-full md:w-96 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar título e aperte Enter..."
              value={inputSearchTerm}
              onChange={(e) => setInputSearchTerm(e.target.value)}
              className="pl-9 pr-4 bg-[#151722] border-[#232738] text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-[#00d2ff] focus-visible:border-[#00d2ff] h-10 text-sm"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !inputSearchTerm.trim()}
            className="bg-[#00d2ff] hover:bg-[#00b8e6] text-slate-950 font-bold px-4 h-10 rounded-xl shadow-md shadow-[#00d2ff]/20 text-xs"
          >
            Buscar
          </Button>
        </form>
      </div>

      {/* Seção de Categorias com Paginação e Filtro Rápido */}
      <div className="space-y-2.5 bg-[#151722]/50 border border-[#232738] rounded-2xl p-3 sm:p-3.5">
        {/* Barra de Filtro de Categorias e Controles de Paginação das Categorias */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#232738]/60">
          {/* Grupos de Categorias */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => { setCategoryGroup('all'); setCategoryPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                categoryGroup === 'all'
                  ? 'bg-[#00d2ff] text-slate-950 font-bold shadow-sm'
                  : 'bg-[#0b0c10] text-slate-400 hover:text-white border border-[#232738]'
              }`}
            >
              Todas ({MAXPLUS_CATEGORIES.length})
            </button>
            <button
              onClick={() => { setCategoryGroup('principais'); setCategoryPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                categoryGroup === 'principais'
                  ? 'bg-[#00d2ff] text-slate-950 font-bold shadow-sm'
                  : 'bg-[#0b0c10] text-slate-400 hover:text-white border border-[#232738]'
              }`}
            >
              Principais (5)
            </button>
            <button
              onClick={() => { setCategoryGroup('doramas'); setCategoryPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                categoryGroup === 'doramas'
                  ? 'bg-[#00d2ff] text-slate-950 font-bold shadow-sm'
                  : 'bg-[#0b0c10] text-slate-400 hover:text-white border border-[#232738]'
              }`}
            >
              Doramas (8)
            </button>
            <button
              onClick={() => { setCategoryGroup('novelas'); setCategoryPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                categoryGroup === 'novelas'
                  ? 'bg-[#00d2ff] text-slate-950 font-bold shadow-sm'
                  : 'bg-[#0b0c10] text-slate-400 hover:text-white border border-[#232738]'
              }`}
            >
              Novelas (4)
            </button>
            <button
              onClick={() => { setCategoryGroup('generos'); setCategoryPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                categoryGroup === 'generos'
                  ? 'bg-[#00d2ff] text-slate-950 font-bold shadow-sm'
                  : 'bg-[#0b0c10] text-slate-400 hover:text-white border border-[#232738]'
              }`}
            >
              Gêneros (21)
            </button>
          </div>

          {/* Campo de Busca Rápida de Categorias e Paginação das Categorias */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => { setCategorySearch(e.target.value); setCategoryPage(1); }}
                placeholder="Filtrar categoria..."
                className="h-7 w-36 sm:w-44 pl-7 pr-2 rounded-lg bg-[#0b0c10] border border-[#232738] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00d2ff]"
              />
            </div>

            {/* Controles da Paginação das Categorias */}
            <div className="flex items-center gap-1 bg-[#0b0c10] px-2 py-0.5 rounded-lg border border-[#232738] text-xs text-slate-300">
              <span className="text-[11px] text-slate-400">
                Pág. {categoryPage}/{totalCategoryPages}
              </span>
              <button
                onClick={() => setCategoryPage(p => Math.max(1, p - 1))}
                disabled={categoryPage <= 1}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="Página anterior de categorias"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCategoryPage(p => Math.min(totalCategoryPages, p + 1))}
                disabled={categoryPage >= totalCategoryPages}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="Próxima página de categorias"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Chips de Categorias da Página Atual */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[#232738] scrollbar-track-transparent">
          {paginatedCategories.map((category) => {
            const isSelected = selectedCategoryUrl === category.url;
            return (
              <button
                key={category.url}
                onClick={() => handleCategorySelect(category.url)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#00d2ff]/20 to-[#6366f1]/20 border-[#00d2ff] text-white shadow-lg shadow-[#00d2ff]/10 scale-102 font-bold'
                    : 'bg-[#0b0c10] border-[#232738] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {category.name === 'Destaques' && <Flame className="w-3.5 h-3.5 text-amber-400" />}
                {category.name === 'Lançamentos' && <Sparkles className="w-3.5 h-3.5 text-[#00d2ff]" />}
                {category.name === 'Séries' && <Tv className="w-3.5 h-3.5 text-[#6366f1]" />}
                {category.name === 'Filmes' && <Film className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{category.name}</span>
              </button>
            );
          })}
          {paginatedCategories.length === 0 && (
            <span className="text-xs text-slate-500 py-1">
              Nenhuma categoria encontrada para &quot;{categorySearch}&quot;
            </span>
          )}
        </div>
      </div>

      {/* Indicador de Status & Filtros de Conteúdos Importados & Mini-Paginação de Títulos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 pt-1 pb-1 border-b border-[#232738]/60">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-semibold text-slate-200">
            {activeCategory ? `Catálogo: ${activeCategory.name}` : searchQuery ? `Pesquisa: "${searchQuery}"` : 'Resultados'}
          </span>
          <span>•</span>
          <span>{items.length} títulos carregados</span>
          
          {items.length > 0 && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {importedCountOnScreen} no banco
              </span>
              <span>•</span>
              <span className="text-slate-400 font-medium">
                {pendingCountOnScreen} pendentes
              </span>
            </>
          )}

          {loadingImportedCheck && (
            <span className="text-[11px] text-[#00d2ff] animate-pulse">
              (Verificando banco...)
            </span>
          )}

          {/* Mini-Paginador Superior para a Categoria Ativa */}
          {isPaginatedCategory && (
            <div className="inline-flex items-center gap-1 bg-[#151722] px-2 py-0.5 rounded-lg border border-[#232738] ml-1">
              <span className="text-[11px] font-bold text-[#00d2ff]">
                Página {currentPage}
              </span>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={loading || currentPage <= 1}
                className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="Página anterior de títulos"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={loading || !hasMorePages}
                className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="Próxima página de títulos"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Abas / Filtros Rápidos (Todos / No Banco / Pendentes) */}
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="inline-flex bg-[#151722] p-1 rounded-xl border border-[#232738]">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-[#00d2ff] text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({items.length})
              </button>
              <button
                onClick={() => setFilterMode('imported')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  filterMode === 'imported'
                    ? 'bg-emerald-500 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                No Banco ({importedCountOnScreen})
              </button>
              <button
                onClick={() => setFilterMode('pending')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filterMode === 'pending'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                Pendentes ({pendingCountOnScreen})
              </button>
            </div>

            <button
              onClick={toggleSelectAll}
              className="text-[#00d2ff] hover:underline font-medium text-xs whitespace-nowrap ml-2 cursor-pointer"
            >
              {selectedItems.length === filteredItems.length && filteredItems.length > 0
                ? 'Desmarcar Todos' 
                : 'Selecionar na Tela'}
            </button>
          </div>
        )}
      </div>

      {/* Grade de Resultados / Skeleton / Estado Vazio */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-[#232738] bg-[#151722] p-2 space-y-3">
              <Skeleton className="aspect-[2/3] w-full rounded-lg bg-slate-800/60" />
              <div className="space-y-1.5 px-1">
                <Skeleton className="h-4 w-full bg-slate-800/60" />
                <Skeleton className="h-3 w-2/3 bg-slate-800/40" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#151722] border border-[#232738] rounded-2xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400" />
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-white">Falha ao carregar conteúdos</h3>
            <p className="text-sm text-slate-400 max-w-md">{error}</p>
          </div>
          <Button
            onClick={() => loadCategory(selectedCategoryUrl || MAXPLUS_CATEGORIES[0].url)}
            className="bg-[#00d2ff] text-slate-950 font-bold gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </Button>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {filteredItems.map((item, index) => {
            const isSelected = selectedItems.some(i => i.link === item.link);
            const isAlreadyImported = isItemImported(item.nome);
            return (
              <MaxPlusCard
                key={`${item.link}-${index}`}
                item={item}
                isSelected={isSelected}
                isAlreadyImported={isAlreadyImported}
                onToggleSelect={toggleSelectItem}
                onOpenDetails={openDetails}
                onQuickImport={(i) => openDetails(i)}
                isImporting={isImporting}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-[#151722]/60 border border-[#232738] rounded-2xl text-center space-y-3">
          <Film className="w-12 h-12 text-slate-600" />
          <h3 className="font-bold text-base text-slate-200">
            {filterMode === 'imported' 
              ? 'Nenhum título desta tela foi importado para o banco ainda'
              : filterMode === 'pending'
              ? 'Todos os títulos desta tela já foram importados para o banco!'
              : 'Nenhum conteúdo encontrado'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {filterMode !== 'all' 
              ? 'Alterne o filtro acima para "Todos" para ver o catálogo completo.'
              : 'Tente buscar por outro termo ou selecione uma das categorias acima para visualizar o catálogo.'}
          </p>
        </div>
      )}

      {/* Barra de Paginação Inferior para o Catálogo da Categoria */}
      {isPaginatedCategory && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#151722]/80 border border-[#232738] rounded-2xl shadow-lg mt-4">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <span className="font-bold text-white bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/30 px-2.5 py-1 rounded-lg">
              Página {currentPage}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              {items.length} títulos nesta página
            </span>
            {loading && (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00d2ff] ml-1" />
            )}
          </div>

          {/* Navegação Numérica e Botões */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {/* Primeira Página */}
            {currentPage > 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(1)}
                disabled={loading}
                className="h-8 px-2.5 text-xs bg-[#0b0c10] border-[#232738] text-slate-300 hover:text-white hover:border-[#00d2ff] cursor-pointer"
                title="Ir para a primeira página"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Anterior */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={loading || currentPage <= 1}
              className="h-8 px-3 text-xs bg-[#0b0c10] border-[#232738] text-slate-300 hover:text-white hover:border-[#00d2ff] gap-1 cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </Button>

            {/* Botões Numéricos */}
            {pageNumbers.map((p) => {
              const isActive = p === currentPage;
              return (
                <Button
                  key={p}
                  size="sm"
                  onClick={() => goToPage(p)}
                  disabled={loading}
                  className={`h-8 w-8 p-0 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#00d2ff] to-[#6366f1] text-slate-950 font-black shadow-md shadow-[#00d2ff]/20 scale-105 border-0'
                      : 'bg-[#0b0c10] border border-[#232738] text-slate-300 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {p}
                </Button>
              );
            })}

            {/* Próxima */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={loading || !hasMorePages}
              className="h-8 px-3 text-xs bg-[#0b0c10] border-[#232738] text-slate-300 hover:text-white hover:border-[#00d2ff] gap-1 cursor-pointer disabled:opacity-40"
            >
              <span>Próxima</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>

            {/* Salto Rápido para Página */}
            <form onSubmit={handleJumpToPage} className="flex items-center gap-1 ml-1 sm:ml-2">
              <Input
                type="number"
                min="1"
                max="300"
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                placeholder="Pág."
                className="h-8 w-14 text-xs bg-[#0b0c10] border-[#232738] text-center text-white px-1 rounded-lg"
              />
              <Button
                type="submit"
                size="sm"
                disabled={loading || !jumpPageInput.trim()}
                className="h-8 px-2.5 text-xs bg-[#00d2ff] hover:bg-[#00b8e6] text-slate-950 font-bold rounded-lg cursor-pointer shadow-sm shadow-[#00d2ff]/20"
              >
                Ir
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes & Pré-visualização */}
      <MaxPlusDetailsDialog
        key={selectedCatalogItem?.link || 'no-item'}
        open={detailsModalOpen}
        onClose={closeDetails}
        details={currentDetails}
        loading={detailsLoading}
        onImportMovie={importMovie}
        onImportSeries={importSeries}
        importProgress={importProgress}
        isImporting={isImporting}
        isAlreadyImported={isItemImported(currentDetails?.nome || selectedCatalogItem?.nome)}
        fallbackCategory={activeCategory?.name}
      />

      {/* Barra Flutuante de Ação em Lote */}
      <MaxPlusBatchBar
        selectedCount={selectedItems.length}
        totalVisibleCount={filteredItems.length}
        isAllSelected={selectedItems.length > 0 && selectedItems.length === filteredItems.length}
        onToggleSelectAll={toggleSelectAll}
        onImportBatch={importSelectedBatch}
        onClearSelection={() => {}}
        isImporting={isImporting}
        importProgress={importProgress}
      />
    </div>
  );
};

export default MaxPlus;
