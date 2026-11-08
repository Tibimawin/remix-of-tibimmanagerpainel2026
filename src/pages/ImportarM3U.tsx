
import React from 'react';
import M3UImporter from '@/components/M3UImporter';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

const ImportarM3U = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          Importar Lista M3U
          <Badge variant="beta" className="text-sm px-3 py-1 flex items-center gap-1">
            <Info className="w-3 h-3" />
            BETA
          </Badge>
        </h1>
        <p className="text-muted-foreground mt-2">
          Faça upload de arquivos M3U e importe conteúdos automaticamente para sua biblioteca
        </p>
      </div>
      
      <M3UImporter />
    </div>
  );
};

export default ImportarM3U;
