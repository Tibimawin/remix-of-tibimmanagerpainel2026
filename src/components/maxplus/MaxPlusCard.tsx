import React from 'react';
import { MaxPlusCatalogItem } from '@/services/maxplusApi';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Download, Film, Tv, Sparkles } from 'lucide-react';

interface MaxPlusCardProps {
  item: MaxPlusCatalogItem;
  isSelected: boolean;
  onToggleSelect: (item: MaxPlusCatalogItem) => void;
  onOpenDetails: (item: MaxPlusCatalogItem) => void;
  onQuickImport?: (item: MaxPlusCatalogItem) => void;
  isImporting?: boolean;
}

export const MaxPlusCard: React.FC<MaxPlusCardProps> = ({
  item,
  isSelected,
  onToggleSelect,
  onOpenDetails,
  onQuickImport,
  isImporting = false,
}) => {
  const isSeries = item.link?.includes('/tvshows/') || 
                   item.genres?.toLowerCase().includes('série') || 
                   item.genres?.toLowerCase().includes('serie');

  return (
    <div
      className={`group relative flex flex-col rounded-xl overflow-hidden transition-all duration-300 border bg-[#151722] hover:shadow-2xl hover:shadow-[#00d2ff]/10 hover:border-[#00d2ff]/50 ${
        isSelected ? 'border-[#00d2ff] ring-2 ring-[#00d2ff]/40 shadow-lg shadow-[#00d2ff]/20' : 'border-[#232738]'
      }`}
    >
      {/* Checkbox de seleção em lote */}
      <div 
        className="absolute top-2.5 left-2.5 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0b0c10]/80 backdrop-blur-md p-1.5 rounded-lg border border-[#232738] shadow-md hover:border-[#00d2ff]/80 transition-colors">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(item)}
            className="data-[state=checked]:bg-[#00d2ff] data-[state=checked]:border-[#00d2ff] data-[state=checked]:text-black border-slate-500 w-4 h-4"
          />
        </div>
      </div>

      {/* Badge de Tipo (Filme / Série) */}
      <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase backdrop-blur-md shadow-md border ${
            isSeries
              ? 'bg-[#6366f1]/80 text-white border-[#6366f1]/50'
              : 'bg-[#00d2ff]/80 text-black border-[#00d2ff]/50 font-extrabold'
          }`}
        >
          {isSeries ? <Tv className="w-3 h-3" /> : <Film className="w-3 h-3" />}
          {isSeries ? 'Série' : 'Filme'}
        </span>
      </div>

      {/* Poster (Proporção 2:3) */}
      <div
        className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900 cursor-pointer"
        onClick={() => onOpenDetails(item)}
      >
        {item.imagem ? (
          <img
            src={item.imagem}
            alt={item.nome}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108 group-hover:brightness-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-500">
            <Film className="w-10 h-10 mb-2 opacity-40 text-[#00d2ff]" />
            <span className="text-xs">Sem Capa</span>
          </div>
        )}

        {/* Gradiente escuro para contraste suave */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#151722] via-[#151722]/30 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Botão Hover rápido para ver detalhes */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-[2px]">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(item);
            }}
            className="bg-[#00d2ff] hover:bg-[#00b8e6] text-slate-950 font-bold shadow-lg shadow-[#00d2ff]/30 text-xs gap-1.5 px-3.5 py-1.5 h-8 rounded-lg transform scale-95 group-hover:scale-100 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            Detalhes
          </Button>
        </div>
      </div>

      {/* Informações e Botão de Ação */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-2 bg-[#151722]">
        <div>
          <h3
            onClick={() => onOpenDetails(item)}
            className="font-semibold text-sm text-slate-100 line-clamp-1 group-hover:text-[#00d2ff] transition-colors cursor-pointer"
            title={item.nome}
          >
            {item.nome}
          </h3>

          {item.genres ? (
            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
              {item.genres}
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
              {isSeries ? 'Série / Dorama / Anime' : 'Filme Completo'}
            </p>
          )}
        </div>

        {/* Botão rápido "Importar" */}
        <Button
          variant="outline"
          size="sm"
          disabled={isImporting}
          onClick={() => {
            if (onQuickImport) {
              onQuickImport(item);
            } else {
              onOpenDetails(item);
            }
          }}
          className="w-full text-xs h-7 gap-1.5 bg-[#0b0c10]/60 border-[#232738] hover:bg-[#00d2ff]/10 hover:border-[#00d2ff]/60 hover:text-[#00d2ff] text-slate-300 transition-all"
        >
          <Download className="w-3.5 h-3.5 text-[#00d2ff]" />
          Importar
        </Button>
      </div>
    </div>
  );
};
