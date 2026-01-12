import { useState, useEffect } from 'react';
import { FirebaseUserService } from '@/services/FirebaseUserService';
import { db } from '@/config/firebase';
import { collection, doc, setDoc, getDoc, onSnapshot, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

export interface ActivityLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: string;
  details?: string;
  ip?: string;
  device?: string;
  imei?: string;
}

export const useActivityLogger = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const addLog = async (userEmail: string, action: string, details?: string) => {
    try {
      const newLog: ActivityLog = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('pt-BR'),
        userEmail,
        action,
        details,
      };

      // Salvar no Firebase
      try {
        await addDoc(collection(db, 'activity_logs'), newLog);
      } catch (firebaseError) {
        console.error('Erro ao salvar log no Firebase:', firebaseError);
      }

      // Manter localStorage como backup
      const existingLogs = JSON.parse(localStorage.getItem('activity-logs') || '[]');
      const updatedLogs = [newLog, ...existingLogs].slice(0, 1000);
      localStorage.setItem('activity-logs', JSON.stringify(updatedLogs));
      
      setLogs(updatedLogs);
    } catch (error) {
      console.error('Erro ao adicionar log:', error);
    }
  };

  const loadLogsFromUsers = async () => {
    try {
      // Carregar logs do Firebase primeiro
      try {
        const logsQuery = query(
          collection(db, 'activity_logs'),
          orderBy('timestamp', 'desc'),
          limit(1000)
        );
        const querySnapshot = await getDocs(logsQuery);
        const firebaseLogs: ActivityLog[] = [];
        
        querySnapshot.forEach((doc) => {
          firebaseLogs.push({ ...doc.data(), id: doc.id } as ActivityLog);
        });

        if (firebaseLogs.length > 0) {
          setLogs(firebaseLogs);
          // Sincronizar com localStorage
          localStorage.setItem('activity-logs', JSON.stringify(firebaseLogs));
          return;
        }
      } catch (firebaseError) {
        console.error('Erro ao carregar logs do Firebase:', firebaseError);
      }

      // Fallback para dados dos usuários e localStorage
      const users = await FirebaseUserService.getAllUsers();
      
      const allLogs: ActivityLog[] = users.map(user => ({
        id: `${user.uid}_${user.lastLogin || Date.now()}`,
        timestamp: user.lastLogin || user.createdAt,
        userEmail: user.email,
        action: user.isActive ? 'Online' : 'Última Atividade',
        details: `Total de logins: ${user.totalLogins || 0}`,
        ip: user.deviceInfo?.ip || 'N/A',
        device: user.deviceInfo?.dispositivo || 'N/A',
        imei: user.deviceInfo?.imei || 'N/A'
      }));

      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setLogs(allLogs);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      const localLogs = JSON.parse(localStorage.getItem('activity-logs') || '[]');
      setLogs(localLogs);
    }
  };

  const clearLogs = () => {
    localStorage.removeItem('activity-logs');
    setLogs([]);
  };

  useEffect(() => {
    loadLogsFromUsers();
  }, []);

  return {
    logs,
    addLog,
    loadLogs: loadLogsFromUsers,
    clearLogs
  };
};