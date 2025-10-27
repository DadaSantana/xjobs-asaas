import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Shield, AlertTriangle, DollarSign, Ban, UserPlus, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/hooks/redux";
import { ChatService } from "@/services/chatService";
import { Chat, ChatMessage, CreateChatData } from "@/types/chat";
import { Project } from "@/types/project";
import { CHAT_LOCALIZATIONS } from "@/utils/chatLocalizations";
import { ChatBlockStatus } from "@/components/ChatBlockStatus";
import { FundReleaseModal } from "./FundReleaseModal";
import { CreateDisputeModal } from "./CreateDisputeModal";
import { ModerationStatus } from "./ModerationStatus";
import { ModerationService } from "@/services/moderationService";
import { ModerationRequest } from "@/types/moderation";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export const ChatModal = ({ isOpen, onClose, project }: ChatModalProps) => {
  const { toast } = useToast();
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showModeratorDialog, setShowModeratorDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [showFundReleaseModal, setShowFundReleaseModal] = useState(false);
  const [showCreateDisputeModal, setShowCreateDisputeModal] = useState(false);
  const [moderationRequest, setModerationRequest] = useState<ModerationRequest | null>(null);
  
  // Estados para controle de bloqueio
  const [blockStatus, setBlockStatus] = useState({
    isBlocked: false,
    currentUserBlocked: false,
    otherUserBlocked: false,
    canSendMessages: true,
    canUnblockOther: false
  });

  // Determinar tipo de usuário
  const userType = userProfile?.uid === project.clientId ? 'client' : 'freelancer';
  const otherUserName = userType === 'client' ? project.clientName : project.clientName;
  const isModerator = chat?.moderatorId === userProfile?.uid;

  // Scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Carregar status de bloqueio
  const loadBlockStatus = async () => {
    if (!chat || !userProfile) return;
    
    try {
      const status = await ChatService.getChatBlockStatus(chat.id, userProfile.uid);
      setBlockStatus(status);
    } catch (error) {
      console.error('Erro ao carregar status de bloqueio:', error);
    }
  };

  // Inicializar chat quando modal abre
  useEffect(() => {
    if (isOpen && userProfile && project) {
      initializeChat();
    }
  }, [isOpen, userProfile, project]);

  // Scroll para baixo quando mensagens mudam
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar status de bloqueio quando chat mudar
  useEffect(() => {
    loadBlockStatus();
    loadModerationRequest();
  }, [chat, userProfile]);

  // Carregar solicitação de moderação
  const loadModerationRequest = async () => {
    if (!chat) return;
    
    try {
      const request = await ModerationService.getPendingModerationForChat(chat.id);
      setModerationRequest(request);
    } catch (error) {
      console.error('Erro ao carregar solicitação de moderação:', error);
    }
  };

  // Subscription para atualizações em tempo real da moderação
  useEffect(() => {
    if (!chat) return;

    const unsubscribe = ModerationService.subscribeToModerationRequestForChat(
      chat.id,
      (request) => {
        setModerationRequest(request);
      }
    );

    return unsubscribe;
  }, [chat]);

  const initializeChat = async () => {
    if (!userProfile) return;
    
    try {
      setIsInitializing(true);
      
      const chatData: CreateChatData = {
        projectId: project.id,
        projectTitle: project.title,
        clientId: project.clientId,
        clientName: project.clientName,
        freelancerId: userProfile.uid,
        freelancerName: userProfile.name
      };
      
      const chatId = await ChatService.getOrCreateChat(chatData);
      
      // Obter dados do chat
      const chatDetails = await ChatService.getChatById(chatId);
      setChat(chatDetails);
      
      // Subscrever às mensagens
      const unsubscribeMessages = ChatService.subscribeToMessages(chatId, (newMessages) => {
        setMessages(newMessages);
      });
      
      // Marcar como lidas quando abrir
      if (chatDetails) {
        await ChatService.markMessagesAsRead(chatId, userProfile.uid, userType);
      }
      
      // Cleanup ao fechar
      return () => {
        unsubscribeMessages();
      };
      
    } catch (error) {
      console.error('Erro ao inicializar chat:', error);
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.ERROR,
        description: CHAT_LOCALIZATIONS.TOASTS.CHAT_INIT_ERROR,
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chat || !userProfile || isSending) return;

    // Verificar se pode enviar mensagens
    if (!blockStatus.canSendMessages) {
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.ERROR,
        description: CHAT_LOCALIZATIONS.TOASTS.USER_BLOCKED_ERROR,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSending(true);
      
      await ChatService.sendMessage(
        userProfile.uid,
        userProfile.name,
        userType,
        {
          chatId: chat.id,
          content: newMessage
        }
      );
      
      setNewMessage("");
      
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      
      let errorMessage = CHAT_LOCALIZATIONS.TOASTS.SEND_MESSAGE_ERROR;
      
      if (error.message?.includes('bloqueado')) {
        errorMessage = CHAT_LOCALIZATIONS.TOASTS.USER_BLOCKED_ERROR;
      } else if (error.message?.includes('não está mais ativa')) {
        errorMessage = CHAT_LOCALIZATIONS.TOASTS.CHAT_INACTIVE_ERROR;
      }
      
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.ERROR,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: any) => {
    try {
      if (!timestamp) return "";
      
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      if (isToday) {
        return format(date, "HH:mm", { locale: ptBR });
      } else {
        return format(date, "dd/MM HH:mm", { locale: ptBR });
      }
    } catch (error) {
      return "";
    }
  };

  const handleBlockUser = async () => {
    if (!chat || !userProfile) return;
    
    try {
      const otherUserId = userType === 'client' ? chat.freelancerId : chat.clientId;
      await ChatService.blockUser(chat.id, otherUserId);
      
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
    if (!chat || !userProfile) return;
    
    try {
      const otherUserId = userType === 'client' ? chat.freelancerId : chat.clientId;
      await ChatService.unblockUser(chat.id, otherUserId);
      
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
    if (!chat || !disputeReason.trim()) return;
    
    try {
      await ChatService.startDispute(chat.id, disputeReason);
      setShowDisputeDialog(false);
      setDisputeReason("");
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.DISPUTE_STARTED,
        description: CHAT_LOCALIZATIONS.TOASTS.DISPUTE_STARTED_SUCCESS,
      });
    } catch (error) {
      console.error('Erro ao iniciar disputa:', error);
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.ERROR,
        description: CHAT_LOCALIZATIONS.TOASTS.DISPUTE_ERROR,
        variant: "destructive",
      });
    }
  };

  const handleReleaseFunds = () => {
    if (!chat || userType !== 'client') return;
    setShowFundReleaseModal(true);
  };

  const handleRequestModerator = async () => {
    if (!chat || !userProfile) return;
    
    try {
      await ChatService.requestModerator(
        chat.id, 
        userProfile.uid, 
        userProfile.name, 
        userType
      );
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.MODERATOR_REQUESTED,
        description: CHAT_LOCALIZATIONS.TOASTS.MODERATOR_REQUESTED_SUCCESS,
      });
      setShowModeratorDialog(false);
      
      // Recarregar dados para mostrar o status da solicitação
      await loadModerationRequest();
      
    } catch (error) {
      console.error('Erro ao solicitar moderador:', error);
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.ERROR,
        description: CHAT_LOCALIZATIONS.TOASTS.MODERATOR_ERROR,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:max-w-4xl md:h-[80dvh] md:rounded-lg flex flex-col p-0">
          <DialogHeader className="p-4 md:p-6 border-b">
            <DialogTitle className="flex items-center justify-between text-sm md:text-base">
              <div className="flex items-center gap-3">
                <span>{CHAT_LOCALIZATIONS.CHAT_TITLE} - {project.title}</span>
                {/* Badge de Moderação no Cabeçalho */}
                {moderationRequest && (
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border-2 ${
                    moderationRequest.status === 'pending' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                    moderationRequest.status === 'assigned' ? 'bg-blue-100 border-blue-300 text-blue-800' :
                    moderationRequest.status === 'resolved' ? 'bg-green-100 border-green-300 text-green-800' :
                    'bg-red-100 border-red-300 text-red-800'
                  }`}>
                    <Shield className="h-3 w-3" />
                    {moderationRequest.status === 'pending' && 'MODERAÇÃO SOLICITADA'}
                    {moderationRequest.status === 'assigned' && 'SOB MODERAÇÃO'}
                    {moderationRequest.status === 'resolved' && 'MODERAÇÃO CONCLUÍDA'}
                    {moderationRequest.status === 'rejected' && 'MODERAÇÃO REJEITADA'}
                  </div>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Status de Bloqueio */}
          <ChatBlockStatus
            isBlocked={blockStatus.isBlocked}
            currentUserBlocked={blockStatus.currentUserBlocked}
            otherUserBlocked={blockStatus.otherUserBlocked}
            canUnblockOther={blockStatus.canUnblockOther}
            otherUserName={otherUserName}
            onUnblock={() => setShowUnblockDialog(true)}
          />

          {/* Status de Moderação */}
          {moderationRequest && (
            <div className="px-4">
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

          <ScrollArea className="flex-1 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderId === userProfile?.uid ? "justify-end" : "justify-start"
                } mb-4`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.senderId === userProfile?.uid
                      ? "bg-blue-500 text-white"
                      : message.senderType === 'moderator'
                      ? "bg-yellow-500 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{message.senderName}</span>
                    {message.senderType === 'moderator' && (
                      <Shield className="h-4 w-4" />
                    )}
                  </div>
                  <p>{message.content}</p>
                  <span className="text-xs opacity-70">
                    {format(message.timestamp.toDate(), "HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={CHAT_LOCALIZATIONS.TYPE_MESSAGE}
                onKeyPress={handleKeyPress}
                disabled={isSending || isLoading || !blockStatus.canSendMessages}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isSending || isLoading || !newMessage.trim() || !blockStatus.canSendMessages}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
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
                  
                  <DropdownMenuItem onClick={() => setShowModeratorDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {CHAT_LOCALIZATIONS.REQUEST_MODERATOR}
                  </DropdownMenuItem>
                  {userType === 'client' && !chat?.fundsReleased && (
                    <DropdownMenuItem onClick={handleReleaseFunds}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      {CHAT_LOCALIZATIONS.RELEASE_FUNDS}
                    </DropdownMenuItem>
                  )}
                  {!chat?.isDisputed && (
                    <DropdownMenuItem onClick={() => setShowCreateDisputeModal(true)}>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      {CHAT_LOCALIZATIONS.START_DISPUTE}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      <AlertDialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{CHAT_LOCALIZATIONS.CONFIRM_DISPUTE.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {CHAT_LOCALIZATIONS.CONFIRM_DISPUTE.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder={CHAT_LOCALIZATIONS.DISPUTE_REASON_PLACEHOLDER}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{CHAT_LOCALIZATIONS.CONFIRM_DISPUTE.cancelButton}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStartDispute}
              disabled={!disputeReason.trim()}
            >
              {CHAT_LOCALIZATIONS.CONFIRM_DISPUTE.confirmButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showModeratorDialog} onOpenChange={setShowModeratorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{CHAT_LOCALIZATIONS.CONFIRM_MODERATOR.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {CHAT_LOCALIZATIONS.CONFIRM_MODERATOR.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{CHAT_LOCALIZATIONS.CONFIRM_MODERATOR.cancelButton}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequestModerator}>
              {CHAT_LOCALIZATIONS.CONFIRM_MODERATOR.confirmButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Liberação de Fundos */}
      {chat && userProfile && (
        <FundReleaseModal
          isOpen={showFundReleaseModal}
          onClose={() => setShowFundReleaseModal(false)}
          projectId={project.id}
          projectTitle={project.title}
          projectValue={typeof project.budget === 'number' ? project.budget : (project.budget?.min || 0)}
          chatId={chat.id}
          clientId={project.clientId}
          clientName={project.clientName}
          freelancerId={userProfile.uid}
          freelancerName={userProfile.name}
          onReleaseComplete={() => {
            setShowFundReleaseModal(false);
            // Recarregar chat para atualizar status
            if (chat) {
              loadBlockStatus();
            }
          }}
        />
      )}

      {/* Modal de Criar Disputa */}
      {chat && userProfile && (
        <CreateDisputeModal
          isOpen={showCreateDisputeModal}
          onClose={() => setShowCreateDisputeModal(false)}
          chatId={chat.id}
          projectId={project.id}
          projectValue={typeof project.budget === 'number' ? project.budget : (project.budget?.min || 0)}
          initiatedBy={userProfile.uid}
          initiatedByName={userProfile.name}
          initiatedByType={userType}
          onDisputeCreated={() => {
            setShowCreateDisputeModal(false);
            // Recarregar chat para atualizar status
            if (chat) {
              loadBlockStatus();
            }
          }}
        />
      )}
    </>
  );
}; 