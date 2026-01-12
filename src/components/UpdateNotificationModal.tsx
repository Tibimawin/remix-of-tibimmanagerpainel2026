import React, { useEffect, useState } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { UpdateNotificationService, UpdateNote } from '@/services/UpdateNotificationService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Sparkles, Wrench, Bug, AlertTriangle } from 'lucide-react';

export const UpdateNotificationModal: React.FC = () => {
    const { userInfo } = useSimpleAuth();
    const [unseenUpdates, setUnseenUpdates] = useState<UpdateNote[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [currentUpdateIndex, setCurrentUpdateIndex] = useState(0);

    useEffect(() => {
        if (!userInfo?.id) return;

        const checkForUpdates = async () => {
            try {
                const updates = await UpdateNotificationService.getUnseenUpdates(userInfo.id);

                if (updates.length > 0) {
                    console.log('🎉 Novas atualizações encontradas:', updates.length);
                    setUnseenUpdates(updates);

                    // Mostrar modal apenas para updates de prioridade high ou medium
                    const shouldShowModal = updates.some(u =>
                        u.priority === 'high' || u.priority === 'medium'
                    );

                    if (shouldShowModal) {
                        setIsOpen(true);
                    }
                }
            } catch (error) {
                console.error('Erro ao verificar atualizações:', error);
            }
        };

        // Verificar imediatamente
        checkForUpdates();

        // Verificar a cada 1 hora
        const intervalId = setInterval(checkForUpdates, 60 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [userInfo?.id]);

    const handleDismiss = async () => {
        if (!userInfo?.id) return;

        try {
            // Marcar todos os updates como vistos
            const updateIds = unseenUpdates
                .filter(u => u.id)
                .map(u => u.id!);

            await UpdateNotificationService.markMultipleAsViewed(userInfo.id, updateIds);

            setIsOpen(false);
            setUnseenUpdates([]);
        } catch (error) {
            console.error('Erro ao marcar updates como vistos:', error);
        }
    };

    const handleNext = () => {
        if (currentUpdateIndex < unseenUpdates.length - 1) {
            setCurrentUpdateIndex(prev => prev + 1);
        } else {
            handleDismiss();
        }
    };

    const handlePrevious = () => {
        if (currentUpdateIndex > 0) {
            setCurrentUpdateIndex(prev => prev - 1);
        }
    };

    const getChangeIcon = (type: string) => {
        switch (type) {
            case 'feature':
                return <Sparkles className="h-4 w-4 text-blue-400" />;
            case 'improvement':
                return <Wrench className="h-4 w-4 text-green-400" />;
            case 'bugfix':
                return <Bug className="h-4 w-4 text-amber-400" />;
            case 'breaking':
                return <AlertTriangle className="h-4 w-4 text-red-400" />;
            default:
                return <CheckCircle2 className="h-4 w-4 text-gray-400" />;
        }
    };

    const getChangeTypeLabel = (type: string) => {
        switch (type) {
            case 'feature':
                return 'Nova Funcionalidade';
            case 'improvement':
                return 'Melhoria';
            case 'bugfix':
                return 'Correção';
            case 'breaking':
                return 'Mudança Importante';
            default:
                return 'Alteração';
        }
    };

    const getChangeTypeColor = (type: string) => {
        switch (type) {
            case 'feature':
                return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'improvement':
                return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'bugfix':
                return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            case 'breaking':
                return 'bg-red-500/20 text-red-300 border-red-500/30';
            default:
                return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    if (unseenUpdates.length === 0) return null;

    const currentUpdate = unseenUpdates[currentUpdateIndex];
    if (!currentUpdate) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-yellow-500" />
                            {currentUpdate.title}
                        </DialogTitle>
                        <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                            Versão {currentUpdate.version}
                        </Badge>
                    </div>
                </DialogHeader>

                {/* Contador de updates */}
                {unseenUpdates.length > 1 && (
                    <div className="text-center text-sm text-muted-foreground">
                        Atualização {currentUpdateIndex + 1} de {unseenUpdates.length}
                    </div>
                )}

                {/* Descrição */}
                <div className="space-y-4">
                    <p className="text-muted-foreground">{currentUpdate.description}</p>

                    {/* Lista de mudanças */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg">O que há de novo:</h3>

                        {currentUpdate.changes.map((change, index) => (
                            <div
                                key={index}
                                className={`p-4 rounded-lg border ${getChangeTypeColor(change.type)} flex items-start gap-3`}
                            >
                                <div className="mt-0.5">
                                    {getChangeIcon(change.type)}
                                </div>
                                <div className="flex-1">
                                    <Badge variant="outline" className="mb-2 text-xs">
                                        {getChangeTypeLabel(change.type)}
                                    </Badge>
                                    <p className="text-sm">{change.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Data de lançamento */}
                    <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                        Lançado em {new Date(currentUpdate.releaseDate).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </div>
                </div>

                {/* Botões de navegação */}
                <div className="flex justify-between gap-2 pt-4">
                    {unseenUpdates.length > 1 && (
                        <Button
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={currentUpdateIndex === 0}
                        >
                            Anterior
                        </Button>
                    )}

                    <div className="flex-1" />

                    <Button
                        onClick={handleNext}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                        {currentUpdateIndex < unseenUpdates.length - 1 ? 'Próxima' : 'Entendi!'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
