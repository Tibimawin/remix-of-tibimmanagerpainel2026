
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useRealtimeLogs } from '@/hooks/useRealtimeLogs';
import { Clock, User, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SystemLogs = () => {
  const { logs, isLoading } = useRealtimeLogs();

  const getActionIcon = (action: string) => {
    if (action.includes('Login')) return '🔐';
    if (action.includes('Logout')) return '🚪';
    if (action.includes('Substituiu')) return '🔄';
    if (action.includes('Deletou') || action.includes('Excluiu')) return '🗑️';
    if (action.includes('Atualizou') || action.includes('Alterou')) return '✏️';
    if (action.includes('Salvou')) return '💾';
    return '📝';
  };

  const getActionColor = (action: string) => {
    if (action.includes('Login')) return 'bg-green-100 text-green-800';
    if (action.includes('Logout')) return 'bg-gray-100 text-gray-800';
    if (action.includes('Substituiu')) return 'bg-blue-100 text-blue-800';
    if (action.includes('Deletou') || action.includes('Excluiu')) return 'bg-red-100 text-red-800';
    if (action.includes('Atualizou') || action.includes('Alterou')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="w-full">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Logs do Sistema (Firebase)
            </CardTitle>
            <CardDescription className="text-xs">
              Histórico em tempo real de ações no sistema ({logs.length} registros)
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            🔴 AO VIVO (Firebase)
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <ScrollArea className="h-[300px] w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              <div className="text-center">
                <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
                <p className="text-xs">Carregando logs do Firebase...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              <div className="text-center">
                <Activity className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Nenhum log registrado ainda</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div key={log.id} className="space-y-1">
                  <div className="flex items-start gap-2 p-3 rounded-md bg-muted/30">
                    <div className="text-base">{getActionIcon(log.action)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs h-5">
                          <Clock className="h-2 w-2 mr-1" />
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </Badge>
                        <Badge variant="outline" className="text-xs h-5">
                          <User className="h-2 w-2 mr-1" />
                          {log.userEmail}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <Badge className={`text-xs h-5 ${getActionColor(log.action)}`}>
                          {log.action}
                        </Badge>
                        {log.details && (
                          <p className="text-xs text-muted-foreground break-words">
                            {log.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < logs.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SystemLogs;
