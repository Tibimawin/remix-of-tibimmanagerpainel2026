import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  QrCode,
  Copy,
  Loader2,
  MessageCircle,
  ShieldCheck,
  User,
  Mail,
  Phone,
  FileText,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LojaLayout } from '@/components/loja/LojaLayout';
import { useLojaCart } from '@/contexts/LojaCartContext';
import { LojaService, LojaConfig, DEFAULT_LOJA_CONFIG } from '@/services/LojaService';
import { AsaasPaymentService } from '@/services/AsaasPaymentService';
import { generateValidCPF, validateCPF } from '@/utils/cpfGenerator';
import { db } from '@/config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import confetti from 'canvas-confetti';

const LojaCheckout: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useLojaCart();

  const [config, setConfig] = useState<LojaConfig>(DEFAULT_LOJA_CONFIG);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState(() => generateValidCPF());
  const [observation, setObservation] = useState('');

  const [step, setStep] = useState<'form' | 'pix' | 'confirmed'>('form');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState('');

  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string; expirationDate: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const unsub = LojaService.subscribeConfig((cfg) => {
      setConfig(cfg);
      setWhatsappNumber(cfg.whatsappVendas || DEFAULT_LOJA_CONFIG.whatsappVendas);
    });

    return () => {
      unsub();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const validateCustomer = (requireEmail = false) => {
    if (!name.trim()) {
      toast.error('Informe seu nome completo');
      return false;
    }
    if (!whatsapp.trim()) {
      toast.error('Informe seu número de WhatsApp para entrega');
      return false;
    }
    if (requireEmail && !email.trim()) {
      toast.error('Informe seu e-mail para gerar o PIX');
      return false;
    }
    return true;
  };

  const buildWhatsappMessage = (id: string, statusLabel: string) => {
    const itemsText = items
      .map(
        (i) =>
          `• ${i.quantity}x *${i.product.nome}* — R$ ${(i.product.preco * i.quantity).toFixed(2).replace('.', ',')}`
      )
      .join('\n');

    return encodeURIComponent(
      `🛒 *NOVO PEDIDO - ${config.nomeLoja}*\n` +
        `📋 *Pedido:* #${id.slice(0, 8).toUpperCase()}\n` +
        `📌 *Status:* ${statusLabel}\n\n` +
        `*Cliente:* ${name.trim()}\n` +
        `*WhatsApp:* ${whatsapp.trim()}\n` +
        (email.trim() ? `*E-mail:* ${email.trim()}\n` : '') +
        (observation.trim() ? `*Observações:* ${observation.trim()}\n` : '') +
        `\n*Itens do Pedido:*\n${itemsText}\n\n` +
        `💰 *TOTAL: R$ ${subtotal.toFixed(2).replace('.', ',')}*`
    );
  };

  const handleOrderViaWhatsapp = async () => {
    if (!validateCustomer(false)) return;
    if (!whatsappNumber) {
      toast.error('WhatsApp de atendimento ainda não configurado pelo administrador.');
      return;
    }

    setIsProcessing(true);
    try {
      const createdId = await LojaService.createOrder({
        clienteNome: name.trim(),
        clienteWhatsapp: whatsapp.trim(),
        clienteEmail: email.trim(),
        clienteObservacao: observation.trim(),
        itens: items.map((i) => ({
          id: i.product.id,
          nome: i.product.nome,
          preco: i.product.preco,
          quantidade: i.quantity,
          imagem: i.product.imagemPrincipal
        })),
        total: subtotal,
        metodoPagamento: 'whatsapp',
        status: 'pendente'
      });

      setOrderId(createdId);
      const msg = buildWhatsappMessage(createdId, 'Aguardando Atendimento / Pagamento');
      window.open(LojaService.formatWhatsappUrl(whatsappNumber, msg), '_blank');

      clearCart();
      setStep('confirmed');
      toast.success('Pedido registrado e aberto no WhatsApp!');
    } catch (err) {
      console.error('Erro ao registrar pedido:', err);
      toast.error('Não foi possível registrar o pedido. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePix = async () => {
    if (!validateCustomer(true)) return;

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11 || !validateCPF(cleanCpf)) {
      toast.error('CPF inválido.');
      return;
    }

    setIsProcessing(true);
    try {
      const customer = await AsaasPaymentService.findOrCreateCustomer(
        name.trim(),
        email.trim(),
        cleanCpf
      );

      const productNames = items.map((i) => `${i.quantity}x ${i.product.nome}`).join(', ');
      const payment = await AsaasPaymentService.createOneTimePayment(
        customer.id,
        subtotal,
        `${config.nomeLoja}: ${productNames}`
      );

      const qrData = await AsaasPaymentService.getPixQrCode(payment.id);

      const createdOrderId = await LojaService.createOrder({
        clienteNome: name.trim(),
        clienteWhatsapp: whatsapp.trim(),
        clienteEmail: email.trim(),
        clienteObservacao: observation.trim(),
        itens: items.map((i) => ({
          id: i.product.id,
          nome: i.product.nome,
          preco: i.product.preco,
          quantidade: i.quantity,
          imagem: i.product.imagemPrincipal
        })),
        total: subtotal,
        metodoPagamento: 'pix',
        status: 'pendente',
        asaasPaymentId: payment.id
      });

      setOrderId(createdOrderId);
      setPixData(qrData);

      try {
        await setDoc(doc(db, 'financialRecords', payment.id), {
          userId: 'loja_publica',
          userEmail: email.trim().toLowerCase(),
          userName: name.trim(),
          planName: `${config.nomeLoja} (${items.length} itens)`,
          planPrice: subtotal,
          paymentMethod: 'PIX',
          paymentId: payment.id,
          status: 'pending',
          source: 'loja_publica',
          createdAt: new Date().toISOString()
        });
      } catch {
        // non-blocking
      }

      setStep('pix');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      pollRef.current = setInterval(async () => {
        try {
          const status = await AsaasPaymentService.getPaymentStatus(payment.id);
          if (status.status === 'RECEIVED' || status.status === 'CONFIRMED') {
            if (pollRef.current) clearInterval(pollRef.current);

            await LojaService.updateOrderStatus(createdOrderId, 'pago');
            try {
              await setDoc(
                doc(db, 'financialRecords', payment.id),
                { status: 'confirmed', confirmedAt: new Date().toISOString() },
                { merge: true }
              );
            } catch {
              // ignore
            }

            clearCart();
            setStep('confirmed');
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
            toast.success('Pagamento PIX confirmado!');
          }
        } catch (err) {
          console.error('Polling PIX erro:', err);
        }
      }, 3500);
    } catch (err: any) {
      console.error('Erro PIX loja:', err);
      toast.error(err?.message || 'Erro ao gerar cobrança PIX. Tente finalizar pelo WhatsApp.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyPixPayload = () => {
    if (!pixData?.payload) return;
    navigator.clipboard.writeText(pixData.payload);
    toast.success('Código PIX Copia e Cola copiado!');
  };

  if (step === 'confirmed') {
    return (
      <LojaLayout>
        <div className="container mx-auto max-w-2xl px-4 py-16 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-white">Pedido Realizado com Sucesso!</h1>
          <p className="text-sm text-white/60 leading-relaxed">
            Seu pedido <span className="text-white font-bold">#{orderId.slice(0, 8).toUpperCase()}</span> foi
            registrado. Nossa equipe entrará em contato pelo WhatsApp informado para concluir a entrega e
            personalização.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            {whatsappNumber && (
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                onClick={() => {
                  const txt = encodeURIComponent(
                    `Olá! Acabei de confirmar o pedido #${orderId.slice(0, 8).toUpperCase()} na ${config.nomeLoja} em nome de ${name}.`
                  );
                  window.open(LojaService.formatWhatsappUrl(whatsappNumber, txt), '_blank');
                }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Falar no WhatsApp sobre meu Pedido
              </Button>
            )}
            <Button variant="outline" size="lg" className="border-white/20" onClick={() => navigate('/loja')}>
              Voltar para a Loja
            </Button>
          </div>
        </div>
      </LojaLayout>
    );
  }

  if (items.length === 0 && step === 'form') {
    return (
      <LojaLayout>
        <div className="container mx-auto max-w-xl px-4 py-20 text-center space-y-4">
          <ShoppingBag className="w-14 h-14 text-white/20 mx-auto" />
          <h2 className="text-xl font-bold text-white">Nenhum item no carrinho</h2>
          <Button onClick={() => navigate('/loja')}>Ir para a Loja</Button>
        </div>
      </LojaLayout>
    );
  }

  return (
    <LojaLayout>
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/loja/carrinho')}
          className="text-white/70 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Voltar ao Carrinho
        </Button>

        {step === 'pix' && pixData ? (
          <Card className="max-w-xl mx-auto bg-[#0B0E16] border-white/15 text-white">
            <CardHeader className="text-center border-b border-white/10 pb-4">
              <Badge className="mx-auto bg-emerald-600/20 text-emerald-400 border-emerald-500/30 mb-2">
                PAGAMENTO VIA PIX
              </Badge>
              <CardTitle className="text-2xl font-black">Escaneie o QR Code para Pagar</CardTitle>
              <p className="text-xs text-white/50 mt-1">
                Valor Total: <strong className="text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</strong>
              </p>
            </CardHeader>
            <CardContent className="pt-6 space-y-5 flex flex-col items-center">
              <div className="bg-white p-4 rounded-2xl shadow-xl">
                <img
                  src={`data:image/png;base64,${pixData.encodedImage}`}
                  alt="QR Code PIX"
                  className="w-56 h-56 object-contain"
                />
              </div>

              <div className="w-full space-y-2">
                <Label className="text-xs text-white/60">Código PIX Copia e Cola</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={pixData.payload}
                    className="bg-black/60 border-white/15 text-xs font-mono text-white"
                  />
                  <Button onClick={copyPixPayload} className="shrink-0 font-bold">
                    <Copy className="w-4 h-4 mr-1.5" /> Copiar
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Aguardando confirmação automática do pagamento...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Formulário do Cliente */}
            <div className="lg:col-span-7">
              <Card className="bg-[#0B0E16] border-white/15 text-white">
                <CardHeader className="border-b border-white/10 pb-4">
                  <CardTitle className="text-xl font-black">Seus Dados para Entrega & Contato</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-white/50" /> Nome Completo *
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="bg-white/5 border-white/15 h-11 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp (com código do país) *
                      </Label>
                      <Input
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="Ex: +244 930 717 724"
                        className="bg-white/5 border-white/15 h-11 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-white/50" /> E-mail (necessário para PIX)
                      </Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="bg-white/5 border-white/15 h-11 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-white/50" /> Observações / Nome da sua marca no App
                    </Label>
                    <Textarea
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      placeholder="Ex: Quero personalizar o aplicativo com o nome CineStream..."
                      rows={3}
                      className="bg-white/5 border-white/15 text-white"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumo & Pagamento */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
              <Card className="bg-[#0B0E16] border-white/15 text-white">
                <CardHeader className="border-b border-white/10 pb-4">
                  <CardTitle className="text-lg font-black">Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {items.map(({ product, quantity }) => (
                      <div key={product.id} className="flex justify-between text-xs gap-2">
                        <span className="text-white/80 font-medium truncate">
                          {quantity}x {product.nome}
                        </span>
                        <span className="font-bold text-white shrink-0">
                          R$ {(product.preco * quantity).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">Total a Pagar</span>
                    <span className="text-2xl font-black text-emerald-400">
                      R$ {subtotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-3">
                    {config.permitirWhatsapp && (
                      <Button
                        size="lg"
                        disabled={isProcessing}
                        onClick={handleOrderViaWhatsapp}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <MessageCircle className="w-4 h-4 mr-2" />
                        )}
                        Finalizar Pedido no WhatsApp
                      </Button>
                    )}

                    {config.permitirPix && (
                      <Button
                        size="lg"
                        variant={config.permitirWhatsapp ? 'outline' : 'default'}
                        disabled={isProcessing}
                        onClick={handleGeneratePix}
                        className="w-full h-12 font-black text-sm border-white/20 bg-white/5 hover:bg-white/10 text-white"
                      >
                        <QrCode className="w-4 h-4 mr-2 text-cyan-400" />
                        Pagar Agora com PIX
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/40 pt-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pedido salvo com segurança e atendimento imediato</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </LojaLayout>
  );
};

export default LojaCheckout;
