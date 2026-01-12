import { useState, useEffect } from 'react';
import { AdminAnnouncementService, AdminAnnouncement } from '@/services/AdminAnnouncementService';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useAdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logger.info('Configurando listener de anúncios do admin');
    
    const unsubscribe = AdminAnnouncementService.onActiveAnnouncementsChange((updatedAnnouncements) => {
      setAnnouncements(updatedAnnouncements);
      setLoading(false);
    });

    // Cleanup listener ao desmontar componente
    return () => {
      logger.debug('Removendo listener de anúncios do admin');
      unsubscribe();
    };
  }, []);

  // Criar novo anúncio
  const createAnnouncement = async (announcement: Omit<AdminAnnouncement, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await AdminAnnouncementService.createAnnouncement(announcement);
      toast.success('Anúncio criado com sucesso!');
      return id;
    } catch (error) {
      logger.error('Erro ao criar anúncio', error);
      toast.error('Erro ao criar anúncio');
      throw error;
    }
  };

  // Atualizar anúncio
  const updateAnnouncement = async (id: string, updates: Partial<AdminAnnouncement>) => {
    try {
      await AdminAnnouncementService.updateAnnouncement(id, updates);
      toast.success('Anúncio atualizado com sucesso!');
    } catch (error) {
      logger.error('Erro ao atualizar anúncio', error);
      toast.error('Erro ao atualizar anúncio');
      throw error;
    }
  };

  // Deletar anúncio
  const deleteAnnouncement = async (id: string) => {
    try {
      await AdminAnnouncementService.deleteAnnouncement(id);
      toast.success('Anúncio deletado com sucesso!');
    } catch (error) {
      logger.error('Erro ao deletar anúncio', error);
      toast.error('Erro ao deletar anúncio');
      throw error;
    }
  };

  // Buscar todos os anúncios (para admin)
  const fetchAllAnnouncements = async () => {
    try {
      setLoading(true);
      const allAnnouncements = await AdminAnnouncementService.getAnnouncements();
      return allAnnouncements;
    } catch (error) {
      logger.error('Erro ao buscar todos os anúncios', error);
      toast.error('Erro ao carregar anúncios');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    announcements,
    loading,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    fetchAllAnnouncements
  };
};