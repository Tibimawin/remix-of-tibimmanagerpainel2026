import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataErrorFallbackProps {
  /** Título curto e amigável */
  title?: string;
  /** Mensagem explicativa para o usuário */
  message?: string;
  /** Detalhe técnico opcional (mensagem do erro) */
  detail?: string | null;
  /** Ação de tentar novamente */
  onRetry?: () => void;
  /** Estado de carregamento da retentativa */
  retrying?: boolean;
  /** Texto do botão */
  retryLabel?: string;
  className?: string;
}

/**
 * Tela de fallback exibida quando a página falha ao carregar dados.
 * Mostra mensagem amigável e um botão para tentar novamente.
 */
export const DataErrorFallback: React.FC<DataErrorFallbackProps> = ({
  title = 'Não conseguimos carregar os dados',
  message = 'Algo deu errado ao buscar as informações. Verifique sua conexão e tente novamente.',
  detail,
  onRetry,
  retrying = false,
  retryLabel = 'Tentar novamente',
  className,
}) => {
  return (
    <Card className={cn('border-destructive/30 bg-destructive/5', className)}>
      <CardContent className="flex flex-col items-center justify-center text-center gap-4 py-12 px-6">
        <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>

        <div className="space-y-1 max-w-md">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {detail && (
          <p className="text-xs text-muted-foreground/80 font-mono break-all max-w-md">
            {detail}
          </p>
        )}

        {onRetry && (
          <Button onClick={onRetry} disabled={retrying} className="mt-1">
            <RefreshCw className={cn('w-4 h-4 mr-2', retrying && 'animate-spin')} />
            {retrying ? 'Tentando...' : retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default DataErrorFallback;
