import React, { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2, UserPlus, CircleCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useResellerAuth } from '@/contexts/ResellerAuthContext';
import { ResellerService } from '@/services/ResellerService';

type Phase = 'info' | 'form' | 'confirm';

/**
 * /revendas-creditos/cadastro?ref=MASTER_UID
 * Cadastro do revendedor: cria a conta (Firebase Auth), vincula ao master
 * que o indicou (coleção resellers) e deixa pronto para comprar créditos.
 */
export const ResellerCadastro: React.FC = () => {
  const [params] = useSearchParams();
  const ref = (params.get('ref') || '').trim();

  const { isAuthenticated, isLoading, user, register } = useResellerAuth();
  const [phase, setPhase] = useState<Phase>(ref ? 'info' : 'info');
  const [masterName, setMasterName] = useState('');
  const [loadingRef, setLoadingRef] = useState(!!ref);
  const [refError, setRefError] = useState('');

  const [nome, setNome] = useState(user?.nome || '');
  const [whatsapp, setWhatsapp] = useState(user?.email ? '' : '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [linked, setLinked] = useState(false);

  useEffect(() => {
    if (!ref || loadingRef) return;
    let alive = true;
    ResellerService.signupInfo(ref)
      .then(info => { if (alive) setMasterName(info.masterName); })
      .catch(err => { if (alive) setRefError(err?.message || 'Link de indicação inválido.'); })
      .finally(() => { if (alive) setLoadingRef(false); });
    return () => { alive = false; };
  }, [ref, loadingRef]);

  // Após cadastrar/entrar, garante o vínculo com o master do link
  useEffect(() => {
    if (!isAuthenticated || !ref || linked || isLoading) return;
    let alive = true;
    ResellerService.signup({ ref, nome, whatsapp })
      .then(() => {
        if (alive) {
          setLinked(true);
          toast.success('Conta vinculada! Você já pode comprar créditos e criar linhas.');
        }
      })
      .catch(err => {
        if (alive) toast.error(err?.message || 'Não foi possível vincular sua conta ao indicador.');
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, ref, linked, isLoading]);

  if (isAuthenticated && !isLoading) {
    return linked ? (
      <Navigate to="/revendas-creditos/dashboard" replace />
    ) : (
      <Navigate to="/revendas-creditos/dashboard" replace />
    );
  }

  const finalRef = ref || localStorage.getItem('reseller-pending-ref') || '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(email, password, nome);
      if (finalRef) localStorage.setItem('reseller-pending-ref', finalRef);
      toast.success('Conta criada! Finalizando seu vínculo com o indicador…');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível criar a conta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
            <Sparkles className="h-7 w-7 text-slate-950" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">Cadastro de Revenda</h1>
            <p className="text-sm text-slate-400">Venda as listas de quem te indicou — credite, crie linhas e cobre por PIX</p>
          </div>
        </div>

        {/* Passo 1: confirmação do link de indicação */}
        {phase === 'info' && (
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            {loadingRef ? (
              <div className="flex items-center justify-center gap-3 py-8 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" /> Verificando o link de indicação…
              </div>
            ) : refError ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{refError}</div>
                <p className="text-sm text-slate-400">
                  Confira o link com quem te indicou. Se ele veio errado, peça um novo — ele encontra na aba
                  <strong className="text-slate-200"> Minhas Revendas</strong> do painel dele.
                </p>
                <Button asChild variant="outline" className="w-full border-slate-700 text-slate-200 hover:bg-slate-800">
                  <Link to="/revendas-creditos/login">Fazer login</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
                  <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <div className="text-sm">
                    <p className="font-medium text-slate-100">
                      Você está indicado por <strong className="text-amber-300">{masterName || 'seu master'}</strong>.
                    </p>
                    <p className="mt-1 text-slate-400">
                      Ao se cadastrar, sua revenda nasce vinculada a ele: você compra créditos com PIX na conta
                      Asaas DELE e cria linhas na DNS dele.
                    </p>
                  </div>
                </div>
                <Button onClick={() => setPhase('form')}
                  className="w-full bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-slate-950 hover:from-amber-300 hover:to-amber-500">
                  <UserPlus className="mr-2 h-4 w-4" /> Continuar para a conta
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Passo 2: criação da conta */}
        {phase === 'form' && (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="cad-nome" className="text-slate-300">Nome ou CNPJ (exibido para seu master)</Label>
              <Input id="cad-nome" required value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: Fulano IPTV" className="border-slate-700 bg-slate-950 text-slate-100" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cad-whats" className="text-slate-300">WhatsApp de contato (opcional)</Label>
              <Input id="cad-whats" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                placeholder="11 99999-9999" inputMode="tel" className="border-slate-700 bg-slate-950 text-slate-100" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cad-email" className="text-slate-300">E-mail (login)</Label>
              <Input id="cad-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="voce@email.com" className="border-slate-700 bg-slate-950 text-slate-100" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cad-pass" className="text-slate-300">Senha</Label>
              <Input id="cad-pass" type="password" required minLength={6} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="mínimo 6 caracteres"
                className="border-slate-700 bg-slate-950 text-slate-100" autoComplete="new-password" />
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              Sua conta é isolada do painel master: você só enxerga as linhas que criou.
            </div>
            <Button type="submit" disabled={busy}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-slate-950 hover:from-amber-300 hover:to-amber-500">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {busy ? 'Criando conta…' : 'Criar conta de revenda'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          Já tem conta?{' '}
          <Link to="/revendas-creditos/login" className="font-medium text-amber-300 hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
};

export default ResellerCadastro;
