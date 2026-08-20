import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft, CheckCircle2, ShieldCheck, Wallet, Landmark, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface Product {
  id: string;
  nome: string;
  preco: number;
  quantity: number;
}

const Checkout = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<{ product: any; quantity: number }[]>([]);
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const [paymentMethod, setPaymentMethod] = useState('pix');

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

  const subtotal = cart.reduce((sum, item) => sum + (item.product.preco * item.quantity), 0);
  const total = subtotal;

  const handleFinalize = () => {
    if (step === 'info') {
      setStep('payment');
      window.scrollTo(0, 0);
    } else if (step === 'payment') {
      // Simular finalização
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 2000)),
        {
          loading: 'Processando seu pedido...',
          success: () => {
            setStep('success');
            localStorage.removeItem('loja-carrinho');
            return 'Pedido finalizado com sucesso!';
          },
          error: 'Erro ao processar pedido.',
        }
      );
    }
  };

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="bg-emerald-500/10 p-6 rounded-full">
          <CheckCircle2 className="w-20 h-20 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Pedido Recebido!</h2>
          <p className="text-muted-foreground max-w-md mx-auto text-lg">
            Obrigado pela sua compra. As instruções de ativação foram enviadas para seu e-mail e estarão disponíveis em seu painel em instantes.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button onClick={() => navigate('/dashboard')} size="lg" className="px-8 font-semibold">
            Ir para o Dashboard
          </Button>
          <Button onClick={() => navigate('/produtos')} variant="outline" size="lg" className="px-8 font-semibold">
            Continuar Comprando
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => step === 'payment' ? setStep('info') : navigate('/carrinho')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finalizar Compra</h1>
          <p className="text-muted-foreground">
            {step === 'info' ? 'Informações de contato e entrega' : 'Escolha a forma de pagamento'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {step === 'info' ? (
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Seus Dados</CardTitle>
                <CardDescription>Precisamos dessas informações para processar sua licença.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" placeholder="Como no seu documento" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" placeholder="seu@email.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp / Telefone</Label>
                  <Input id="phone" placeholder="(00) 00000-0000" />
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg text-sm">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    Produtos digitais são entregues instantaneamente via e-mail e ficam disponíveis na aba "Meus Aplicativos" do seu painel.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Forma de Pagamento</CardTitle>
                <CardDescription>Escolha como deseja pagar com segurança.</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  defaultValue="pix" 
                  onValueChange={setPaymentMethod}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <Label
                    htmlFor="pix"
                    className={`flex flex-col items-center justify-between rounded-xl border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all ${paymentMethod === 'pix' ? 'border-primary ring-2 ring-primary/10' : 'border-muted'}`}
                  >
                    <RadioGroupItem value="pix" id="pix" className="sr-only" />
                    <Wallet className="mb-3 h-8 w-8 text-primary" />
                    <span className="font-semibold">PIX</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Liberação Imediata</span>
                  </Label>
                  <Label
                    htmlFor="card"
                    className={`flex flex-col items-center justify-between rounded-xl border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-primary ring-2 ring-primary/10' : 'border-muted'}`}
                  >
                    <RadioGroupItem value="card" id="card" className="sr-only" />
                    <CreditCard className="mb-3 h-8 w-8 text-primary" />
                    <span className="font-semibold">Cartão</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Até 12x</span>
                  </Label>
                  <Label
                    htmlFor="bank"
                    className={`flex flex-col items-center justify-between rounded-xl border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all ${paymentMethod === 'bank' ? 'border-primary ring-2 ring-primary/10' : 'border-muted'}`}
                  >
                    <RadioGroupItem value="bank" id="bank" className="sr-only" />
                    <Landmark className="mb-3 h-8 w-8 text-primary" />
                    <span className="font-semibold">Boleto</span>
                    <span className="text-[10px] text-muted-foreground mt-1">1-2 dias úteis</span>
                  </Label>
                </RadioGroup>

                {paymentMethod === 'card' && (
                  <div className="mt-8 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <Label>Número do Cartão</Label>
                      <Input placeholder="0000 0000 0000 0000" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Validade</Label>
                        <Input placeholder="MM/AA" />
                      </div>
                      <div className="space-y-2">
                        <Label>CVV</Label>
                        <Input placeholder="000" />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-2 text-muted-foreground text-sm justify-center py-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Pagamento Processado com Segurança
          </div>
        </div>

        {/* Resumo Lateral */}
        <div className="space-y-6">
          <Card className="sticky top-24 border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Resumo do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-48 overflow-y-auto pr-2 space-y-3">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.product.nome}
                    </span>
                    <span className="font-medium">R$ {(item.product.preco * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-2xl text-primary">R$ {total.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleFinalize} className="w-full h-12 text-lg font-semibold gap-2 shadow-md shadow-primary/20">
                {step === 'info' ? 'Continuar para Pagamento' : 'Finalizar Pedido'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
