import React, { useState, useEffect } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useLocation } from 'react-router-dom';
import { AIAssistantService, AISuggestion } from '@/services/AIAssistantService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles, X, Lightbulb, Zap, AlertTriangle, TrendingUp,
    ChevronRight, Minimize2, Maximize2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AIAssistant: React.FC = () => {
    // 🚨 TEMPORARIAMENTE DESABILITADO devido a quota exceeded do Firebase
    // Reativar quando quota resetar (24h) ou após upgrade do plano
    return null;
    const { userInfo } = useSimpleAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        if (!userInfo?.id) return;

        loadSuggestions();

        // Recarregar sugestões a cada 1 HORA (otimizado para evitar quota exceeded)
        const interval = setInterval(loadSuggestions, 60 * 60 * 1000);

        return () => clearInterval(interval);
    }, [userInfo?.id, location.pathname]);

    const loadSuggestions = async () => {
        if (!userInfo?.id) return;

        try {
            setLoading(true);

            // Buscar sugestões contextuais para a página atual
            const contextualSuggestions = await AIAssistantService.getContextualSuggestions(
                userInfo.id,
                location.pathname
            );

            // Limitar a 3 sugestões mais importantes
            const topSuggestions = contextualSuggestions
                .sort((a, b) => {
                    const priorityWeight = { high: 3, medium: 2, low: 1 };
                    return priorityWeight[b.priority] - priorityWeight[a.priority];
                })
                .slice(0, 3);

            setSuggestions(topSuggestions);
        } catch (error) {
            console.error('Erro ao carregar sugestões:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (suggestion: AISuggestion) => {
        if (suggestion.actionRoute) {
            navigate(suggestion.actionRoute);
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'tip':
                return <Lightbulb className="h-5 w-5" />;
            case 'feature':
                return <Sparkles className="h-5 w-5" />;
            case 'workflow':
                return <TrendingUp className="h-5 w-5" />;
            case 'optimization':
                return <Zap className="h-5 w-5" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5" />;
            default:
                return <Lightbulb className="h-5 w-5" />;
        }
    };

    const getColorForType = (type: string) => {
        switch (type) {
            case 'tip':
                return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'feature':
                return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
            case 'workflow':
                return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'optimization':
                return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
            case 'warning':
                return 'bg-red-500/20 text-red-300 border-red-500/30';
            default:
                return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'high':
                return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Alta</Badge>;
            case 'medium':
                return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Média</Badge>;
            case 'low':
                return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Baixa</Badge>;
            default:
                return null;
        }
    };

    if (isDismissed || !userInfo?.id) return null;
    if (loading && suggestions.length === 0) return null;
    if (suggestions.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 max-w-md">
            {isMinimized ? (
                // Botão minimizado
                <Button
                    onClick={() => setIsMinimized(false)}
                    className="rounded-full h-14 w-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg animate-pulse"
                >
                    <Sparkles className="h-6 w-6" />
                </Button>
            ) : (
                // Card completo
                <Card className="shadow-2xl border-purple-500/30 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600">
                                    <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-lg">IA Assistente</CardTitle>
                            </div>

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsMinimized(true)}
                                    className="h-8 w-8 p-0"
                                >
                                    <Minimize2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsDismissed(true)}
                                    className="h-8 w-8 p-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Sugestões personalizadas para você
                        </p>
                    </CardHeader>

                    <CardContent className="space-y-3">
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className={`p-4 rounded-lg border ${getColorForType(suggestion.type)} transition-all hover:scale-[1.02]`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        {getIconForType(suggestion.type)}
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-semibold text-sm leading-tight">
                                                {suggestion.title}
                                            </h4>
                                            {getPriorityBadge(suggestion.priority)}
                                        </div>

                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {suggestion.description}
                                        </p>

                                        {suggestion.actionLabel && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAction(suggestion)}
                                                className="w-full mt-2 group"
                                            >
                                                {suggestion.actionLabel}
                                                <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="text-center pt-2">
                            <p className="text-xs text-muted-foreground">
                                💡 Baseado no seu padrão de uso
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
