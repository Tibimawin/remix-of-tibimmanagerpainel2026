import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ImportProgress } from '@/services/maxplusImportEngine';
import { Sparkles, CheckSquare, XSquare, Loader2, Zap } from 'lucide-react';

interface MaxPlusBatchBarProps {
  selectedCount: number;
  totalVisibleCount: number;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onImportBatch: () => void;
  onClearSelection: () => void;
  isImporting: boolean;
  importProgress: ImportProgress;
}

export const MaxPlusBatchBar: React.FC<MaxPlusBatchBarProps> = ({
  selectedCount,
  totalVisibleCount,
  isAllSelected,
  onToggleSelectAll,
  onImportBatch,
  onClearSelection,
  isImporting,
  importProgress,
}) => {
  if (selectedCount === 0 && !importProgress.active) {
    return null;
  }

  const percentage = importProgress.total > 0 
    ? Math.round((importProgress.current / importProgress.total) * 100)
    : 0;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-300">
      <div className="bg-[#151722]/95 backdrop-blur-xl border border-[#232738] shadow-2xl shadow-black/80 rounded-2xl p-4 flex flex-col gap-3">
        {/* Linha principal com ações */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00d2ff]/10 border border-[#00d2ff]/30 flex items-center justify-center text-[#00d2ff]">
              <Sparkles className="w-5 h-5" />
            </div>

            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>{selectedCount} de {totalVisibleCount} itens selecionados</span>
              </p>
              <p className="text-xs text-slate-400">
                Prontos para importação automática para o Baserow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={isImporting}
              onClick={onToggleSelectAll}
              className="border-[#232738] bg-[#0b0c10] hover:bg-[#232738] text-slate-300 text-xs h-9 gap-1.5"
            >
              {isAllSelected ? (
                <>
                  <XSquare className="w-4 h-4 text-rose-400" />
                  Desmarcar Todos
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 text-[#00d2ff]" />
                  Selecionar Todos
                </>
              )}
            </Button>

            <Button
              size="sm"
              disabled={isImporting || selectedCount === 0}
              onClick={onImportBatch}
              className="bg-gradient-to-r from-[#00d2ff] via-[#38bdf8] to-[#6366f1] hover:brightness-110 text-slate-950 font-black text-xs h-9 px-5 rounded-xl shadow-lg shadow-[#00d2ff]/25 gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  Importando ({importProgress.current}/{importProgress.total})...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
                  ⚡ Importar Selecionados para o Baserow
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Barra de Progresso quando ativo */}
        {importProgress.active && (
          <div className="space-y-1.5 pt-2 border-t border-[#232738]">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium truncate max-w-[70%]">
                {importProgress.stage || `Processando: ${importProgress.currentTitle}`}
              </span>
              <span className="font-mono font-bold text-[#00d2ff]">
                {percentage}% ({importProgress.current}/{importProgress.total})
              </span>
            </div>
            <Progress value={percentage} className="h-2 bg-[#0b0c10]" />
          </div>
        )}
      </div>
    </div>
  );
};
