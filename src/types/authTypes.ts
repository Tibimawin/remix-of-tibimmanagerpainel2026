
export interface UserInfo {
  id: string;
  email: string;
  name?: string;
  diasRestantes: number;
  accessDays?: number;
  totalLogins: number;
  isDemo?: boolean;
}

export interface LoginResult {
  success: boolean;
  message?: string;
}

export interface SimpleAuthContextType {
  userInfo: UserInfo | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  loginWithGoogle: () => Promise<LoginResult>;
  logout: () => Promise<void>;
  enterDemoMode: () => void;
  isDemoMode: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

