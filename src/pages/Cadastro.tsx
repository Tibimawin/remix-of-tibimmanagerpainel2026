import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, User, Mail, Lock, CheckCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { FirebaseUserService } from '@/services/FirebaseUserService';

export default function Cadastro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isRegistrationEnabled, setIsRegistrationEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Calcular força da senha
  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 33, label: 'Fraca', color: 'bg-destructive' };
    if (score <= 4) return { score: 66, label: 'Média', color: 'bg-yellow-500' };
    return { score: 100, label: 'Forte', color: 'bg-green-500' };
  };

  // Verificar se o cadastro está habilitado
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'systemSettings', 'registration'),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setIsRegistrationEnabled(docSnapshot.data().enabled || false);
        } else {
          setIsRegistrationEnabled(false);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao verificar status de cadastro:', error);
        setIsRegistrationEnabled(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isRegistrationEnabled) {
      toast.error('Cadastro de novos usuários está desabilitado no momento');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSubmitting(true);

    try {
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      // Criar registro no Firestore
      const referrerUid = searchParams.get('ref');
      const isReferral = !!referrerUid;
      const start = new Date().toISOString();
      const userData = {
        uid: user.uid,
        email: user.email || '',
        name: formData.name,
        accessDays: 1,
        startDate: start,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        totalLogins: 0,
        createdAt: new Date().toISOString(),
        createdBy: isReferral ? 'referral' : 'self-registration'
      };
      
      await FirebaseUserService.createUserRecord(userData);
      if (referrerUid) {
        const { ReferralService } = await import('@/services/ReferralService');
        const attemptReferral = async (attempt: number) => {
          try {
            await ReferralService.createReferral(referrerUid, user.uid, formData.email, formData.name);
            console.log('Indicação registrada com sucesso');
          } catch (err: any) {
            console.error(`Erro ao registrar indicação (tentativa ${attempt}):`, err);
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              return attemptReferral(attempt + 1);
            }
            toast.warning('Não foi possível registrar a indicação. Entre em contato com o suporte.');
          }
        };
        // Delay para garantir que o documento do usuário foi propagado no Firestore
        await new Promise(resolve => setTimeout(resolve, 1500));
        await attemptReferral(1);
      }
      
      toast.success('Conta criada com sucesso! Você já pode fazer login.');
      
      // Redirecionar para login após um breve delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      let errorMessage = 'Erro ao criar conta';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A senha é muito fraca';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Atualizar força da senha quando o campo de senha mudar
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando disponibilidade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header com gradiente suave */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5"></div>
        <div className="relative container mx-auto px-6 py-8">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground mb-6"
            onClick={() => navigate('/')}
          >
            <User className="w-4 h-4 mr-2" />
            Voltar ao início
          </Button>
          
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold text-foreground mb-4">Criar Conta</h1>
            <p className="text-muted-foreground text-lg">
              Crie sua conta e comece a usar o sistema agora mesmo
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md space-y-6">
          {/* Status do Cadastro */}
          {!isRegistrationEnabled ? (
            <Alert className="border-destructive/20 bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                O cadastro de novos usuários está temporariamente desabilitado. 
                Tente novamente mais tarde ou entre em contato com o administrador.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-primary/20 bg-primary/10">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-primary">
                Cadastro disponível! Crie sua conta e tenha acesso imediato ao sistema.
              </AlertDescription>
            </Alert>
          )}

          {/* Formulário */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <User className="w-5 h-5 mr-2 text-primary" />
                Dados Pessoais
              </CardTitle>
              <CardDescription>
                Preencha seus dados para criar sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center text-foreground">
                    <User className="w-4 h-4 mr-2" />
                    Nome Completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Digite seu nome completo"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={!isRegistrationEnabled || submitting}
                    required
                    className="modern-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center text-foreground">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Digite seu email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isRegistrationEnabled || submitting}
                    required
                    className="modern-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center text-foreground">
                    <Lock className="w-4 h-4 mr-2" />
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha (mín. 6 caracteres)"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      disabled={!isRegistrationEnabled || submitting}
                      required
                      className="modern-input pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={!isRegistrationEnabled || submitting}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Indicador de força da senha */}
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Força da senha:</span>
                        <span className={`font-medium ${
                          passwordStrength.label === 'Forte' ? 'text-green-500' :
                          passwordStrength.label === 'Média' ? 'text-yellow-500' :
                          'text-destructive'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${passwordStrength.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use letras maiúsculas, minúsculas, números e caracteres especiais
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="flex items-center text-foreground">
                    <Lock className="w-4 h-4 mr-2" />
                    Confirmar Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirme sua senha"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      disabled={!isRegistrationEnabled || submitting}
                      required
                      className="modern-input pr-20"
                    />
                    <div className="absolute right-0 top-0 h-full flex items-center">
                      {/* Indicador de senhas coincidentes */}
                      {formData.confirmPassword && (
                        <div className="px-2">
                          {formData.password === formData.confirmPassword ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : (
                            <X className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={!isRegistrationEnabled || submitting}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <X className="h-3 w-3" />
                      As senhas não coincidem
                    </p>
                  )}
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      As senhas coincidem
                    </p>
                  )}
                </div>

                <div className="space-y-4 pt-4">
                  <Button 
                    type="submit" 
                    className="w-full modern-button"
                    disabled={!isRegistrationEnabled || submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                        Criando Conta...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Criar Conta
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate('/login')}
                      className="w-full border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      Já tenho uma conta - Fazer Login
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Informações Adicionais */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="flex items-center text-sm text-foreground">
                <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                Acesso Imediato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Sua conta será criada automaticamente</p>
                <p>• Acesso liberado com 1 dia de uso</p>
                <p>• Você pode fazer login imediatamente após criar a conta</p>
                <p>• Comece a usar o sistema agora mesmo</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}