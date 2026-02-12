import { doc, collection, setDoc, getDoc, getDocs, updateDoc, query, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { db, auth } from '@/config/firebase';

export interface FirebaseUser {
  uid: string;
  email: string;
  name: string;
  password?: string;
  accessDays: number;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
  totalLogins: number;
  createdAt: string;
  createdBy: string;
  lastLogin?: string;
  deviceInfo?: {
    imei: string;
    dispositivo: string;
    ip: string;
    lastActivity: string;
  };
}

export const FirebaseUserService = {
  // Criar registro de usuário no Firestore (sem criar no Firebase Auth)
  async createUserRecord(userData: Partial<FirebaseUser>): Promise<FirebaseUser> {
    try {
      console.log('Criando registro de usuário no Firestore:', userData.email);

      const userDoc: FirebaseUser = {
        uid: userData.uid!,
        email: userData.email!,
        name: userData.name!,
        accessDays: userData.accessDays || 1,
        startDate: userData.startDate || new Date().toISOString(),
        expiryDate: userData.expiryDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isActive: userData.isActive ?? true,
        totalLogins: userData.totalLogins || 0,
        createdAt: userData.createdAt || new Date().toISOString(),
        createdBy: userData.createdBy || 'system'
      };

      // Salvar no Firestore
      await setDoc(doc(db, 'users', userDoc.uid), userDoc);

      // Criar permissões padrão
      const defaultPermissions = {
        userId: userDoc.uid,
        userEmail: userDoc.email,
        userName: userDoc.name,
        planId: 'basic',
        planName: 'Gratuito (1 dia)',
        monthlyContentLimit: 0,
        enabledFeatures: [], // Nenhuma funcionalidade por padrão
        currentMonthUsage: 0,
        lastUpdated: new Date().toISOString(),
        expiryDate: userDoc.expiryDate,
        isActive: userDoc.isActive
      };

      await setDoc(doc(db, 'userPermissions', userDoc.uid), defaultPermissions);

      console.log('Registro de usuário criado com sucesso:', userDoc.uid);
      return userDoc;

    } catch (error: any) {
      console.error('Erro ao criar registro de usuário:', error);
      throw new Error('Erro ao criar registro de usuário: ' + error.message);
    }
  },

  // Criar usuário no Firebase Auth e Firestore (para admin)
  async createUser(userData: {
    name: string;
    email: string;
    password: string;
    accessDays: number;
    startDate?: string;
  }): Promise<FirebaseUser> {
    try {
      console.log('Criando usuário no Firebase:', userData.email);

      // 1. Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const firebaseUser = userCredential.user;

      // 2. Calcular data de expiração
      const startDate = userData.startDate || new Date().toISOString();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + userData.accessDays);

      // 3. Criar dados do usuário para o Firestore
      const userDoc: FirebaseUser = {
        uid: firebaseUser.uid,
        email: userData.email,
        name: userData.name,
        accessDays: userData.accessDays,
        startDate: startDate,
        expiryDate: expiryDate.toISOString(),
        isActive: true,
        totalLogins: 0,
        createdAt: new Date().toISOString(),
        createdBy: 'admin'
      };

      // 4. Salvar no Firestore usando o método unificado
      const createdUser = await this.createUserRecord({
        uid: firebaseUser.uid,
        email: userData.email,
        name: userData.name,
        accessDays: userData.accessDays,
        startDate: startDate,
        expiryDate: expiryDate.toISOString(),
        isActive: true,
        totalLogins: 0,
        createdAt: new Date().toISOString(),
        createdBy: 'admin'
      });

      console.log('Usuário criado com sucesso:', firebaseUser.uid);

      // 5. Enviar notificação de boas-vindas
      try {
        const { UserSubscriptionNotificationService } = await import('@/services/UserSubscriptionNotificationService');
        await UserSubscriptionNotificationService.notifyWelcome(
          firebaseUser.uid,
          userData.email,
          userData.name,
          userData.accessDays,
          expiryDate.toISOString()
        );
        console.log('Notificação de boas-vindas enviada');
      } catch (notifError) {
        console.error('Erro ao enviar notificação de boas-vindas (não crítico):', notifError);
        // Não falhar a criação do usuário por causa da notificação
      }

      return createdUser;

    } catch (error: any) {
      console.error('Erro ao criar usuário no Firebase:', error);

      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este email já está cadastrado');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Senha muito fraca. Use pelo menos 6 caracteres');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Email inválido');
      }

      throw new Error('Erro ao criar usuário: ' + error.message);
    }
  },

  // Buscar todos os usuários
  async getAllUsers(): Promise<FirebaseUser[]> {
    try {
      console.log('Buscando todos os usuários Firebase');

      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const users: FirebaseUser[] = [];
      querySnapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as FirebaseUser);
      });

      console.log('Usuários encontrados:', users.length);
      return users;

    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  },

  // Buscar usuário por ID
  async getUserById(uid: string): Promise<FirebaseUser | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (userDoc.exists()) {
        return { uid: userDoc.id, ...userDoc.data() } as FirebaseUser;
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw error;
    }
  },

  // Atualizar usuário
  async updateUser(uid: string, updates: Partial<FirebaseUser>): Promise<void> {
    try {
      console.log('Atualizando usuário:', uid, updates);

      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, updates);

      console.log('Usuário atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  },

  // Verificar se usuário está ativo (não expirado)
  async checkUserAccess(uid: string): Promise<boolean> {
    try {
      const user = await this.getUserById(uid);
      if (!user) return false;

      const now = new Date();
      const expiryDate = new Date(user.expiryDate);

      const hasAccess = user.isActive && now <= expiryDate;

      console.log('Verificação de acesso:', {
        uid,
        isActive: user.isActive,
        expiryDate: user.expiryDate,
        hasAccess
      });

      return hasAccess;
    } catch (error) {
      console.error('Erro ao verificar acesso do usuário:', error);
      return false;
    }
  },

  // Estender acesso do usuário
  async extendUserAccess(uid: string, additionalDays: number): Promise<void> {
    try {
      const user = await this.getUserById(uid);
      if (!user) throw new Error('Usuário não encontrado');

      // Sempre contar a partir de HOJE (data do pagamento)
      const now = new Date();
      const newExpiry = new Date(now);
      newExpiry.setDate(now.getDate() + additionalDays);

      await this.updateUser(uid, {
        expiryDate: newExpiry.toISOString(),
        accessDays: user.accessDays + additionalDays,
        isActive: true
      });

      // Atualizar também as permissões
      const permissionsRef = doc(db, 'userPermissions', uid);
      await updateDoc(permissionsRef, {
        expiryDate: newExpiry.toISOString(),
        isActive: true,
        lastUpdated: new Date().toISOString()
      });

      console.log('Acesso estendido com sucesso:', additionalDays, 'dias');

      // Enviar notificação de renovação ao usuário
      try {
        const { UserSubscriptionNotificationService } = await import('@/services/UserSubscriptionNotificationService');

        // Remover notificações de expiração antigas
        await UserSubscriptionNotificationService.removeExpirationWarnings(uid);

        // Enviar notificação de renovação
        await UserSubscriptionNotificationService.notifySubscriptionRenewal(
          uid,
          user.email,
          user.name,
          additionalDays,
          newExpiry.toISOString()
        );
        console.log('Notificação de renovação enviada ao usuário');
      } catch (notifError) {
        console.error('Erro ao enviar notificação (não crítico):', notifError);
      }

      try {
        const { ReferralService } = await import('@/services/ReferralService');
        await ReferralService.updateSubscriptionStatusByReferred(uid, true);
      } catch { }
    } catch (error) {
      console.error('Erro ao estender acesso:', error);
      throw error;
    }
  },

  // Desativar usuário
  async deactivateUser(uid: string): Promise<void> {
    try {
      await this.updateUser(uid, { isActive: false });

      // Atualizar também as permissões
      const permissionsRef = doc(db, 'userPermissions', uid);
      await updateDoc(permissionsRef, {
        isActive: false,
        lastUpdated: new Date().toISOString()
      });

      console.log('Usuário desativado:', uid);
      try {
        const { ReferralService } = await import('@/services/ReferralService');
        await ReferralService.updateSubscriptionStatusByReferred(uid, false);
      } catch { }
    } catch (error) {
      console.error('Erro ao desativar usuário:', error);
      throw error;
    }
  },

  // Registrar login do usuário
  async recordLogin(uid: string, deviceInfo?: any): Promise<void> {
    try {
      const user = await this.getUserById(uid);
      if (!user) return;

      const updates: Partial<FirebaseUser> = {
        totalLogins: user.totalLogins + 1,
        lastLogin: new Date().toISOString()
      };

      if (deviceInfo) {
        updates.deviceInfo = deviceInfo;
      }

      await this.updateUser(uid, updates);
    } catch (error) {
      console.error('Erro ao registrar login:', error);
    }
  }
};