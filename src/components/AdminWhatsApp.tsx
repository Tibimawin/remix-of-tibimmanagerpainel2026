import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Save, Check, Copy, Download, Link } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/config/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

interface WhatsAppConfig {
  number: string;
  qrCodeUrl: string;
  updatedAt: string;
}

const AdminWhatsApp = () => {
  const [config, setConfig] = useState<WhatsAppConfig>({
    number: '',
    qrCodeUrl: '',
    updatedAt: ''
  });
  const [loading, setLoading] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string>('');

  // Carregar configuração em tempo real
  useEffect(() => {
    const configRef = doc(db, 'config', 'whatsapp');
    
    const unsubscribe = onSnapshot(configRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as WhatsAppConfig;
        setConfig(data);
        setQrImageUrl(data.qrCodeUrl);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfig(prev => ({ ...prev, number: value }));
  };

  const handleQrUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setQrImageUrl(url);
  };

  const saveConfig = async () => {
    if (!config.number.trim()) {
      toast.error('Por favor, insira o número do WhatsApp');
      return;
    }

    if (!qrImageUrl.trim()) {
      toast.error('Por favor, insira a URL do QR Code');
      return;
    }

    setLoading(true);
    try {
      const newConfig: WhatsAppConfig = {
        number: config.number,
        qrCodeUrl: qrImageUrl,
        updatedAt: new Date().toISOString()
      };

      const configRef = doc(db, 'config', 'whatsapp');
      await setDoc(configRef, newConfig);

      setConfig(newConfig);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const copyNumber = () => {
    const cleanNumber = config.number.replace(/\D/g, '');
    navigator.clipboard.writeText(cleanNumber);
    toast.success('Número copiado para a área de transferência!');
  };

  const openWhatsApp = () => {
    const cleanNumber = config.number.replace(/\D/g, '');
    const message = 'Olá! Este é um teste da configuração do WhatsApp.';
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const downloadQR = () => {
    if (config.qrCodeUrl) {
      const link = document.createElement('a');
      link.href = config.qrCodeUrl;
      link.download = 'qr-whatsapp.png';
      link.click();
      toast.success('QR Code baixado!');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Configurações do WhatsApp
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Gerencie o número e QR Code do WhatsApp usado nos planos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Número do WhatsApp */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp-number" className="text-foreground font-medium">
              Número do WhatsApp (Internacional)
            </Label>
            <div className="flex gap-2">
              <Input
                id="whatsapp-number"
                value={config.number}
                onChange={handleNumberChange}
                placeholder="+244 999 999 999 (Angola) ou +55 11 99999-9999 (Brasil)"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyNumber}
                disabled={!config.number}
                className="hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Digite o número completo com código do país. Ex: +244 para Angola, +55 para Brasil, +351 para Portugal.
            </p>
          </div>

          {/* URL do QR Code */}
          <div className="space-y-4">
            <Label className="text-foreground font-medium">URL do QR Code do WhatsApp</Label>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Preview */}
              <div className="flex-1">
                {qrImageUrl ? (
                  <div className="relative">
                    <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-green-200 inline-block">
                      <img 
                        src={qrImageUrl} 
                        alt="QR Code WhatsApp" 
                        className="w-48 h-48 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadQR}
                      className="mt-2 hover:bg-green-50 dark:hover:bg-green-900/20"
                      disabled={!config.qrCodeUrl}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar QR
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum QR Code carregado</p>
                  </div>
                )}
              </div>

              {/* URL Input */}
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qr-url" className="text-foreground font-medium">
                    URL da Imagem do QR Code
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="qr-url"
                      value={qrImageUrl}
                      onChange={handleQrUrlChange}
                      placeholder="https://exemplo.com/qr-code.png"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!qrImageUrl}
                      className="hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                      <Link className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Cole aqui a URL da imagem do QR Code do seu WhatsApp. A imagem deve estar hospedada online.
                </p>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
            <Button
              onClick={saveConfig}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>

            {config.number && (
              <Button
                variant="outline"
                onClick={openWhatsApp}
                className="hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Falar no WhatsApp
              </Button>
            )}
          </div>

          {/* Status */}
          {config.updatedAt && (
            <div className="bg-muted/50 border border-border/40 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-foreground">
                  Última atualização: {new Date(config.updatedAt).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card className="modern-card bg-gradient-to-br from-blue-500/5 to-blue-600/5 border-blue-200/40">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Como usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">1</div>
            <p>Configure o número do WhatsApp com código internacional (+244 para Angola, +55 para Brasil, etc.)</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">2</div>
            <p>Cole a URL da imagem do QR Code do seu WhatsApp (hospede a imagem online primeiro)</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">3</div>
            <p>Salve as configurações - elas serão aplicadas automaticamente nos planos</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">4</div>
            <p>Use o botão "Falar no WhatsApp" para testar se a configuração funciona</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWhatsApp;