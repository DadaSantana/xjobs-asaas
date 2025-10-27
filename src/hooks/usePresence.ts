import { useState, useEffect, useRef, useMemo } from 'react';
import { doc, setDoc, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppSelector } from './redux';

interface UserPresence {
  isOnline: boolean;
  lastSeen: any;
  userId: string;
}

interface PresenceState {
  [userId: string]: boolean;
}

export const usePresence = (userIds: string[] = []) => {
  const [presence, setPresence] = useState<PresenceState>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const unsubscribesRef = useRef<(() => void)[]>([]);
  const heartbeatRef = useRef<NodeJS.Timeout>();
  
  // Memoizar os userIds para evitar re-renders desnecessários
  const memoizedUserIds = useMemo(() => userIds, [userIds.join(',')]);

  // Atualiza presença do usuário atual
  const updateMyPresence = async (isOnline: boolean) => {
    if (!userProfile?.uid) return;

    try {
      const presenceRef = doc(db, 'presence', userProfile.uid);
      
      if (isOnline) {
        await setDoc(presenceRef, {
          isOnline: true,
          lastSeen: serverTimestamp(),
          userId: userProfile.uid,
          name: userProfile.name,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await deleteDoc(presenceRef);
      }
    } catch (error) {
      console.error('Erro ao atualizar presença:', error);
    }
  };

  // Configurar heartbeat para manter presença ativa
  const setupHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(() => {
      updateMyPresence(true);
    }, 30000); // Atualiza a cada 30 segundos
  };

  // Monitorar presença de usuários específicos
  useEffect(() => {
    if (memoizedUserIds.length === 0) {
      setIsInitialized(true);
      return;
    }

    // Limpar listeners anteriores
    unsubscribesRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribesRef.current = [];

    // Criar listeners para cada usuário
    const newUnsubscribes = memoizedUserIds.map(userId => {
      const presenceRef = doc(db, 'presence', userId);
      
      return onSnapshot(presenceRef, (doc) => {
        const data = doc.data() as UserPresence | undefined;
        
        setPresence(prev => ({
          ...prev,
          [userId]: data?.isOnline || false
        }));
      }, (error) => {
        console.error(`Erro ao monitorar presença de ${userId}:`, error);
        setPresence(prev => ({
          ...prev,
          [userId]: false
        }));
      });
    });

    unsubscribesRef.current = newUnsubscribes;
    setIsInitialized(true);

    return () => {
      newUnsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [memoizedUserIds]);

  // Gerenciar presença do usuário atual
  useEffect(() => {
    if (!userProfile?.uid) return;

    // Marcar como online quando componente monta
    updateMyPresence(true);
    setupHeartbeat();

    // Configurar listeners de eventos da página
    const handleBeforeUnload = () => {
      updateMyPresence(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateMyPresence(true);
        setupHeartbeat();
      } else {
        updateMyPresence(false);
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
        }
      }
    };

    const handleOnline = () => {
      updateMyPresence(true);
      setupHeartbeat();
    };

    const handleOffline = () => {
      updateMyPresence(false);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };

    // Adicionar event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      // Cleanup
      updateMyPresence(false);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      unsubscribesRef.current.forEach(unsubscribe => unsubscribe());
    };
  }, [userProfile?.uid]);

  const isUserOnline = (userId: string): boolean => {
    return presence[userId] || false;
  };

  const getOnlineUsers = (): string[] => {
    return Object.entries(presence)
      .filter(([_, isOnline]) => isOnline)
      .map(([userId, _]) => userId);
  };

  const getOnlineCount = (): number => {
    return getOnlineUsers().length;
  };

  return {
    presence,
    isUserOnline,
    getOnlineUsers,
    getOnlineCount,
    isInitialized,
    updateMyPresence
  };
};
