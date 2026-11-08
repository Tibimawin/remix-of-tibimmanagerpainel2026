import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FirebaseUserService } from './FirebaseUserService';

export const UserSyncService = {
  // Sincronizar usuários do Firebase Auth com Firestore
  async syncAllAuthUsers() {
    console.log('Iniciando sincronização de usuários do Firebase Auth...');
    
    // Esta função seria executada periodicamente pelo admin
    // Para garantir que todos os usuários autenticados tenham registros no Firestore
    
    try {
      // Obter usuários do Firestore
      const firestoreUsers = await FirebaseUserService.getAllUsers();
      const firestoreUserIds = new Set(firestoreUsers.map(u => u.uid));
      
      console.log('Usuários no Firestore:', firestoreUserIds.size);
      
      // Nota: Firebase Auth não permite listar todos os usuários no frontend
      // Essa sincronização seria mais eficaz com Cloud Functions
      // Por enquanto, a sincronização acontece automaticamente no login
      
      return {
        success: true,
        message: 'Sincronização ativa no login dos usuários'
      };
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return {
        success: false,
        message: 'Erro na sincronização: ' + error
      };
    }
  },

  // Monitorar usuários em tempo real
  setupRealtimeUserSync(callback: (users: any[]) => void) {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(users);
      },
      (error) => {
        console.error('Erro no listener de usuários:', error);
      }
    );

    return unsubscribe;
  }
};