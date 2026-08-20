import React from 'react';
import { ShoppingCart } from 'lucide-react';

const Produtos = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="bg-primary/10 p-6 rounded-full">
        <ShoppingCart className="w-16 h-16 text-primary animate-pulse" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Loja Oficial</h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        Esta página está sendo preparada para receber produtos de aplicativos e muito mais. 
        Em breve você encontrará novidades aqui!
      </p>
      <div className="flex gap-2 mt-4">
        <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" />
        <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-.3s]" />
        <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-.5s]" />
      </div>
    </div>
  );
};

export default Produtos;
