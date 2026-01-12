import { useState, useEffect } from 'react';
import { userActivityService } from '@/services/UserActivityService';

export interface LoginIPData {
  id: string;
  email: string;
  nome: string;
  ip: string;
  lastLogin: string;
  loginCount: number;
  device: string;
  location?: string;
  risk: 'low' | 'medium' | 'high';
}

export const useLoginIPs = () => {
  const [loginIPs, setLoginIPs] = useState<LoginIPData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uniqueIPs, setUniqueIPs] = useState<Set<string>>(new Set());

  const fetchLoginIPs = async () => {
    try {
      setIsLoading(true);
      const users = await userActivityService.getUsersWithActivity();
      
      const ipData: LoginIPData[] = users
        .filter(user => user.IP_Ultimo_Acesso && user.IP_Ultimo_Acesso !== '0.0.0.0')
        .map(user => {
          // Determinar nível de risco baseado em padrões
          let risk: 'low' | 'medium' | 'high' = 'low';
          
          if (user.IP_Ultimo_Acesso?.includes('192.168.') || 
              user.IP_Ultimo_Acesso?.includes('10.') || 
              user.IP_Ultimo_Acesso?.includes('172.')) {
            risk = 'low'; // IP local
          } else if (user.Total_Logins < 3) {
            risk = 'high'; // Poucos logins
          } else if (user.Total_Logins < 10) {
            risk = 'medium'; // Logins moderados
          }

          return {
            id: user.id,
            email: user.Email || 'N/A',
            nome: user.Nome || 'N/A',
            ip: user.IP_Ultimo_Acesso || 'N/A',
            lastLogin: user.Ultimo_Login || 'N/A',
            loginCount: Number(user.Total_Logins) || 0,
            device: user.Dispositivo_Ultimo_Acesso || 'N/A',
            location: getLocationFromIP(user.IP_Ultimo_Acesso),
            risk
          };
        })
        .sort((a, b) => new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime());

      setLoginIPs(ipData);
      
      // Contar IPs únicos
      const ips = new Set(ipData.map(item => item.ip));
      setUniqueIPs(ips);
      
    } catch (error) {
      console.error('Erro ao buscar dados de IPs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocationFromIP = (ip: string): string => {
    // Lógica básica para identificar tipo de IP
    if (!ip || ip === '0.0.0.0') return 'Desconhecido';
    
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return 'Rede Local';
    }
    
    // Alguns IPs conhecidos para demonstração
    const knownIPs: { [key: string]: string } = {
      '8.8.8.8': 'Google DNS - Estados Unidos',
      '1.1.1.1': 'Cloudflare - Estados Unidos',
    };
    
    return knownIPs[ip] || `Externo (${ip.split('.')[0]}.${ip.split('.')[1]}.x.x)`;
  };

  const refreshIPs = () => {
    fetchLoginIPs();
  };

  const getIPsByRisk = (risk: 'low' | 'medium' | 'high') => {
    return loginIPs.filter(item => item.risk === risk);
  };

  const getMostActiveIPs = () => {
    const ipCounts = new Map<string, { count: number, users: string[] }>();
    
    loginIPs.forEach(item => {
      if (ipCounts.has(item.ip)) {
        const existing = ipCounts.get(item.ip)!;
        existing.count += item.loginCount;
        existing.users.push(item.email);
      } else {
        ipCounts.set(item.ip, { count: item.loginCount, users: [item.email] });
      }
    });

    return Array.from(ipCounts.entries())
      .map(([ip, data]) => ({
        ip,
        totalLogins: data.count,
        userCount: data.users.length,
        users: data.users
      }))
      .sort((a, b) => b.totalLogins - a.totalLogins)
      .slice(0, 10);
  };

  useEffect(() => {
    fetchLoginIPs();
  }, []);

  return {
    loginIPs,
    isLoading,
    uniqueIPs: uniqueIPs.size,
    refreshIPs,
    getIPsByRisk,
    getMostActiveIPs
  };
};