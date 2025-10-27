import { useState, useEffect } from 'react';
import { ChatService } from '@/services/chatService';
import { Chat, ChatMessage } from '@/types/chat';
import { useAppSelector } from './redux';

export const useUserChats = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAppSelector(state => state.auth.user);
  const userProfile = useAppSelector(state => state.auth.userProfile);

  useEffect(() => {
    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }

    console.log('Carregando chats do usuário:', user.uid);
    setLoading(true);

    const unsubscribe = ChatService.subscribeToUserChats(user.uid, (userChats) => {
      setChats(userChats);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { chats, loading };
};

export const useChatMessages = (chatId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    console.log('Carregando mensagens do chat:', chatId);
    setLoading(true);

    const unsubscribe = ChatService.subscribeToChatMessages(chatId, (chatMessages) => {
      setMessages(chatMessages);
      setLoading(false);
    });

    return unsubscribe;
  }, [chatId]);

  return { messages, loading };
};

export const useSendMessage = () => {
  const [sending, setSending] = useState(false);
  const user = useAppSelector(state => state.auth.user);
  const userProfile = useAppSelector(state => state.auth.userProfile);

  const sendMessage = async (chatId: string, content: string, fileData?: {
    type?: 'text' | 'file' | 'image';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  }) => {
    if (!user || !userProfile || (!content.trim() && !fileData)) return;

    setSending(true);
    try {
      // Determinar tipo de usuário baseado no chat
      const chat = await ChatService.getChatById(chatId);
      if (!chat) {
        throw new Error('Chat não encontrado');
      }
      
      const userType = chat.clientId === user.uid ? 'client' : 'freelancer';
      
      await ChatService.sendMessage(
        user.uid,
        userProfile.name,
        userType,
        {
          chatId,
          content: content.trim(),
          type: fileData?.type || 'text',
          fileUrl: fileData?.fileUrl,
          fileName: fileData?.fileName,
          fileSize: fileData?.fileSize,
          fileType: fileData?.fileType
        }
      );
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Relançar o erro com a mensagem original para ser tratado pelos componentes
      if (error.message?.includes('bloqueado')) {
        throw new Error('USER_BLOCKED');
      } else if (error.message?.includes('não está mais ativa')) {
        throw new Error('CHAT_INACTIVE');
      } else {
        throw new Error('SEND_ERROR');
      }
    } finally {
      setSending(false);
    }
  };

  return { sendMessage, sending };
};
