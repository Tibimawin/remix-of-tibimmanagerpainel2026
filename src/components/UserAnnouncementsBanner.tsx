import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserAnnouncements } from '@/hooks/useUserAnnouncements';
import { X, Megaphone, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const UserAnnouncementsBanner = () => {
  const { announcements, loading, dismissAnnouncement } = useUserAnnouncements();

  console.log('🔥 UserAnnouncementsBanner - Estado:', { announcements, loading });

  if (loading) {
    console.log('🔥 UserAnnouncementsBanner - Ainda carregando');
    return null;
  }

  if (announcements.length === 0) {
    console.log('🔥 UserAnnouncementsBanner - Nenhum anúncio para exibir');
    return null;
  }

  console.log('🔥 UserAnnouncementsBanner - Renderizando', announcements.length, 'anúncios');

  const getIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info className="w-5 h-5" />;
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'error': return <XCircle className="w-5 h-5" />;
      default: return <Megaphone className="w-5 h-5" />;
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'info': 
        return 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100';
      case 'success': 
        return 'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-100';
      case 'warning': 
        return 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-100';
      case 'error': 
        return 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-100';
      default: 
        return 'bg-muted border-border text-foreground';
    }
  };

  const getIconStyles = (type: string) => {
    switch (type) {
      case 'info': return 'text-blue-600 dark:text-blue-400';
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <Card 
          key={announcement.id} 
          className={`border-l-4 ${getTypeStyles(announcement.type)} animate-fade-in`}
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className={`mt-0.5 ${getIconStyles(announcement.type)}`}>
                  {getIcon(announcement.type)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{announcement.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      Novo
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {announcement.message}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissAnnouncement(announcement.id!)}
                className="shrink-0 h-8 w-8 p-0 hover:bg-background/80"
                aria-label="Dispensar anúncio"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default UserAnnouncementsBanner;