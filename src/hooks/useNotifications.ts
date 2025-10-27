import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from './redux';
import { NotificationService } from '@/services/notificationService';
import { 
  Notification, 
  CreateNotificationData, 
  NotificationStats,
  NotificationPreferences 
} from '@/types/notification';

export const useNotifications = () => {
  const user = useAppSelector(state => state.auth.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    byType: {} as any
  });
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{
    markAll: boolean;
    deleteRead: boolean;
    deleteAll: boolean;
    perItem: Record<string, boolean>;
  }>({ markAll: false, deleteRead: false, deleteAll: false, perItem: {} });

  // Carregar notificações iniciais
  const loadNotifications = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);

      const [notificationsData, statsData, preferencesData] = await Promise.all([
        NotificationService.getNotifications(user.uid, 50),
        NotificationService.getNotificationStats(user.uid),
        NotificationService.getNotificationPreferences(user.uid)
      ]);

      setNotifications(notificationsData);
      setStats(statsData);
      setPreferences(preferencesData);
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
      setError('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Escutar notificações em tempo real
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = NotificationService.subscribeToNotifications(
      user.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        
        // Atualizar estatísticas
        const unread = newNotifications.filter(n => !n.read).length;
        setStats(prev => ({
          ...prev,
          total: newNotifications.length,
          unread
        }));
      },
      50 // alinhar com o carregamento inicial
    );

    return unsubscribe;
  }, [user?.uid]);

  // Carregar dados iniciais
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Marcar como visualizada
  const markAsViewed = useCallback(async (notificationId: string) => {
    try {
      await NotificationService.markAsViewed(notificationId, user.uid);
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, viewedAt: new Date(), updatedAt: new Date() }
            : n
        )
      );
    } catch (err) {
      console.error('Erro ao marcar como visualizada:', err);
      // Não definir erro aqui pois é uma ação silenciosa
    }
  }, []);

  // Marcar como lida
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      setActionLoading(prev => ({
        ...prev,
        perItem: { ...prev.perItem, [notificationId]: true }
      }));
      await NotificationService.markAsRead(notificationId, user.uid);
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read: true, readAt: new Date(), updatedAt: new Date() }
            : n
        )
      );

      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1)
      }));
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
      setError('Erro ao marcar notificação como lida');
    } finally {
      setActionLoading(prev => ({
        ...prev,
        perItem: { ...prev.perItem, [notificationId]: false }
      }));
    }
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setActionLoading(prev => ({ ...prev, markAll: true }));
      await NotificationService.markAllAsRead(user.uid);
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, updatedAt: new Date() }))
      );

      setStats(prev => ({
        ...prev,
        unread: 0
      }));
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
      setError('Erro ao marcar todas as notificações como lidas');
    } finally {
      setActionLoading(prev => ({ ...prev, markAll: false }));
    }
  }, [user?.uid]);

  // Deletar notificação
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      setActionLoading(prev => ({
        ...prev,
        perItem: { ...prev.perItem, [notificationId]: true }
      }));
      await NotificationService.deleteNotification(notificationId, user.uid);
      
      const deletedNotification = notifications.find(n => n.id === notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      setStats(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        unread: deletedNotification && !deletedNotification.read 
          ? Math.max(0, prev.unread - 1) 
          : prev.unread
      }));
    } catch (err) {
      console.error('Erro ao deletar notificação:', err);
      setError('Erro ao deletar notificação');
    } finally {
      setActionLoading(prev => ({
        ...prev,
        perItem: { ...prev.perItem, [notificationId]: false }
      }));
    }
  }, [notifications]);

  // Deletar notificações lidas
  const deleteReadNotifications = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setActionLoading(prev => ({ ...prev, deleteRead: true }));
      await NotificationService.deleteReadNotifications(user.uid);
      
      const readCount = notifications.filter(n => n.read).length;
      
      setNotifications(prev => prev.filter(n => !n.read));
      
      setStats(prev => ({
        ...prev,
        total: Math.max(0, prev.total - readCount)
      }));
    } catch (err) {
      console.error('Erro ao deletar notificações lidas:', err);
      setError('Erro ao deletar notificações lidas');
    } finally {
      setActionLoading(prev => ({ ...prev, deleteRead: false }));
    }
  }, [user?.uid, notifications]);

  // Deletar todas as notificações
  const deleteAllNotifications = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setActionLoading(prev => ({ ...prev, deleteAll: true }));
      await NotificationService.deleteAllNotifications(user.uid);
      
      setNotifications([]);
      setStats({
        total: 0,
        unread: 0,
        byType: {} as any
      });
    } catch (err) {
      console.error('Erro ao deletar todas as notificações:', err);
      setError('Erro ao deletar todas as notificações');
    } finally {
      setActionLoading(prev => ({ ...prev, deleteAll: false }));
    }
  }, [user?.uid]);

  // Criar notificação (para testes)
  const createNotification = useCallback(async (data: Omit<CreateNotificationData, 'userId'>) => {
    if (!user?.uid) return;

    try {
      await NotificationService.createNotification({
        ...data,
        userId: user.uid
      });
    } catch (err) {
      console.error('Erro ao criar notificação:', err);
      setError('Erro ao criar notificação');
    }
  }, [user?.uid]);

  // Atualizar preferências
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user?.uid) return;

    try {
      await NotificationService.updateNotificationPreferences({
        ...newPreferences,
        userId: user.uid
      });

      setPreferences(prev => prev ? { ...prev, ...newPreferences } : null);
    } catch (err) {
      console.error('Erro ao atualizar preferências:', err);
      setError('Erro ao atualizar preferências');
    }
  }, [user?.uid]);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Obter notificações não lidas
  const unreadNotifications = notifications.filter(n => !n.read);

  // Obter notificações por tipo
  const getNotificationsByType = useCallback((type: string) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  return {
    notifications,
    unreadNotifications,
    stats,
    preferences,
    loading,
    error,
    actionLoading,
    markAsViewed,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    deleteAllNotifications,
    createNotification,
    updatePreferences,
    clearError,
    getNotificationsByType,
    refresh: loadNotifications
  };
};