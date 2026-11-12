import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMaxPlusImport } from '@/contexts/MaxPlusImportContext';
import { Loader2, Sparkles } from 'lucide-react';

export const MaxPlusFloatingProgress: React.FC = () => {
  const { isImporting, importProgress } = useMaxPlusImport();
  const location = useLocation();
  const navigate = useNavigate();

  // Só exibe o widget flutuante quando está importando e o usuário navegou para outra página
  if (!isImporting || location.pathname === '/maxplus') {
    return null;
  }

  const total = importProgress.total || 1;
  const current = importProgress.current || 0;
  const percent = Math.min(100, Math.round((current / total) * 100));

  return (
    <button
      type="button"
      onClick={() => navigate('/maxplus')}
      title="Clique para voltar para a página do MaxPlus"
      className="fixed bottom-4 right-4 z-50 w-72 rounded-xl border border-border bg-card/95 backdrop-blur-md p-3 shadow-lg hover:border-primary/60 transition-all text-left"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
          <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>Importando MaxPlus</span>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          {current}/{total} ({percent}%)
        </span>
      </div>

      {importProgress.currentTitle && (
        <p className="text-xs text-foreground/90 truncate mb-1.5">
          {importProgress.currentTitle}
        </p>
      )}

      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {importProgress.stage && (
        <p className="text-[10px] text-muted-foreground truncate mt-1">
          {importProgress.stage}
        </p>
      )}
    </button>
  );
};
