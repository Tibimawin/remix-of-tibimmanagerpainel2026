import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FirebaseUserService, FirebaseUser } from '@/services/FirebaseUserService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bell, BellOff, Clock, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminAlert {
    id: string;
    type: 'expired' | 'expiring' | 'automation-running';
    severity: 'critical' | 'warning' | 'info';
    userId: string;
    userEmail: string;
    userName: string;
    message: string;
    timestamp: string;
    dismissed?: boolean;
}

export const AdminAlertCenter: React.FC = () => {
    const [alerts, setAlerts] = useState<AdminAlert[]>([]);
    const [users, setUsers] = useState<FirebaseUser[]>([]);
    const [automationRunning, setAutomationRunning] = useState<string[]>([]);
    const [showDismissed, setShowDismissed] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Monitorar usuários em tempo real
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'users'),
            (snapshot) => {
                const userData: FirebaseUser[] = [];
                snapshot.forEach((doc) => {
                    userData.push({ uid: doc.id, ...doc.data() } as FirebaseUser);
                });
                setUsers(userData);
                checkForAlerts(userData);
            }
        );

        return () => unsubscribe();
    }, []);

    // Monitorar logs de automação em tempo real
    useEffect(() => {
        const q = query(
            collection(db, 'autoImportLogs'),
            where('status', '==', 'success'),
            orderBy('timestamp', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const runningUsers = new Set<string>();
            const now = new Date().getTime();
            const fiveMinutesAgo = now - (5 * 60 * 1000);

            snapshot.forEach((doc) => {
                const data = doc.data();
                const logTime = new Date(data.timestamp).getTime();

                // Se importou nos últimos 5 minutos, considera como "rodando"
                if (logTime > fiveMinutesAgo) {
                    runningUsers.add(data.userEmail);
                }
            });

            setAutomationRunning(Array.from(runningUsers));
        });

        return () => unsubscribe();
    }, []);

    const checkForAlerts = (userList: FirebaseUser[]) => {
        const newAlerts: AdminAlert[] = [];
        const now = new Date();

        userList.forEach((user) => {
            const expiryDate = new Date(user.expiryDate);
            const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

            // 🚨 ALERTA CRÍTICO: Assinatura Expirada
            if (user.isActive && daysRemaining <= 0) {
                newAlerts.push({
                    id: `expired-${user.uid}`,
                    type: 'expired',
                    severity: 'critical',
                    userId: user.uid,
                    userEmail: user.email,
                    userName: user.name,
                    message: `Assinatura EXPIRADA! Expirou ${Math.abs(daysRemaining)} dia(s) atrás`,
                    timestamp: new Date().toISOString(),
                    dismissed: false
                });
            }

            // ⚠️ ALERTA: Assinatura Expirando em Breve (1-7 dias)
            if (user.isActive && daysRemaining > 0 && daysRemaining <= 7) {
                newAlerts.push({
                    id: `expiring-${user.uid}`,
                    type: 'expiring',
                    severity: 'warning',
                    userId: user.uid,
                    userEmail: user.email,
                    userName: user.name,
                    message: `Assinatura expira em ${daysRemaining} dia(s)`,
                    timestamp: new Date().toISOString(),
                    dismissed: false
                });
            }
        });

        // 🤖 ALERTA: Automação Rodando
        automationRunning.forEach((userEmail) => {
            const user = userList.find(u => u.email === userEmail);
            if (user) {
                newAlerts.push({
                    id: `automation-${user.uid}`,
                    type: 'automation-running',
                    severity: 'info',
                    userId: user.uid,
                    userEmail: user.email,
                    userName: user.name,
                    message: `Automação está importando conteúdos`,
                    timestamp: new Date().toISOString(),
                    dismissed: false
                });
            }
        });

        // Atualizar alertas e mostrar toast para novos alertas críticos
        const criticalAlerts = newAlerts.filter(a => a.severity === 'critical');

        if (criticalAlerts.length > 0 && soundEnabled) {
            // Tocar som de alerta
            playAlertSound();

            criticalAlerts.forEach(alert => {
                toast.error(`🚨 ${alert.userName}: ${alert.message}`, {
                    duration: 10000,
                    action: {
                        label: 'Ver Detalhes',
                        onClick: () => console.log('Navegar para usuário:', alert.userId)
                    }
                });
            });
        }

        setAlerts(newAlerts);
    };

    const playAlertSound = () => {
        // Som de alerta suave
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    };

    const dismissAlert = (alertId: string) => {
        setAlerts(prev => prev.map(a =>
            a.id === alertId ? { ...a, dismissed: true } : a
        ));
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-500/20 text-red-300 border-red-500/30';
            case 'warning':
                return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            case 'info':
                return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            default:
                return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    const getSeverityIcon = (type: string) => {
        switch (type) {
            case 'expired':
                return <AlertTriangle className="h-5 w-5" />;
            case 'expiring':
                return <Clock className="h-5 w-5" />;
            case 'automation-running':
                return <Zap className="h-5 w-5" />;
            default:
                return <Bell className="h-5 w-5" />;
        }
    };

    const activeAlerts = alerts.filter(a => !a.dismissed);
    const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
    const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;
    const infoCount = activeAlerts.filter(a => a.severity === 'info').length;

    return (
        <Card className="bg-gradient-to-br from-slate-900/50 via-slate-800/30 to-slate-900/50 border-slate-700/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-yellow-500" />
                        Central de Alertas do Admin
                        {activeAlerts.length > 0 && (
                            <Badge variant="destructive" className="animate-pulse">
                                {activeAlerts.length}
                            </Badge>
                        )}
                    </CardTitle>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={soundEnabled ? 'border-green-500/30' : 'border-red-500/30'}
                        >
                            {soundEnabled ? (
                                <>
                                    <Bell className="h-4 w-4 mr-1" />
                                    Som On
                                </>
                            ) : (
                                <>
                                    <BellOff className="h-4 w-4 mr-1" />
                                    Som Off
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDismissed(!showDismissed)}
                        >
                            {showDismissed ? 'Ocultar Ignorados' : 'Mostrar Ignorados'}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Resumo de Alertas */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-red-300">Críticos</span>
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                        </div>
                        <p className="text-2xl font-bold text-red-300">{criticalCount}</p>
                    </div>

                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-amber-300">Avisos</span>
                            <Clock className="h-4 w-4 text-amber-400" />
                        </div>
                        <p className="text-2xl font-bold text-amber-300">{warningCount}</p>
                    </div>

                    <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-300">Info</span>
                            <Zap className="h-4 w-4 text-blue-400" />
                        </div>
                        <p className="text-2xl font-bold text-blue-300">{infoCount}</p>
                    </div>
                </div>

                {/* Lista de Alertas */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(showDismissed ? alerts : activeAlerts).map((alert) => (
                        <div
                            key={alert.id}
                            className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)} transition-all ${alert.dismissed ? 'opacity-50' : 'opacity-100'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        {getSeverityIcon(alert.type)}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{alert.userName}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {alert.userEmail}
                                            </Badge>
                                            {alert.dismissed && (
                                                <Badge variant="secondary" className="text-xs">
                                                    Ignorado
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm">{alert.message}</p>
                                        <p className="text-xs opacity-60">
                                            {format(new Date(alert.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                        </p>
                                    </div>
                                </div>

                                {!alert.dismissed && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => dismissAlert(alert.id)}
                                        className="ml-2"
                                    >
                                        Ignorar
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}

                    {activeAlerts.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">Nenhum alerta ativo</p>
                            <p className="text-sm opacity-60">Tudo está funcionando perfeitamente!</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
