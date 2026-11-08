import { FirebaseUserService, FirebaseUser } from '@/services/FirebaseUserService';

export interface ActiveSession {
  id: string;
  nome: string;
  email: string;
  lastLogin: string;
  isOnline: boolean;
  timeAgo: string;
  totalLogins: number;
  status: string;
}

export const activeSessionService = {
  async getActiveSessions(): Promise<ActiveSession[]> {
    try {
      const users = await FirebaseUserService.getAllUsers();
      
      if (!users) {
        console.log('Nenhum usuário encontrado');
        return [];
      }

      const sessions: ActiveSession[] = users
        .filter(user => user.isActive)
        .map(user => ({
          id: user.uid,
          nome: user.name || 'Usuário',
          email: user.email,
          lastLogin: user.lastLogin || user.createdAt,
          isOnline: user.isActive,
          timeAgo: this.calculateTimeAgo(user.lastLogin || user.createdAt),
          totalLogins: user.totalLogins || 0,
          status: user.isActive ? 'Ativo' : 'Inativo'
        }));

      return sessions.sort((a, b) => 
        new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime()
      );
    } catch (error) {
      console.error('Erro ao buscar sessões ativas:', error);
      return [];
    }
  },

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

  async forceLogout(userId: string, email: string): Promise<boolean> {
    try {
      console.log('Forçando logout do usuário:', email);
      
      // Desativar usuário no Firebase
      await FirebaseUserService.deactivateUser(userId);
      
      console.log('Usuário desativado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao forçar logout:', error);
      throw error;
    }
  }
};