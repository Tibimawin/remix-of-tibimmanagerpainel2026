import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, User, Phone, Mail, Lock, UserPlus, BadgeCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResellerAuth } from '@/contexts/ResellerAuthContext';
import { ResellerService } from '@/services/ResellerService';

export const ResellerCadastro: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signup, isAuthenticated, isLoading } = useResellerAuth();
  const ref = (params.get('ref') || '').trim();

  const [masterName, setMasterName] = useState('');
  const [refError, setRefError] = useState('');
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Portal de Revendas — Cadastro';
    if (ref) {
      ResellerService.signupInfo(ref)
        .then(info => setMasterName(info.masterName))
        .catch(err => setRefError(err?.message || 'Link de indicação inválido.'));
    } else {
      setRefError('Este cadastro precisa de um link de indicação. Peça o link a quem te indicou.');
    }
  }, [ref]);

  if (!isLoading && isAuthenticated) {
    navigate('/revendas-creditos/dashboard', { replace: true });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await signup({ nome, email, password, ref, whatsapp });
    if (res.success) {
      navigate('/revendas-creditos/dashboard');
    } else {
      setError(res.message || 'Não foi possível cadastrar.');
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
            <Sparkles className="h-7 w-7 text-slate-950" />
          </div>
          <h1 className="text-2xl font-bold">Criar conta de revenda</h1>
          {masterName && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-sm text-emerald-300">
              <BadgeCheck className="h-4 w-4" />
              Indicado por: <strong className="font-semibold">{masterName}</strong>
            </p>
          )}
        </div>

        {refError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {refError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
          )}
          <div className="space-y-2">
            <Label className="text-slate-300">Seu nome</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome ou nome da revenda"
                className="border-slate-700 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-600" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">WhatsApp (opcional)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="11 99999-9999"
                className="border-slate-700 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-600" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                className="border-slate-700 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-600" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                className="border-slate-700 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-600" required minLength={6} />
            </div>
          </div>
          <Button type="submit" disabled={busy || isLoading || !ref || !!refError}
            className="w-full bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-slate-950 hover:from-amber-300 hover:to-amber-500">
            <UserPlus className="mr-2 h-4 w-4" />
            {busy ? 'Criando conta…' : 'Criar conta de revenda'}
          </Button>
          <p className="text-center text-sm text-slate-400">
            Já tem conta?{' '}
            <Link to="/revendas-creditos/login" className="text-amber-300 hover:underline">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ResellerCadastro;
