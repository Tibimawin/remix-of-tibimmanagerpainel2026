
export interface UserInfo {
  id: string;
  email: string;
  diasRestantes: number;
  totalLogins: number;
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
  isAuthenticated: boolean;
  isLoading: boolean;
}

