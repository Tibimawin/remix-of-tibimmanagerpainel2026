import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload } from 'lucide-react';

interface ImportButtonProps {
  onImport: (data: any) => void;
  tableKey: string;
}

export function ImportButton({ onImport, tableKey }: ImportButtonProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setFile(selectedFile || null);
  };

  const handleImport = () => {
    if (!file) {
      alert("Por favor, selecione um arquivo para importar.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        onImport(jsonData);
        setOpen(false);
        setFile(null);
      } catch (error) {
        alert("Erro ao processar o arquivo. Verifique se o formato JSON está correto.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Importar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Dados</DialogTitle>
            <DialogDescription>
              Selecione um arquivo JSON para importar os dados para a tabela "{tableKey}".
            </DialogDescription>
          </DialogHeader>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
          />
          <div className="flex justify-end mt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleImport} disabled={!file}>
              Importar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
