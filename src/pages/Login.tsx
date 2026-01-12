
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { toast } from 'sonner';
import { Loader2, AlertCircle, User, ArrowLeft, Shield, CheckCircle, Mail, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginWithGoogle, isAuthenticated } = useSimpleAuth();
  const navigate = useNavigate();
  useEffect(() => {
    // Se já estiver autenticado, sair imediatamente da tela de login
    if (isAuthenticated) {
      navigate('/configuracoes', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        navigate('/configuracoes', { replace: true });
      } else {
        setError(result.message || 'Erro desconhecido.');
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error("Por favor, digite seu email para recuperar a senha.");
      return;
    }

    setIsResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      
      toast.success("Email enviado! Verifique sua caixa de entrada para redefinir sua senha.");
      
      setIsResetDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      let message = 'Erro ao enviar email de recuperação.';
      if (error.code === 'auth/user-not-found') {
        message = 'Email não encontrado em nossa base de dados.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Email inválido.';
      }
      
      toast.error(message);
    } finally {
      setIsResetLoading(false);
    }
  };

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
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao início
          </Button>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md">
          <Card className="modern-card">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Painel Administrativo</CardTitle>
              <CardDescription className="text-muted-foreground">
                Faça login para acessar o painel de gestão
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="Digite seu email"
                    autoComplete="email"
                    className="modern-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="Digite sua senha"
                      autoComplete="current-password"
                      className="modern-input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-destructive text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {error}
                    </p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full modern-button"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando acesso...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Entrar
                    </>
                  )}
                </Button>

                {/* Login com Google */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  disabled={isLoading}
                  onClick={async () => {
                    setError('');
                    setIsLoading(true);
                    try {
                      const result = await loginWithGoogle();
                      if (result.success) {
                        navigate('/configuracoes');
                      } else {
                        setError(result.message || 'Falha ao autenticar com Google.');
                      }
                    } catch (error) {
                      setError('Erro ao conectar com Google.');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Conectando com Google...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Entrar com Google
                    </>
                  )}
                </Button>

                {/* Esqueceu a senha */}
                <div className="text-center">
                  <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        type="button" 
                        variant="ghost"
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        Esqueceu a senha?
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="modern-card">
                      <DialogHeader>
                        <DialogTitle className="text-foreground flex items-center">
                          <Mail className="w-5 h-5 mr-2" />
                          Recuperar Senha
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Digite seu email para receber as instruções de recuperação.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="resetEmail" className="text-foreground">Email</Label>
                          <Input
                            id="resetEmail"
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            disabled={isResetLoading}
                            placeholder="Digite seu email"
                            className="modern-input"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => setIsResetDialogOpen(false)}
                            className="flex-1"
                            disabled={isResetLoading}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            className="flex-1 modern-button"
                            disabled={isResetLoading}
                          >
                            {isResetLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Mail className="w-4 h-4 mr-2" />
                                Enviar Email
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Link para Cadastro */}
                <div className="text-center">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => navigate('/cadastro')}
                    className="w-full border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Criar nova conta
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
