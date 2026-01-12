import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Download, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface WhatsAppQRDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  planName?: string;
}

const WhatsAppQRDialog = ({ isOpen, onOpenChange, planName }: WhatsAppQRDialogProps) => {
  const [whatsappNumber, setWhatsappNumber] = useState("+5511999999999");
  const [qrImageUrl, setQrImageUrl] = useState("/lovable-uploads/2b25d5ff-f2ba-4dc7-b2fe-a9f5cfd9ef26.png");

  // Carregar configurações em tempo real do Firebase
  useEffect(() => {
    const configRef = doc(db, 'config', 'whatsapp');
    
    const unsubscribe = onSnapshot(configRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.number) {
          setWhatsappNumber(data.number);
        }
        if (data.qrCodeUrl) {
          setQrImageUrl(data.qrCodeUrl);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(whatsappNumber);
    toast.success("Número copiado para a área de transferência!");
  };

  const handleOpenWhatsApp = () => {
    const message = planName ? 
      `Olá! Gostaria de assinar o plano ${planName}. Poderia me ajudar?` :
      `Olá! Gostaria de saber mais sobre os planos disponíveis.`;
    
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = 'qr-whatsapp-tibim-awin.png';
    link.click();
    toast.success("QR Code baixado com sucesso!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center space-x-2 text-xl">
            <MessageCircle className="h-6 w-6 text-green-600" />
            <span>Fale Conosco no WhatsApp</span>
          </DialogTitle>
          <DialogDescription className="text-center">
            {planName ? 
              `Entre em contato para assinar o plano ${planName}` :
              "Entre em contato para mais informações sobre nossos planos"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-green-200">
              <img 
                src={qrImageUrl} 
                alt="QR Code WhatsApp - Tibim Awin" 
                className="w-48 h-48 object-contain"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="text-center space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                Tibim Awin
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                Especialista em soluções de streaming
              </p>
              <div className="flex items-center justify-center space-x-2 text-green-800 dark:text-green-200">
                <span className="font-mono text-sm">{whatsappNumber}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyNumber}
                  className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-800"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleOpenWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Abrir WhatsApp
              </Button>
              
              <Button 
                onClick={handleDownloadQR}
                variant="outline"
                className="w-full border-green-300 text-green-700 hover:bg-green-50 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-900/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar QR Code
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Escaneie o QR Code com seu celular ou clique em "Abrir WhatsApp" para iniciar a conversa
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppQRDialog;