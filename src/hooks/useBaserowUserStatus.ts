import { useState, useEffect, useCallback } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useTypeMode } from '@/contexts/TypeModeContext';
import { useBaserowService } from '@/services/BaserowService';
import { getValueByPossibleKeys } from '@/utils/baserowHelpers';

export interface BaserowUserStatus {
  found: boolean;
  name: string;
  email: string;
  totalDays: number;
  daysRemaining: number;
  paymentDate: string | null;
  expiryDate: string | null;
  status: 'active' | 'warning' | 'expired' | 'unconfigured';
  logins: number;
  percentage: number;
  rawRecord?: any;
}

export const useBaserowUserStatus = () => {
  const { config, isConfigured } = useConfig();
  const { userInfo } = useSimpleAuth();
  const { mode } = useTypeMode();
  const baserowService = useBaserowService();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baserowStatus, setBaserowStatus] = useState<BaserowUserStatus | null>(null);

  const fetchBaserowStatus = useCallback(async () => {
    if (!userInfo?.email) {
      setLoading(false);
      return;
    }

    // Dias e duração do plano ativo
    const planTotalDays = (userInfo as any)?.accessDays || (userInfo.diasRestantes > 0 ? Math.max(30, userInfo.diasRestantes) : 30);
    
    // Cálculo seguro dos dias restantes a partir de expiryDate ou diasRestantes
    let calculatedDaysRemaining = userInfo.diasRestantes !== undefined ? userInfo.diasRestantes : 0;
    const expiryStr = (userInfo as any)?.expiryDate;
    if (expiryStr) {
      const expDate = new Date(expiryStr);
      if (!isNaN(expDate.getTime())) {
        const diff = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        calculatedDaysRemaining = Math.max(0, diff);
      }
    }

    const planDaysRemaining = calculatedDaysRemaining;
    const planPercentage = planTotalDays > 0 ? Math.min(100, Math.max(0, Math.round((planDaysRemaining / planTotalDays) * 100))) : 0;
    const planStatus = planDaysRemaining <= 0 ? 'expired' : planDaysRemaining <= 5 ? 'warning' : 'active';

    if (!isConfigured || !config.tableIds?.usuarios) {
      setBaserowStatus({
        found: false,
        name: userInfo.email.split('@')[0],
        email: userInfo.email,
        totalDays: planTotalDays,
        daysRemaining: planDaysRemaining,
        paymentDate: null,
        expiryDate: null,
        status: planStatus,
        logins: userInfo.totalLogins || 0,
        percentage: planPercentage,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tableId = config.tableIds.usuarios;
      // Buscar pelo email do usuário logado
      const searchResult = await baserowService.getAllTableData(tableId, userInfo.email, 1);
      
      const rows = searchResult?.results || searchResult || [];
      const userRow = Array.isArray(rows) 
        ? rows.find((r: any) => {
            const rowEmail = getValueByPossibleKeys(r, ['Email', 'email', 'E-mail', 'mail']) || '';
            return String(rowEmail).trim().toLowerCase() === userInfo.email.trim().toLowerCase();
          }) || rows[0]
        : null;

      if (userRow) {
        const name = getValueByPossibleKeys(userRow, ['Nome', 'nome', 'Name', 'Usuario', 'usuario']) || userInfo.email.split('@')[0];
        const email = getValueByPossibleKeys(userRow, ['Email', 'email', 'E-mail']) || userInfo.email;
        const totalDiasRaw = getValueByPossibleKeys(userRow, ['Total de Dias', 'Dias', 'dias', 'TotalDias', 'total_dias', 'accessDays']);
        const totalDays = Number(totalDiasRaw) > 0 ? Number(totalDiasRaw) : planTotalDays;
        
        const paymentDateRaw = getValueByPossibleKeys(userRow, ['Data Pagamento', 'Pagamento', 'pagamento', 'DataCriacao', 'data_pagamento', 'startDate']);
        const restamRaw = getValueByPossibleKeys(userRow, ['Dias Restantes', 'Restam', 'restam', 'dias_restantes', 'Vencimento', 'vencimento']);
        const loginsRaw = getValueByPossibleKeys(userRow, ['Logins', 'logins', 'totalLogins']);
        
        let daysRemaining = planDaysRemaining;
        let expiryDate: string | null = null;

        if (mode === 'tibim' && restamRaw && typeof restamRaw === 'string' && restamRaw.includes('-')) {
          expiryDate = restamRaw;
          const exp = new Date(restamRaw);
          if (!isNaN(exp.getTime())) {
            const diff = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            daysRemaining = Math.max(0, diff);
          }
        } else if (typeof restamRaw === 'number' || (typeof restamRaw === 'string' && !isNaN(Number(restamRaw)))) {
          daysRemaining = Math.max(0, Number(restamRaw));
        } else if (paymentDateRaw) {
          const pDate = new Date(paymentDateRaw);
          if (!isNaN(pDate.getTime())) {
            const diffDays = Math.floor((Date.now() - pDate.getTime()) / (1000 * 60 * 60 * 24));
            daysRemaining = Math.max(0, totalDays - diffDays);
            
            const exp = new Date(pDate.getTime() + (Number(totalDays) || 30) * 24 * 60 * 60 * 1000);
            expiryDate = exp.toISOString();
          }
        } else {
          // Mantém 100% em sincronia com o plano ativo
          daysRemaining = planDaysRemaining;
        }

        const percentage = totalDays > 0 ? Math.min(100, Math.max(0, Math.round((daysRemaining / totalDays) * 100))) : 0;
        const status = daysRemaining <= 0 ? 'expired' : daysRemaining <= 5 ? 'warning' : 'active';

        setBaserowStatus({
          found: true,
          name: String(name),
          email: String(email),
          totalDays,
          daysRemaining,
          paymentDate: paymentDateRaw ? String(paymentDateRaw) : null,
          expiryDate,
          status,
          logins: Number(loginsRaw) || 0,
          percentage,
          rawRecord: userRow,
        });
      } else {
        // Usuário não encontrado na tabela do Baserow, o Baserow herda diretamente os dias do plano ativo
        setBaserowStatus({
          found: false,
          name: userInfo.email.split('@')[0],
          email: userInfo.email,
          totalDays: planTotalDays,
          daysRemaining: planDaysRemaining,
          paymentDate: null,
          expiryDate: null,
          status: planStatus,
          logins: userInfo.totalLogins || 0,
          percentage: planPercentage,
        });
      }
    } catch (err: any) {
      console.warn('Erro ao buscar status do usuário no Baserow:', err);
      setError(err?.message || 'Erro ao carregar dados do Baserow');
      
      setBaserowStatus({
        found: false,
        name: userInfo.email.split('@')[0],
        email: userInfo.email,
        totalDays: planTotalDays,
        daysRemaining: planDaysRemaining,
        paymentDate: null,
        expiryDate: null,
        status: planStatus,
        logins: userInfo.totalLogins || 0,
        percentage: planPercentage,
      });
    } finally {
      setLoading(false);
    }
  }, [userInfo, isConfigured, config.tableIds, baserowService, mode]);

  useEffect(() => {
    fetchBaserowStatus();
  }, [fetchBaserowStatus]);

  return {
    baserowStatus,
    loading,
    error,
    refetch: fetchBaserowStatus,
  };
};
