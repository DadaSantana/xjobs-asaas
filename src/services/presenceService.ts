
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { UserPresence, PresenceStatus } from '@/types/user';

export class PresenceService {
  private static activityTimeout: NodeJS.Timeout | null = null;
  private static isActive = true;

  static async setUserOnline(uid: string): Promise<void> {
    try {
      console.log('Marcando usuário como online:', uid);
      
      const userRef = doc(db, 'users', uid);
      
      await updateDoc(userRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('Usuário marcado como online');
    } catch (error) {
      console.error('Erro ao marcar usuário como online:', error);
    }
  }

  static async setUserOffline(uid: string): Promise<void> {
    try {
      console.log('Marcando usuário como offline:', uid);
      
      const userRef = doc(db, 'users', uid);
      
      await updateDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('Usuário marcado como offline');
    } catch (error) {
      console.error('Erro ao marcar usuário como offline:', error);
    }
  }

  static async setUserAway(uid: string): Promise<void> {
    try {
      console.log('Marcando usuário como ausente:', uid);
      
      const userRef = doc(db, 'users', uid);
      
      await updateDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('Usuário marcado como ausente');
    } catch (error) {
      console.error('Erro ao marcar usuário como ausente:', error);
    }
  }

  static subscribeToUserPresence(uid: string, callback: (presence: UserPresence | null) => void): () => void {
    console.log('Inscrevendo-se para presença do usuário:', uid);
    
    const userRef = doc(db, 'users', uid);
    
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        const presence: UserPresence = {
          uid: userData.uid,
          isOnline: userData.isOnline || false,
          lastSeen: userData.lastSeen,
          status: userData.isOnline ? 'online' : 'offline',
          connectionId: '', // Simplified for now
        };
        callback(presence);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Erro ao monitorar presença:', error);
      callback(null);
    });

    return unsubscribe;
  }

  static setupActivityListeners(): void {
    console.log('Configurando listeners de atividade');
    
    // Detectar atividade do usuário
    const resetActivityTimer = () => {
      if (this.activityTimeout) {
        clearTimeout(this.activityTimeout);
      }
      
      this.isActive = true;
      
      // Marcar como "away" após 5 minutos de inatividade
      this.activityTimeout = setTimeout(() => {
        this.isActive = false;
        const user = auth.currentUser;
        if (user) {
          this.setUserAway(user.uid);
        }
      }, 5 * 60 * 1000); // 5 minutos
    };

    // Eventos que indicam atividade
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetActivityTimer, true);
    });

    // Configurar timer inicial
    resetActivityTimer();

    // Detectar quando a aba fica inativa
    document.addEventListener('visibilitychange', () => {
      const user = auth.currentUser;
      if (!user) return;

      if (document.hidden) {
        this.setUserAway(user.uid);
      } else if (this.isActive) {
        this.setUserOnline(user.uid);
      }
    });
  }

  static setupDisconnectListeners(uid: string): void {
    console.log('Configurando listeners de desconexão para:', uid);
    
    // Listener para quando a página é fechada
    window.addEventListener('beforeunload', () => {
      this.setUserOffline(uid);
    });

    // Cleanup quando component é desmontado
    window.addEventListener('unload', () => {
      this.setUserOffline(uid);
    });
  }
}
