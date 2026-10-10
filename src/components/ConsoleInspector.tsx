import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  consoleInterceptor, 
  CapturedLog, 
  ConsoleLogType 
} from '@/services/ConsoleInterceptor';
import { 
  Terminal, 
  X, 
  Trash2, 
  Copy, 
  Download, 
  Search, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Check, 
  Maximize2, 
  Minimize2, 
  ArrowDownCircle, 
  Play, 
  ChevronRight, 
  ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const ConsoleInspector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [logs, setLogs] = useState<CapturedLog[]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | ConsoleLogType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [commandInput, setCommandInput] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Inicializa interceptor e escuta logs
  useEffect(() => {
    consoleInterceptor.init();
    const unsubscribe = consoleInterceptor.subscribe((newLogs, errors) => {
      setLogs(newLogs);
      setErrorCount(errors);
    });
    return () => unsubscribe();
  }, []);

  // Atalho de teclado para abrir/fechar o console: Ctrl + Shift + L ou F12
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') ||
          (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Rolagem automática
  useEffect(() => {
    if (isOpen && autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen, autoScroll]);

  // Contagem por tipo
  const counts = useMemo(() => {
    return {
      all: logs.length,
      error: logs.filter(l => l.type === 'error').length,
      warn: logs.filter(l => l.type === 'warn').length,
      log: logs.filter(l => l.type === 'log').length,
      info: logs.filter(l => l.type === 'info').length,
    };
  }, [logs]);

  // Logs filtrados
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (activeTab !== 'all' && log.type !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msg = (log.message || '').toLowerCase();
        const stack = (log.stack || '').toLowerCase();
        return msg.includes(q) || stack.includes(q);
      }
      return true;
    });
  }, [logs, activeTab, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClear = () => {
    consoleInterceptor.clear();
    toast.success('Console limpo com sucesso');
  };

  const handleCopyAll = () => {
    if (filteredLogs.length === 0) {
      toast.info('Nenhum log para copiar');
      return;
    }
    const text = filteredLogs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}${l.stack ? '\n' + l.stack : ''}`).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success(`${filteredLogs.length} logs copiados para a área de transferência!`);
  };

  const handleCopySingle = (log: CapturedLog, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}${log.stack ? '\n' + log.stack : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1500);
    toast.success('Log copiado!');
  };

  const handleExport = () => {
    if (logs.length === 0) {
      toast.info('Nenhum log para exportar');
      return;
    }
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Arquivo de logs exportado!');
  };

  const handleExecuteCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    try {
      consoleInterceptor.evaluate(commandInput.trim());
      setCommandInput('');
    } catch {
      // O erro já é registrado pelo interceptor
    }
  };

  const getLogColorClass = (type: ConsoleLogType) => {
    switch (type) {
      case 'error':
        return 'text-rose-400 bg-rose-950/20 border-rose-900/40 hover:bg-rose-950/30';
      case 'warn':
        return 'text-amber-300 bg-amber-950/20 border-amber-900/40 hover:bg-amber-950/30';
      case 'info':
        return 'text-sky-300 bg-sky-950/20 border-sky-900/40 hover:bg-sky-950/30';
      default:
        return 'text-slate-300 bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/40';
    }
  };

  const getLogBadge = (type: ConsoleLogType) => {
    switch (type) {
      case 'error':
        return <Badge variant="destructive" className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-wider">ERRO</Badge>;
      case 'warn':
        return <Badge className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border-amber-500/40">AVISO</Badge>;
      case 'info':
        return <Badge className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border-sky-500/40">INFO</Badge>;
      default:
        return <Badge className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border-slate-700">LOG</Badge>;
    }
  };

  return (
    <>
      {/* Botão Flutuante Discreto no Canto Inferior Direito */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Abrir Console de Logs"
            title="Inspecionar Console (Atalho: Ctrl+Shift+L)"
            className={`flex items-center gap-2 px-3 py-2 rounded-full font-mono text-xs shadow-2xl backdrop-blur-md border transition-all duration-200 cursor-pointer active:scale-95 ${
              errorCount > 0
                ? 'bg-rose-950/90 hover:bg-rose-900 text-rose-200 border-rose-500/50 shadow-rose-950/50 animate-pulse'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/70 shadow-black/60'
            }`}
          >
            <Terminal className={`w-4 h-4 ${errorCount > 0 ? 'text-rose-400' : 'text-[#00d2ff]'}`} />
            <span className="font-semibold tracking-wide">Console</span>
            {errorCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-extrabold text-[10px]">
                {errorCount} {errorCount === 1 ? 'erro' : 'erros'}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-medium text-[10px]">
                {counts.all}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Painel do Console Inspector */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-[#090b10] border-t border-[#1e2330] shadow-2xl flex flex-col font-mono text-xs transition-all duration-200 ${
            isMaximized
              ? 'inset-0 w-screen h-screen'
              : 'bottom-0 left-0 right-0 h-[460px] max-h-[85vh] border-l border-r'
          }`}
        >
          {/* Barra Superior de Controles */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#0e111a] border-b border-[#1e2330] select-none shrink-0 gap-2">
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5 text-slate-200 font-bold shrink-0">
                <Terminal className="w-4 h-4 text-[#00d2ff]" />
                <span className="tracking-wide">Dev Console</span>
              </div>

              {/* Filtros em Abas */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-[#1a2030] text-[#00d2ff] border border-[#00d2ff]/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todos ({counts.all})
                </button>
                <button
                  onClick={() => setActiveTab('error')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    activeTab === 'error'
                      ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                      : 'text-slate-400 hover:text-rose-300'
                  }`}
                >
                  <AlertCircle className="w-3 h-3 text-rose-400" />
                  Erros ({counts.error})
                </button>
                <button
                  onClick={() => setActiveTab('warn')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    activeTab === 'warn'
                      ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  Avisos ({counts.warn})
                </button>
                <button
                  onClick={() => setActiveTab('log')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeTab === 'log'
                      ? 'bg-[#1a2030] text-slate-200 border border-slate-600'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Logs ({counts.log})
                </button>
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    activeTab === 'info'
                      ? 'bg-sky-950/60 text-sky-300 border border-sky-500/40'
                      : 'text-slate-400 hover:text-sky-300'
                  }`}
                >
                  <Info className="w-3 h-3 text-sky-400" />
                  Info ({counts.info})
                </button>
              </div>
            </div>

            {/* Ações da Barra */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative w-36 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Filtrar logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 pl-8 pr-2 text-[11px] bg-[#090b10] border-[#1e2330] text-slate-200 focus:border-[#00d2ff]"
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoScroll(prev => !prev)}
                title={autoScroll ? 'Auto-scroll ativado' : 'Auto-scroll desativado'}
                className={`h-7 px-2 text-[11px] gap-1 cursor-pointer ${
                  autoScroll ? 'text-[#00d2ff] bg-[#00d2ff]/10' : 'text-slate-400'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAll}
                title="Copiar logs visíveis"
                className="h-7 px-2 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                title="Exportar logs em JSON"
                className="h-7 px-2 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                title="Limpar console"
                className="h-7 px-2 text-[11px] text-slate-400 hover:text-rose-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMaximized(prev => !prev)}
                title={isMaximized ? 'Restaurar' : 'Maximizar'}
                className="h-7 px-2 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                title="Fechar console"
                className="h-7 px-2 text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Área de Listagem dos Logs */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 select-text bg-[#07090e]">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2 py-16">
                <Terminal className="w-8 h-8 opacity-40" />
                <p className="text-xs">Nenhum log para o filtro atual.</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                const hasDetails = (log.args && log.args.length > 0) || Boolean(log.stack);

                return (
                  <div
                    key={log.id}
                    onClick={() => hasDetails && toggleExpand(log.id)}
                    className={`rounded-md p-1.5 px-2.5 border transition-colors ${
                      hasDetails ? 'cursor-pointer' : ''
                    } ${getLogColorClass(log.type)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        {hasDetails && (
                          <span className="shrink-0 text-slate-500 mt-0.5">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </span>
                        )}

                        <span className="shrink-0 text-[10px] text-slate-500 font-mono select-none">
                          {log.timestamp}
                        </span>

                        <span className="shrink-0">
                          {getLogBadge(log.type)}
                        </span>

                        {log.count && log.count > 1 && (
                          <span className="shrink-0 px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[9px] font-bold">
                            {log.count}x
                          </span>
                        )}

                        <span className="break-all whitespace-pre-wrap font-mono text-xs flex-1">
                          {log.message}
                        </span>
                      </div>

                      {/* Botão de copiar este log específico */}
                      <button
                        onClick={(e) => handleCopySingle(log, e)}
                        title="Copiar este log"
                        className="shrink-0 text-slate-500 hover:text-slate-200 p-1 rounded hover:bg-white/5 transition-colors"
                      >
                        {copiedId === log.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Detalhes expandidos (Stack trace ou argumentos JSON) */}
                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-white/5 pl-6 space-y-1.5 text-[11px]">
                        {log.args && log.args.length > 0 && (
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Dados:</span>
                            <pre className="p-2 rounded bg-black/60 border border-white/5 text-slate-300 overflow-x-auto text-[10px] leading-relaxed max-h-48 overflow-y-auto">
                              {JSON.stringify(log.args, null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.stack && (
                          <div>
                            <span className="text-[10px] text-rose-400/80 uppercase font-semibold">Stack Trace:</span>
                            <pre className="p-2 rounded bg-rose-950/30 border border-rose-900/30 text-rose-300/90 overflow-x-auto text-[10px] leading-relaxed max-h-40 overflow-y-auto">
                              {log.stack}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>

          {/* Linha de Comando REPL Inferior */}
          <form
            onSubmit={handleExecuteCommand}
            className="flex items-center gap-2 p-2 bg-[#0e111a] border-t border-[#1e2330] shrink-0"
          >
            <span className="text-[#00d2ff] font-bold text-sm pl-1">{'>'}</span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Executar comando JS no console (ex: localStorage, document.title, window.location.href)..."
              className="flex-1 bg-transparent border-0 text-xs text-slate-200 font-mono focus:outline-none focus:ring-0 placeholder:text-slate-600"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!commandInput.trim()}
              className="h-6 px-2 text-[10px] bg-[#00d2ff] hover:bg-[#00b8e6] text-slate-950 font-bold gap-1 cursor-pointer"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              Executar
            </Button>
          </form>
        </div>
      )}
    </>
  );
};
