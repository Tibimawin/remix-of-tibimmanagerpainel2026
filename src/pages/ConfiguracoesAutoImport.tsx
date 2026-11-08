import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAutoImportConfig } from '@/hooks/useAutoImportConfig';
import { useAutoImportLogs } from '@/hooks/useAutoImportLogs';
import { Zap, Clock, CheckCircle2, XCircle, Settings, History, AlertCircle, Loader2, Tag, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { AutoImportScheduleService } from '@/services/AutoImportScheduleService';
import { useGlobalAutomationConfig } from '@/hooks/useGlobalAutomationConfig';

export default function ConfiguracoesAutoImport() {
    const { config, loading, updateConfig } = useAutoImportConfig();
    const { logs, loading: logsLoading } = useAutoImportLogs(15);
    const { hasFeature } = useUserPermissions();
    const { isEnabled: globalAutomationEnabled, loading: globalAutomationLoading } = useGlobalAutomationConfig();

    // Verificar permissão para automação
    const hasAccess = hasFeature('automacao');

    const [isEnabled, setIsEnabled] = useState(config?.isEnabled || false);
    const [contentTypes, setContentTypes] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [timeUntilNext, setTimeUntilNext] = useState<string>('');
    const [runningNow, setRunningNow] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'ok' | 'no_json' | 'server_down' | 'network_error'>('idle');
    const [connectionMessage, setConnectionMessage] = useState<string>('');
    const [connectionSolution, setConnectionSolution] = useState<string>('');

    useEffect(() => {
        if (config) {
            setIsEnabled(config.isEnabled);
            setContentTypes(config.preferences.contentTypes || []);
        }
    }, [config]);

    // Atualizar contador em tempo real
    useEffect(() => {
        if (!config?.nextRun) return;

        const interval = setInterval(() => {
            const now = new Date();
            const next = new Date(config.nextRun);
            const diff = next.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeUntilNext('Verificando agora...');
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setTimeUntilNext(`${minutes}m ${seconds}s`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [config?.nextRun]);

    const SAVE_TIMEOUT_MS = 15000;

    const handleSave = async () => {
        console.log('💾 [AUTO-IMPORT-UI] Iniciando salvamento de preferências...', {
            isEnabled,
            contentTypes
        });

        try {
            setSaving(true);

            const savePromise = updateConfig({
                isEnabled,
                preferences: {
                    ...config?.preferences,
                    contentTypes
                }
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout ao salvar configurações de auto-import')), SAVE_TIMEOUT_MS)
            );

            await Promise.race([savePromise, timeoutPromise]);

            toast.success('Configurações salvas com sucesso!');
            console.log('✅ [AUTO-IMPORT-UI] Preferências salvas com sucesso');
        } catch (error: any) {
            console.error('Erro ao salvar configurações de auto-import:', error);

            const message = String(error?.message || error || '');
            if (error?.code === 'resource-exhausted' || message.includes('Quota exceeded')) {
                toast.error('Não foi possível salvar: limite de uso do banco de dados (Firestore) foi atingido. Tente novamente mais tarde.');
            } else if (message.includes('Timeout ao salvar configurações')) {
                toast.error('Demorou muito para salvar. Verifique sua conexão e tente novamente.');
            } else {
                toast.error('Erro ao salvar configurações. Verifique sua conexão e tente novamente.');
            }
        } finally {
            setSaving(false);
            console.log('🔁 [AUTO-IMPORT-UI] Estado de salvamento resetado (saving = false)');
        }
    };

    const handleRunNow = async () => {
        if (!config?.userId) {
            toast.error('Configuração de automação não carregada para este usuário.');
            return;
        }
        try {
            setRunningNow(true);
            toast.info('Iniciando importação automática agora...');
            await AutoImportScheduleService.runNowForUser(config.userId, config.userEmail);
            toast.success('Importação automática executada! Verifique o histórico abaixo.');
        } catch (error) {
            console.error('Erro ao executar auto-import agora:', error);
            toast.error('Erro ao executar importação automática agora.');
        } finally {
            setRunningNow(false);
        }
    };

    const handleTestConnection = async () => {
        try {
            setConnectionStatus('testing');
            setConnectionMessage('Testando conexão com servidor de origem...');
            setConnectionSolution('');
            
            const result = await AutoImportScheduleService.testOriginConnection();

            setConnectionStatus(result.status);
            setConnectionMessage(result.details);
            setConnectionSolution(result.solution || '');

            if (result.status === 'ok') {
                toast.success('Conexão com servidor de origem OK! ✅');
            } else if (result.status === 'server_down') {
                toast.error('⚠️ Servidor fora do ar', {
                    description: result.solution
                });
            } else if (result.status === 'no_json') {
                toast.error('⚠️ Resposta inválida do servidor', {
                    description: result.solution
                });
            } else {
                toast.error('❌ Falha ao conectar', {
                    description: result.solution
                });
            }
        } catch (error) {
            console.error('Erro no diagnóstico de conexão com Baserow:', error);
            setConnectionStatus('network_error');
            setConnectionMessage('Erro inesperado ao testar conexão com servidor de origem.');
            setConnectionSolution('Entre em contato com o suporte técnico.');
            toast.error('Erro inesperado ao testar conexão.');
        }
    };

    const toggleContentType = (type: string) => {
        setContentTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const formatDate = (isoString: string) => {
        if (!isoString) return '-';
        try {
            return new Date(isoString).toLocaleString('pt-BR');
        } catch {
            return '-';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#121212]">
                <Loader2 className="h-8 w-8 animate-spin text-[#76ff03]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#121212] p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Importação Automática
                    </h1>
                    <p className="text-gray-400">
                        Configure para receber novos conteúdos automaticamente no seu painel. Com a automação ativa, os conteúdos novos já estão sendo importados para o seu aplicativo — é só verificar na sua lista de conteúdos.
                    </p>
                </div>

                {/* Aviso discreto: agendador automático em segundo plano desativado pelo admin.
                    A configuração, teste de conexão e execução manual ("Executar agora") continuam funcionando. */}
                {hasAccess && !globalAutomationLoading && !globalAutomationEnabled && (
                    <Card className="border-yellow-500/30 bg-yellow-500/5">
                        <CardContent className="p-4 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
                            <div className="text-sm text-yellow-200/90">
                                <span className="font-semibold">Agendador automático pausado pelo administrador.</span>{' '}
                                A verificação periódica em segundo plano está desligada para todos os usuários.
                                Você ainda pode configurar, testar a conexão e usar o botão <em>Executar agora</em> normalmente.
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!hasAccess && (
                    <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/10">
                        <CardContent className="p-12 text-center">
                            <div className="flex flex-col items-center space-y-6">
                                <div className="p-6 bg-orange-500/20 rounded-full">
                                    <Lock className="h-16 w-16 text-orange-500" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-white">
                                        Funcionalidade Bloqueada
                                    </h2>
                                    <p className="text-gray-400 max-w-md">
                                        A Importação Automática está disponível apenas para usuários com plano <span className="text-[#76ff03]">Profissional</span> ou superior.
                                    </p>
                                </div>
                                <div className="flex flex-col items-center space-y-3 p-6 bg-black/30 rounded-lg border border-gray-700">
                                    <p className="text-sm text-gray-400">
                                        Entre em contato com o administrador para fazer upgrade do seu plano.
                                    </p>
                                    <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">
                                        Plano Profissional Necessário
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Conteúdo Principal - Apenas se tiver acesso (kill-switch global não bloqueia mais a UI) */}
                {hasAccess && (
                    <>
                        {/* Status Card */}
                        <Card className="border-[#76ff03]/20 bg-[#1e1e1e]">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-full ${isEnabled ? 'bg-[#76ff03]/10' : 'bg-gray-700/50'}`}>
                                            <Zap className={`h-6 w-6 ${isEnabled ? 'text-[#76ff03]' : 'text-gray-400'}`} />
                                        </div>
                                        <div>
                                            <CardTitle className="text-white">Status da Automação</CardTitle>
                                            <CardDescription>
                                                {isEnabled
                                                    ? 'Novos conteúdos serão importados automaticamente'
                                                    : 'Importação automática desativada'}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={isEnabled}
                                        onCheckedChange={(checked) => {
                                            setIsEnabled(checked);
                                            // Auto-salvar quando mudar o toggle
                                            updateConfig({ isEnabled: checked }).then(() => {
                                                toast.success(checked ? 'Importação automática ativada!' : 'Importação automática desativada');
                                            }).catch((error) => {
                                                console.error('Erro ao salvar toggle:', error);
                                                toast.error('Erro ao atualizar status');
                                                setIsEnabled(!checked); // Reverter em caso de erro
                                            });
                                        }}
                                        className="data-[state=checked]:bg-[#76ff03]"
                                    />
                                </div>
                            </CardHeader>
                        </Card>

                        {/* Alert se desativado */}
                        {!isEnabled && (
                            <Card className="border-orange-500/20 bg-orange-500/5">
                                <CardContent className="flex items-start gap-3 pt-6">
                                    <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-orange-500 font-medium">Importação automática desativada</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Você precisará importar manualmente novos conteúdos através da página de Importação
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Próxima Verificação (se ativo) */}
                        {isEnabled && timeUntilNext && (
                            <Card className="border-[#76ff03]/20 bg-gradient-to-r from-[#1e1e1e] to-[#1a1a1a]">
                                <CardContent className="pt-6">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between gap-4 flex-wrap">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 rounded-full bg-[#76ff03]/10">
                                                    <Clock className="h-6 w-6 text-[#76ff03]" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-400">Próxima Verificação</p>
                                                    <p className="text-2xl font-bold text-white">{timeUntilNext}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Verificação automática a cada 15 minutos</p>
                                                    <p className="text-xs text-[#76ff03] mt-1">● Sistema ativo</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2 justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleRunNow}
                                                        disabled={runningNow}
                                                        className="border-[#76ff03]/40 text-[#76ff03] hover:bg-[#76ff03]/10"
                                                    >
                                                        {runningNow && (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        )}
                                                        Executar agora
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleTestConnection}
                                                        disabled={connectionStatus === 'testing'}
                                                        className="border-gray-500/40 text-gray-200 hover:bg-gray-700/40"
                                                    >
                                                        {connectionStatus === 'testing' && (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        )}
                                                        Testar conexão servidor
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                        {connectionStatus !== 'idle' && connectionStatus !== 'testing' && (
                                            <div className={`text-xs border-t pt-3 mt-1 space-y-2 ${
                                                connectionStatus === 'ok'
                                                    ? 'border-green-700/60 bg-green-900/20'
                                                    : connectionStatus === 'server_down'
                                                        ? 'border-orange-700/60 bg-orange-900/20'
                                                        : 'border-red-700/60 bg-red-900/20'
                                            } rounded-lg p-3`}>
                                                <div className="flex items-center gap-2">
                                                    <span className={
                                                        connectionStatus === 'ok'
                                                            ? 'text-[#76ff03]'
                                                            : connectionStatus === 'server_down'
                                                                ? 'text-orange-400'
                                                                : 'text-red-400'
                                                    }>
                                                        {connectionStatus === 'ok' && '✅ Status: Conectado'}
                                                        {connectionStatus === 'server_down' && '⚠️ Status: Servidor Offline'}
                                                        {connectionStatus === 'no_json' && '⚠️ Status: Resposta Inválida'}
                                                        {connectionStatus === 'network_error' && '❌ Status: Erro de Conexão'}
                                                    </span>
                                                </div>
                                                <p className="text-gray-300">{connectionMessage}</p>
                                                {connectionSolution && (
                                                    <div className="mt-2 pt-2 border-t border-current/20">
                                                        <p className="text-gray-400 font-medium">💡 Solução:</p>
                                                        <p className="text-gray-300 mt-1">{connectionSolution}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Formato do Tipo */}
                        {isEnabled && (
                            <Card className="border-gray-700 bg-[#1e1e1e]">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Tag className="h-5 w-5 text-[#76ff03]" />
                                        Formato do Tipo
                                    </CardTitle>
                                    <CardDescription className="text-gray-400">
                                        Escolha como os tipos serão salvos no seu Baserow
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2 p-4 border border-gray-700 rounded-lg bg-[#121212]">
                                        {[
                                            { value: 'singular', label: 'Thiago', desc: 'Filme / Serie' },
                                            { value: 'plural',   label: 'Francisco', desc: 'Filmes / Series' },
                                            { value: 'tibim',    label: 'Tibim', desc: 'Filme / Serie (estrutura Tibim)' },
                                        ].map(({ value, label, desc }) => (
                                            <button
                                                key={value}
                                                onClick={() => {
                                                    updateConfig({ typeFormat: value as 'singular' | 'plural' | 'tibim' }).then(() => {
                                                        toast.success(`Formato alterado para ${label}!`);
                                                    }).catch(() => {
                                                        toast.error('Erro ao atualizar formato');
                                                    });
                                                }}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 text-center ${
                                                    config?.typeFormat === value
                                                        ? value === 'tibim'
                                                            ? 'bg-orange-500 text-white'
                                                            : 'bg-[#76ff03] text-black'
                                                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                                }`}
                                            >
                                                <p>{label}</p>
                                                <p className="text-xs opacity-75 mt-0.5">{desc}</p>
                                            </button>
                                        ))}
                                    </div>

                                </CardContent>
                            </Card>
                        )}

                        {/* Preferências */}
                        {isEnabled && (
                            <Card className="border-gray-700 bg-[#1e1e1e]">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Settings className="h-5 w-5 text-[#76ff03]" />
                                        <CardTitle className="text-white">Preferências de Importação</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Escolha que tipos de conteúdo você quer receber automaticamente
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-3">
                                        <Label className="text-white">Tipos de Conteúdo</Label>
                                        <div className="space-y-2">
                                            {[
                                                { value: 'Filmes', label: 'Filmes' },
                                                { value: 'Series', label: 'Séries' }
                                            ].map(type => (
                                                <div key={type.value} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={type.value}
                                                        checked={contentTypes.includes(type.value)}
                                                        onCheckedChange={() => toggleContentType(type.value)}
                                                        className="border-gray-600"
                                                    />
                                                    <label
                                                        htmlFor={type.value}
                                                        className="text-sm font-medium text-gray-300 cursor-pointer select-none"
                                                    >
                                                        {type.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || contentTypes.length === 0}
                                        className="w-full bg-[#76ff03] text-black hover:bg-[#69e600]"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Salvando...
                                            </>
                                        ) : (
                                            'Salvar Preferências'
                                        )}
                                    </Button>

                                    {contentTypes.length === 0 && (
                                        <p className="text-sm text-orange-500 text-center">
                                            ⚠️ Selecione pelo menos um tipo de conteúdo
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Última Sincronização */}
                        {config?.lastCheckTimestamp && config.lastCheckTimestamp !== new Date().toISOString().substring(0, 10) && (
                            <Card className="border-gray-700 bg-[#1e1e1e]">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Zap className="h-5 w-5 text-[#76ff03]" />
                                        Estatísticas de Importação
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-[#121212] p-4 rounded-lg border border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <Clock className="h-5 w-5 text-blue-400" />
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-400">Última Verificação</p>
                                                    <p className="text-sm text-white font-medium mt-1">
                                                        {formatDate(config.lastCheckTimestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-[#121212] p-4 rounded-lg border border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 className="h-5 w-5 text-green-400" />
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-400">Última Importação</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-sm text-white font-medium">
                                                            {config.stats.lastImportCount || 0}
                                                        </p>
                                                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                                                            conteúdos
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-[#121212] p-4 rounded-lg border border-[#76ff03]/20">
                                            <div className="flex items-center gap-3">
                                                <Zap className="h-5 w-5 text-[#76ff03]" />
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-400">Total Acumulado</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-lg text-white font-bold">
                                                            {config.stats.totalImported || 0}
                                                        </p>
                                                        <Badge className="bg-[#76ff03]/10 text-[#76ff03] border-[#76ff03]/20 text-xs">
                                                            importados
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Histórico de Importações */}
                        <Card className="border-gray-700 bg-[#1e1e1e]">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <History className="h-5 w-5 text-[#76ff03]" />
                                    <CardTitle className="text-white">Histórico Recente</CardTitle>
                                </div>
                                <CardDescription>
                                    Últimas importações automáticas realizadas
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {logsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-[#76ff03]" />
                                    </div>
                                ) : logs.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-400">Nenhuma importação automática realizada ainda</p>
                                        <p className="text-sm text-gray-500 mt-2">
                                            {isEnabled ? 'Aguarde a próxima verificação' : 'Ative a importação automática para começar'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-gray-700">
                                                    <TableHead className="text-gray-400">Data/Hora</TableHead>
                                                    <TableHead className="text-gray-400">Resumo</TableHead>
                                                    <TableHead className="text-gray-400">Importados</TableHead>
                                                    <TableHead className="text-gray-400">Pulados</TableHead>
                                                    <TableHead className="text-gray-400">Erros</TableHead>
                                                    <TableHead className="text-gray-400">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {logs.map(log => (
                                                    <TableRow key={log.id} className="border-gray-700">
                                                        <TableCell className="text-gray-300 text-sm">
                                                            {formatDate(log.timestamp)}
                                                        </TableCell>
                                                        <TableCell className="text-white font-medium max-w-xs truncate">
                                                            {log.message || 'Execução de importação automática'}
                                                        </TableCell>
                                                        <TableCell className="text-gray-300 text-sm">
                                                            {log.importedCount}
                                                        </TableCell>
                                                        <TableCell className="text-gray-300 text-sm">
                                                            {log.skippedCount}
                                                        </TableCell>
                                                        <TableCell className="text-gray-300 text-sm">
                                                            {log.errorCount}
                                                        </TableCell>
                                                        <TableCell>
                                                            {log.status === 'success' && (
                                                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                    Sucesso
                                                                </Badge>
                                                            )}
                                                            {log.status === 'skipped' && (
                                                                <Badge variant="outline" className="border-gray-500 text-gray-400">
                                                                    Pulado
                                                                </Badge>
                                                            )}
                                                            {log.status === 'error' && (
                                                                <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                                                                    <XCircle className="h-3 w-3 mr-1" />
                                                                    Erro
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Info Card */}
                        <Card className="border-gray-700 bg-[#1e1e1e]">
                            <CardContent className="pt-6 space-y-6">
                                <div className="flex items-start gap-3 text-sm text-gray-400">
                                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-[#76ff03]" />
                                    <div className="space-y-2">
                                        <p>
                                            <strong className="text-white">Como funciona:</strong> O sistema verifica novos conteúdos a cada 15 minutos.
                                            Quando novos conteúdos são adicionados no painel principal, eles são automaticamente importados para o seu painel,
                                            respeitando suas preferências e seu limite mensal.
                                        </p>
                                        <p>
                                            <strong className="text-white">Séries e episódios:</strong> Sempre que uma série for importada automaticamente,
                                            <span className="text-[#76ff03] font-semibold"> todos os episódios dessa série serão importados junto</span>,
                                            seguindo as mesmas regras de duplicidade e limite mensal.
                                        </p>
                                        <p>
                                            <strong className="text-white">Duplicatas:</strong> O sistema evita automaticamente importar conteúdos que você já possui.
                                        </p>
                                        <p>
                                            <strong className="text-white">Limites:</strong> A importação automática respeita seu limite mensal de importações.
                                        </p>
                                        <p>
                                            <strong className="text-white">Opcional:</strong> Você pode ativar ou desativar a importação automática a qualquer momento.
                                        </p>
                                    </div>
                                </div>

                                {/* FAQ simples */}
                                <div className="border-t border-gray-800 pt-4 text-sm text-gray-300 space-y-3">
                                    <p className="text-xs uppercase tracking-wide text-gray-500">FAQ Rápido da Automação</p>
                                    <div>
                                        <p className="font-medium text-white">Ao importar uma série, os episódios vem juntos?</p>
                                        <p className="text-gray-400 mt-1">
                                            Sim. Quando a automação encontra uma nova série válida, ela importa a série e em seguida
                                            importa todos os episódios relacionados a ela automaticamente.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">Preciso me preocupar com episódios duplicados?</p>
                                        <p className="text-gray-400 mt-1">
                                            Não. Antes de criar qualquer registro novo, o sistema faz uma verificação para evitar
                                            duplicidades tanto para séries quanto para episódios.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">O que acontece se eu desativar a automação?</p>
                                        <p className="text-gray-400 mt-1">
                                            Nada é removido. Você apenas deixa de receber novos conteúdos automaticamente até ativar
                                            novamente.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
