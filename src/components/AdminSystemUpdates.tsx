import React, { useState, useEffect } from 'react';
import { UpdateNotificationService, UpdateNote } from '@/services/UpdateNotificationService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Sparkles, Wrench, Bug, AlertTriangle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

type ChangeType = 'feature' | 'improvement' | 'bugfix' | 'breaking';

export const AdminSystemUpdates: React.FC = () => {
    const { adminUser } = useAdminAuth();
    const [updates, setUpdates] = useState<UpdateNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const [formData, setFormData] = useState({
        version: '',
        title: '',
        description: '',
        priority: 'medium' as 'low' | 'medium' | 'high',
        releaseDate: new Date().toISOString().split('T')[0]
    });

    const [changes, setChanges] = useState<{ type: ChangeType; description: string }[]>([
        { type: 'feature', description: '' }
    ]);

    useEffect(() => {
        loadUpdates();
    }, []);

    const loadUpdates = async () => {
        try {
            setLoading(true);
            const data = await UpdateNotificationService.getAllUpdates();
            setUpdates(data);
        } catch (error) {
            console.error('Erro ao carregar atualizações:', error);
            toast.error('Erro ao carregar atualizações');
        } finally {
            setLoading(false);
        }
    };

    const addChange = () => {
        setChanges([...changes, { type: 'feature', description: '' }]);
    };

    const removeChange = (index: number) => {
        setChanges(changes.filter((_, i) => i !== index));
    };

    const updateChange = (index: number, field: 'type' | 'description', value: string) => {
        const newChanges = [...changes];
        if (field === 'type') {
            newChanges[index].type = value as ChangeType;
        } else {
            newChanges[index].description = value;
        }
        setChanges(newChanges);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!adminUser) {
            toast.error('Você precisa estar logado como admin');
            return;
        }

        // Validações
        if (!formData.version || !formData.title || !formData.description) {
            toast.error('Preencha todos os campos obrigatórios');
            return;
        }

        const validChanges = changes.filter(c => c.description.trim() !== '');
        if (validChanges.length === 0) {
            toast.error('Adicione pelo menos uma mudança');
            return;
        }

        setIsCreating(true);

        try {
            const updateId = await UpdateNotificationService.createUpdate({
                version: formData.version,
                title: formData.title,
                description: formData.description,
                changes: validChanges,
                releaseDate: formData.releaseDate,
                createdBy: adminUser.email || 'admin',
                priority: formData.priority
            });

            toast.success('Atualização criada com sucesso!');

            // Perguntar se quer notificar usuários
            const shouldNotify = window.confirm(
                'Deseja enviar notificação para todos os usuários sobre esta atualização?'
            );

            if (shouldNotify) {
                await UpdateNotificationService.notifyAllUsers(updateId, formData.title);
                toast.success('Notificações enviadas para todos os usuários!');
            }

            // Resetar formulário
            setFormData({
                version: '',
                title: '',
                description: '',
                priority: 'medium',
                releaseDate: new Date().toISOString().split('T')[0]
            });
            setChanges([{ type: 'feature', description: '' }]);
            setDialogOpen(false);

            // Recarregar lista
            loadUpdates();
        } catch (error) {
            console.error('Erro ao criar atualização:', error);
            toast.error('Erro ao criar atualização');
        } finally {
            setIsCreating(false);
        }
    };

    const getChangeTypeIcon = (type: ChangeType) => {
        switch (type) {
            case 'feature':
                return <Sparkles className="h-4 w-4" />;
            case 'improvement':
                return <Wrench className="h-4 w-4" />;
            case 'bugfix':
                return <Bug className="h-4 w-4" />;
            case 'breaking':
                return <AlertTriangle className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-purple-500" />
                                Gerenciar Atualizações do Sistema
                            </CardTitle>
                            <CardDescription>
                                Crie notas de atualização para informar os usuários sobre novidades
                            </CardDescription>
                        </div>

                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nova Atualização
                                </Button>
                            </DialogTrigger>

                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Criar Nova Atualização</DialogTitle>
                                </DialogHeader>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Informações básicas */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="version">Versão *</Label>
                                            <Input
                                                id="version"
                                                placeholder="2.5.0"
                                                value={formData.version}
                                                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="releaseDate">Data de Lançamento *</Label>
                                            <Input
                                                id="releaseDate"
                                                type="date"
                                                value={formData.releaseDate}
                                                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="title">Título *</Label>
                                        <Input
                                            id="title"
                                            placeholder="Ex: Nova Funcionalidade de Automação"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="description">Descrição *</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Descrição resumida da atualização..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={3}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="priority">Prioridade</Label>
                                        <select
                                            id="priority"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                                            className="w-full px-3 py-2 border rounded-md"
                                        >
                                            <option value="low">Baixa - Apenas notificação</option>
                                            <option value="medium">Média - Modal ao fazer login</option>
                                            <option value="high">Alta - Modal importante</option>
                                        </select>
                                    </div>

                                    {/* Lista de mudanças */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label>Mudanças *</Label>
                                            <Button type="button" size="sm" variant="outline" onClick={addChange}>
                                                <Plus className="h-4 w-4 mr-1" />
                                                Adicionar Mudança
                                            </Button>
                                        </div>

                                        {changes.map((change, index) => (
                                            <div key={index} className="flex gap-2">
                                                <select
                                                    value={change.type}
                                                    onChange={(e) => updateChange(index, 'type', e.target.value)}
                                                    className="px-3 py-2 border rounded-md"
                                                >
                                                    <option value="feature">✨ Nova Funcionalidade</option>
                                                    <option value="improvement">🔧 Melhoria</option>
                                                    <option value="bugfix">🐛 Correção</option>
                                                    <option value="breaking">⚠️ Mudança Importante</option>
                                                </select>

                                                <Input
                                                    placeholder="Descrição da mudança..."
                                                    value={change.description}
                                                    onChange={(e) => updateChange(index, 'description', e.target.value)}
                                                    className="flex-1"
                                                />

                                                {changes.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => removeChange(index)}
                                                    >
                                                        Remover
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={isCreating}>
                                            {isCreating ? 'Criando...' : 'Criar Atualização'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">Carregando atualizações...</p>
                        </div>
                    ) : updates.length === 0 ? (
                        <div className="text-center py-8">
                            <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-foreground font-medium">Nenhuma atualização criada ainda</p>
                            <p className="text-sm text-muted-foreground">Crie a primeira atualização do sistema</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {updates.map((update) => (
                                <Card key={update.id} className="border-l-4 border-l-purple-500">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-lg">{update.title}</CardTitle>
                                                <CardDescription>{update.description}</CardDescription>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge variant="outline">v{update.version}</Badge>
                                                <Badge variant={
                                                    update.priority === 'high' ? 'destructive' :
                                                        update.priority === 'medium' ? 'default' : 'secondary'
                                                }>
                                                    {update.priority === 'high' ? 'Alta' :
                                                        update.priority === 'medium' ? 'Média' : 'Baixa'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {update.changes.map((change, idx) => (
                                                <div key={idx} className="flex items-start gap-2 text-sm">
                                                    {getChangeTypeIcon(change.type)}
                                                    <span>{change.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                                            Lançado em {new Date(update.releaseDate).toLocaleDateString('pt-BR')} por {update.createdBy}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
