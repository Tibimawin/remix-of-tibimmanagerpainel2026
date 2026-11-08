import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Eye, ClipboardCopy } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  showDetails?: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Em produção, enviar para serviço de monitoramento
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary capturou um erro:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, showDetails: false });
  };

  handleToggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  handleCopyDetails = () => {
    const { error } = this.state;
    if (!error) return;
    const details = `${error.name}: ${error.message}\n\n${error.stack || ''}`;
    navigator.clipboard.writeText(details).catch(() => {});
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Oops! Algo deu errado</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver o problema.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleReset} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full"
                >
                  Voltar ao Dashboard
                </Button>
                {(import.meta.env.DEV || import.meta.env.VITE_DEBUG_ERRORS === 'true') && this.state.error && (
                  <div className="mt-3 text-left">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={this.handleToggleDetails}>
                        <Eye className="w-4 h-4 mr-2" />
                        {this.state.showDetails ? 'Ocultar detalhes (DEV)' : 'Mostrar detalhes (DEV)'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={this.handleCopyDetails}>
                        <ClipboardCopy className="w-4 h-4 mr-2" />
                        Copiar detalhes
                      </Button>
                    </div>
                    {this.state.showDetails && (
                      <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-64">
                        {(this.state.error?.name || 'Error') + ': ' + (this.state.error?.message || '')}
                        {'\n\n'}
                        {this.state.error?.stack || ''}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}