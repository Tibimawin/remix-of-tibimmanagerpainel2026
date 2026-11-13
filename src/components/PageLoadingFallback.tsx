import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, LayoutDashboard } from 'lucide-react';

export const PageLoadingFallback: React.FC = () => {
  const [tookTooLong, setTookTooLong] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTookTooLong(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full" aria-busy="true">
      <div className="flex flex-col items-center gap-3 max-w-sm text-center px-4">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-medium animate-pulse">Carregando página...</span>
        
        {tookTooLong && (
          <div className="mt-4 p-4 rounded-xl bg-muted/60 border border-border/60 space-y-3 animate-in fade-in duration-300">
            <p className="text-xs text-muted-foreground">
              O carregamento está demorando mais que o habitual. Deseja recarregar a página?
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={() => window.location.reload()}>
                <RefreshCw className="w-3.5 h-3.5" />
                Recarregar
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-8 gap-1.5" onClick={() => { window.location.href = '/dashboard'; }}>
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
