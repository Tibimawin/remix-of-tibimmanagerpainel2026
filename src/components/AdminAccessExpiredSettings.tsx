import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Settings, Mail, MessageCircle } from 'lucide-react';
import { AccessExpiredConfigService, defaultConfig, type AccessExpiredConfig } from '@/services/AccessExpiredConfigService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export const AdminAccessExpiredSettings: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const [config, setConfig] = useState<AccessExpiredConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [newInstruction, setNewInstruction] = useState('');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeConfig = async () => {
      try {
        // Migrar do localStorage se necessário
        if (adminUser?.email) {
          await AccessExpiredConfigService.migrateFromLocalStorage(adminUser.email);
        }

        // Configurar listener em tempo real
        unsubscribe = AccessExpiredConfigService.onConfigChange((newConfig) => {
          setConfig(newConfig);
          setLoading(false);
        });

      } catch (error) {
        console.error('Erro ao inicializar configurações:', error);
        setLoading(false);
      }
    };

    initializeConfig();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [adminUser?.email]);

  const handleSave = async () => {
    if (!adminUser?.email) {
      toast.error('Usuário não autenticado');
      return;
    }

    setLoading(true);
    try {
      const configToSave = {
        title: config.title,
        description: config.description,
        instructions: config.instructions,
        contactType: config.contactType,
        contactValue: config.contactValue,
        contactLabel: config.contactLabel
      };

      await AccessExpiredConfigService.saveConfig(configToSave, adminUser.email);
      toast.success('Configurações salvas com sucesso! Todos os usuários verão as mudanças em tempo real.');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações no Firebase');
    } finally {
      setLoading(false);
    }
  };

  const addInstruction = () => {
    if (newInstruction.trim()) {
      setConfig(prev => ({
        ...prev,
        instructions: [...prev.instructions, newInstruction.trim()]
      }));
      setNewInstruction('');
    }
  };

  const removeInstruction = (index: number) => {
    setConfig(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  };

  const updateInstruction = (index: number, value: string) => {
    setConfig(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => i === index ? value : inst)
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Configurações - Acesso Expirado</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personalizar Mensagem de Acesso Expirado</CardTitle>
          <CardDescription>
            Configure como os usuários com acesso expirado verão a mensagem de bloqueio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Título e Descrição */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Mensagem</Label>
              <Input
                id="title"
                value={config.title}
                onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título principal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={config.description}
                onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição da situação"
              />
            </div>
          </div>

          {/* Instruções */}
          <div className="space-y-4">
            <Label>Instruções para Renovação</Label>
            <div className="space-y-2">
              {config.instructions.map((instruction, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={instruction}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    placeholder={`Instrução ${index + 1}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeInstruction(index)}
                  >
                    Remover
                  </Button>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <Input
                  value={newInstruction}
                  onChange={(e) => setNewInstruction(e.target.value)}
                  placeholder="Nova instrução"
                  onKeyPress={(e) => e.key === 'Enter' && addInstruction()}
                />
                <Button variant="outline" onClick={addInstruction}>
                  Adicionar
                </Button>
              </div>
            </div>
          </div>

          {/* Informações de Contato */}
          <div className="space-y-4">
            <Label>Informações de Contato</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactType">Tipo de Contato</Label>
                <Select
                  value={config.contactType}
                  onValueChange={(value: 'email' | 'whatsapp') => 
                    setConfig(prev => ({ ...prev, contactType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>Email</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="whatsapp">
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactLabel">Rótulo</Label>
                <Input
                  id="contactLabel"
                  value={config.contactLabel}
                  onChange={(e) => setConfig(prev => ({ ...prev, contactLabel: e.target.value }))}
                  placeholder="Ex: Suporte, Atendimento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactValue">
                  {config.contactType === 'email' ? 'Email' : 'Número WhatsApp'}
                </Label>
                <Input
                  id="contactValue"
                  value={config.contactValue}
                  onChange={(e) => setConfig(prev => ({ ...prev, contactValue: e.target.value }))}
                  placeholder={
                    config.contactType === 'email' 
                      ? 'admin@exemplo.com' 
                      : '+55 11 99999-9999'
                  }
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <Label>Prévia da Mensagem</Label>
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">{config.title}</h3>
                <p className="text-muted-foreground">{config.description}</p>
              </div>
              
              <div className="bg-background p-3 rounded border mb-4">
                <h4 className="font-medium mb-2">Como renovar seu acesso:</h4>
                <ul className="space-y-1 text-sm">
                  {config.instructions.map((instruction, index) => (
                    <li key={index}>• {instruction}</li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-primary/10 rounded">
                {config.contactType === 'email' ? (
                  <Mail className="h-4 w-4 text-primary" />
                ) : (
                  <MessageCircle className="h-4 w-4 text-primary" />
                )}
                <div className="text-sm">
                  <p className="font-medium">{config.contactLabel}</p>
                  <p className="text-muted-foreground">{config.contactValue}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Sincronização em Tempo Real:</strong> As alterações serão aplicadas automaticamente para todos os usuários conectados.
            </p>
            {config.lastUpdated && (
              <p className="text-xs text-blue-600 mt-1">
                Última atualização: {new Date(config.lastUpdated).toLocaleString('pt-BR')} por {config.updatedBy}
              </p>
            )}
          </div>

          {/* Botão Salvar */}
          <Button onClick={handleSave} disabled={loading} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando no Firebase...' : 'Salvar Configurações Globais'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};