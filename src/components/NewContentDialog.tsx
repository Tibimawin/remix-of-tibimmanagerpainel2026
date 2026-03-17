import { BellRing, CheckCheck, Download, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { NewContentItem } from '@/hooks/useNewContentNotifications';

interface NewContentDialogProps {
  open: boolean;
  items: NewContentItem[];
  onOpenChange: (open: boolean) => void;
  onView: () => void;
  onImport: () => void;
  onMarkAllAsSeen: () => void;
}

const NewContentDialog = ({ open, items, onOpenChange, onView, onImport, onMarkAllAsSeen }: NewContentDialogProps) => {
  const previewItems = items.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-background sm:max-w-2xl">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <BellRing className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2 text-2xl text-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                Novos conteúdos no catálogo
              </DialogTitle>
              <DialogDescription>
                Encontramos {items.length} {items.length === 1 ? 'novidade' : 'novidades'} desde a sua última visita.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {previewItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[item.type, item.category, item.year].filter(Boolean).join(' • ') || 'Novo conteúdo adicionado'}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                Novo
              </span>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onMarkAllAsSeen}>
            <CheckCheck className="h-4 w-4" />
            Marcar como visto
          </Button>
          <Button variant="outline" onClick={onView}>Ver novidades</Button>
          <Button onClick={onImport}>
            <Download className="h-4 w-4" />
            Importar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewContentDialog;
