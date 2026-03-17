import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

export const useWithdrawalNotifications = () => {
  const { userInfo } = useSimpleAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userInfo?.id) return;

    const q = query(
      collection(db, 'userNotifications'),
      where('destinatario', '==', userInfo.id),
      where('withdrawalNotification', '==', true),
      where('lida', '==', false)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      setUnreadCount(snapshot.size);
    }, () => setUnreadCount(0));

    return () => unsubscribe();
  }, [userInfo?.id]);

  return unreadCount;
};
