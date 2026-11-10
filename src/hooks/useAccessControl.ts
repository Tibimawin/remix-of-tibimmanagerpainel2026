import { useState, useEffect } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { FirebaseUserService } from '@/services/FirebaseUserService';
import { toast } from 'sonner';

interface CachedAccessState {
  hasAccess: boolean;
  expiryDate: string | null;
  checkedAt: number;
}

const ACCESS_CACHE_TTL_MS = 5 * 60 * 1000;
const accessMemoryCache = new Map<string, CachedAccessState>();

const readAccessCache = (userId?: string): CachedAccessState | null => {
  if (!userId) return null;
  const mem = accessMemoryCache.get(userId);
  if (mem && Date.now() - mem.checkedAt < ACCESS_CACHE_TTL_MS) {
    return mem;
  }
  try {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(`tibim-access-cache:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAccessState;
    if (Date.now() - parsed.checkedAt < ACCESS_CACHE_TTL_MS) {
      accessMemoryCache.set(userId, parsed);
      return parsed;
    }
  } catch {
    // noop
  }
  return null;
};

const writeAccessCache = (userId: string, state: CachedAccessState) => {
  accessMemoryCache.set(userId, state);
  try {
    sessionStorage.setItem(`tibim-access-cache:${userId}`, JSON.stringify(state));
  } catch {
    // noop
  }
};

export const useAccessControl = () => {
  const { userInfo, isAuthenticated } = useSimpleAuth();
  const initialCache = userInfo?.isDemo
    ? { hasAccess: true, expiryDate: null, checkedAt: Date.now() }
    : readAccessCache(userInfo?.id);

  const [hasAccess, setHasAccess] = useState<boolean>(initialCache ? initialCache.hasAccess : true);
  const [isChecking, setIsChecking] = useState<boolean>(() => Boolean(userInfo?.id && !userInfo?.isDemo && !initialCache));
  const [expiryDate, setExpiryDate] = useState<string | null>(initialCache?.expiryDate ?? null);

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async (forceRefresh = false) => {
      if (!userInfo?.id) {
        setHasAccess(false);
        setIsChecking(false);
        return;
      }

      if (userInfo.isDemo) {
        setHasAccess(true);
        setExpiryDate(null);
        setIsChecking(false);
        return;
      }

      const cached = !forceRefresh ? readAccessCache(userInfo.id) : null;
      if (cached) {
        setHasAccess(cached.hasAccess);
        setExpiryDate(cached.expiryDate);
        setIsChecking(false);
        return;
      }

      try {
        const hasValidAccess = await FirebaseUserService.checkUserAccess(userInfo.id);
        if (!isMounted) return;

        let nextExpiry: string | null = null;
        if (!hasValidAccess) {
          const userData = await FirebaseUserService.getUserById(userInfo.id);
          if (!isMounted) return;
          if (userData) {
            nextExpiry = userData.expiryDate;
            setExpiryDate(userData.expiryDate);

            if (!localStorage.getItem(`access-expired-${userInfo.id}`)) {
              toast.error('Seu acesso expirou. Entre em contato com o administrador para renovar.');
              localStorage.setItem(`access-expired-${userInfo.id}`, 'true');
            }
          }
          setHasAccess(false);
        } else {
          setHasAccess(true);
          localStorage.removeItem(`access-expired-${userInfo.id}`);
        }

        writeAccessCache(userInfo.id, {
          hasAccess: hasValidAccess,
          expiryDate: nextExpiry,
          checkedAt: Date.now(),
        });
      } catch {
        if (isMounted) setHasAccess(false);
      } finally {
        if (isMounted) setIsChecking(false);
      }
    };

    checkAccess(false);

    // Verificar acesso periodicamente (a cada 20 minutos)
    const interval = setInterval(() => checkAccess(true), 20 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userInfo?.id, userInfo?.isDemo]);

  return {
    hasAccess,
    isChecking,
    expiryDate,
    isExpired: isAuthenticated && !isChecking && !hasAccess,
  };
};