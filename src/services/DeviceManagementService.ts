import { doc, collection, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FirebaseUserService, FirebaseUser } from '@/services/FirebaseUserService';

export interface UserDevice {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'tv' | 'unknown';
  browser?: string;
  os?: string;
  ip?: string;
  lastActivity: string;
  firstLogin: string;
  isActive: boolean;
  deviceToken?: string;
}

export interface DeviceLimit {
  userId: string;
  maxDevices: number;
  currentDevices: number;
}

const detectDeviceType = (userAgent: string): 'mobile' | 'tablet' | 'desktop' | 'tv' | 'unknown' => {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('smart-tv') || ua.includes('smarttv') || ua.includes('webos') || ua.includes('tizen')) {
    return 'tv';
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  }
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  }
  if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
    return 'desktop';
  }
  return 'unknown';
};

const detectBrowser = (userAgent: string): string => {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari')) return 'Safari';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  return 'Desconhecido';
};

const detectOS = (userAgent: string): string => {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('windows nt 10')) return 'Windows 10/11';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os x')) return 'macOS';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  if (ua.includes('linux')) return 'Linux';
  return 'Desconhecido';
};

export const DeviceManagementService = {
  // Gerar fingerprint único do dispositivo (persistente no localStorage)
  getDeviceFingerprint(userId: string): string {
    const storageKey = `device_fingerprint_${userId}`;
    let fingerprint = localStorage.getItem(storageKey);
    
    if (!fingerprint) {
      // Criar fingerprint baseado em características do dispositivo
      const userAgent = navigator.userAgent;
      const screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}`;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const language = navigator.language;
      
      // Hash simples das características
      const rawFingerprint = `${userId}_${userAgent}_${screenInfo}_${timezone}_${language}`;
      fingerprint = `${userId}_${this.simpleHash(rawFingerprint)}`;
      
      localStorage.setItem(storageKey, fingerprint);
    }
    
    return fingerprint;
  },

  // Hash simples para criar fingerprint
  simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  },

  // Registrar ou atualizar dispositivo (OTIMIZADO - evita writes desnecessários)
  async registerDevice(userId: string, userEmail: string, userName: string): Promise<UserDevice | null> {
    try {
      const deviceId = this.getDeviceFingerprint(userId);
      const deviceRef = doc(db, 'userDevices', deviceId);
      
      // Verificar se dispositivo já existe
      const existingDoc = await getDoc(deviceRef);
      
      if (existingDoc.exists()) {
        // ✅ Dispositivo já registrado - apenas atualizar lastActivity
        // Limitar updates para no máximo 1 por hora
        const existingData = existingDoc.data() as UserDevice;
        const lastActivity = new Date(existingData.lastActivity);
        const now = new Date();
        const hoursDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff >= 1) {
          await updateDoc(deviceRef, {
            lastActivity: now.toISOString()
          });
          console.log('📱 Atividade do dispositivo atualizada (1 write)');
        } else {
          console.log('📱 Dispositivo já ativo recentemente (0 writes)');
        }
        
        return { ...existingData, id: deviceId };
      }
      
      // ✅ Novo dispositivo - criar registro
      const userAgent = navigator.userAgent;
      
      // Buscar IP (com timeout curto)
      let ip = 'Desconhecido';
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        ip = data.ip;
      } catch (e) {
        console.log('IP não obtido (timeout ou erro)');
      }

      const device: UserDevice = {
        id: deviceId,
        userId,
        userEmail,
        userName,
        deviceName: `${detectOS(userAgent)} - ${detectBrowser(userAgent)}`,
        deviceType: detectDeviceType(userAgent),
        browser: detectBrowser(userAgent),
        os: detectOS(userAgent),
        ip,
        lastActivity: new Date().toISOString(),
        firstLogin: new Date().toISOString(),
        isActive: true
      };

      await setDoc(deviceRef, device);
      console.log('📱 Novo dispositivo registrado (1 write):', deviceId);
      
      return device;
    } catch (error) {
      console.error('Erro ao registrar dispositivo:', error);
      throw error;
    }
  },

  // Atualizar atividade do dispositivo
  async updateDeviceActivity(deviceId: string): Promise<void> {
    try {
      const deviceRef = doc(db, 'userDevices', deviceId);
      await updateDoc(deviceRef, {
        lastActivity: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
    }
  },

  // Buscar dispositivos de um usuário
  async getUserDevices(userId: string): Promise<UserDevice[]> {
    try {
      const devicesRef = collection(db, 'userDevices');
      const q = query(devicesRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      const devices: UserDevice[] = [];
      snapshot.forEach(doc => {
        devices.push({ id: doc.id, ...doc.data() } as UserDevice);
      });
      
      return devices.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );
    } catch (error) {
      console.error('Erro ao buscar dispositivos do usuário:', error);
      return [];
    }
  },

  // Buscar todos os dispositivos (admin)
  async getAllDevices(): Promise<UserDevice[]> {
    try {
      const devicesRef = collection(db, 'userDevices');
      const snapshot = await getDocs(devicesRef);
      
      const devices: UserDevice[] = [];
      snapshot.forEach(doc => {
        devices.push({ id: doc.id, ...doc.data() } as UserDevice);
      });
      
      return devices.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );
    } catch (error) {
      console.error('Erro ao buscar todos os dispositivos:', error);
      return [];
    }
  },

  // Buscar dispositivos agrupados por usuário
  async getDevicesGroupedByUser(): Promise<Map<string, { user: Partial<FirebaseUser>, devices: UserDevice[] }>> {
    try {
      const devices = await this.getAllDevices();
      const users = await FirebaseUserService.getAllUsers();
      
      const grouped = new Map<string, { user: Partial<FirebaseUser>, devices: UserDevice[] }>();
      
      // Inicializar com todos os usuários
      users.forEach(user => {
        grouped.set(user.uid, {
          user: {
            uid: user.uid,
            email: user.email,
            name: user.name,
            isActive: user.isActive,
            lastLogin: user.lastLogin
          },
          devices: []
        });
      });
      
      // Adicionar dispositivos aos usuários
      devices.forEach(device => {
        const userGroup = grouped.get(device.userId);
        if (userGroup) {
          userGroup.devices.push(device);
        } else {
          // Usuário não encontrado, criar entrada
          grouped.set(device.userId, {
            user: {
              uid: device.userId,
              email: device.userEmail,
              name: device.userName,
              isActive: true
            },
            devices: [device]
          });
        }
      });
      
      return grouped;
    } catch (error) {
      console.error('Erro ao agrupar dispositivos:', error);
      return new Map();
    }
  },

  // Revogar acesso de um dispositivo
  async revokeDeviceAccess(deviceId: string): Promise<void> {
    try {
      const deviceRef = doc(db, 'userDevices', deviceId);
      await updateDoc(deviceRef, {
        isActive: false,
        revokedAt: new Date().toISOString()
      });
      console.log('Acesso do dispositivo revogado:', deviceId);
    } catch (error) {
      console.error('Erro ao revogar acesso:', error);
      throw error;
    }
  },

  // Remover dispositivo completamente
  async removeDevice(deviceId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'userDevices', deviceId));
      console.log('Dispositivo removido:', deviceId);
    } catch (error) {
      console.error('Erro ao remover dispositivo:', error);
      throw error;
    }
  },

  // Revogar todos os dispositivos de um usuário
  async revokeAllUserDevices(userId: string): Promise<void> {
    try {
      const devices = await this.getUserDevices(userId);
      
      for (const device of devices) {
        await this.revokeDeviceAccess(device.id);
      }
      
      console.log('Todos os dispositivos do usuário revogados:', userId);
    } catch (error) {
      console.error('Erro ao revogar dispositivos do usuário:', error);
      throw error;
    }
  },

  // Buscar limite de dispositivos do usuário
  async getDeviceLimit(userId: string): Promise<DeviceLimit> {
    try {
      const limitDoc = await getDoc(doc(db, 'deviceLimits', userId));
      
      if (limitDoc.exists()) {
        return limitDoc.data() as DeviceLimit;
      }
      
      // Limite padrão
      const devices = await this.getUserDevices(userId);
      return {
        userId,
        maxDevices: 3, // Limite padrão
        currentDevices: devices.filter(d => d.isActive).length
      };
    } catch (error) {
      console.error('Erro ao buscar limite de dispositivos:', error);
      return {
        userId,
        maxDevices: 3,
        currentDevices: 0
      };
    }
  },

  // Definir limite de dispositivos para um usuário
  async setDeviceLimit(userId: string, maxDevices: number): Promise<void> {
    try {
      const devices = await this.getUserDevices(userId);
      const currentDevices = devices.filter(d => d.isActive).length;
      
      await setDoc(doc(db, 'deviceLimits', userId), {
        userId,
        maxDevices,
        currentDevices,
        updatedAt: new Date().toISOString()
      });
      
      console.log('Limite de dispositivos atualizado:', userId, maxDevices);
    } catch (error) {
      console.error('Erro ao definir limite de dispositivos:', error);
      throw error;
    }
  },

  // Verificar se usuário pode adicionar mais dispositivos
  async canAddDevice(userId: string): Promise<boolean> {
    try {
      const limit = await this.getDeviceLimit(userId);
      const devices = await this.getUserDevices(userId);
      const activeDevices = devices.filter(d => d.isActive).length;
      
      return activeDevices < limit.maxDevices;
    } catch (error) {
      console.error('Erro ao verificar limite de dispositivos:', error);
      return false;
    }
  },

  // Calcular tempo desde última atividade
  calculateTimeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'agora';
    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  },

  // Estatísticas de dispositivos
  async getDeviceStats(): Promise<{
    totalDevices: number;
    activeDevices: number;
    devicesByType: Record<string, number>;
    devicesByBrowser: Record<string, number>;
    usersOverLimit: number;
  }> {
    try {
      const devices = await this.getAllDevices();
      const users = await FirebaseUserService.getAllUsers();
      
      const activeDevices = devices.filter(d => d.isActive);
      
      const devicesByType: Record<string, number> = {};
      const devicesByBrowser: Record<string, number> = {};
      
      devices.forEach(device => {
        // Por tipo
        devicesByType[device.deviceType] = (devicesByType[device.deviceType] || 0) + 1;
        
        // Por browser
        if (device.browser) {
          devicesByBrowser[device.browser] = (devicesByBrowser[device.browser] || 0) + 1;
        }
      });
      
      // Verificar usuários acima do limite
      let usersOverLimit = 0;
      for (const user of users) {
        const limit = await this.getDeviceLimit(user.uid);
        const userDevices = devices.filter(d => d.userId === user.uid && d.isActive);
        if (userDevices.length > limit.maxDevices) {
          usersOverLimit++;
        }
      }
      
      return {
        totalDevices: devices.length,
        activeDevices: activeDevices.length,
        devicesByType,
        devicesByBrowser,
        usersOverLimit
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de dispositivos:', error);
      return {
        totalDevices: 0,
        activeDevices: 0,
        devicesByType: {},
        devicesByBrowser: {},
        usersOverLimit: 0
      };
    }
  }
};
