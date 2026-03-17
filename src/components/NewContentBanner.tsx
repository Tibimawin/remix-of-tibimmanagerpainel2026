import { BellRing, CheckCheck, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface NewContentBannerProps {
  count: number;
  onView: () => void;
  onMarkAllAsSeen: () => void;
}

const NewContentBanner = ({ count, onView, onMarkAllAsSeen }: NewContentBannerProps) => {
  if (count <= 0) return null;

  return (
    <Alert className="relative border-primary/30 bg-primary/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <BellRing className="h-5 w-5" />
          </div>

          <AlertDescription className="space-y-1 text-foreground">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              {count} {count === 1 ? 'conteúdo novo disponível' : 'conteúdos novos disponíveis'}
            </p>
            <p className="text-xs text-muted-foreground">
              Seu catálogo recebeu novidades. Abra a lista para ver os itens adicionados agora há pouco.
            </p>
          </AlertDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onView}>
            Ver novidades
          </Button>
          <Button size="sm" variant="outline" onClick={onMarkAllAsSeen}>
            <CheckCheck className="h-4 w-4" />
            Marcar como visto
          </Button>
        </div>
      </div>
    </Alert>
  );
};

export default NewContentBanner;
