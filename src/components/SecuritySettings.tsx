import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shield, Key, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '@/config/firebase';
import { 
  updatePassword, 
  sendEmailVerification, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  reload
} from 'firebase/auth';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { FirebaseUserService } from '@/services/FirebaseUserService';

const SecuritySettings = () => {
  const { userInfo } = useSimpleAuth();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    // Verificar status do email verification
    const checkSecurityStatus = async () => {
      if (auth.currentUser) {
        await reload(auth.currentUser);
        setEmailVerified(auth.currentUser.emailVerified || false);
        
      }
    };

    checkSecurityStatus();
  }, []);

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast.error('A nova senha deve ser diferente da senha atual');
      return;
    }

    try {
      setLoading(true);
      
      if (!auth.currentUser || !auth.currentUser.email) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Primeira etapa: Reauthentication com a senha atual
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        passwordForm.currentPassword
      );

      try {
        await reauthenticateWithCredential(auth.currentUser, credential);
      } catch (reauthError: any) {
        if (reauthError.code === 'auth/wrong-password') {
          toast.error('Senha atual incorreta');
        } else if (reauthError.code === 'auth/invalid-credential') {
          toast.error('Credenciais inválidas');
        } else {
          toast.error('Erro na verificação da senha atual');
        }
        return;
      }

      // Segunda etapa: Atualizar para a nova senha
      await updatePassword(auth.currentUser, passwordForm.newPassword);
      
      toast.success('Senha atualizada com sucesso!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      
      if (error.code === 'auth/weak-password') {
        toast.error('Senha muito fraca. Use pelo menos 6 caracteres');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Por favor, faça login novamente e tente alterar a senha');
      } else {
        toast.error(`Erro ao atualizar senha: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };




  const sendVerificationEmail = async () => {
    try {
      if (!auth.currentUser) {
        toast.error('Usuário não autenticado');
        return;
      }

      if (auth.currentUser.emailVerified) {
        toast.info('Seu email já está verificado!');
        return;
      }

      setLoading(true);
      await sendEmailVerification(auth.currentUser);
      
      toast.success('📧 Email de verificação enviado! Verifique sua caixa de entrada e spam.');
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      
      if (error.code === 'auth/too-many-requests') {
        toast.error('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
      } else if (error.code === 'auth/user-not-found') {
        toast.error('Usuário não encontrado');
      } else {
        toast.error('Erro ao enviar email de verificação: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshEmailVerification = async () => {
    try {
      if (auth.currentUser) {
        await reload(auth.currentUser);
        setEmailVerified(auth.currentUser.emailVerified || false);
        
        if (auth.currentUser.emailVerified) {
          toast.success('✅ Email verificado com sucesso!');
        } else {
          toast.info('Email ainda não foi verificado. Verifique sua caixa de entrada.');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status do email:', error);
      toast.error('Erro ao verificar status do email');
    }
  };

  return (
    <div className="space-y-6">
      {/* Status de Sincronização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Status da Segurança
          </CardTitle>
          <CardDescription>
            Estado atual da sincronização entre Firebase e Baserow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label>Sistema Baserow:</Label>
              <Badge variant="default" className="ml-2">✅ Conectado</Badge>
            </div>
            <div>
              <Label>Firebase Auth:</Label>
              <Badge variant="default" className="ml-2">
                ✅ Ativo
              </Badge>
            </div>
            <div>
              <Label>Usuário Ativo:</Label>
              <p className="text-muted-foreground">{userInfo?.email}</p>
            </div>
            <div>
              <Label>ID Usuário:</Label>
              <p className="text-muted-foreground font-mono text-xs">{userInfo?.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alteração de Senha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Mantenha sua conta segura alterando sua senha regularmente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Digite sua senha atual"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Digite sua nova senha"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirme sua nova senha"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handlePasswordChange} 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Alterar Senha
              </>
            )}
          </Button>
        </CardContent>
      </Card>


      {/* Verificação de Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verificação de Email
          </CardTitle>
          <CardDescription>
            Confirme seu endereço de email para maior segurança
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Email da Conta</Label>
              <p className="text-sm text-muted-foreground">{userInfo?.email || 'Não disponível'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={emailVerified ? "default" : "destructive"}>
                {emailVerified ? 'Verificado' : 'Não Verificado'}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            {!emailVerified && (
              <Button
                onClick={sendVerificationEmail}
                disabled={loading}
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  '📧 Enviar Email'
                )}
              </Button>
            )}
            
            <Button
              onClick={refreshEmailVerification}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              🔄 Atualizar Status
            </Button>
          </div>

          {!emailVerified && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                📩 Após clicar em "Enviar Email", verifique sua caixa de entrada e pasta de spam. 
                Clique no link de verificação e depois use o botão "Atualizar Status".
              </p>
            </div>
          )}

          {emailVerified && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                ✅ Seu email está verificado! Sua conta está mais segura.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Dicas de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>🔒 Use uma senha forte com pelo menos 8 caracteres</p>
            
            <p>✉️ Mantenha seu email verificado para recuperação de conta</p>
            <p>🔄 Altere sua senha regularmente</p>
            <p>❌ Nunca compartilhe suas credenciais com outras pessoas</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;