import { useState, useEffect } from 'react';
import { AdminAnnouncementService, AdminAnnouncement } from '@/services/AdminAnnouncementService';
import { logger } from '@/utils/logger';

export const useUserAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);

  useEffect(() => {
    // Carregar anúncios dispensados do localStorage
    const dismissed = localStorage.getItem('dismissedAnnouncements');
    if (dismissed) {
      try {
        setDismissedAnnouncements(JSON.parse(dismissed));
      } catch (error) {
        logger.error('Erro ao carregar anúncios dispensados', error);
      }
    }
  }, []);

  useEffect(() => {
    console.log('🔥 Configurando listener de anúncios para usuários');
    logger.info('Configurando listener de anúncios para usuários');
    
    const unsubscribe = AdminAnnouncementService.onActiveAnnouncementsChange((updatedAnnouncements) => {
      console.log('🔥 Anúncios recebidos no hook:', updatedAnnouncements);
      
      // Filtrar anúncios que ainda não foram dispensados
      const nonDismissedAnnouncements = updatedAnnouncements.filter(
        announcement => !dismissedAnnouncements.includes(announcement.id!)
      );
      
      console.log('🔥 Anúncios após filtro:', nonDismissedAnnouncements);
      console.log('🔥 Anúncios dispensados:', dismissedAnnouncements);
      
      setAnnouncements(nonDismissedAnnouncements);
      setLoading(false);
    });

    // Cleanup listener ao desmontar componente
    return () => {
      console.log('🔥 Removendo listener de anúncios para usuários');
      logger.debug('Removendo listener de anúncios para usuários');
      unsubscribe();
    };
  }, [dismissedAnnouncements]);

  // Dispensar anúncio
  const dismissAnnouncement = (announcementId: string) => {
    const newDismissed = [...dismissedAnnouncements, announcementId];
    setDismissedAnnouncements(newDismissed);
    
    // Salvar no localStorage
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
    
    // Remover da lista atual
    setAnnouncements(prev => prev.filter(ann => ann.id !== announcementId));
    
    logger.debug('Anúncio dispensado', { announcementId });
  };

  // Limpar todos os anúncios dispensados (para resetar)
  const clearDismissedAnnouncements = () => {
    setDismissedAnnouncements([]);
    localStorage.removeItem('dismissedAnnouncements');
    logger.debug('Lista de anúncios dispensados limpa');
  };

  return {
    announcements,
    loading,
    dismissAnnouncement,
    clearDismissedAnnouncements
  };
};