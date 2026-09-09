import React, { useState } from 'react';
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
  AlertCircle 
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
  } = useMaxPlus();

  const [inputSearchTerm, setInputSearchTerm] = useState('');

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSearchTerm.trim()) {
      handleSearch(inputSearchTerm);
    }
  };

  const handleCategorySelect = (url: string) => {
    setInputSearchTerm('');
    loadCategory(url);
  };

  const activeCategory = MAXPLUS_CATEGORIES.find(c => c.url === selectedCategoryUrl);
  const pendingCountOnScreen = Math.max(0, items.length - importedCountOnScreen);

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

      {/* Chips de Categorias com Rolagem Horizontal */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#232738] scrollbar-track-transparent">
        {MAXPLUS_CATEGORIES.map((category) => {
          const isSelected = selectedCategoryUrl === category.url;
          return (
            <button
              key={category.url}
              onClick={() => handleCategorySelect(category.url)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-[#00d2ff]/20 to-[#6366f1]/20 border-[#00d2ff] text-white shadow-lg shadow-[#00d2ff]/10 scale-102'
                  : 'bg-[#151722] border-[#232738] text-slate-400 hover:text-slate-200 hover:border-slate-700'
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
      </div>

      {/* Indicador de Status & Filtros de Conteúdos Importados */}
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

      {/* Modal de Detalhes & Pré-visualização */}
      <MaxPlusDetailsDialog
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
