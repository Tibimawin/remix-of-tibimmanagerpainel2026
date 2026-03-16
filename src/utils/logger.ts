interface LogData {
  [key: string]: any;
}

const isDevelopment = import.meta.env.DEV;
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

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
    if (isDevelopment) {
      const maskedData = data ? maskSensitiveData(data) : undefined;
      console.log(`[INFO] ${message}`, maskedData || '');
    }
  },

  warn: (message: string, data?: LogData) => {
    if (isDevelopment) {
      const maskedData = data ? maskSensitiveData(data) : undefined;
      console.warn(`[WARN] ${message}`, maskedData || '');
    }
  },

  error: (message: string, error?: any) => {
    if (isDevelopment) {
      const safeError = error?.message || error;
      console.error(`[ERROR] ${message}`, safeError || '');
    }
  },

  debug: (message: string, data?: LogData) => {
    if (isDevelopment) {
      const maskedData = data ? maskSensitiveData(data) : undefined;
      console.debug(`[DEBUG] ${message}`, maskedData || '');
    }
  },

  devOnly: (message: string, data?: LogData) => {
    if (isDevelopment && isLocalhost) {
      console.log(`[DEV-ONLY] ${message}`, data || '');
    }
  }
};

export const sanitizeForLog = (data: any) => {
  return maskSensitiveData(data);
};