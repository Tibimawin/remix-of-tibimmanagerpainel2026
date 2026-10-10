/**
 * Serviço de Interceptação do Console do Navegador
 * Captura todos os logs (log, info, warn, error, unhandledrejection, window.onerror)
 * permitindo inspecionar o console em tempo real diretamente na interface do site.
 */

export type ConsoleLogType = 'log' | 'info' | 'warn' | 'error';

export interface CapturedLog {
  id: string;
  type: ConsoleLogType;
  timestamp: string;
  rawTime: number;
  message: string;
  args: any[];
  stack?: string;
  count?: number;
}

type LogListener = (logs: CapturedLog[], errorCount: number) => void;

class ConsoleInterceptorService {
  private logs: CapturedLog[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 600;
  private isInitialized = false;

  private originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Intercepta console.log
    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.addLog('log', args);
    };

    // Intercepta console.info
    console.info = (...args: any[]) => {
      this.originalConsole.info(...args);
      this.addLog('info', args);
    };

    // Intercepta console.warn
    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.addLog('warn', args);
    };

    // Intercepta console.error
    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      this.addLog('error', args);
    };

    // Intercepta console.debug
    console.debug = (...args: any[]) => {
      this.originalConsole.debug(...args);
      this.addLog('log', args);
    };

    // Captura erros globais não tratados de JavaScript
    window.addEventListener('error', (event) => {
      const errorMsg = event.message || 'Erro não capturado';
      const stack = event.error?.stack || `${event.filename || 'desconhecido'}:${event.lineno || 0}:${event.colno || 0}`;
      this.addLog('error', [errorMsg], stack);
    });

    // Captura rejeições não tratadas de Promises
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      let msg = 'Unhandled Promise Rejection';
      let stack: string | undefined;

      if (reason instanceof Error) {
        msg = reason.message;
        stack = reason.stack;
      } else if (typeof reason === 'string') {
        msg = reason;
      } else if (typeof reason === 'object' && reason !== null) {
        try {
          msg = JSON.stringify(reason);
        } catch {
          msg = String(reason);
        }
      }

      this.addLog('error', [`[Promise Rejection] ${msg}`], stack);
    });

    // Log de inicialização do interceptor
    this.addLog('info', ['[Console Inspector] Monitor de logs inicializado e ativo.']);
  }

  private formatTimestamp(date: Date): string {
    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  }

  private safeSerialize(arg: any): any {
    if (arg === null || arg === undefined) return String(arg);
    if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`;
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
      };
    }
    if (typeof arg === 'object') {
      try {
        // Tenta cópia rasa segura para evitar referências circulares
        return JSON.parse(JSON.stringify(arg));
      } catch {
        return String(arg);
      }
    }
    return arg;
  }

  private addLog(type: ConsoleLogType, rawArgs: any[], stack?: string) {
    const now = new Date();
    const timestamp = this.formatTimestamp(now);

    let extractedStack = stack;
    if (!extractedStack) {
      for (const a of rawArgs) {
        if (a instanceof Error && a.stack) {
          extractedStack = a.stack;
          break;
        }
      }
    }

    const stringMessages = rawArgs.map(arg => {
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    });

    const message = stringMessages.join(' ');
    const safeArgs = rawArgs.map(a => this.safeSerialize(a));

    // Deduplicação consecutiva se for exatamente igual à última
    const last = this.logs[this.logs.length - 1];
    if (last && last.type === type && last.message === message) {
      last.count = (last.count || 1) + 1;
      last.timestamp = timestamp;
      last.rawTime = now.getTime();
      this.notifyListeners();
      return;
    }

    const newLog: CapturedLog = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      timestamp,
      rawTime: now.getTime(),
      message,
      args: safeArgs,
      stack: extractedStack,
      count: 1,
    };

    this.logs.push(newLog);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.notifyListeners();
  }

  public getLogs(): CapturedLog[] {
    return [...this.logs];
  }

  public getErrorCount(): number {
    return this.logs.filter(l => l.type === 'error').length;
  }

  public clear() {
    this.logs = [];
    this.notifyListeners();
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener(this.getLogs(), this.getErrorCount());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const logs = this.getLogs();
    const errors = this.getErrorCount();
    this.listeners.forEach(fn => fn(logs, errors));
  }

  public evaluate(jsCode: string): any {
    try {
      const result = window.eval(jsCode);
      this.addLog('log', ['> ' + jsCode]);
      this.addLog('info', ['<', result]);
      return result;
    } catch (err: any) {
      this.addLog('log', ['> ' + jsCode]);
      this.addLog('error', ['< Erro na execução:', err?.message || String(err)]);
      throw err;
    }
  }
}

export const consoleInterceptor = new ConsoleInterceptorService();
