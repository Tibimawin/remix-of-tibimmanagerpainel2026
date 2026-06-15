import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

/**
 * Subscribes to Firestore `userNotifications` in real time and returns
 * the unread count for the current user (matches destinatario === 'todos'
 * or emailDestinatario === current user email).
 */
export function useUnreadNotifications(): number {
  const { userInfo } = useSimpleAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userInfo?.email) {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'userNotifications'),
      orderBy('dataRecebimento', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        let unread = 0;
        snap.forEach((doc) => {
          const data = doc.data() as any;
          const isForUser =
            data.destinatario === 'todos' ||
            data.emailDestinatario === userInfo.email;
          if (isForUser && !data.lida) unread += 1;
        });
        setUnreadCount(unread);
      },
      (err) => {
        console.error('Erro ao escutar notificações:', err);
      }
    );

    return () => unsubscribe();
  }, [userInfo?.email]);

  return unreadCount;
}
