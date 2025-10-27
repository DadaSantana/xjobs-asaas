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
import { Dispute, DisputeEvidence, DisputeMessage, DisputeAction, DisputeStats } from '@/types/dispute';
import { Chat } from '@/types/chat';
import { NotificationService } from './notificationService';

export class DisputeService {
  
  // Criar disputa
  static async createDispute(
    chatId: string,
    projectId: string,
    projectValue: number,
    initiatedBy: string,
    initiatedByName: string,
    initiatedByType: 'client' | 'freelancer',
    reason: string,
    description?: string
  ): Promise<string> {
    try {
      // Verificar se já existe uma disputa ativa para este chat
      const existingDispute = await this.getActiveDisputeForChat(chatId);
      if (existingDispute) {
        throw new Error('Já existe uma disputa ativa para esta conversa.');
      }

      // Obter dados do chat
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (!chatDoc.exists()) {
        throw new Error('Chat não encontrado');
      }

      const chat = chatDoc.data() as Chat;
      
      // Determinar prioridade baseada no valor do projeto
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
      if (projectValue > 10000) {
        priority = 'high';
      } else if (projectValue > 50000) {
        priority = 'urgent';
      } else if (projectValue < 1000) {
        priority = 'low';
      }

      const dispute: Omit<Dispute, 'id'> = {
        chatId,
        projectId,
        projectTitle: chat.projectTitle,
        projectValue,
        clientId: chat.clientId,
        clientName: chat.clientName,
        freelancerId: chat.freelancerId,
        freelancerName: chat.freelancerName,
        initiatedBy,
        initiatedByName,
        initiatedByType,
        reason,
        description,
        status: 'open',
        priority,
        evidence: [],
        messages: [],
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        tags: []
      };

      const docRef = await addDoc(collection(db, 'disputes'), dispute);
      
      // Marcar chat como em disputa
      await updateDoc(doc(db, 'chats', chatId), {
        isDisputed: true,
        disputeId: docRef.id,
        updatedAt: serverTimestamp()
      });
      
      // Notificar a outra parte sobre a criação da disputa
      const otherPartyId = initiatedByType === 'client' ? chat.freelancerId : chat.clientId;
      const otherPartyName = initiatedByType === 'client' ? chat.freelancerName : chat.clientName;
      
      await NotificationService.createNotification({
        userId: otherPartyId,
        type: 'dispute_created',
        title: 'Nova disputa criada',
        message: `${initiatedByName} criou uma disputa para o projeto "${chat.projectTitle}". Motivo: ${reason}`,
        actionUrl: `/chat/${chatId}`,
        actionLabel: 'Ver conversa',
        data: {
          disputeId: docRef.id,
          projectId,
          chatId,
          initiatedBy,
          initiatedByName,
          initiatedByType,
          reason,
          targetRole: initiatedByType === 'client' ? 'freelancer' : 'cliente'
        }
      });
      
      return docRef.id;
      
    } catch (error) {
      console.error('Erro ao criar disputa:', error);
      throw error;
    }
  }

  // Verificar se existe disputa ativa para um chat
  static async getActiveDisputeForChat(chatId: string): Promise<Dispute | null> {
    try {
      const q = query(
        collection(db, 'disputes'),
        where('chatId', '==', chatId),
        where('status', 'in', ['open', 'under_review']),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as Dispute;
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar disputa ativa:', error);
      return null;
    }
  }

  // Resolver disputa
  static async resolveDispute(
    disputeId: string, 
    moderatorId: string, 
    moderatorName: string, 
    resolution: string,
    resolutionType: 'client_favor' | 'freelancer_favor' | 'partial_refund' | 'mediated_agreement',
    refundAmount?: number
  ): Promise<void> {
    try {
      const disputeRef = doc(db, 'disputes', disputeId);
      
      const updateData: any = {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        resolution,
        resolutionType,
        updatedAt: serverTimestamp()
      };

      if (refundAmount) {
        updateData.refundAmount = refundAmount;
      }

      await updateDoc(disputeRef, updateData);

      // Atualizar chat e notificar as partes
      const disputeDoc = await getDoc(disputeRef);
      if (disputeDoc.exists()) {
        const dispute = disputeDoc.data() as Dispute;
        const chatRef = doc(db, 'chats', dispute.chatId);
        await updateDoc(chatRef, {
          isDisputed: false,
          disputeResolved: true,
          disputeResolution: resolution,
          updatedAt: serverTimestamp()
        });
        
        // Notificar cliente sobre a resolução
        await NotificationService.createNotification({
          userId: dispute.clientId,
          type: 'dispute_resolved',
          title: 'Disputa resolvida',
          message: `A disputa do projeto "${dispute.projectTitle}" foi resolvida por ${moderatorName}. Resolução: ${resolutionType.replace('_', ' ')}`,
          actionUrl: `/chat/${dispute.chatId}`,
          actionLabel: 'Ver conversa',
          data: {
            disputeId,
            projectId: dispute.projectId,
            chatId: dispute.chatId,
            moderatorId,
            moderatorName,
            resolution,
            resolutionType,
            refundAmount,
            targetRole: 'cliente'
          }
        });
        
        // Notificar freelancer sobre a resolução
        await NotificationService.createNotification({
          userId: dispute.freelancerId,
          type: 'dispute_resolved',
          title: 'Disputa resolvida',
          message: `A disputa do projeto "${dispute.projectTitle}" foi resolvida por ${moderatorName}. Resolução: ${resolutionType.replace('_', ' ')}`,
          actionUrl: `/chat/${dispute.chatId}`,
          actionLabel: 'Ver conversa',
          data: {
            disputeId,
            projectId: dispute.projectId,
            chatId: dispute.chatId,
            moderatorId,
            moderatorName,
            resolution,
            resolutionType,
            targetRole: 'freelancer',
            refundAmount
          }
        });
      }

    } catch (error) {
      console.error('Erro ao resolver disputa:', error);
      throw error;
    }
  }

  // Obter todas as disputas
  static async getAllDisputes(): Promise<Dispute[]> {
    try {
      const q = query(
        collection(db, 'disputes'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const disputes: Dispute[] = [];
      
      querySnapshot.forEach((doc) => {
        disputes.push({
          id: doc.id,
          ...doc.data()
        } as Dispute);
      });

      return disputes;
    } catch (error) {
      console.error('Erro ao obter disputas:', error);
      return [];
    }
  }

  // Subscrever a disputas abertas
  static subscribeToOpenDisputes(callback: (disputes: Dispute[]) => void): () => void {
    const q = query(
      collection(db, 'disputes'),
      where('status', 'in', ['open', 'under_review']),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const disputes: Dispute[] = [];
      querySnapshot.forEach((doc) => {
        disputes.push({
          id: doc.id,
          ...doc.data()
        } as Dispute);
      });
      callback(disputes);
    });
  }
}