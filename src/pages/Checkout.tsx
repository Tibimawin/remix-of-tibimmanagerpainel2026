import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Wallet, 
  Info, 
  QrCode, 
  Copy, 
  Loader2, 
  Sparkles,
  RefreshCw,
  ShoppingBag,
  User,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { AsaasPaymentService } from '@/services/AsaasPaymentService';
import { SourceExportService } from '@/services/SourceExportService';
import { generateValidCPF, validateCPF } from '@/utils/cpfGenerator';
import { db } from '@/config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import confetti from 'canvas-confetti';

const Checkout = () => {
  const navigate = useNavigate();
  const { userInfo } = useSimpleAuth();

  const [cart, setCart] = useState<{ product: any; quantity: number }[]>([]);
  const [step, setStep] = useState<'info' | 'pix' | 'confirmed' | 'error'>('info');

  // Campos do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Dados do PIX
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string; expirationDate: string } | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('loja-carrinho');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length === 0) navigate('/produtos');
        setCart(parsed);
      } catch (e) {
        navigate('/produtos');
      }
    } else {
      navigate('/produtos');
    }
  }, [navigate]);

  useEffect(() => {
    if (userInfo) {
      setEmail(userInfo.email || '');
      if (userInfo.name && !name) {
        setName(userInfo.name);
      }
    }
    if (!cpf) {
      setCpf(generateValidCPF());
    }
  }, [userInfo]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + (item.product.preco * item.quantity), 0);
  const total = subtotal;

  const formatCpf = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
    if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
  };

  const handleGenerateNewCpf = () => {
    const newCpf = generateValidCPF();
    setCpf(newCpf);
    toast.success('Novo CPF válido gerado com sucesso!');
  };

  const handleGeneratePix = async () => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!name.trim() || !email.trim()) {
      toast.error('Preencha seu nome e e-mail');
      return;
    }

    if (cleanCpf.length !== 11 || !validateCPF(cleanCpf)) {
      toast.error('CPF inválido. Clique em "Gerar CPF Válido" para preencher.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      // 1. Criar ou obter cliente no Asaas
      const customer = await AsaasPaymentService.findOrCreateCustomer(name.trim(), email.trim(), cleanCpf);

      // Resumo dos nomes de produtos
      const productNames = cart.map(i => `${i.quantity}x ${i.product.nome}`).join(', ');

      // 2. Criar cobrança avulsa PIX
      const payment = await AsaasPaymentService.createOneTimePayment(
        customer.id,
        total,
        `Loja Painel: ${productNames}`
      );

      setPaymentId(payment.id);

      // 3. Gerar QR Code
      const qrData = await AsaasPaymentService.getPixQrCode(payment.id);
      setPixData(qrData);
      setStep('pix');
      window.scrollTo(0, 0);

      // 4. Salvar registro pendente
      try {
        await setDoc(doc(db, 'financialRecords', payment.id), {
          userId: userInfo?.id || 'unknown',
          userEmail: email.trim().toLowerCase(),
          userName: name.trim(),
          planName: `Pedido Loja (${cart.length} itens)`,
          planPrice: total,
          paymentMethod: 'PIX',
          paymentId: payment.id,
          status: 'pending',
          source: 'store_cart',
          items: cart.map(i => ({ id: i.product.id, name: i.product.nome, price: i.product.preco, qty: i.quantity })),
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Erro ao salvar registro financeiro pendente:', e);
      }

      // 5. Polling para checagem em tempo real
      pollRef.current = setInterval(async () => {
        try {
          const status = await AsaasPaymentService.getPaymentStatus(payment.id);
          if (status.status === 'RECEIVED' || status.status === 'CONFIRMED') {
            if (pollRef.current) clearInterval(pollRef.current);

            // Registrar cada produto comprado
            for (const item of cart) {
              await SourceExportService.recordPurchase({
                paymentId: `${payment.id}_${item.product.id}`,
                userId: userInfo?.id || 'unknown',
                userEmail: email.trim(),
                userName: name.trim(),
                amount: item.product.preco * item.quantity,
                productId: item.product.id,
                productName: item.product.nome,
              });
            }

            // Atualizar status no financeiro
            try {
              await setDoc(doc(db, 'financialRecords', payment.id), {
                status: 'confirmed',
                confirmedAt: new Date().toISOString(),
              }, { merge: true });
            } catch (finUpErr) {
              console.error('Erro ao atualizar financeiro:', finUpErr);
            }

            localStorage.removeItem('loja-carrinho');
            setStep('confirmed');
            confetti({
              particleCount: 150,
              spread: 90,
              origin: { y: 0.6 }
            });
            toast.success('Pagamento confirmado com sucesso!');
          }
        } catch (pollErr) {
          console.error('Erro no polling do checkout:', pollErr);
        }
      }, 3500);

    } catch (err: any) {
      console.error('Erro ao processar pedido:', err);
      setErrorMsg(err.message || 'Erro ao gerar pagamento PIX.');
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload);
      toast.success('Código PIX Copia e Cola copiado com sucesso!');
    }
  };

  if (step === 'confirmed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 animate-in fade-in zoom-in duration-500 max-w-xl mx-auto">
        <div className="bg-emerald-500/10 p-6 rounded-full text-emerald-600 border border-emerald-500/30">
          <CheckCircle2 className="w-20 h-20" />
        </div>
        <div className="space-y-2">
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">PAGAMENTO CONFIRMADO</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Obrigado pela sua compra!</h2>
          <p className="text-muted-foreground text-base">
            Seus produtos e acessos foram liberados com sucesso. Você já pode acessar a página dos produtos na loja para baixar planilhas e utilizar as ferramentas.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full justify-center">
          <Button onClick={() => navigate('/produtos')} size="lg" className="px-8 font-semibold gap-2">
            <ShoppingBag className="w-4 h-4" />
            Voltar para a Loja
          </Button>
          <Button onClick={() => navigate('/dashboard')} variant="outline" size="lg" className="px-8 font-semibold">
            Ir para o Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => step === 'pix' ? setStep('info') : navigate('/carrinho')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finalizar Compra</h1>
          <p className="text-muted-foreground">
            {step === 'info' ? 'Preencha seus dados para liberação imediata' : 'Escaneie o QR Code ou copie o código PIX'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {step === 'info' && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Seus Dados de Acesso</CardTitle>
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    Ambiente Seguro
                  </Badge>
                </div>
                <CardDescription>
                  Seus downloads e permissões são vinculados ao e-mail informado abaixo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkout-name" className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Nome Completo
                    </Label>
                    <Input 
                      id="checkout-name" 
                      placeholder="Seu nome" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkout-email" className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> E-mail de Cadastro
                    </Label>
                    <Input 
                      id="checkout-email" 
                      type="email" 
                      placeholder="seu@email.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="checkout-cpf" className="flex items-center gap-1 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> CPF (Exigência do Banco Central para PIX)
                    </Label>
                    <button
                      type="button"
                      onClick={handleGenerateNewCpf}
                      className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Gerar CPF Válido
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      id="checkout-cpf" 
                      placeholder="000.000.000-00" 
                      value={cpf}
                      onChange={(e) => setCpf(formatCpf(e.target.value))}
                      maxLength={14}
                      className="font-mono text-sm"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGenerateNewCpf}
                      className="shrink-0 gap-1 text-xs"
                      title="Gera um CPF matematicamente válido sem expor seus dados"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Gerar
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    🔒 Para proteger sua privacidade, o gerador preenche um CPF válido aceito pelo gateway bancário.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-xl border text-xs">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-muted-foreground leading-relaxed">
                    Após o pagamento via PIX, a liberação ocorre em poucos segundos e seus arquivos CSV ou módulos ficam disponíveis instantaneamente.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'pix' && pixData && (
            <Card className="border-border/60 shadow-sm text-center p-6 space-y-6">
              <div className="space-y-2">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
                  PIX GERADO COM SUCESSO
                </Badge>
                <h2 className="text-2xl font-bold">Escaneie o QR Code</h2>
                <p className="text-xs text-muted-foreground">
                  Aguardando confirmação do banco em tempo real...
                </p>
              </div>

              <div className="flex justify-center p-4 bg-white rounded-2xl shadow-inner border max-w-[240px] mx-auto">
                <img
                  src={`data:image/png;base64,${pixData.encodedImage}`}
                  alt="QR Code PIX"
                  className="w-52 h-52 object-contain"
                />
              </div>

              <div className="space-y-2 text-left max-w-md mx-auto">
                <Label className="text-xs text-muted-foreground">Código PIX Copia e Cola:</Label>
                <div className="flex gap-2">
                  <Input value={pixData.payload} readOnly className="text-xs font-mono select-all bg-muted/50" />
                  <Button size="sm" onClick={copyPixCode} className="gap-1.5 shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </Button>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center max-w-md mx-auto">
                <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Assim que você pagar no app do banco, esta tela atualizará automaticamente.
                </p>
              </div>
            </Card>
          )}

          {step === 'error' && (
            <Card className="border-red-500/30 bg-red-500/5 p-6 text-center space-y-4">
              <h3 className="text-lg font-bold text-red-600">Erro ao processar</h3>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button onClick={() => setStep('info')} variant="outline">
                Tentar Novamente
              </Button>
            </Card>
          )}

          <div className="flex items-center gap-2 text-muted-foreground text-xs justify-center py-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Pagamento Direto via Asaas • Processamento Criptografado
          </div>
        </div>

        {/* Resumo do Pedido Lateral */}
        <div className="space-y-6">
          <Card className="sticky top-24 border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                Resumo do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-56 overflow-y-auto pr-1 space-y-3 divide-y">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-xs pt-2 first:pt-0">
                    <div className="pr-2">
                      <p className="font-semibold text-foreground">{item.quantity}x {item.product.nome}</p>
                      <p className="text-muted-foreground text-[10px]">{item.product.categoria}</p>
                    </div>
                    <span className="font-bold shrink-0">
                      R$ {(item.product.preco * item.quantity).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-lg">Total</span>
                <span className="font-extrabold text-2xl text-primary">
                  R$ {total.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              {step === 'info' ? (
                <Button 
                  onClick={handleGeneratePix} 
                  disabled={isProcessing}
                  className="w-full h-12 text-base font-bold gap-2 shadow-md shadow-primary/20"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando PIX...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-5 h-5" />
                      Gerar Chave PIX
                    </>
                  )}
                </Button>
              ) : null}

              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs text-muted-foreground"
                onClick={() => navigate('/carrinho')}
              >
                Voltar para o Carrinho
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
