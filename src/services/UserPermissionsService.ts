import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const UserPermissionsService = {
  // Incrementar o uso mensal de conteúdos
  async incrementContentUsage(userId: string, amount: number = 1) {
    try {
      console.log(`Incrementando uso de conteúdos para usuário ${userId}: +${amount}`);
      
      const userPermissionsRef = doc(db, 'userPermissions', userId);
      await updateDoc(userPermissionsRef, {
        currentMonthUsage: increment(amount),
        lastUpdated: serverTimestamp()
      });
      
      console.log('Uso de conteúdos atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao incrementar uso de conteúdos:', error);
      throw error;
    }
  },

  // Resetar o uso mensal (útil para reset manual ou mudança de plano)
  async resetMonthlyUsage(userId: string) {
    try {
      console.log(`Resetando uso mensal para usuário ${userId}`);
      
      const userPermissionsRef = doc(db, 'userPermissions', userId);
      await updateDoc(userPermissionsRef, {
        currentMonthUsage: 0,
        lastUpdated: serverTimestamp()
      });
      
      console.log('Uso mensal resetado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao resetar uso mensal:', error);
      throw error;
    }
  }
};