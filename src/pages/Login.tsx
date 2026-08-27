
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { toast } from 'sonner';
import { 
  Loader2, 
  AlertCircle, 
  UserPlus, 
  ArrowLeft, 
  ShieldCheck, 
  Mail, 
  Eye, 
  EyeOff, 
  Lock, 
  Tv, 
  Sparkles,
  ArrowRight,
  KeyRound
} from 'lucide-react';

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
        setError(result.message || 'Credenciais inválidas. Verifique seus dados.');
      }
    } catch {
      setError('Erro de conexão. Verifique sua rede e tente novamente.');
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
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-orange-500 selection:text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-orange-500/15 via-primary/10 to-amber-500/15 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Top Navbar */}
      <header className="container mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground font-medium gap-2 -ml-2"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Button>

        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Tv className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:inline">
            Tibim <span className="text-orange-400">Manager</span>
          </span>
        </div>
      </header>

      {/* Center Form Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-md space-y-6">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 mb-2 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Acesse seu Painel
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seus conteúdos, canais, clientes e integrações
            </p>
          </div>

          <Card className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-2xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-5">
              
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3.5 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-destructive font-medium leading-relaxed">
                    {error}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email de Acesso
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="seuemail@exemplo.com"
                      autoComplete="email"
                      className="h-11 pl-10 bg-secondary/40 border-border/70 focus:border-orange-500 text-foreground text-sm rounded-xl transition-all"
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Senha
                    </Label>
                    <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                      <DialogTrigger asChild>
                        <button 
                          type="button" 
                          className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors"
                        >
                          Esqueceu a senha?
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border/80 shadow-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-foreground flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-orange-400" />
                            Recuperar Senha
                          </DialogTitle>
                          <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
                            Digite o email cadastrado para receber o link de redefinição de senha.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleResetPassword} className="space-y-4 mt-3">
                          <div className="space-y-2">
                            <Label htmlFor="resetEmail" className="text-xs font-medium text-foreground">Email</Label>
                            <Input
                              id="resetEmail"
                              type="email"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              required
                              disabled={isResetLoading}
                              placeholder="seuemail@exemplo.com"
                              className="h-10 rounded-xl bg-secondary/50 border-border"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => setIsResetDialogOpen(false)}
                              className="flex-1 rounded-xl"
                              disabled={isResetLoading}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              type="submit" 
                              className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium"
                              disabled={isResetLoading}
                            >
                              {isResetLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Enviar Link"
                              )}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="h-11 pl-10 pr-10 bg-secondary/40 border-border/70 focus:border-orange-500 text-foreground text-sm rounded-xl transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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

                <Button 
                  type="submit" 
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Autenticando...
                    </>
                  ) : (
                    <>
                      Entrar no Painel
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                  <span className="bg-card px-3 text-muted-foreground">Ou continue com</span>
                </div>
              </div>

              {/* Login com Google */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 rounded-xl border-border/80 bg-secondary/20 hover:bg-secondary/60 text-foreground text-sm font-medium gap-2 transition-all"
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
                  } catch {
                    setError('Erro ao conectar com Google.');
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>

              <div className="pt-2 text-center">
                <p className="text-xs text-muted-foreground">
                  Ainda não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/cadastro')}
                    className="font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Criar nova conta
                  </button>
                </p>
              </div>

            </CardContent>
          </Card>

        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground/60">
        © {new Date().getFullYear()} Tibim Manager • Sistema Seguro de Gestão de Mídia
      </footer>
    </div>
  );
};

export default Login;
