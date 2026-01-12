import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Film, Tv } from 'lucide-react';
import { MaxPlusContent } from '@/services/MaxPlusImportService';

interface MaxPlusContentCardProps {
  content: MaxPlusContent;
  onClick: () => void;
}

export const MaxPlusContentCard = ({ content, onClick }: MaxPlusContentCardProps) => {
  return (
    <Card 
      className="overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
      onClick={onClick}
    >
      <div className="aspect-[2/3] relative bg-muted">
        {content.poster ? (
          <img 
            src={content.poster} 
            alt={content.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {content.type === 'movie' ? (
              <Film className="w-16 h-16 text-muted-foreground" />
            ) : (
              <Tv className="w-16 h-16 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={content.type === 'movie' ? 'default' : 'secondary'}>
            {content.type === 'movie' ? 'Filme' : 'Série'}
          </Badge>
        </div>
      </div>
      <CardContent className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
          {content.title}
        </h3>
        {content.category && (
          <p className="text-xs text-muted-foreground mt-1">{content.category}</p>
        )}
      </CardContent>
    </Card>
  );
};
