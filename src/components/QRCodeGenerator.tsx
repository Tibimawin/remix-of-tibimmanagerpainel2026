import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface QRCodeGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  open,
  onOpenChange,
  url
}) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.error("Não foi possível gerar o QR Code.");
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'playlist-qrcode.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("O QR Code foi salvo como imagem.");
    });
  };

  if (!url) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code da Playlist</DialogTitle>
          <DialogDescription>
            Escaneie este QR Code com seu aplicativo IPTV para adicionar a playlist.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          <div 
            ref={qrRef}
            className="bg-white p-4 rounded-lg"
          >
            <QRCodeCanvas
              value={url}
              size={256}
              level="H"
              includeMargin={true}
            />
          </div>
          <div className="text-sm text-muted-foreground text-center max-w-sm break-all">
            {url}
          </div>
          <Button onClick={handleDownloadQR} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Baixar QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
