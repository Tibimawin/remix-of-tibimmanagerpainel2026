import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertCircle, CheckCircle2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ServerStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<'online' | 'checking' | 'offline'>('checking');
  const [latency, setLatency] = useState<number | null>(null);

  const checkStatus = async () => {
    const startTime = Date.now();
    try {
      // Usando o endpoint de baserow-proxy como referência para a saúde da infraestrutura
      const response = await fetch('/api/baserow-proxy', { 
        method: 'HEAD',
        cache: 'no-store' 
      });
      
      const duration = Date.now() - startTime;
      setLatency(duration);

      if (response.ok || response.status === 405) { // 405 Method Not Allowed ainda significa que o servidor respondeu
        setStatus('online');
      } else {
        setStatus('offline');
      }
    } catch (error) {
      console.error('Erro ao verificar status do servidor:', error);
      setStatus('offline');
      setLatency(null);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-background/50 backdrop-blur-md border border-border shadow-sm">
      <div className="flex items-center gap-1.5">
        <div className="relative flex h-2 w-2">
          {status === 'online' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            status === 'online' ? "bg-emerald-500" : 
            status === 'checking' ? "bg-amber-500 animate-pulse" : 
            "bg-red-500"
          )}></span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:inline">
          API Status
        </span>
      </div>

      <div className="h-4 w-[1px] bg-border hidden sm:block"></div>

      <div className="flex items-center gap-2">
        {status === 'online' ? (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Online</span>
            {latency !== null && (
              <span className="text-[10px] text-muted-foreground ml-1 hidden md:inline">
                ({latency}ms)
              </span>
            )}
          </div>
        ) : status === 'checking' ? (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Activity className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs font-medium">Verificando...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Offline</span>
          </div>
        )}
      </div>

      <Globe className="w-3.5 h-3.5 text-muted-foreground ml-1" />
    </div>
  );
};
