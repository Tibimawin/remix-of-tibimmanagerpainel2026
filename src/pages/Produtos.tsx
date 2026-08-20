import React, { useState, useEffect } from 'react';
import { ShoppingBag, Rocket, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

const Produtos = () => {
  const navigate = useNavigate();
  const [showComingSoon, setShowComingSoon] = useState(true);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
      <div className="bg-primary/10 p-6 rounded-full">
        <ShoppingBag className="w-16 h-16 text-primary animate-pulse" />
      </div>
      
      <div className="max-w-md space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Loja Oficial</h1>
        <p className="text-xl text-muted-foreground">
          Estamos preparando uma experiência incrível com os melhores aplicativos e complementos para você.
        </p>
      </div>

      <Button size="lg" onClick={() => navigate('/')}>
        Voltar ao Início
      </Button>

      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto bg-amber-100 p-3 rounded-full mb-4 w-fit">
              <Rocket className="w-8 h-8 text-amber-600" />
            </div>
            <DialogTitle className="text-center text-2xl">Em Breve!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              A Loja de Aplicativos está em manutenção para trazer novidades exclusivas. 
              <br /><br />
              <span className="flex items-center justify-center gap-2 text-amber-600 font-medium">
                <AlertCircle className="w-4 h-4" />
                Indisponível no momento
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button className="w-full" onClick={() => setShowComingSoon(false)}>
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produtos;
