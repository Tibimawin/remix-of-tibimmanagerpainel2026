import { CheckCheck, Film, FolderOpen, Tv } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { NewContentItem } from '@/hooks/useNewContentNotifications';

interface NewContentListProps {
  items: NewContentItem[];
  onMarkAllAsSeen: () => void;
}

const NewContentList = ({ items, onMarkAllAsSeen }: NewContentListProps) => {
  if (!items.length) return null;

  const visibleItems = items.slice(0, 8);

  return (
    <Card id="novidades-conteudos" className="backdrop-blur-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            Últimas novidades
          </CardTitle>
          <CardDescription>
            Estes são os conteúdos novos detectados automaticamente no seu catálogo.
          </CardDescription>
        </div>

        <Button variant="outline" size="sm" onClick={onMarkAllAsSeen}>
          <CheckCheck className="h-4 w-4" />
          Marcar tudo como visto
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {visibleItems.map((item) => (
          <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-4">
            <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">
              {String(item.type).toLowerCase().includes('serie') || String(item.type).toLowerCase().includes('tv') ? (
                <Tv className="h-4 w-4" />
              ) : (
                <Film className="h-4 w-4" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Novo
                </span>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Tv className="h-3.5 w-3.5" />
                  {item.type}
                </span>
                {item.category && (
                  <span className="inline-flex items-center gap-1">
                    <FolderOpen className="h-3.5 w-3.5" />
                    {item.category}
                  </span>
                )}
                {item.year && <span>{item.year}</span>}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default NewContentList;
