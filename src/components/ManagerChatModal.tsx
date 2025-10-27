import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { ChatService } from '@/services/chatService';
import { ModerationService } from '@/services/moderationService';
import { Chat, ChatMessage } from '@/types/chat';
import { 
  Send, 
  User, 
  Bot, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ManagerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
  moderatorId: string;
  moderatorName: string;
}

const ManagerChatModal = ({ isOpen, onClose, chat, moderatorId, moderatorName }: ManagerChatModalProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');
  const [moderationAction, setModerationAction] = useState<'resolve' | 'escalate' | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chat && isOpen) {
      loadMessages();
    } else {
      setMessages([]);
      setLoading(true);
    }
  }, [chat, isOpen]);

  useEffect(() => {
    // Scroll para a última mensagem quando novas mensagens chegam
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = () => {
    if (!chat) return;

    setLoading(true);
    
    const unsubscribe = ChatService.subscribeToMessages(chat.id, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const sendSystemMessage = async () => {
    if (!chat || !systemMessage.trim() || sendingMessage) return;

    try {
      setSendingMessage(true);

      await ChatService.sendMessage(moderatorId, `🤖 ${moderatorName} (Sistema)`, 'freelancer', {
        chatId: chat.id,
        content: `🔧 **MENSAGEM DO SISTEMA**\n\n${systemMessage.trim()}`,
        type: 'text'
      });

      setSystemMessage('');
      
      toast({
        title: "Mensagem Enviada",
        description: "Mensagem do sistema enviada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem do sistema:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem do sistema",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleModerationAction = async (action: 'resolve' | 'escalate', resolution?: string) => {
    if (!chat) return;

    try {
      if (action === 'resolve') {
        // Resolver disputa
        await ChatService.resolveDispute(chat.id);
        
        // Enviar mensagem do sistema informando resolução
        if (resolution) {
          await ChatService.sendMessage(moderatorId, `🤖 ${moderatorName} (Sistema)`, 'freelancer', {
            chatId: chat.id,
            content: `✅ **DISPUTA RESOLVIDA**\n\n${resolution}`,
            type: 'text'
          });
        }

        toast({
          title: "Disputa Resolvida",
          description: "A disputa foi marcada como resolvida",
        });
      } else if (action === 'escalate') {
        // Escalar para administração
        await ChatService.sendMessage(moderatorId, `🤖 ${moderatorName} (Sistema)`, 'freelancer', {
          chatId: chat.id,
          content: "🚨 **CASO ESCALADO**\n\nEste caso foi escalado para a administração superior.",
          type: 'text'
        });

        toast({
          title: "Caso Escalado",
          description: "O caso foi escalado para administração",
        });
      }

      setModerationAction(null);
    } catch (error) {
      console.error('Erro na ação de moderação:', error);
      toast({
        title: "Erro",
        description: "Erro ao executar ação de moderação",
        variant: "destructive",
      });
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getMessageIcon = (senderName: string) => {
    if (senderName.includes('Sistema') || senderName.includes('🤖')) {
      return <Bot className="h-4 w-4 text-blue-600" />;
    }
    return <User className="h-4 w-4 text-gray-600" />;
  };

  const getMessageBadge = (senderType: string, senderName: string) => {
    if (senderName.includes('Sistema') || senderName.includes('🤖')) {
      return <Badge variant="outline" className="text-blue-600 border-blue-300">Sistema</Badge>;
    }
    
    switch (senderType) {
      case 'client':
        return <Badge variant="outline" className="text-green-600 border-green-300">Cliente</Badge>;
      case 'freelancer':
        return <Badge variant="outline" className="text-orange-600 border-orange-300">Freelancer</Badge>;
      default:
        return <Badge variant="outline">Usuário</Badge>;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendSystemMessage();
    }
  };

  if (!chat) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:max-w-[95dvw] md:max-h-[95dvh] md:rounded-lg flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b bg-gray-50">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            <span className="truncate">Conversa: {chat.projectTitle}</span>
          </DialogTitle>
          <DialogDescription>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mt-2">
              <div className="flex items-center gap-1">
                <span className="font-medium">Cliente:</span>
                <span className="truncate">{chat.clientName}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Freelancer:</span>
                <span className="truncate">{chat.freelancerName}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Criado:</span>
                <span>{chat.createdAt.toDate().toLocaleDateString()}</span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Área de mensagens */}
        <div className="flex-1 min-h-0 px-4">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-gray-500">Carregando mensagens...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-gray-500">Nenhuma mensagem encontrada</div>
              </div>
            ) : (
              <div className="space-y-4 p-4">
                {messages.map((message) => (
                  <Card key={message.id} className={`p-3 ${
                    message.senderName.includes('Sistema') || message.senderName.includes('🤖')
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-white'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getMessageIcon(message.senderName)}
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{message.senderName}</span>
                          {getMessageBadge(message.senderType, message.senderName)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {formatMessageTime(message.timestamp)}
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                      {message.content}
                    </div>
                    
                    {(message as any).attachments && (message as any).attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(message as any).attachments.map((attachment: any, index: number) => (
                          <a 
                            key={index} 
                            href={attachment.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm block"
                          >
                            📎 {attachment.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Área de envio de mensagem do sistema */}
        <div className="border-t bg-gray-50 p-4 space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600" />
              Enviar Mensagem do Sistema
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Textarea
                placeholder="Digite uma mensagem oficial do sistema..."
                value={systemMessage}
                onChange={(e) => setSystemMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 min-h-[60px]"
                rows={2}
              />
              <Button 
                onClick={sendSystemMessage}
                disabled={!systemMessage.trim() || sendingMessage}
                className="bg-blue-600 hover:bg-blue-700 sm:self-start h-[60px] px-6"
              >
                {sendingMessage ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Enviar</span>
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Pressione Enter para enviar ou Shift+Enter para nova linha
            </p>
          </div>

          {/* Ações de moderação */}
          {chat.isDisputed && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="font-medium">Ações de Moderação</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setModerationAction('resolve')}
                  className="text-green-600 border-green-300 hover:bg-green-50 justify-start"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolver Disputa
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setModerationAction('escalate')}
                  className="text-red-600 border-red-300 hover:bg-red-50 justify-start"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Escalar Caso
                </Button>
              </div>

              {moderationAction === 'resolve' && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <label className="text-sm font-medium block mb-2">Resolução da Disputa:</label>
                  <Textarea
                    placeholder="Descreva como a disputa foi resolvida..."
                    onBlur={(e) => {
                      const resolution = e.target.value;
                      if (resolution.trim()) {
                        handleModerationAction('resolve', resolution);
                      } else {
                        setModerationAction(null);
                      }
                    }}
                    rows={3}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Digite a resolução e clique fora da caixa para confirmar
                  </p>
                </div>
              )}

              {moderationAction === 'escalate' && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700 mb-2">
                    Tem certeza que deseja escalar este caso para a administração superior?
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => handleModerationAction('escalate')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Confirmar Escalação
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setModerationAction(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {messages.length} mensagem{messages.length !== 1 ? 's' : ''}
          </div>
          <Button variant="outline" onClick={onClose} className="px-6">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManagerChatModal;