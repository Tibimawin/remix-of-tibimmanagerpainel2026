import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { BaserowService } from '@/services/BaserowService';

const FETCH_LIMIT = 20;
const MAX_STORED_IDS = 200;

export interface NewContentItem {
  id: string;
  title: string;
  type: string;
  category: string;
  cover: string;
  year: string;
  raw: Record<string, any>;
}

const getStorageKeys = (userId: string, tableId: string) => ({
  seen: `new-content-seen:${userId}:${tableId}`,
  popup: `new-content-popup-dismissed:${userId}:${tableId}`,
});

const safeReadArray = (key: string): string[] => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return [];

    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const safeWriteArray = (key: string, values: string[]) => {
  try {
    const unique = Array.from(new Set(values.map(String)));
    localStorage.setItem(key, JSON.stringify(unique.slice(-MAX_STORED_IDS)));
  } catch {
    // noop
  }
};

const getContentTitle = (item: Record<string, any>) => {
  return item.Nome || item.Titulo || item.Title || item.nome || item.titulo || item.title || 'Sem título';
};

const getContentType = (item: Record<string, any>) => {
  return item.Tipo || item.type || item.Type || 'Conteúdo';
};

const getContentCategory = (item: Record<string, any>) => {
  return item.Categoria || item.Category || item.Genero || item.Gênero || '';
};

const getContentCover = (item: Record<string, any>) => {
  return item.Capa || item.cover || item.Poster || item.poster || '';
};

const getContentYear = (item: Record<string, any>) => {
  return String(item.Ano || item.Year || item.year || '').trim();
};

const normalizeContentItem = (item: Record<string, any>): NewContentItem => ({
  id: String(item.id),
  title: getContentTitle(item),
  type: getContentType(item),
  category: getContentCategory(item),
  cover: getContentCover(item),
  year: getContentYear(item),
  raw: item,
});

export const useNewContentNotifications = () => {
  const { userInfo, isLoading: authLoading } = useSimpleAuth();
  const { config, isConfigured, loading: configLoading } = useConfig();
  const [newItems, setNewItems] = useState<NewContentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const tableId = config.conteudosTableId || config.tableIds.conteudos;
  const storageKeys = useMemo(() => {
    if (!userInfo?.id || !tableId) return null;
    return getStorageKeys(userInfo.id, tableId);
  }, [tableId, userInfo?.id]);

  const batchSignature = useMemo(() => newItems.map((item) => item.id).join(','), [newItems]);
  const hasNewContent = newItems.length > 0;

  const loadNewContent = useCallback(async () => {
    if (!userInfo?.id || !isConfigured || !config.apiToken || !config.baseUrl || !tableId || authLoading || configLoading || !storageKeys) {
      setNewItems([]);
      return;
    }

    setLoading(true);

    try {
      const service = new BaserowService(config.apiToken, config.baseUrl);
      const response = await service.getAllTableData(tableId, undefined, FETCH_LIMIT);
      const recentItems = (response?.results || [])
        .filter((item: Record<string, any>) => item?.id !== undefined && item?.id !== null)
        .map(normalizeContentItem)
        .slice(0, FETCH_LIMIT);

      const recentIds = recentItems.map((item) => item.id);
      const seenIds = safeReadArray(storageKeys.seen);

      if (seenIds.length === 0) {
        safeWriteArray(storageKeys.seen, recentIds);
        setNewItems([]);
        return;
      }

      const unseenItems = recentItems.filter((item) => !seenIds.includes(item.id));
      setNewItems(unseenItems);
    } catch (error) {
      console.error('Erro ao carregar novidades de conteúdo:', error);
      setNewItems([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, config.apiToken, config.baseUrl, configLoading, isConfigured, storageKeys, tableId, userInfo?.id]);

  useEffect(() => {
    void loadNewContent();
  }, [loadNewContent]);

  const markAllAsSeen = useCallback(() => {
    if (!storageKeys || !newItems.length) return;

    const seenIds = safeReadArray(storageKeys.seen);
    safeWriteArray(storageKeys.seen, [...seenIds, ...newItems.map((item) => item.id)]);

    try {
      localStorage.setItem(storageKeys.popup, batchSignature);
    } catch {
      // noop
    }

    setNewItems([]);
  }, [batchSignature, newItems, storageKeys]);

  const dismissPopup = useCallback(() => {
    if (!storageKeys || !batchSignature) return;

    try {
      localStorage.setItem(storageKeys.popup, batchSignature);
    } catch {
      // noop
    }
  }, [batchSignature, storageKeys]);

  const shouldShowPopup = useMemo(() => {
    if (!storageKeys || !batchSignature || !hasNewContent) return false;

    try {
      return localStorage.getItem(storageKeys.popup) !== batchSignature;
    } catch {
      return false;
    }
  }, [batchSignature, hasNewContent, storageKeys]);

  return {
    newItems,
    newCount: newItems.length,
    hasNewContent,
    shouldShowPopup,
    loading,
    markAllAsSeen,
    dismissPopup,
    refresh: loadNewContent,
  };
};
