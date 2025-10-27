import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  X, 
  Minimize2, 
  Send, 
  Users,
  Shield,
  MoreVertical,
  Ban,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { useUserChats, useChatMessages, useSendMessage } from '@/hooks/useChat';
import { useAppSelector } from '@/hooks/redux';
import { Chat as ChatType } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CHAT_LOCALIZATIONS } from '@/utils/chatLocalizations';
import { ModerationService } from '@/services/moderationService';
import { ModerationRequest } from '@/types/moderation';
import { ChatService } from '@/services/chatService';
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

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [moderationRequests, setModerationRequests] = useState<Map<string, ModerationRequest>>(new Map());
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [blockStatus, setBlockStatus] = useState({
    isBlocked: false,
    currentUserBlocked: false,
    otherUserBlocked: false,
    canSendMessages: true,
    canUnblockOther: false,
  });
  
  const { chats, loading: chatsLoading } = useUserChats();
  const { messages, loading: messagesLoading } = useChatMessages(selectedChat?.id || null);
  const { sendMessage, sending } = useSendMessage();
  const currentUser = useAppSelector(state => state.auth.user);
  const currentUserProfile = useAppSelector(state => state.auth.userProfile);
  const isAuthLoading = useAppSelector(state => state.auth.isLoading);
  const isClient = currentUserProfile?.role === 'client';

  // Carregar solicitações de moderação para cada chat
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

  // Carregar status de bloqueio quando o chat for selecionado
  useEffect(() => {
    const loadBlockStatus = async () => {
      if (!selectedChat || !currentUser) return;
      try {
        const status = await ChatService.getChatBlockStatus(selectedChat.id, currentUser.uid);
        setBlockStatus(status);
      } catch (err) {
        // silencioso
      }
    };
    loadBlockStatus();
  }, [selectedChat, currentUser]);

  // Não renderizar se o usuário não estiver logado ou ainda estiver carregando
  if (isAuthLoading || !currentUser || !currentUserProfile) {
    return null;
  }

  const handleSendMessage = async () => {
    if (!selectedChat || !messageInput.trim()) return;
    
    await sendMessage(selectedChat.id, messageInput);
    setMessageInput('');
  };

  const getOtherParticipant = (chat: ChatType) => {
    const isClient = chat.clientId === currentUser?.uid;
    return {
      id: isClient ? chat.freelancerId : chat.clientId,
      name: isClient ? chat.freelancerName : chat.clientName,
      role: isClient ? 'freelancer' : 'client'
    };
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  };

  const totalUnreadMessages = chats.reduce((total, chat) => {
    const isClient = chat.clientId === currentUser?.uid;
    const unreadForUser = isClient ? chat.unreadCount.client : chat.unreadCount.freelancer;
    return total + unreadForUser;
  }, 0);

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg relative"
        >
          <MessageCircle className="h-6 w-6 text-white" />
          {totalUnreadMessages > 0 && (
            <Badge className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {totalUnreadMessages > 9 ? '9+' : totalUnreadMessages}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Card className="w-80 h-96 shadow-xl">
        {/* Header */}
        <CardHeader className="p-3 bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">
                {selectedChat ? getOtherParticipant(selectedChat).name : CHAT_LOCALIZATIONS.CONVERSATIONS}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {selectedChat && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white hover:bg-blue-700">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{CHAT_LOCALIZATIONS.CHAT_ACTIONS}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
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
                      <DropdownMenuItem onClick={async () => {
                        if (!selectedChat) return;
                        try { await ChatService.releaseFunds(selectedChat.id); } catch {}
                      }}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        {CHAT_LOCALIZATIONS.RELEASE_FUNDS}
                      </DropdownMenuItem>
                    )}
                    {!selectedChat?.isDisputed && (
                      <DropdownMenuItem onClick={() => setShowDisputeDialog(true)}>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {CHAT_LOCALIZATIONS.START_DISPUTE}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {selectedChat && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedChat(null)}
                  className="h-6 w-6 p-0 text-white hover:bg-blue-700"
                >
                  ←
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0 text-white hover:bg-blue-700"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0 text-white hover:bg-blue-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 h-80 flex flex-col">
            {!selectedChat ? (
              /* Lista de Conversas */
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {chatsLoading ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      {CHAT_LOCALIZATIONS.LOADING}
                    </div>
                  ) : chats.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>{CHAT_LOCALIZATIONS.NO_CONVERSATIONS}</p>
                    </div>
                  ) : (
                    chats.slice(0, 5).map((chat) => {
                      const otherParticipant = getOtherParticipant(chat);
                      const moderationRequest = moderationRequests.get(chat.id);
                      
                      return (
                        <div
                          key={chat.id}
                          onClick={() => setSelectedChat(chat)}
                          className={`p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                            moderationRequest ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                                  {otherParticipant.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {/* Badge de Moderação */}
                              {moderationRequest && (
                                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                                  moderationRequest.status === 'pending' ? 'bg-yellow-500' :
                                  moderationRequest.status === 'assigned' ? 'bg-blue-500' :
                                  moderationRequest.status === 'resolved' ? 'bg-green-500' :
                                  'bg-red-500'
                                }`}>
                                  <Shield className="h-2 w-2 text-white" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <h4 className="font-medium text-sm text-gray-900 truncate">
                                    {otherParticipant.name}
                                  </h4>
                                  {moderationRequest && (
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs px-1 py-0 ${
                                        moderationRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        moderationRequest.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                                        moderationRequest.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                      }`}
                                    >
                                      <Shield className="h-2 w-2 mr-1" />
                                      {moderationRequest.status === 'pending' && 'MOD'}
                                      {moderationRequest.status === 'assigned' && 'MOD'}
                                      {moderationRequest.status === 'resolved' && 'OK'}
                                      {moderationRequest.status === 'rejected' && 'REJ'}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatMessageTime(chat.lastMessageAt)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 truncate">
                                {moderationRequest ? 
                                  `🛡️ Sob moderação - ${chat.lastMessage || CHAT_LOCALIZATIONS.CONVERSATION_STARTED}` :
                                  chat.lastMessage || CHAT_LOCALIZATIONS.CONVERSATION_STARTED
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            ) : (
              /* Conversa Selecionada */
              <>
                <ScrollArea className="flex-1 p-2">
                  {messagesLoading ? (
                    <div className="text-center text-gray-500 text-sm p-4">
                      {CHAT_LOCALIZATIONS.LOADING}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm p-4">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>{CHAT_LOCALIZATIONS.NO_MESSAGES}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.slice(-10).map((message) => {
                        const isOwn = message.senderId === currentUser?.uid;
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                              isOwn 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-900'
                            }`}>
                              <p>{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                isOwn ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {formatMessageTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Input de Mensagem */}
                <div className="p-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={CHAT_LOCALIZATIONS.TYPE_MESSAGE}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1 h-8 text-sm"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sending}
                      size="sm"
                      className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>

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
            <AlertDialogAction onClick={async () => {
              if (!selectedChat || !currentUser) return;
              try {
                const otherUserId = isClient ? selectedChat.freelancerId : selectedChat.clientId;
                await ChatService.blockUser(selectedChat.id, otherUserId);
              } finally {
                setShowBlockDialog(false);
              }
            }}>
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
            <AlertDialogAction onClick={async () => {
              if (!selectedChat || !currentUser) return;
              try {
                const otherUserId = isClient ? selectedChat.freelancerId : selectedChat.clientId;
                await ChatService.unblockUser(selectedChat.id, otherUserId);
              } finally {
                setShowUnblockDialog(false);
              }
            }}>
              {CHAT_LOCALIZATIONS.CONFIRM_UNBLOCK.confirmButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Iniciar disputa */}
      <AlertDialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{CHAT_LOCALIZATIONS.START_DISPUTE}</AlertDialogTitle>
            <AlertDialogDescription>
              {CHAT_LOCALIZATIONS.CONFIRM_DISPUTE_DESCRIPTION}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Motivo da disputa..." />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{CHAT_LOCALIZATIONS.CONFIRM_BLOCK.cancelButton}</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!selectedChat || !disputeReason.trim()) return;
              try { await ChatService.startDispute(selectedChat.id, disputeReason); } finally {
                setShowDisputeDialog(false); setDisputeReason("");
              }
            }}>
              {CHAT_LOCALIZATIONS.CONFIRM_BLOCK.confirmButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FloatingChat;
