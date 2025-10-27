import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from "../lib/firebase";
import { 
  Notification, 
  NotificationType, 
  NotificationPreferences, 
  CreateNotificationData, 
  NotificationStats 
} from "../types/notification";

export class NotificationService {
  private static readonly COLLECTION_NAME = 'notifications';
  private static readonly PREFERENCES_COLLECTION = 'notificationPreferences';

  /**
   * Criar uma nova notificação usando Firebase Function
   */
  static async createNotification(data: CreateNotificationData): Promise<string> {
    try {
      const createNotificationFn = httpsCallable(functions, 'createNotification');
      const result = await createNotificationFn(data);
      return (result.data as any).notificationId;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  }

  /**
   * Buscar notificações do usuário
   */
  static async getNotifications(
    userId: string, 
    limitCount: number = 20,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    try {
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (unreadOnly) {
        q = query(
          collection(db, this.COLLECTION_NAME),
          where('userId', '==', userId),
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        ...(doc.data().viewedAt && { viewedAt: doc.data().viewedAt.toDate() }),
        ...(doc.data().readAt && { readAt: doc.data().readAt.toDate() }),
        ...(doc.data().expiresAt && { expiresAt: doc.data().expiresAt.toDate() })
      })) as Notification[];
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      throw error;
    }
  }

  /**
   * Marcar notificação como visualizada diretamente no Firestore
   */
  static async markAsViewed(notificationId: string, userId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.COLLECTION_NAME, notificationId);
      
      await updateDoc(notificationRef, {
        viewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Erro ao marcar notificação como visualizada:', error);
      throw error;
    }
  }

  /**
   * Marcar notificação como lida diretamente no Firestore
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.COLLECTION_NAME, notificationId);
      
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  }

  /**
   * Marcar todas as notificações como lidas diretamente no Firestore
   */
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      // Buscar todas as notificações não lidas do usuário
      const unreadQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(unreadQuery);
      
      if (snapshot.empty) {
        return 0;
      }

      // Usar batch para atualizar todas as notificações de uma vez
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          read: true,
          readAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();

      console.log(`${snapshot.size} notificações marcadas como lidas para o usuário ${userId}`);
      return snapshot.size;

    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      throw error;
    }
  }

  /**
   * Deletar notificação diretamente no Firestore
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.COLLECTION_NAME, notificationId);
      await deleteDoc(notificationRef);
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      throw error;
    }
  }

  /**
   * Deletar notificações lidas diretamente no Firestore
   */
  static async deleteReadNotifications(userId: string): Promise<number> {
    try {
      // Buscar todas as notificações lidas do usuário
      const readQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('read', '==', true)
      );

      const snapshot = await getDocs(readQuery);
      
      if (snapshot.empty) {
        return 0;
      }

      // Usar batch para deletar todas as notificações lidas de uma vez
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`${snapshot.size} notificações lidas deletadas para o usuário ${userId}`);
      return snapshot.size;

    } catch (error) {
      console.error('Erro ao deletar notificações lidas:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas das notificações
   */
  static async getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => doc.data());

      const stats: NotificationStats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        byType: {} as Record<NotificationType, number>
      };

      // Contar por tipo
      notifications.forEach(notification => {
        const type = notification.type as NotificationType;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Escutar notificações em tempo real
   */
  static subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void,
    limitCount: number = 20
  ): () => void {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        ...(doc.data().viewedAt && { viewedAt: doc.data().viewedAt.toDate() }),
        ...(doc.data().readAt && { readAt: doc.data().readAt.toDate() }),
        ...(doc.data().expiresAt && { expiresAt: doc.data().expiresAt.toDate() })
      })) as Notification[];

      callback(notifications);
    });
  }

  /**
   * Obter preferências de notificação do usuário
   */
  static async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const q = query(
        collection(db, this.PREFERENCES_COLLECTION),
        where('userId', '==', userId),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as NotificationPreferences;
    } catch (error) {
      console.error('Erro ao buscar preferências:', error);
      throw error;
    }
  }

  /**
   * Atualizar preferências de notificação
   */
  static async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      if (!preferences.userId) {
        throw new Error('userId é obrigatório');
      }

      const q = query(
        collection(db, this.PREFERENCES_COLLECTION),
        where('userId', '==', preferences.userId),
        limit(1)
      );

      const snapshot = await getDocs(q);
      const updateData = {
        ...preferences,
        updatedAt: serverTimestamp()
      };

      if (snapshot.empty) {
        // Criar novo documento de preferências
        await addDoc(collection(db, this.PREFERENCES_COLLECTION), {
          userId: preferences.userId,
          emailNotifications: true,
          pushNotifications: true,
          types: {
            project_proposal: true,
            proposal_accepted: true,
            proposal_rejected: true,
            project_started: true,
            project_completed: true,
            payment_received: true,
            payment_released: true,
            payment_failed: true,
            message_received: true,
            dispute_created: true,
            dispute_resolved: true,
            profile_approved: true,
            profile_rejected: true,
            system_announcement: true,
            deadline_reminder: true,
            rating_request: true
          },
          ...updateData
        });
      } else {
        // Atualizar documento existente
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, updateData);
      }
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
      throw error;
    }
  }

  /**
   * Deletar todas as notificações do usuário diretamente no Firestore
   */
  static async deleteAllNotifications(userId: string): Promise<number> {
    try {
      // Buscar todas as notificações do usuário
      const notificationsQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(notificationsQuery);
      
      if (snapshot.empty) {
        return 0;
      }

      // Usar batch para deletar todas as notificações de uma vez
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`${snapshot.size} notificações deletadas para o usuário ${userId}`);
      return snapshot.size;

    } catch (error) {
      console.error('Erro ao deletar todas as notificações:', error);
      throw error;
    }
  }

  /**
   * Limpar notificações expiradas usando Firebase Function
   */
  static async cleanupExpiredNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cleanupFn = httpsCallable(functions, 'cleanupExpiredNotifications');
      const result = await cleanupFn({ daysOld });
      return (result.data as any).deletedCount;
    } catch (error) {
      console.error('Erro ao limpar notificações expiradas:', error);
      throw error;
    }
  }
}