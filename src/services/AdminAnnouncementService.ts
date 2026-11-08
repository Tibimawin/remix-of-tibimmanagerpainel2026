import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';

export interface AdminAnnouncement {
  id?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isActive: boolean;
  targetAudience: 'all' | 'new_users' | 'existing_users';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export const AdminAnnouncementService = {
  // Criar novo anúncio
  async createAnnouncement(announcement: Omit<AdminAnnouncement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      logger.info('Criando novo anúncio');
      
      const newAnnouncement = {
        ...announcement,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'adminAnnouncements'), newAnnouncement);
      logger.info('Anúncio criado com sucesso', { id: docRef.id });
      
      return docRef.id;
    } catch (error) {
      logger.error('Erro ao criar anúncio', error);
      throw error;
    }
  },

  // Buscar todos os anúncios
  async getAnnouncements(): Promise<AdminAnnouncement[]> {
    try {
      logger.debug('Buscando anúncios');
      
      const q = query(
        collection(db, 'adminAnnouncements'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const announcements: AdminAnnouncement[] = [];
      
      querySnapshot.forEach((doc) => {
        announcements.push({
          id: doc.id,
          ...doc.data()
        } as AdminAnnouncement);
      });
      
      logger.debug(`${announcements.length} anúncios encontrados`);
      return announcements;
    } catch (error) {
      logger.error('Erro ao buscar anúncios', error);
      throw error;
    }
  },

  // Buscar anúncios ativos para usuários
  async getActiveAnnouncements(): Promise<AdminAnnouncement[]> {
    try {
      logger.debug('Buscando anúncios ativos');
      
      const q = query(
        collection(db, 'adminAnnouncements'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const announcements: AdminAnnouncement[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as AdminAnnouncement;
        
        // Verificar se o anúncio não expirou
        if (data.expiresAt) {
          const expirationDate = new Date(data.expiresAt);
          const now = new Date();
          
          if (now > expirationDate) {
            return; // Pular anúncios expirados
          }
        }
        
        announcements.push({
          id: doc.id,
          ...data
        });
      });
      
      logger.debug(`${announcements.length} anúncios ativos encontrados`);
      return announcements;
    } catch (error) {
      logger.error('Erro ao buscar anúncios ativos', error);
      throw error;
    }
  },

  // Atualizar anúncio
  async updateAnnouncement(id: string, updates: Partial<AdminAnnouncement>): Promise<void> {
    try {
      logger.info('Atualizando anúncio', { id });
      
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      const docRef = doc(db, 'adminAnnouncements', id);
      await updateDoc(docRef, updateData);
      
      logger.info('Anúncio atualizado com sucesso');
    } catch (error) {
      logger.error('Erro ao atualizar anúncio', error);
      throw error;
    }
  },

  // Deletar anúncio
  async deleteAnnouncement(id: string): Promise<void> {
    try {
      logger.info('Deletando anúncio', { id });
      
      const docRef = doc(db, 'adminAnnouncements', id);
      await deleteDoc(docRef);
      
      logger.info('Anúncio deletado com sucesso');
    } catch (error) {
      logger.error('Erro ao deletar anúncio', error);
      throw error;
    }
  },

  // Listener em tempo real para anúncios ativos
  onActiveAnnouncementsChange(callback: (announcements: AdminAnnouncement[]) => void) {
    console.log('🔥 Iniciando listener de anúncios ativos');
    logger.debug('Iniciando listener de anúncios ativos');
    
    const q = query(
      collection(db, 'adminAnnouncements'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log('🔥 Query snapshot recebido, docs:', querySnapshot.size);
        const announcements: AdminAnnouncement[] = [];
        
        querySnapshot.forEach((doc) => {
          console.log('🔥 Processando documento:', doc.id, doc.data());
          const data = doc.data() as AdminAnnouncement;
          
          // Verificar se o anúncio não expirou
          if (data.expiresAt) {
            const expirationDate = new Date(data.expiresAt);
            const now = new Date();
            
            console.log('🔥 Verificando expiração:', { expiresAt: data.expiresAt, now: now.toISOString(), expired: now > expirationDate });
            
            if (now > expirationDate) {
              console.log('🔥 Anúncio expirado, pulando');
              return; // Pular anúncios expirados
            }
          }
          
          announcements.push({
            id: doc.id,
            ...data
          });
        });
        
        console.log('🔥 Total de anúncios ativos carregados:', announcements.length);
        logger.debug(`${announcements.length} anúncios ativos carregados`);
        callback(announcements);
      },
      (error) => {
        console.error('🔥 Erro no listener de anúncios ativos:', error);
        logger.error('Erro no listener de anúncios ativos', error);
        callback([]);
      }
    );

    return unsubscribe;
  },

  // Desativar anúncios expirados (função utilitária)
  async deactivateExpiredAnnouncements(): Promise<void> {
    try {
      logger.debug('Verificando anúncios expirados');
      
      const q = query(
        collection(db, 'adminAnnouncements'),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const now = new Date();
      const batch: Promise<void>[] = [];
      
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as AdminAnnouncement;
        
        if (data.expiresAt) {
          const expirationDate = new Date(data.expiresAt);
          
          if (now > expirationDate) {
            logger.info('Desativando anúncio expirado', { id: docSnapshot.id });
            
            const docRef = doc(db, 'adminAnnouncements', docSnapshot.id);
            batch.push(updateDoc(docRef, { 
              isActive: false,
              updatedAt: new Date().toISOString()
            }));
          }
        }
      });
      
      await Promise.all(batch);
      logger.debug(`${batch.length} anúncios expirados desativados`);
      
    } catch (error) {
      logger.error('Erro ao desativar anúncios expirados', error);
      throw error;
    }
  }
};