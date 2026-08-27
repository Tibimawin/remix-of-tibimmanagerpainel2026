import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertCircle, 
  User, 
  Mail, 
  Lock, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  ArrowLeft, 
  Sparkles, 
  Tv, 
  Zap, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  UserPlus
} from 'lucide-react';
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
    if (score <= 4) return { score: 66, label: 'Média', color: 'bg-amber-500' };
    return { score: 100, label: 'Forte', color: 'bg-emerald-500' };
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
        await new Promise(resolve => setTimeout(resolve, 1500));
        await attemptReferral(1);
      }
      
      toast.success('Conta criada com sucesso! Redirecionando para o login...');
      
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      let errorMessage = 'Erro ao criar conta';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está cadastrado no sistema.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A senha informada é fraca. Use pelo menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email informado é inválido.';
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
    
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-sm text-muted-foreground">Verificando status do sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-orange-500 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[380px] bg-gradient-to-br from-orange-500/15 via-primary/10 to-amber-500/15 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

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

      {/* Center Layout */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Info Column (Hidden or top on small screens, detailed on large) */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Acesso Instantâneo</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                Crie sua conta no <br />
                <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300 bg-clip-text text-transparent">
                  Tibim Manager
                </span>
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Comece agora mesmo a gerenciar seus canais, playlists M3U personalizadas e catálogo em uma única plataforma.
              </p>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-3 pt-2 text-left">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">1 Dia de Acesso Imediato</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Liberação automática de testes logo após o cadastro.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">API e M3U Sob Medida</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">URLs protegidas com Modo Tibim e tokens de autorização.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Segurança de Dados</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Controle de renovações e gerenciamento de permissões.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="lg:col-span-7">
            <Card className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-2xl overflow-hidden">
              <CardContent className="p-6 sm:p-8 space-y-5">
                
                {/* Registration status badge */}
                {!isRegistrationEnabled ? (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3.5 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-destructive">Cadastros Temporariamente Desativados</h4>
                      <p className="text-xs text-destructive/90 mt-0.5">
                        O registro de novos usuários está suspenso. Entre em contato com o suporte para solicitar um convite.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Inscrições abertas com ativação imediata.</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Nome Completo */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nome Completo
                    </Label>
                    <div className="relative">
                      <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Ex: João da Silva"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        disabled={!isRegistrationEnabled || submitting}
                        required
                        className="h-11 pl-10 bg-secondary/40 border-border/70 focus:border-orange-500 text-foreground text-sm rounded-xl transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seuemail@exemplo.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={!isRegistrationEnabled || submitting}
                        required
                        className="h-11 pl-10 bg-secondary/40 border-border/70 focus:border-orange-500 text-foreground text-sm rounded-xl transition-all"
                      />
                    </div>
                  </div>

                  {/* Senha e Confirmar Senha (Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Senha */}
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Senha
                      </Label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Mín. 6 caracteres"
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          disabled={!isRegistrationEnabled || submitting}
                          required
                          className="h-11 pl-10 pr-10 bg-secondary/40 border-border/70 focus:border-orange-500 text-foreground text-sm rounded-xl transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          disabled={!isRegistrationEnabled || submitting}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirmar Senha */}
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Confirmar Senha
                      </Label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Repita a senha"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          disabled={!isRegistrationEnabled || submitting}
                          required
                          className="h-11 pl-10 pr-10 bg-secondary/40 border-border/70 focus:border-orange-500 text-foreground text-sm rounded-xl transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          disabled={!isRegistrationEnabled || submitting}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Indicador de força de senha */}
                  {formData.password && (
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Força da senha:</span>
                        <span className={`font-semibold ${
                          passwordStrength.label === 'Forte' ? 'text-emerald-400' :
                          passwordStrength.label === 'Média' ? 'text-amber-400' :
                          'text-destructive'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${passwordStrength.score}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Comparativo de confirmação */}
                  {formData.confirmPassword && (
                    <div className="text-xs">
                      {formData.password === formData.confirmPassword ? (
                        <p className="text-emerald-400 flex items-center gap-1.5 font-medium">
                          <Check className="w-3.5 h-3.5" /> As senhas conferem
                        </p>
                      ) : (
                        <p className="text-destructive flex items-center gap-1.5 font-medium">
                          <X className="w-3.5 h-3.5" /> As senhas não conferem
                        </p>
                      )}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-11 text-sm font-semibold rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] mt-2"
                    disabled={!isRegistrationEnabled || submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Criando sua conta...
                      </>
                    ) : (
                      <>
                        Finalizar Cadastro e Entrar
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <div className="pt-2 text-center">
                    <p className="text-xs text-muted-foreground">
                      Já possui uma conta?{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        Fazer Login
                      </button>
                    </p>
                  </div>

                </form>

              </CardContent>
            </Card>
          </div>

        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground/60">
        © {new Date().getFullYear()} Tibim Manager • Sistema Seguro de Gestão de Mídia
      </footer>
    </div>
  );
}