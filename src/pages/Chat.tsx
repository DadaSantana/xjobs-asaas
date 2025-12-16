import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Send, MessageCircle, Users, Phone, Video, Paperclip, Image as ImageIcon, Download, Loader2, X, MoreVertical, Ban, Shield, DollarSign, AlertTriangle, ArrowLeft } from "lucide-react";
import { useUserChats, useChatMessages, useSendMessage } from '@/hooks/useChat';
import { useAppSelector } from '@/hooks/redux';
import { Chat as ChatType, ChatMessage, CreateChatData } from '@/types/chat';
import { ChatService } from '@/services/chatService';
import { UserProfileService } from '@/services/userProfileService';
import { ProfileModal } from '@/components/ProfileModal';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CHAT_LOCALIZATIONS } from '@/utils/chatLocalizations';
import { ChatBlockStatus } from '@/components/ChatBlockStatus';
import { ModerationStatus } from '@/components/ModerationStatus';
import { ModerationService } from '@/services/moderationService';
import { ModerationRequest } from '@/types/moderation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Chat = () => {
  const [searchParams] = useSearchParams();
  const { chats, loading: chatsLoading } = useUserChats();
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [temporaryChat, setTemporaryChat] = useState<{
    userId: string;
    projectId: string;
    projectTitle: string;
    userName: string;
  } | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [profileModal, setProfileModal] = useState({
    isOpen: false,
    userId: '',
    userName: '',
    userRole: 'freelancer' as 'client' | 'freelancer'
  });
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [isMobileViewingChat, setIsMobileViewingChat] = useState(false);
  const [moderationRequest, setModerationRequest] = useState<ModerationRequest | null>(null);
  const [moderationRequests, setModerationRequests] = useState<Map<string, ModerationRequest>>(new Map());
  
  // Estados para controle de bloqueio
  const [blockStatus, setBlockStatus] = useState({
    isBlocked: false,
    currentUserBlocked: false,
    otherUserBlocked: false,
    canSendMessages: true,
    canUnblockOther: false
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const { messages, loading: messagesLoading } = useChatMessages(selectedChat?.id || null);
  const { sendMessage, sending } = useSendMessage();
  const currentUser = useAppSelector(state => state.auth.user);
  const currentUserProfile = useAppSelector(state => state.auth.userProfile);

  // Determinar se é cliente ou freelancer
  const isClient = currentUserProfile?.role === 'client';

  // Carregar status de bloqueio
  const loadBlockStatus = async () => {
    if (!selectedChat || !currentUser) return;
    
    try {
      const status = await ChatService.getChatBlockStatus(selectedChat.id, currentUser.uid);
      setBlockStatus(status);
    } catch (error) {
      console.error('Erro ao carregar status de bloqueio:', error);
    }
  };

  // Carregar status de bloqueio quando chat mudar
  useEffect(() => {
    loadBlockStatus();
    loadModerationRequest();
  }, [selectedChat, currentUser]);

  // Carregar solicitações de moderação para a lista de chats
  useEffect(() => {
    const loadModerationRequests = async () => {
      const requestsMap = new Map<string, ModerationRequest>();
      
      await Promise.all(
        chats.map(async (chat) => {
          try {
            const request = await ModerationService.getPendingModerationForChat(chat.id);
            if (request) {
              requestsMap.set(chat.id, request);
            }
          } catch (error) {
            console.error(`Erro ao carregar moderação para chat ${chat.id}:`, error);
          }
        })
      );
      
      setModerationRequests(requestsMap);
    };

    if (chats.length > 0) {
      loadModerationRequests();
    }
  }, [chats]);

  // Carregar solicitação de moderação para o chat selecionado
  const loadModerationRequest = async () => {
    if (!selectedChat) return;
    
    try {
      const request = await ModerationService.getPendingModerationForChat(selectedChat.id);
      setModerationRequest(request);
    } catch (error) {
      console.error('Erro ao carregar solicitação de moderação:', error);
    }
  };

  // Auto-selecionar chat baseado no parâmetro userId
  useEffect(() => {
    const targetUserId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');
    const projectTitle = searchParams.get('projectTitle');
    
    if (targetUserId && !selectedChat && !temporaryChat) {
      const targetChat = chats.find(chat => {
        const otherParticipant = isClient ? chat.freelancerId : chat.clientId;
        return otherParticipant === targetUserId;
      });
      
      if (targetChat) {
        setSelectedChat(targetChat);
      } else if (targetUserId && projectId && projectTitle && currentUser && currentUserProfile) {
        // Buscar informações do usuário para criar chat temporário
        UserProfileService.getUserProfile(targetUserId).then(userProfile => {
          if (userProfile) {
            setTemporaryChat({
              userId: targetUserId,
              projectId,
              projectTitle,
              userName: userProfile.name
            });
            
            toast({
              title: CHAT_LOCALIZATIONS.TOASTS.NEW_CONVERSATION,
              description: CHAT_LOCALIZATIONS.TOASTS.NEW_CONVERSATION_DESCRIPTION(userProfile.name),
            });
          }
        }).catch(error => {
          console.error('Erro ao buscar perfil do usuário:', error);
          toast({
            title: CHAT_LOCALIZATIONS.TOASTS.ERROR,
            description: CHAT_LOCALIZATIONS.TOASTS.USER_PROFILE_ERROR,
            variant: "destructive"
          });
        });
      }
    }
  }, [chats, searchParams, isClient, selectedChat, temporaryChat, currentUser, currentUserProfile, toast]);

  // Marcar mensagens como lidas quando selecionar uma conversa
  useEffect(() => {
    if (selectedChat && currentUser) {
      const userType = isClient ? 'client' : 'freelancer';
      ChatService.markMessagesAsRead(selectedChat.id, currentUser.uid, userType);
    }
  }, [selectedChat, currentUser, isClient]);

  // Subscription para atualizações em tempo real da moderação
  useEffect(() => {
    if (!selectedChat) return;

    const unsubscribe = ModerationService.subscribeToModerationRequestForChat(
      selectedChat.id,
      (request) => {
        setModerationRequest(request);
      }
    );

    return unsubscribe;
  }, [selectedChat]);

  const filteredChats = chats.filter(chat => {
    const otherParticipantName = isClient ? chat.freelancerName : chat.clientName;
    return otherParticipantName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSendMessage = async () => {
    if ((!selectedChat && !temporaryChat) || (!messageInput.trim() && !selectedFile)) return;
    
    // Verificar se pode enviar mensagens
    if (selectedChat && !blockStatus.canSendMessages) {
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.ERROR,
        description: CHAT_LOCALIZATIONS.TOASTS.USER_BLOCKED_ERROR,
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Se estamos em modo temporário, criar o chat primeiro
      if (temporaryChat && !selectedChat && currentUser && currentUserProfile) {
        const createChatData: CreateChatData = {
          projectId: temporaryChat.projectId,
          projectTitle: temporaryChat.projectTitle,
          clientId: isClient ? currentUser.uid : temporaryChat.userId,
          clientName: isClient ? currentUserProfile.name : temporaryChat.userName,
          freelancerId: isClient ? temporaryChat.userId : currentUser.uid,
          freelancerName: isClient ? temporaryChat.userName : currentUserProfile.name
        };
        
        const chatId = await ChatService.getOrCreateChat(createChatData);
        
        // Encontrar o chat recém-criado
        const newChats = await ChatService.getUserChats(currentUser.uid, isClient ? 'client' : 'freelancer');
        const newChat = newChats.find(chat => chat.id === chatId);
        
        if (newChat) {
          setSelectedChat(newChat);
          setTemporaryChat(null);
          
          // Enviar a mensagem
          if (selectedFile) {
            await handleSendFile();
          } else {
            await sendMessage(chatId, messageInput);
            setMessageInput('');
          }
        }
      } else if (selectedChat) {
        // Chat normal
        if (selectedFile) {
          await handleSendFile();
        } else {
          await sendMessage(selectedChat.id, messageInput);
          setMessageInput('');
        }
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      
      let errorMessage = CHAT_LOCALIZATIONS.TOASTS.SEND_MESSAGE_ERROR;
      
      if (error.message === 'USER_BLOCKED') {
        errorMessage = CHAT_LOCALIZATIONS.TOASTS.USER_BLOCKED_ERROR;
      } else if (error.message === 'CHAT_INACTIVE') {
        errorMessage = CHAT_LOCALIZATIONS.TOASTS.CHAT_INACTIVE_ERROR;
      }
      
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.ERROR,
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho (30MB)
    if (file.size > 30 * 1024 * 1024) {
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.ERROR,
        description: CHAT_LOCALIZATIONS.FILE_TOO_LARGE,
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setMessageInput(file.name); // Mostrar nome do arquivo no input
  };

  const handleSendFile = async () => {
    if (!selectedChat || !selectedFile || !currentUser) return;

    setUploadingFile(true);
    try {
      // Upload do arquivo
      const fileUrl = await ChatService.uploadChatFile(currentUser.uid, selectedChat.id, selectedFile);
      
      // Determinar tipo do arquivo
      const isImage = selectedFile.type.startsWith('image/');
      const messageType = isImage ? 'image' : 'file';
      
      // Enviar mensagem com arquivo
      await sendMessage(selectedChat.id, messageInput || selectedFile.name, {
        type: messageType,
        fileUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });

      // Limpar estados
      setSelectedFile(null);
      setMessageInput('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.SUCCESS,
        description: CHAT_LOCALIZATIONS.FILE_UPLOAD_SUCCESS,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.ERROR,
        description: CHAT_LOCALIZATIONS.FILE_UPLOAD_ERROR,
        variant: "destructive"
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
    setMessageInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenProfile = (userId: string, userName: string, userRole: 'client' | 'freelancer') => {
    setProfileModal({
      isOpen: true,
      userId,
      userName,
      userRole
    });
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.ERROR,
        description: CHAT_LOCALIZATIONS.FILE_DOWNLOAD_ERROR,
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return `0 ${CHAT_LOCALIZATIONS.FILE_SIZES[0]}`;
    const k = 1024;
    const sizes = CHAT_LOCALIZATIONS.FILE_SIZES;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessage = (message: ChatMessage) => {
    const isOwn = message.senderId === currentUser?.uid;
    const messageTime = formatMessageTime(message.timestamp);

    if (message.type === 'image' && message.fileUrl) {
      return (
        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-xs lg:max-w-md rounded-2xl overflow-hidden ${
            isOwn ? 'bg-blue-600' : 'bg-gray-100'
          }`}>
            <img
              src={message.fileUrl}
              alt={message.fileName}
              className="w-full h-auto max-h-64 object-cover cursor-pointer"
              onClick={() => window.open(message.fileUrl, '_blank')}
            />
            <div className={`px-4 py-2 ${isOwn ? 'text-white' : 'text-gray-900'}`}>
              {message.content && <p className="text-sm mb-1">{message.content}</p>}
              <p className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                {messageTime}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (message.type === 'file' && message.fileUrl) {
      return (
        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
            isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isOwn ? 'bg-blue-500' : 'bg-gray-200'}`}>
                <Paperclip className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{message.fileName}</p>
                {message.fileSize && (
                  <p className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                    {formatFileSize(message.fileSize)}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${isOwn ? 'hover:bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
                onClick={() => handleDownloadFile(message.fileUrl!, message.fileName || 'arquivo')}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
            {message.content && message.content !== message.fileName && (
              <p className="text-sm mt-2">{message.content}</p>
            )}
            <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
              {messageTime}
            </p>
          </div>
        </div>
      );
    }

    // Mensagem de texto normal
    return (
      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
          isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}>
          <p className="text-sm">{message.content}</p>
          <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
            {messageTime}
          </p>
        </div>
      </div>
    );
  };

  const getOtherParticipant = (chat: ChatType) => {
    const isClientView = chat.clientId === currentUser?.uid;
    return {
      id: isClientView ? chat.freelancerId : chat.clientId,
      name: isClientView ? chat.freelancerName : chat.clientName,
      role: isClientView ? 'freelancer' : 'client'
    };
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  };

  const handleSelectChat = (chat: ChatType) => {
    setSelectedChat(chat);
    setTemporaryChat(null);
    setIsMobileViewingChat(true); // Abrir a conversa no mobile
  };

  const handleBackToChats = () => {
    setIsMobileViewingChat(false);
    setSelectedChat(null);
    setTemporaryChat(null);
  };

  const handleBlockUser = async () => {
    if (!selectedChat) return;
    
    try {
      const otherUserId = isClient ? selectedChat.freelancerId : selectedChat.clientId;
      await ChatService.blockUser(selectedChat.id, otherUserId);
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.USER_BLOCKED,
        description: CHAT_LOCALIZATIONS.TOASTS.USER_BLOCKED_SUCCESS,
      });
      
      // Recarregar status de bloqueio
      await loadBlockStatus();
      setShowBlockDialog(false);
      
    } catch (error) {
      console.error('Erro ao bloquear usuário:', error);
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.ERROR,
        description: CHAT_LOCALIZATIONS.TOASTS.BLOCK_USER_ERROR,
        variant: "destructive",
      });
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedChat) return;
    
    try {
      const otherUserId = isClient ? selectedChat.freelancerId : selectedChat.clientId;
      await ChatService.unblockUser(selectedChat.id, otherUserId);
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.USER_UNBLOCKED,
        description: CHAT_LOCALIZATIONS.TOASTS.USER_UNBLOCKED_SUCCESS,
      });
      
      // Recarregar status de bloqueio
      await loadBlockStatus();
      setShowUnblockDialog(false);
      
    } catch (error) {
      console.error('Erro ao desbloquear usuário:', error);
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.ERROR,
        description: CHAT_LOCALIZATIONS.TOASTS.UNBLOCK_USER_ERROR,
        variant: "destructive",
      });
    }
  };

  const handleStartDispute = async () => {
    if (!selectedChat || !disputeReason.trim()) return;
    
    try {
      await ChatService.startDispute(selectedChat.id, disputeReason);
      setShowDisputeDialog(false);
      setDisputeReason("");
      toast({
        title: "Disputa iniciada",
        description: "A disputa foi iniciada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao iniciar disputa:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar disputa",
        variant: "destructive",
      });
    }
  };

  const handleReleaseFunds = async () => {
    if (!selectedChat || !isClient) return;
    
    try {
      await ChatService.releaseFunds(selectedChat.id);
      toast({
        title: "Fundos liberados",
        description: "Os fundos foram liberados com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao liberar fundos:', error);
      toast({
        title: "Erro",
        description: "Erro ao liberar fundos",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white md:rounded-xl md:shadow-lg overflow-hidden h-full max-w-full">
      <div className="flex h-full max-w-full overflow-hidden">
        {/* Lista de Contatos */}
        <div className={`${isMobileViewingChat ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 md:max-w-sm border-r border-gray-200 flex-col overflow-hidden`}>
          {/* Header da Lista */}
          <div className="p-4 md:p-6 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              <h1 className="text-lg md:text-xl font-semibold text-gray-900">{CHAT_LOCALIZATIONS.CONVERSATIONS}</h1>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={CHAT_LOCALIZATIONS.SEARCH_CONVERSATIONS}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Lista de Chats */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {chatsLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                  <p className="text-sm">{CHAT_LOCALIZATIONS.LOADING_CONVERSATIONS}</p>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <h3 className="font-medium text-gray-900 mb-1">{CHAT_LOCALIZATIONS.NO_CONVERSATIONS}</h3>
                  <p className="text-sm">{CHAT_LOCALIZATIONS.NO_CONVERSATIONS_DESCRIPTION}</p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const otherParticipant = getOtherParticipant(chat);
                  const isSelected = selectedChat?.id === chat.id;
                  const chatModerationRequest = moderationRequests.get(chat.id);
                  
                  return (
                    <div
                      key={chat.id}
                      onClick={() => handleSelectChat(chat)}
                      className={`p-3 md:p-4 rounded-lg cursor-pointer transition-colors mb-1 md:mb-2 active:bg-blue-100 ${
                        isSelected 
                          ? 'bg-blue-50 border border-blue-200' 
                          : chatModerationRequest
                          ? 'bg-yellow-50 border-l-4 border-yellow-400 hover:bg-yellow-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar 
                            className="cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all h-10 w-10 md:h-12 md:w-12"
                            onClick={() => handleOpenProfile(otherParticipant.id, otherParticipant.name, otherParticipant.role as 'client' | 'freelancer')}
                          >
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm md:text-base">
                              {otherParticipant.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {/* Badge de Moderação no Avatar */}
                          {chatModerationRequest && (
                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                              chatModerationRequest.status === 'pending' ? 'bg-yellow-500' :
                              chatModerationRequest.status === 'assigned' ? 'bg-blue-500' :
                              chatModerationRequest.status === 'resolved' ? 'bg-green-500' :
                              'bg-red-500'
                            }`}>
                              <Shield className="h-2 w-2 text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-gray-900 truncate text-sm md:text-base">
                              {otherParticipant.name}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 hidden md:inline">
                                {formatMessageTime(chat.lastMessageAt)}
                              </span>
                              {/* Mostrar contador de não lidas */}
                              {(() => {
                                const unreadCount = isClient ? chat.unreadCount.client : chat.unreadCount.freelancer;
                                return unreadCount > 0 && (
                                  <Badge className="bg-red-500 text-white text-xs h-5 w-5 rounded-full flex items-center justify-center p-0">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                  </Badge>
                                );
                              })()}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mb-1">
                            <Badge 
                              variant={otherParticipant.role === 'freelancer' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {otherParticipant.role === 'freelancer' ? CHAT_LOCALIZATIONS.FREELANCER : CHAT_LOCALIZATIONS.CLIENT}
                            </Badge>
                            <span className="text-xs text-gray-500 md:hidden">
                              {formatMessageTime(chat.lastMessageAt)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 truncate mb-1">
                            {chatModerationRequest ? 
                              `🛡️ Sob moderação - ${chat.lastMessage || CHAT_LOCALIZATIONS.CONVERSATION_STARTED}` :
                              chat.lastMessage || CHAT_LOCALIZATIONS.CONVERSATION_STARTED
                            }
                          </p>
                          
                          <p className="text-xs text-gray-500 truncate">
                            📋 {chat.projectTitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Área de Conversa */}
        <div className={`${!isMobileViewingChat && (selectedChat || temporaryChat) ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0 overflow-hidden h-full`}>
          {selectedChat || temporaryChat ? (
            <>
              {/* Header da Conversa */}
              <div className="p-4 md:p-6 border-b border-gray-100 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Botão de voltar no mobile */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="md:hidden p-2"
                      onClick={handleBackToChats}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar 
                      className="cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all h-10 w-10 md:h-12 md:w-12"
                      onClick={() => {
                        if (selectedChat) {
                          const participant = getOtherParticipant(selectedChat);
                          handleOpenProfile(participant.id, participant.name, participant.role as 'client' | 'freelancer');
                        } else if (temporaryChat) {
                          const userRole = isClient ? 'freelancer' : 'client';
                          handleOpenProfile(temporaryChat.userId, temporaryChat.userName, userRole);
                        }
                      }}
                    >
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm md:text-base">
                        {selectedChat 
                          ? getOtherParticipant(selectedChat).name.charAt(0).toUpperCase()
                          : temporaryChat?.userName.charAt(0).toUpperCase()
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 max-w-full">
                      <div className="flex items-center gap-2 flex-wrap max-w-full">
                        <h2 className="font-semibold text-gray-900 text-base md:text-lg truncate flex-shrink">
                          {selectedChat 
                            ? getOtherParticipant(selectedChat).name
                            : temporaryChat?.userName
                          }
                        </h2>
                        {/* Badge de Moderação no Cabeçalho */}
                        {moderationRequest && (
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border-2 flex-shrink-0 ${
                            moderationRequest.status === 'pending' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                            moderationRequest.status === 'assigned' ? 'bg-blue-100 border-blue-300 text-blue-800' :
                            moderationRequest.status === 'resolved' ? 'bg-green-100 border-green-300 text-green-800' :
                            'bg-red-100 border-red-300 text-red-800'
                          }`}>
                            <Shield className="h-3 w-3" />
                            <span className="hidden md:inline">
                              {moderationRequest.status === 'pending' && 'MODERAÇÃO SOLICITADA'}
                              {moderationRequest.status === 'assigned' && 'SOB MODERAÇÃO'}
                              {moderationRequest.status === 'resolved' && 'MODERAÇÃO CONCLUÍDA'}
                              {moderationRequest.status === 'rejected' && 'MODERAÇÃO REJEITADA'}
                            </span>
                            <span className="md:hidden">
                              {moderationRequest.status === 'pending' && 'MOD'}
                              {moderationRequest.status === 'assigned' && 'MOD'}
                              {moderationRequest.status === 'resolved' && 'OK'}
                              {moderationRequest.status === 'rejected' && 'REJ'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant={selectedChat 
                            ? (getOtherParticipant(selectedChat).role === 'freelancer' ? 'default' : 'secondary')
                            : (isClient ? 'default' : 'secondary')
                          }
                          className="text-xs"
                        >
                          {selectedChat 
                            ? (getOtherParticipant(selectedChat).role === 'freelancer' ? CHAT_LOCALIZATIONS.FREELANCER : CHAT_LOCALIZATIONS.CLIENT)
                            : (isClient ? CHAT_LOCALIZATIONS.FREELANCER : CHAT_LOCALIZATIONS.CLIENT)
                          }
                        </Badge>
                        <span className="text-sm text-green-600 hidden md:inline">Online</span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-500 truncate">
                        📋 {selectedChat ? selectedChat.projectTitle : temporaryChat?.projectTitle}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 md:gap-2">
                    <Button variant="ghost" size="sm" className="hidden md:flex p-2">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="hidden md:flex p-2">
                      <Video className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-2">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{CHAT_LOCALIZATIONS.CHAT_ACTIONS}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {/* Opções de bloqueio/desbloqueio */}
                        {blockStatus.canUnblockOther ? (
                          <DropdownMenuItem onClick={() => setShowUnblockDialog(true)}>
                            <Shield className="h-4 w-4 mr-2" />
                            {CHAT_LOCALIZATIONS.UNBLOCK_USER}
                          </DropdownMenuItem>
                        ) : !blockStatus.otherUserBlocked && (
                          <DropdownMenuItem onClick={() => setShowBlockDialog(true)}>
                            <Ban className="h-4 w-4 mr-2" />
                            {CHAT_LOCALIZATIONS.BLOCK_USER}
                          </DropdownMenuItem>
                        )}
                        
                        {isClient && !selectedChat?.fundsReleased && (
                          <DropdownMenuItem onClick={handleReleaseFunds}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Liberar Fundos
                          </DropdownMenuItem>
                        )}
                        {!selectedChat?.isDisputed && (
                          <DropdownMenuItem onClick={() => setShowDisputeDialog(true)}>
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Iniciar Disputa
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Status de Bloqueio */}
              {selectedChat && (
                <div className="px-4 md:px-6">
                  <ChatBlockStatus
                    isBlocked={blockStatus.isBlocked}
                    currentUserBlocked={blockStatus.currentUserBlocked}
                    otherUserBlocked={blockStatus.otherUserBlocked}
                    canUnblockOther={blockStatus.canUnblockOther}
                    otherUserName={selectedChat ? getOtherParticipant(selectedChat).name : ''}
                    onUnblock={() => setShowUnblockDialog(true)}
                  />
                </div>
              )}

              {/* Status de Moderação */}
              {moderationRequest && (
                <div className="px-4 md:px-6">
                  <ModerationStatus
                    status={moderationRequest.status}
                    moderatorName={moderationRequest.moderatorName}
                    requestedByName={moderationRequest.requestedByName}
                    requestedByType={moderationRequest.requestedByType}
                    assignedAt={moderationRequest.assignedAt}
                    resolvedAt={moderationRequest.resolvedAt}
                    priority={moderationRequest.priority}
                    onViewDetails={() => {
                      toast({
                        title: 'Em desenvolvimento',
                        description: 'Detalhes da solicitação serão implementados em breve'
                      });
                    }}
                  />
                </div>
              )}

              {/* Mensagens */}
              <ScrollArea className="flex-1 p-3 md:p-6">
                {selectedChat ? (
                  messagesLoading ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-sm">Carregando mensagens...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-12 md:py-20">
                      <MessageCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="font-medium text-gray-900 mb-2">Primeira conversa!</h3>
                      <p className="text-sm md:text-base">Seja o primeiro a enviar uma mensagem</p>
                    </div>
                  ) : (
                    <div className="space-y-3 md:space-y-4">
                      {messages.map(renderMessage)}
                    </div>
                  )
                ) : temporaryChat ? (
                  <div className="text-center text-gray-500 py-12 md:py-20">
                    <MessageCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      💬 Nova conversa
                    </h3>
                    <p className="text-gray-900 font-medium mb-1">{temporaryChat.userName}</p>
                    <p className="text-sm text-gray-600 mb-3">📋 {temporaryChat.projectTitle}</p>
                    <p className="text-sm text-gray-500">
                      Envie uma mensagem para iniciar a conversa
                    </p>
                  </div>
                ) : null}
              </ScrollArea>

              {/* Input de Mensagem */}
              <div className="p-4 md:p-6 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile || sending || !blockStatus.canSendMessages}
                    className="p-2"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  
                  {selectedFile && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg">
                      <span className="text-sm text-blue-700 truncate max-w-20">
                        {selectedFile.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelFile}
                        className="p-1 h-auto text-blue-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  <Input
                    placeholder={CHAT_LOCALIZATIONS.TYPE_MESSAGE}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={uploadingFile || sending || !blockStatus.canSendMessages}
                    className="flex-1"
                  />
                  
                  <Button 
                    onClick={handleSendMessage}
                    disabled={(!messageInput.trim() && !selectedFile) || uploadingFile || sending || !blockStatus.canSendMessages}
                    className="px-4"
                  >
                    {(uploadingFile || sending) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Estado Vazio - Escondido no mobile */
            <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 min-h-full">
              <div className="text-center max-w-md mx-auto p-6">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Selecione uma conversa
                </h3>
                <p className="text-gray-500">
                  Escolha uma conversa da lista para começar a trocar mensagens
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Perfil */}
      <ProfileModal
        isOpen={profileModal.isOpen}
        onClose={() => setProfileModal(prev => ({ ...prev, isOpen: false }))}
        userId={profileModal.userId}
        userName={profileModal.userName}
        userRole={profileModal.userRole}
      />

      {/* Dialogs */}
      <AlertDialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar Disputa</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, descreva o motivo da disputa. Isso ajudará os moderadores a entender melhor a situação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Motivo da disputa..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStartDispute}
              disabled={!disputeReason.trim()}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmação de bloqueio */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{CHAT_LOCALIZATIONS.CONFIRM_BLOCK.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {CHAT_LOCALIZATIONS.CONFIRM_BLOCK.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{CHAT_LOCALIZATIONS.CONFIRM_BLOCK.cancelButton}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockUser}>
              {CHAT_LOCALIZATIONS.CONFIRM_BLOCK.confirmButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmação de desbloqueio */}
      <AlertDialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{CHAT_LOCALIZATIONS.CONFIRM_UNBLOCK.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {CHAT_LOCALIZATIONS.CONFIRM_UNBLOCK.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{CHAT_LOCALIZATIONS.CONFIRM_UNBLOCK.cancelButton}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblockUser}>
              {CHAT_LOCALIZATIONS.CONFIRM_UNBLOCK.confirmButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Chat;
