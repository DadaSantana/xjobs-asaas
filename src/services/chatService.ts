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
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Chat, ChatMessage, CreateChatData, SendMessageData } from '@/types/chat';
import { ModerationService } from './moderationService';
import { NotificationService } from './notificationService';
import { canSendMessage, useMessage as useMessageService } from './planUsageService';

export class ChatService {
  
  // Criar ou obter chat direto entre usuários (sem projeto)
  static async getOrCreateDirectChat(clientId: string, clientName: string, freelancerId: string, freelancerName: string): Promise<Chat> {
    try {
      // Verificar se já existe um chat direto entre estes usuários
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('clientId', '==', clientId),
        where('freelancerId', '==', freelancerId),
        where('projectId', '==', null)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Chat já existe, retornar o chat completo
        const chatDoc = querySnapshot.docs[0];
        return { id: chatDoc.id, ...chatDoc.data() } as Chat;
      }
      
      // Criar novo chat direto
      const chatData: Omit<Chat, 'id'> = {
        projectId: null,
        projectTitle: 'Chat Direto',
        clientId,
        clientName,
        freelancerId,
        freelancerName,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        isActive: true,
        unreadCount: {
          client: 0,
          freelancer: 0
        },
        blockedUsers: [],
        isDisputed: false,
        fundsReleased: false
      };
      
      const docRef = await addDoc(chatsRef, chatData);
      return { id: docRef.id, ...chatData } as Chat;
      
    } catch (error) {
      console.error('Erro ao criar/obter chat direto:', error);
      throw error;
    }
  }
  
  // Criar ou obter chat existente para um projeto
  static async getOrCreateChat(data: CreateChatData): Promise<string> {
    try {
      // Verificar se já existe um chat para este projeto e freelancer
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('projectId', '==', data.projectId),
        where('freelancerId', '==', data.freelancerId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Chat já existe, retornar o ID
        return querySnapshot.docs[0].id;
      }
      
      // Criar novo chat
      const chatData: Omit<Chat, 'id'> = {
        projectId: data.projectId,
        projectTitle: data.projectTitle,
        clientId: data.clientId,
        clientName: data.clientName,
        freelancerId: data.freelancerId,
        freelancerName: data.freelancerName,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        isActive: true,
        unreadCount: {
          client: 0,
          freelancer: 0
        },
        blockedUsers: [],
        isDisputed: false,
        fundsReleased: false
      };
      
      const docRef = await addDoc(chatsRef, chatData);
      return docRef.id;
      
    } catch (error) {
      console.error('Erro ao criar/obter chat:', error);
      throw error;
    }
  }
  
  // Upload de arquivo para chat
  static async uploadChatFile(userId: string, chatId: string, file: File): Promise<string> {
    try {
      // Criar referência única para o arquivo
      const timestamp = Date.now();
      const fileName = `chat_${chatId}_${userId}_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `chat-files/${fileName}`);
      
      // Upload do arquivo
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Erro no upload do arquivo:', error);
      throw new Error('Falha no upload do arquivo');
    }
  }

  // Enviar mensagem
  static async sendMessage(senderId: string, senderName: string, senderType: 'client' | 'freelancer', data: SendMessageData): Promise<void> {
    try {
      // Verificar se o remetente está bloqueado antes de enviar
      const isBlocked = await this.isUserBlocked(data.chatId, senderId);
      if (isBlocked) {
        throw new Error('Você foi bloqueado nesta conversa e não pode enviar mensagens.');
      }

      // Verificar se o chat existe e está ativo
      const chat = await this.getChatById(data.chatId);
      if (!chat || !chat.isActive) {
        throw new Error('Esta conversa não está mais ativa.');
      }

      // Verificar limite de mensagens do plano (apenas para freelancers)
      if (senderType === 'freelancer') {
        const canMessage = await canSendMessage(senderId, chat.projectId);
        if (!canMessage.canUse) {
          throw new Error(canMessage.reason || 'Você atingiu o limite de mensagens do seu plano.');
        }
      }

      // Adicionar mensagem à subcoleção
      const messagesRef = collection(db, 'chats', data.chatId, 'messages');
      const messageData: any = {
        chatId: data.chatId,
        senderId,
        senderName,
        senderType,
        content: data.content.trim(),
        timestamp: serverTimestamp() as Timestamp,
        readBy: [senderId], // Marcar como lida pelo remetente
        type: data.type || 'text'
      };
      
      // Só adicionar campos de arquivo se eles existirem
      if (data.fileUrl) {
        messageData.fileUrl = data.fileUrl;
      }
      if (data.fileName) {
        messageData.fileName = data.fileName;
      }
      if (data.fileSize) {
        messageData.fileSize = data.fileSize;
      }
      if (data.fileType) {
        messageData.fileType = data.fileType;
      }
      
      await addDoc(messagesRef, messageData);
      
      // Atualizar chat com última mensagem e contador de não lidas
      const chatRef = doc(db, 'chats', data.chatId);
      let lastMessage = data.content.trim();
      
      // Customizar mensagem para arquivos
      if (data.type === 'file') {
        lastMessage = `📎 ${data.fileName}`;
      } else if (data.type === 'image') {
        lastMessage = `🖼️ Imagem enviada`;
      }
      
      const updateData: any = {
        lastMessage,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Incrementar contador para o destinatário
      if (senderType === 'freelancer') {
        updateData['unreadCount.client'] = await this.incrementUnreadCount(data.chatId, 'client');
      } else {
        updateData['unreadCount.freelancer'] = await this.incrementUnreadCount(data.chatId, 'freelancer');
      }
      
      await updateDoc(chatRef, updateData);
      
      // Decrementar mensagem do plano (apenas para freelancers)
      if (senderType === 'freelancer') {
        const useMessageResult = await useMessageService(senderId, chat.projectId);
        if (!useMessageResult.success) {
          // Log apenas, pois a mensagem já foi enviada
          console.error('Erro ao registrar uso de mensagem:', useMessageResult.error);
        }
      }
      
      // Notificar o destinatário sobre a nova mensagem
      const recipientId = senderType === 'client' ? chat.freelancerId : chat.clientId;
      const recipientName = senderType === 'client' ? chat.freelancerName : chat.clientName;
      
      await NotificationService.createNotification({
        userId: recipientId,
        type: 'message_received',
        title: 'Nova mensagem',
        message: `${senderName} enviou uma mensagem no projeto "${chat.projectTitle}": ${lastMessage}`,
        actionUrl: `/chat/${data.chatId}`,
        actionLabel: 'Ver conversa',
        data: {
          chatId: data.chatId,
          projectId: chat.projectId,
          senderId,
          senderName,
          senderType,
          messageType: data.type || 'text',
          targetRole: senderType === 'client' ? 'freelancer' : 'cliente'
        }
      });
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }
  
  // Obter mensagens de um chat
  static subscribeToMessages(chatId: string, callback: (messages: ChatMessage[]) => void): () => void {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const messages: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        } as ChatMessage);
      });
      callback(messages);
    });
  }

  // Obter todas as mensagens de um chat de forma síncrona (para exportação)
  static async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      
      const querySnapshot = await getDocs(q);
      const messages: ChatMessage[] = [];
      
      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        } as ChatMessage);
      });
      
      return messages;
    } catch (error) {
      console.error('Erro ao obter mensagens do chat:', error);
      throw error;
    }
  }
  
  // Obter todos os chats (para moderadores/administradores)
  static async getAllChats(): Promise<Chat[]> {
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, orderBy('updatedAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const chats: Chat[] = [];
      
      querySnapshot.forEach((doc) => {
        chats.push({
          id: doc.id,
          ...doc.data()
        } as Chat);
      });
      
      return chats;
      
    } catch (error) {
      console.error('Erro ao obter todos os chats:', error);
      throw error;
    }
  }

  // Obter chats de um usuário
  static async getUserChats(userId: string, userType: 'client' | 'freelancer'): Promise<Chat[]> {
    try {
      const chatsRef = collection(db, 'chats');
      const field = userType === 'client' ? 'clientId' : 'freelancerId';
      const q = query(
        chatsRef,
        where(field, '==', userId),
        where('isActive', '==', true),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const chats: Chat[] = [];
      
      querySnapshot.forEach((doc) => {
        chats.push({
          id: doc.id,
          ...doc.data()
        } as Chat);
      });
      
      return chats;
      
    } catch (error) {
      console.error('Erro ao obter chats do usuário:', error);
      throw error;
    }
  }
  
  // Marcar mensagens como lidas
  static async markMessagesAsRead(chatId: string, userId: string, userType: 'client' | 'freelancer'): Promise<void> {
    try {
      // Resetar contador de não lidas
      const chatRef = doc(db, 'chats', chatId);
      const updateData: any = {};
      updateData[`unreadCount.${userType}`] = 0;
      
      await updateDoc(chatRef, updateData);
      
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
      throw error;
    }
  }
  
  // Obter detalhes de um chat
  static async getChatById(chatId: string): Promise<Chat | null> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (chatSnap.exists()) {
        return {
          id: chatSnap.id,
          ...chatSnap.data()
        } as Chat;
      }
      
      return null;
      
    } catch (error) {
      console.error('Erro ao obter chat:', error);
      throw error;
    }
  }
  
  // Helper para incrementar contador de não lidas
  private static async incrementUnreadCount(chatId: string, userType: 'client' | 'freelancer'): Promise<number> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (chatSnap.exists()) {
        const chatData = chatSnap.data() as Chat;
        const currentCount = chatData.unreadCount[userType] || 0;
        return currentCount + 1;
      }
      
      return 1;
    } catch (error) {
      console.error('Erro ao incrementar contador:', error);
      return 1;
    }
  }
  
  // Subscrever a um chat específico
  static subscribeToChat(chatId: string, callback: (chat: Chat | null) => void): () => void {
    const chatRef = doc(db, 'chats', chatId);
    
    return onSnapshot(chatRef, (doc) => {
      if (doc.exists()) {
        callback({
          id: doc.id,
          ...doc.data()
        } as Chat);
      } else {
        callback(null);
      }
    });
  }

  // Subscrever aos chats de um usuário (para compatibilidade com o FloatingChat)
  static subscribeToUserChats(userId: string, callback: (chats: Chat[]) => void): () => void {
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('isActive', '==', true),
        orderBy('updatedAt', 'desc')
      );
      
      return onSnapshot(q, (querySnapshot) => {
        const chats: Chat[] = [];
        querySnapshot.forEach((doc) => {
          const chatData = doc.data() as Chat;
          // Filtrar apenas chats onde o usuário é participante
          if (chatData.clientId === userId || chatData.freelancerId === userId) {
            chats.push({
              id: doc.id,
              ...chatData
            });
          }
        });
        callback(chats);
      });
      
    } catch (error) {
      console.error('Erro ao subscrever aos chats do usuário:', error);
      // Retornar função vazia em caso de erro
      return () => {};
    }
  }

  // Subscrever às mensagens de um chat (alias para compatibilidade)
  static subscribeToChatMessages(chatId: string, callback: (messages: ChatMessage[]) => void): () => void {
    return this.subscribeToMessages(chatId, callback);
  }

  // Bloquear usuário no chat
  static async blockUser(chatId: string, userId: string): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        blockedUsers: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao bloquear usuário:', error);
      throw error;
    }
  }

  // Desbloquear usuário no chat
  static async unblockUser(chatId: string, userId: string): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        blockedUsers: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao desbloquear usuário:', error);
      throw error;
    }
  }

  // Adicionar moderador ao chat
  static async addModerator(chatId: string, moderatorId: string): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        moderatorId,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao adicionar moderador:', error);
      throw error;
    }
  }

  // Solicitar moderador para chat
  static async requestModerator(
    chatId: string, 
    requestedBy: string, 
    requestedByName: string, 
    requestedByType: 'client' | 'freelancer',
    reason?: string
  ): Promise<string> {
    try {
      // Criar solicitação de moderação usando o ModerationService
      const requestId = await ModerationService.createModerationRequest(
        chatId,
        requestedBy,
        requestedByName,
        requestedByType,
        reason
      );

      return requestId;
    } catch (error) {
      console.error('Erro ao solicitar moderador:', error);
      throw error;
    }
  }

  // Remover moderador do chat
  static async removeModerator(chatId: string): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        moderatorId: null,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao remover moderador:', error);
      throw error;
    }
  }

  // Iniciar disputa no chat
  static async startDispute(chatId: string, reason: string): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        isDisputed: true,
        disputeReason: reason,
        disputeStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao iniciar disputa:', error);
      throw error;
    }
  }

  // Resolver disputa no chat
  static async resolveDispute(chatId: string): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        isDisputed: false,
        disputeReason: null,
        disputeStartedAt: null,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao resolver disputa:', error);
      throw error;
    }
  }

  // Liberar fundos do projeto
  static async releaseFunds(chatId: string): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        fundsReleased: true,
        fundsReleasedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao liberar fundos:', error);
      throw error;
    }
  }

  // Verificar se usuário está bloqueado
  static async isUserBlocked(chatId: string, userId: string): Promise<boolean> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (chatSnap.exists()) {
        const chat = chatSnap.data() as Chat;
        return chat.blockedUsers?.includes(userId) || false;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao verificar bloqueio:', error);
      throw error;
    }
  }

  // Verificar se conversa está bloqueada para o usuário atual
  static async isChatBlocked(chatId: string, currentUserId: string): Promise<{
    isBlocked: boolean;
    blockedBy?: string;
    canUnblock: boolean;
  }> {
    try {
      const chat = await this.getChatById(chatId);
      if (!chat) {
        return { isBlocked: false, canUnblock: false };
      }

      // Verificar se o usuário atual está bloqueado
      const isCurrentUserBlocked = chat.blockedUsers?.includes(currentUserId) || false;
      
      // Verificar se o outro usuário está bloqueado (e quem bloqueou)
      const otherUserId = chat.clientId === currentUserId ? chat.freelancerId : chat.clientId;
      const isOtherUserBlocked = chat.blockedUsers?.includes(otherUserId) || false;
      
      if (isCurrentUserBlocked) {
        return {
          isBlocked: true,
          blockedBy: otherUserId,
          canUnblock: false
        };
      }
      
      if (isOtherUserBlocked) {
        return {
          isBlocked: true,
          blockedBy: currentUserId,
          canUnblock: true
        };
      }
      
      return { isBlocked: false, canUnblock: false };
      
    } catch (error) {
      console.error('Erro ao verificar status do chat:', error);
      return { isBlocked: false, canUnblock: false };
    }
  }

  // Obter informações detalhadas do status de bloqueio
  static async getChatBlockStatus(chatId: string, currentUserId: string): Promise<{
    isBlocked: boolean;
    blockedUsers: string[];
    currentUserBlocked: boolean;
    otherUserBlocked: boolean;
    canSendMessages: boolean;
    canUnblockOther: boolean;
  }> {
    try {
      const chat = await this.getChatById(chatId);
      if (!chat) {
        return {
          isBlocked: false,
          blockedUsers: [],
          currentUserBlocked: false,
          otherUserBlocked: false,
          canSendMessages: true,
          canUnblockOther: false
        };
      }

      const blockedUsers = chat.blockedUsers || [];
      const otherUserId = chat.clientId === currentUserId ? chat.freelancerId : chat.clientId;
      
      const currentUserBlocked = blockedUsers.includes(currentUserId);
      const otherUserBlocked = blockedUsers.includes(otherUserId);
      
      return {
        isBlocked: blockedUsers.length > 0,
        blockedUsers,
        currentUserBlocked,
        otherUserBlocked,
        canSendMessages: !currentUserBlocked,
        canUnblockOther: otherUserBlocked && !currentUserBlocked
      };
      
    } catch (error) {
      console.error('Erro ao obter status de bloqueio:', error);
      return {
        isBlocked: false,
        blockedUsers: [],
        currentUserBlocked: false,
        otherUserBlocked: false,
        canSendMessages: false,
        canUnblockOther: false
      };
    }
  }
}
