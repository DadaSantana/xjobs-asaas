import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ModerationRequest, ModerationAction, ModeratorStats, ModerationDashboardData } from '@/types/moderation';
import { Chat } from '@/types/chat';
import { UserProfile } from '@/types/user';
import { NotificationService } from './notificationService';

export class ModerationService {
  
  // Criar solicitação de moderação
  static async createModerationRequest(
    chatId: string,
    requestedBy: string,
    requestedByName: string,
    requestedByType: 'client' | 'freelancer',
    reason?: string
  ): Promise<string> {
    try {
      // Verificar se já existe uma solicitação pendente para este chat
      const existingRequest = await this.getPendingModerationForChat(chatId);
      if (existingRequest) {
        throw new Error('Já existe uma solicitação de moderação pendente para esta conversa.');
      }

      // Obter dados do chat
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (!chatDoc.exists()) {
        throw new Error('Chat não encontrado');
      }

      const chat = chatDoc.data() as Chat;
      
      // Determinar prioridade baseada no contexto
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
      if (chat.isDisputed) {
        priority = 'high';
      }
      if (reason?.toLowerCase().includes('urgent') || reason?.toLowerCase().includes('emergenc')) {
        priority = 'urgent';
      }

      const moderationRequest: Omit<ModerationRequest, 'id'> = {
        chatId,
        projectId: chat.projectId,
        projectTitle: chat.projectTitle,
        clientId: chat.clientId,
        clientName: chat.clientName,
        freelancerId: chat.freelancerId,
        freelancerName: chat.freelancerName,
        requestedBy,
        requestedByName,
        requestedByType,
        reason: reason || '',
        status: 'pending',
        priority,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        tags: []
      };

      const docRef = await addDoc(collection(db, 'moderationRequests'), moderationRequest);
      
      // Tentar atribuir automaticamente um moderador
      await this.autoAssignModerator(docRef.id);
      
      // Notificar a outra parte sobre a solicitação de moderação
      const otherPartyId = requestedByType === 'client' ? chat.freelancerId : chat.clientId;
      const otherPartyName = requestedByType === 'client' ? chat.freelancerName : chat.clientName;
      
      await NotificationService.createNotification({
        userId: otherPartyId,
        type: 'system_announcement',
        title: 'Solicitação de moderação',
        message: `${requestedByName} solicitou moderação para o projeto "${chat.projectTitle}". ${reason ? `Motivo: ${reason}` : ''}`,
        actionUrl: `/chat/${chatId}`,
        actionLabel: 'Ver conversa',
        data: {
          moderationRequestId: docRef.id,
          projectId: chat.projectId,
          chatId,
          requestedBy,
          requestedByName,
          requestedByType,
          reason: reason || '',
          targetRole: requestedByType === 'client' ? 'freelancer' : 'cliente'
        }
      });
      
      return docRef.id;
      
    } catch (error) {
      console.error('Erro ao criar solicitação de moderação:', error);
      throw error;
    }
  }

  // Verificar se existe solicitação pendente para um chat
  static async getPendingModerationForChat(chatId: string): Promise<ModerationRequest | null> {
    try {
      const q = query(
        collection(db, 'moderationRequests'),
        where('chatId', '==', chatId),
        where('status', 'in', ['pending', 'assigned']),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as ModerationRequest;
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar solicitação pendente:', error);
      return null;
    }
  }

  // Atribuir moderador automaticamente
  static async autoAssignModerator(requestId: string): Promise<boolean> {
    try {
      // Buscar moderadores disponíveis (com menos carga de trabalho)
      const availableModerator = await this.findAvailableModerator();
      
      if (availableModerator) {
        await this.assignModerator(requestId, availableModerator.uid, availableModerator.name);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro na atribuição automática:', error);
      return false;
    }
  }

  // Encontrar moderador disponível
  static async findAvailableModerator(): Promise<UserProfile | null> {
    try {
      // Buscar todos os moderadores
      const moderatorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'moderator')
      );

      const moderatorsSnapshot = await getDocs(moderatorsQuery);
      const moderators: UserProfile[] = [];
      
      moderatorsSnapshot.forEach((doc) => {
        moderators.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });

      if (moderators.length === 0) {
        return null;
      }

      // Buscar estatísticas dos moderadores para encontrar o menos ocupado
      const moderatorStats = await Promise.all(
        moderators.map(async (moderator) => {
          const stats = await this.getModeratorStats(moderator.uid);
          return {
            moderator,
            currentActive: stats.currentActive
          };
        })
      );

      // Ordenar por menor carga de trabalho
      moderatorStats.sort((a, b) => a.currentActive - b.currentActive);
      
      return moderatorStats[0].moderator;
      
    } catch (error) {
      console.error('Erro ao encontrar moderador disponível:', error);
      return null;
    }
  }

  // Atribuir moderador manualmente
  static async assignModerator(requestId: string, moderatorId: string, moderatorName: string): Promise<void> {
    try {
      const requestRef = doc(db, 'moderationRequests', requestId);
      
      await updateDoc(requestRef, {
        status: 'assigned',
        moderatorId,
        moderatorName,
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Registrar ação
      await this.logModerationAction(requestId, moderatorId, moderatorName, 'assign', `Moderador atribuído: ${moderatorName}`);
      
      // Atualizar chat com moderador
      const requestDoc = await getDoc(requestRef);
      if (requestDoc.exists()) {
        const request = requestDoc.data() as ModerationRequest;
        const chatRef = doc(db, 'chats', request.chatId);
        await updateDoc(chatRef, {
          moderatorId,
          updatedAt: serverTimestamp()
        });
      }

    } catch (error) {
      console.error('Erro ao atribuir moderador:', error);
      throw error;
    }
  }

  // Resolver solicitação de moderação
  static async resolveModerationRequest(requestId: string, moderatorId: string, moderatorName: string, resolution: string): Promise<void> {
    try {
      const requestRef = doc(db, 'moderationRequests', requestId);
      
      // Buscar dados da solicitação antes de atualizar
      const requestDoc = await getDoc(requestRef);
      if (!requestDoc.exists()) {
        throw new Error('Solicitação de moderação não encontrada');
      }
      
      const request = requestDoc.data() as ModerationRequest;
      
      await updateDoc(requestRef, {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        notes: resolution,
        updatedAt: serverTimestamp()
      });

      // Registrar ação
      await this.logModerationAction(requestId, moderatorId, moderatorName, 'resolve', resolution);
      
      // Notificar ambas as partes sobre a resolução
      const notificationPromises = [
        NotificationService.createNotification({
          userId: request.clientId,
          type: 'system_announcement',
          title: 'Moderação resolvida',
          message: `A solicitação de moderação para o projeto "${request.projectTitle}" foi resolvida por ${moderatorName}. Resolução: ${resolution}`,
          actionUrl: `/chat/${request.chatId}`,
          actionLabel: 'Ver conversa',
          data: {
            moderationRequestId: requestId,
            projectId: request.projectId,
            chatId: request.chatId,
            moderatorId,
            moderatorName,
            resolution,
            targetRole: 'cliente'
          }
        }),
        NotificationService.createNotification({
          userId: request.freelancerId,
          type: 'system_announcement',
          title: 'Moderação resolvida',
          message: `A solicitação de moderação para o projeto "${request.projectTitle}" foi resolvida por ${moderatorName}. Resolução: ${resolution}`,
          actionUrl: `/chat/${request.chatId}`,
          actionLabel: 'Ver conversa',
          data: {
            targetRole: 'freelancer',
            moderationRequestId: requestId,
            projectId: request.projectId,
            chatId: request.chatId,
            moderatorId,
            moderatorName,
            resolution
          }
        })
      ];
      
      await Promise.all(notificationPromises);

    } catch (error) {
      console.error('Erro ao resolver solicitação:', error);
      throw error;
    }
  }

  // Rejeitar solicitação de moderação
  static async rejectModerationRequest(requestId: string, moderatorId: string, moderatorName: string, reason: string): Promise<void> {
    try {
      const requestRef = doc(db, 'moderationRequests', requestId);
      
      await updateDoc(requestRef, {
        status: 'rejected',
        resolvedAt: serverTimestamp(),
        notes: reason,
        updatedAt: serverTimestamp()
      });

      // Registrar ação
      await this.logModerationAction(requestId, moderatorId, moderatorName, 'reject', reason);

    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error);
      throw error;
    }
  }

  // Registrar ação de moderação
  static async logModerationAction(
    moderationRequestId: string,
    moderatorId: string,
    moderatorName: string,
    action: 'assign' | 'resolve' | 'reject' | 'escalate' | 'note',
    details?: string
  ): Promise<void> {
    try {
      const actionData: Omit<ModerationAction, 'id'> = {
        moderationRequestId,
        moderatorId,
        moderatorName,
        action,
        details,
        timestamp: serverTimestamp() as Timestamp
      };

      await addDoc(collection(db, 'moderationActions'), actionData);
    } catch (error) {
      console.error('Erro ao registrar ação:', error);
    }
  }

  // Obter estatísticas do moderador
  static async getModeratorStats(moderatorId: string): Promise<ModeratorStats> {
    try {
      // Buscar solicitações atribuídas
      const assignedQuery = query(
        collection(db, 'moderationRequests'),
        where('moderatorId', '==', moderatorId)
      );

      const assignedSnapshot = await getDocs(assignedQuery);
      const requests: ModerationRequest[] = [];
      
      assignedSnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as ModerationRequest);
      });

      // Calcular estatísticas
      const totalAssigned = requests.length;
      const totalResolved = requests.filter(r => r.status === 'resolved').length;
      const totalRejected = requests.filter(r => r.status === 'rejected').length;
      const currentActive = requests.filter(r => r.status === 'assigned').length;

      // Calcular tempo médio de resolução
      const resolvedRequests = requests.filter(r => r.status === 'resolved' && r.assignedAt && r.resolvedAt);
      let averageResolutionTime = 0;
      
      if (resolvedRequests.length > 0) {
        const totalTime = resolvedRequests.reduce((sum, request) => {
          const assignedTime = request.assignedAt!.toDate().getTime();
          const resolvedTime = request.resolvedAt!.toDate().getTime();
          return sum + (resolvedTime - assignedTime);
        }, 0);
        
        averageResolutionTime = (totalTime / resolvedRequests.length) / (1000 * 60 * 60); // em horas
      }

      // Buscar informações do moderador
      const moderatorDoc = await getDoc(doc(db, 'users', moderatorId));
      const moderatorName = moderatorDoc.exists() ? moderatorDoc.data().name : 'Desconhecido';

      return {
        id: moderatorId,
        moderatorId,
        moderatorName,
        totalAssigned,
        totalResolved,
        totalRejected,
        averageResolutionTime,
        currentActive,
        rating: totalAssigned > 0 ? (totalResolved / totalAssigned) * 5 : 0,
        lastActive: Timestamp.now()
      };

    } catch (error) {
      console.error('Erro ao obter estatísticas do moderador:', error);
      return {
        id: moderatorId,
        moderatorId,
        moderatorName: 'Erro',
        totalAssigned: 0,
        totalResolved: 0,
        totalRejected: 0,
        averageResolutionTime: 0,
        currentActive: 0,
        rating: 0,
        lastActive: Timestamp.now()
      };
    }
  }

  // Obter dados do dashboard de moderação
  static async getModerationDashboardData(): Promise<ModerationDashboardData> {
    try {
      // Buscar todas as solicitações
      const allRequestsQuery = query(
        collection(db, 'moderationRequests'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const allRequestsSnapshot = await getDocs(allRequestsQuery);
      const allRequests: ModerationRequest[] = [];
      
      allRequestsSnapshot.forEach((doc) => {
        allRequests.push({ id: doc.id, ...doc.data() } as ModerationRequest);
      });

      // Separar por status
      const pendingRequests = allRequests.filter(r => r.status === 'pending');
      const assignedRequests = allRequests.filter(r => r.status === 'assigned');
      const resolvedRequests = allRequests.filter(r => r.status === 'resolved');
      const urgentRequests = allRequests.filter(r => r.priority === 'urgent');

      // Buscar ações recentes
      const recentActionsQuery = query(
        collection(db, 'moderationActions'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      const actionsSnapshot = await getDocs(recentActionsQuery);
      const recentActions: ModerationAction[] = [];
      
      actionsSnapshot.forEach((doc) => {
        recentActions.push({ id: doc.id, ...doc.data() } as ModerationAction);
      });

      // Buscar estatísticas dos moderadores
      const moderatorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'moderator')
      );

      const moderatorsSnapshot = await getDocs(moderatorsQuery);
      const moderatorStats: ModeratorStats[] = [];
      
      const statsPromises = moderatorsSnapshot.docs.map(async (doc) => {
        return await this.getModeratorStats(doc.id);
      });

      const stats = await Promise.all(statsPromises);
      moderatorStats.push(...stats);

      return {
        totalPending: pendingRequests.length,
        totalAssigned: assignedRequests.length,
        totalResolved: resolvedRequests.length,
        totalUrgent: urgentRequests.length,
        pendingRequests: pendingRequests.slice(0, 10), // Primeiras 10
        assignedRequests: assignedRequests.slice(0, 10), // Primeiras 10
        recentActions,
        moderatorStats
      };

    } catch (error) {
      console.error('Erro ao obter dados do dashboard:', error);
      throw error;
    }
  }

  // Subscrever a solicitações pendentes
  static subscribeToPendingRequests(callback: (requests: ModerationRequest[]) => void): () => void {
    const q = query(
      collection(db, 'moderationRequests'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const requests: ModerationRequest[] = [];
      querySnapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        } as ModerationRequest);
      });
      callback(requests);
    });
  }

  // Subscrever a solicitações de um moderador específico
  static subscribeToModeratorRequests(moderatorId: string, callback: (requests: ModerationRequest[]) => void): () => void {
    const q = query(
      collection(db, 'moderationRequests'),
      where('moderatorId', '==', moderatorId),
      where('status', '==', 'assigned'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const requests: ModerationRequest[] = [];
      querySnapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        } as ModerationRequest);
      });
      callback(requests);
    });
  }

  // Subscrever a solicitação de moderação de um chat específico
  static subscribeToModerationRequestForChat(chatId: string, callback: (request: ModerationRequest | null) => void): () => void {
    const q = query(
      collection(db, 'moderationRequests'),
      where('chatId', '==', chatId),
      where('status', 'in', ['pending', 'assigned']),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    return onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const request = {
          id: doc.id,
          ...doc.data()
        } as ModerationRequest;
        callback(request);
      } else {
        callback(null);
      }
    });
  }
}