interface LogData {
  [key: string]: any;
}

// Função para mascarar dados sensíveis
const maskSensitiveData = (data: any): any => {
  if (!data) return data;
  
  const sensitiveKeys = [
    'apiToken', 'token', 'password', 'secret', 'key', 'authorization',
    'baseUrl', 'sourceBaseUrl', 'sourceToken', 'userId'
  ];
  
  if (typeof data === 'string') {
    // Mascarar tokens e URLs
    if (data.length > 10) {
      return `${data.substring(0, 4)}${'*'.repeat(data.length - 8)}${data.substring(data.length - 4)}`;
    }
    return '*'.repeat(data.length);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const masked: any = {};
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
        masked[key] = typeof value === 'string' && value.length > 0 ? '[MASKED]' : value;
      } else if (key === 'tableIds' && typeof value === 'object') {
        // Mascarar IDs de tabelas
        masked[key] = Object.keys(value).reduce((acc, k) => {
          acc[k] = '[TABLE_ID_MASKED]';
          return acc;
        }, {} as any);
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }
  
  return data;
};

export const logger = {
  info: (message: string, data?: LogData) => {
    if (process.env.NODE_ENV === 'development') {
      const maskedData = data ? maskSensitiveData(data) : undefined;
      console.log(`[INFO] ${message}`, maskedData || '');
    }
  },

  warn: (message: string, data?: LogData) => {
    if (process.env.NODE_ENV === 'development') {
      const maskedData = data ? maskSensitiveData(data) : undefined;
      console.warn(`[WARN] ${message}`, maskedData || '');
    }
  },

  error: (message: string, error?: any) => {
    if (process.env.NODE_ENV === 'development') {
      // Para erros, só mostrar a mensagem, não dados sensíveis
      const safeError = error?.message || error;
      console.error(`[ERROR] ${message}`, safeError || '');
    }
  },

  debug: (message: string, data?: LogData) => {
    if (process.env.NODE_ENV === 'development') {
      const maskedData = data ? maskSensitiveData(data) : undefined;
      console.debug(`[DEBUG] ${message}`, maskedData || '');
    }
  },

  // Método específico para dados de desenvolvimento (nunca em produção)
  devOnly: (message: string, data?: LogData) => {
    if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
      console.log(`[DEV-ONLY] ${message}`, data || '');
    }
  }
};

// Função para sanitizar dados sensíveis (mantida para compatibilidade)
export const sanitizeForLog = (data: any) => {
  return maskSensitiveData(data);
};