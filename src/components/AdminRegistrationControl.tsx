import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const AdminRegistrationControl: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Carregar status atual
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'systemSettings', 'registration'),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setIsEnabled(data.enabled || false);
          setLastUpdated(data.lastUpdated || '');
        } else {
          // Criar documento inicial se não existir
          const defaultSettings = {
            enabled: false,
            lastUpdated: new Date().toISOString(),
            updatedBy: 'admin'
          };
          setDoc(doc(db, 'systemSettings', 'registration'), defaultSettings);
          setIsEnabled(false);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar configurações:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleToggle = async (enabled: boolean) => {
    setUpdating(true);
    
    try {
      const newSettings = {
        enabled,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'admin'
      };

      await setDoc(doc(db, 'systemSettings', 'registration'), newSettings);
      
      toast.success(
        enabled 
          ? 'Cadastro de usuários habilitado com sucesso!' 
          : 'Cadastro de usuários desabilitado com sucesso!'
      );

      // Log da ação
      try {
        const logs = JSON.parse(localStorage.getItem('system-logs') || '[]');
        logs.unshift({
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString('pt-BR'),
          userEmail: 'admin',
          action: enabled ? 'Habilitou cadastro de usuários' : 'Desabilitou cadastro de usuários',
          details: `Sistema de cadastro ${enabled ? 'ativado' : 'desativado'} pelo administrador`
        });
        localStorage.setItem('system-logs', JSON.stringify(logs));
      } catch (error) {
        console.error('Erro ao salvar log:', error);
      }

    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Carregando configurações...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controle Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-primary" />
            Controle de Cadastro de Usuários
          </CardTitle>
          <CardDescription>
            Gerencie se novos usuários podem se cadastrar no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Switch Principal */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                Permitir novos cadastros
              </Label>
              <p className="text-sm text-muted-foreground">
                Quando habilitado, usuários podem solicitar cadastro na página de registro
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={updating}
            />
          </div>

          {/* Status Atual */}
          <Alert>
            {isEnabled ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {isEnabled 
                ? 'Cadastro de novos usuários está HABILITADO. Usuários podem se registrar.'
                : 'Cadastro de novos usuários está DESABILITADO. Apenas admins podem criar contas.'
              }
            </AlertDescription>
          </Alert>

          {/* Informações Adicionais */}
          {lastUpdated && (
            <div className="text-sm text-muted-foreground">
              Última atualização: {new Date(lastUpdated).toLocaleString('pt-BR')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-primary" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant={isEnabled ? "destructive" : "default"}
              onClick={() => handleToggle(!isEnabled)}
              disabled={updating}
              className="w-full"
            >
              {updating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : isEnabled ? (
                <XCircle className="w-4 h-4 mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {isEnabled ? 'Desabilitar Cadastros' : 'Habilitar Cadastros'}
            </Button>

            <Button
              variant="outline"
              onClick={() => window.open('/cadastro', '_blank')}
              className="w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Visualizar Página de Cadastro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações Importantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-amber-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Informações Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium mb-1">Quando habilitado:</h4>
              <ul className="space-y-1 text-muted-foreground ml-4">
                <li>• Usuários podem acessar a página /cadastro</li>
                <li>• Formulário de registro ficará disponível</li>
                <li>• Solicitações serão enviadas para aprovação manual</li>
                <li>• Você ainda controla quem é aprovado</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-1">Quando desabilitado:</h4>
              <ul className="space-y-1 text-muted-foreground ml-4">
                <li>• Página de cadastro mostra mensagem de indisponibilidade</li>
                <li>• Apenas admins podem criar usuários</li>
                <li>• Formulário fica bloqueado para preenchimento</li>
                <li>• Maior controle sobre criação de contas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};