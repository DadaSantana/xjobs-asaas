import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/hooks/redux';
import { ChatService } from '@/services/chatService';
import { ModerationService } from '@/services/moderationService';
import { Chat } from '@/types/chat';
import { ModerationRequest } from '@/types/moderation';
import ManagerChatModal from '@/components/ManagerChatModal';
import { 
  MessageSquare, 
  Search,
  Calendar,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Shield,
  Download,
  FileText,
  File
} from 'lucide-react';
import { exportChatToTxt, exportChatToPdf } from '@/utils/chatExport';

interface ChatWithModeration extends Chat {
  moderationRequest?: ModerationRequest;
  status: 'active' | 'disputed' | 'resolved' | 'blocked' | 'moderated';
}

const ManagerChats = () => {
  const { toast } = useToast();
  const userProfile = useAppSelector(state => state.auth.userProfile);
  
  const [chats, setChats] = useState<ChatWithModeration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [exportingChat, setExportingChat] = useState<string | null>(null);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      setLoading(true);
      
      // Carregar todos os chats
      const allChats = await ChatService.getAllChats();
      
      // Para cada chat, carregar informações de moderação
      const chatsWithModeration = await Promise.all(
        allChats.map(async (chat) => {
          try {
            const moderationRequest = await ModerationService.getPendingModerationForChat(chat.id);
            
            // Determinar status baseado na moderação e outras condições
            let status: 'active' | 'disputed' | 'resolved' | 'blocked' | 'moderated' = 'active';
            
            // Verificação segura para campos que podem estar undefined
            const blockedUsers = Array.isArray(chat.blockedUsers) ? chat.blockedUsers : [];
            const isDisputed = chat.isDisputed === true;
            
            if (blockedUsers.length > 0) {
              status = 'blocked';
            } else if (isDisputed) {
              status = 'disputed';
            } else if (moderationRequest) {
              if (moderationRequest.status === 'resolved') {
                status = 'resolved';
              } else {
                status = 'moderated';
              }
            }
            
            return {
              ...chat,
              blockedUsers, // Garantir que seja sempre um array
              isDisputed,   // Garantir que seja sempre boolean
              moderationRequest,
              status
            } as ChatWithModeration;
          } catch (error) {
            console.error(`Erro ao carregar moderação para chat ${chat.id}:`, error);
            
            // Fallback seguro em caso de erro
            const blockedUsers = Array.isArray(chat.blockedUsers) ? chat.blockedUsers : [];
            const isDisputed = chat.isDisputed === true;
            
            return {
              ...chat,
              blockedUsers,
              isDisputed,
              status: isDisputed ? 'disputed' : blockedUsers.length > 0 ? 'blocked' : 'active'
            } as ChatWithModeration;
          }
        })
      );
      
      setChats(chatsWithModeration);
    } catch (error) {
      console.error('Erro ao carregar chats:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar conversas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default' as const, label: 'Ativo', icon: MessageSquare },
      disputed: { variant: 'destructive' as const, label: 'Em Disputa', icon: AlertTriangle },
      resolved: { variant: 'secondary' as const, label: 'Resolvido', icon: CheckCircle },
      blocked: { variant: 'outline' as const, label: 'Bloqueado', icon: XCircle },
      moderated: { variant: 'secondary' as const, label: 'Sob Moderação', icon: Shield }
    };
    
    const config = variants[status as keyof typeof variants] || variants.active;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = 
      chat.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.freelancerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.projectTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'all' || chat.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const handleViewChat = (chat: Chat) => {
    setSelectedChat(chat);
    setShowChatModal(true);
  };

  const handleModerateChat = async (chat: Chat) => {
    try {
      if (!userProfile) return;

      // Verificar se já existe uma solicitação de moderação para este chat
      let moderationRequest = await ModerationService.getPendingModerationForChat(chat.id);
      
      // Se não existir, criar uma nova solicitação
      if (!moderationRequest) {
        const requestId = await ModerationService.createModerationRequest(
          chat.id,
          userProfile.uid,
          userProfile.name || 'Moderador',
          'client', // Tipo padrão para solicitações criadas por moderadores
          'Moderação iniciada pelo painel administrativo'
        );
        
        // Buscar a solicitação criada
        moderationRequest = await ModerationService.getPendingModerationForChat(chat.id);
      }

      // Atribuir moderação para o usuário atual
      if (moderationRequest) {
        await ModerationService.assignModerator(
          moderationRequest.id, 
          userProfile.uid, 
          userProfile.name || 'Moderador'
        );
        
        toast({
          title: "Moderação Atribuída",
          description: "Você foi atribuído para moderar esta conversa",
        });
      }
      
      // Abrir o modal para visualizar a conversa
      handleViewChat(chat);
    } catch (error) {
      console.error('Erro ao atribuir moderação:', error);
      toast({
        title: "Erro",
        description: "Erro ao atribuir moderação",
        variant: "destructive",
      });
    }
  };

  const handleExportChat = async (chat: Chat, format: 'txt' | 'pdf') => {
    try {
      setExportingChat(chat.id);
      
      // Obter todas as mensagens do chat
      const messages = await ChatService.getChatMessages(chat.id);
      
      if (format === 'txt') {
        exportChatToTxt(chat, messages);
      } else {
        await exportChatToPdf(chat, messages);
      }
      
      toast({
        title: "Exportação Concluída",
        description: `Conversa exportada em formato ${format.toUpperCase()} com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao exportar conversa:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar conversa",
        variant: "destructive",
      });
    } finally {
      setExportingChat(null);
    }
  };

  const handleExportAllChats = async (format: 'txt' | 'pdf') => {
    try {
      if (filteredChats.length === 0) {
        toast({
          title: "Aviso",
          description: "Não há conversas para exportar",
          variant: "destructive",
        });
        return;
      }

      setExportingChat('all');
      
      // Exportar cada conversa
      for (const chat of filteredChats) {
        try {
          const messages = await ChatService.getChatMessages(chat.id);
          
          if (format === 'txt') {
            exportChatToTxt(chat, messages);
            // Pequeno delay para evitar sobrecarga
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            await exportChatToPdf(chat, messages);
            // Pequeno delay para evitar sobrecarga
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Erro ao exportar conversa ${chat.id}:`, error);
        }
      }
      
      toast({
        title: "Exportação Concluída",
        description: `${filteredChats.length} conversa(s) exportada(s) em formato ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Erro ao exportar conversas:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar conversas",
        variant: "destructive",
      });
    } finally {
      setExportingChat(null);
    }
  };

  const stats = {
    total: chats.length,
    active: chats.filter(c => c.status === 'active').length,
    disputed: chats.filter(c => c.status === 'disputed').length,
    resolved: chats.filter(c => c.status === 'resolved').length,
    blocked: chats.filter(c => c.status === 'blocked').length,
    moderated: chats.filter(c => c.status === 'moderated').length
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Moderação de Chats</h1>
        <p className="text-sm md:text-base text-gray-600">Monitore e modere conversas da plataforma</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-6 mb-6 md:mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Todas as conversas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Conversas normais
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Moderadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.moderated}</div>
            <p className="text-xs text-muted-foreground">
              Sob moderação
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Disputas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.disputed}</div>
            <p className="text-xs text-muted-foreground">
              Precisam atenção
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              Resolvidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">
              Disputas solucionadas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-600" />
              Bloqueados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.blocked}</div>
            <p className="text-xs text-muted-foreground">
              Conversas suspensas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Exportação */}
      <Card className="mb-4 md:mb-6">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, email ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm md:text-base"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportAllChats('txt')}
                disabled={filteredChats.length === 0 || exportingChat === 'all'}
                className="text-xs md:text-sm"
              >
                {exportingChat === 'all' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                  <>
                    <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                    <span className="hidden sm:inline">Exportar TXT</span>
                    <span className="sm:hidden">TXT</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportAllChats('pdf')}
                disabled={filteredChats.length === 0 || exportingChat === 'all'}
                className="text-xs md:text-sm"
              >
                {exportingChat === 'all' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                  <>
                    <File className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                    <span className="hidden sm:inline">Exportar PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Status */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1">
          <TabsTrigger value="all" className="text-xs md:text-sm px-2 md:px-4">Todas ({stats.total})</TabsTrigger>
          <TabsTrigger value="active" className="text-xs md:text-sm px-2 md:px-4">Ativas ({stats.active})</TabsTrigger>
          <TabsTrigger value="moderated" className="text-xs md:text-sm px-2 md:px-4">Moderadas ({stats.moderated})</TabsTrigger>
          <TabsTrigger value="disputed" className="text-xs md:text-sm px-2 md:px-4">Disputas ({stats.disputed})</TabsTrigger>
          <TabsTrigger value="resolved" className="text-xs md:text-sm px-2 md:px-4">Resolvidas ({stats.resolved})</TabsTrigger>
          <TabsTrigger value="blocked" className="text-xs md:text-sm px-2 md:px-4">Bloqueadas ({stats.blocked})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversas ({filteredChats.length})
              </CardTitle>
              <CardDescription>
                Lista de conversas entre clientes e freelancers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredChats.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma conversa encontrada
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm 
                      ? 'Tente ajustar os termos de busca'
                      : activeTab === 'disputed' 
                        ? 'Não há conversas em disputa no momento'
                        : 'Nenhuma conversa nesta categoria'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredChats.map((chat) => (
                    <div key={chat.id} className="border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col gap-2 mb-2">
                            <div className="flex items-center gap-1 md:gap-2 min-w-0">
                              <Users className="h-3 w-3 md:h-4 md:w-4 text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-sm md:text-base truncate max-w-[120px] sm:max-w-none">
                                {chat.clientName}
                              </span>
                              <span className="text-gray-400 text-sm md:text-base flex-shrink-0">↔</span>
                              <span className="font-medium text-sm md:text-base truncate max-w-[120px] sm:max-w-none">
                                {chat.freelancerName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {getStatusBadge(chat.status)}
                              {chat.moderationRequest && (
                                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                  <Shield className="h-3 w-3" />
                                  <span className="hidden sm:inline">
                                    {chat.moderationRequest.status === 'pending' && 'Moderação Pendente'}
                                    {chat.moderationRequest.status === 'assigned' && 'Sob Análise'}
                                    {chat.moderationRequest.status === 'resolved' && 'Moderação Resolvida'}
                                    {chat.moderationRequest.status === 'rejected' && 'Moderação Rejeitada'}
                                  </span>
                                  <span className="sm:hidden">
                                    {chat.moderationRequest.status === 'pending' && 'Pendente'}
                                    {chat.moderationRequest.status === 'assigned' && 'Análise'}
                                    {chat.moderationRequest.status === 'resolved' && 'Resolvida'}
                                    {chat.moderationRequest.status === 'rejected' && 'Rejeitada'}
                                  </span>
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-xs md:text-sm text-gray-600 mb-2 space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                              <span className="font-medium flex-shrink-0">Projeto:</span> 
                              <span className="truncate">{chat.projectTitle}</span>
                            </div>
                            {chat.lastMessage && (
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                <span className="font-medium flex-shrink-0">Última mensagem:</span> 
                                <span className="truncate">{chat.lastMessage.length > 60 ? `${chat.lastMessage.substring(0, 60)}...` : chat.lastMessage}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-1 text-xs text-gray-500">
                            {chat.lastMessageAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{chat.lastMessageAt.toDate().toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">Criado em {chat.createdAt.toDate().toLocaleDateString()}</span>
                            </div>
                            {chat.disputeReason && (
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                                <span className="truncate">{chat.disputeReason}</span>
                              </div>
                            )}
                            {chat.moderationRequest && (
                              <div className="flex items-center gap-1">
                                <Shield className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                <span className="truncate">Moderador: {chat.moderationRequest.moderatorName || 'Não atribuído'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewChat(chat)}
                            className="text-xs md:text-sm"
                          >
                            <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            <span className="hidden sm:inline">Ver Conversa</span>
                            <span className="sm:hidden">Ver</span>
                          </Button>
                          
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportChat(chat, 'txt')}
                              disabled={exportingChat === chat.id}
                              className="text-xs md:text-sm"
                              title="Exportar como TXT"
                            >
                              {exportingChat === chat.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                              ) : (
                                <FileText className="h-3 w-3 md:h-4 md:w-4" />
                              )}
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportChat(chat, 'pdf')}
                              disabled={exportingChat === chat.id}
                              className="text-xs md:text-sm"
                              title="Exportar como PDF"
                            >
                              {exportingChat === chat.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                              ) : (
                                <File className="h-3 w-3 md:h-4 md:w-4" />
                              )}
                            </Button>
                          </div>
                          
                          {chat.status === 'disputed' && (
                            <Button 
                              size="sm"
                              onClick={() => handleModerateChat(chat)}
                              className="bg-blue-600 hover:bg-blue-700 text-xs md:text-sm"
                            >
                              <Shield className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                              Moderar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de visualização de chat */}
      <ManagerChatModal
        isOpen={showChatModal}
        onClose={() => {
          setShowChatModal(false);
          setSelectedChat(null);
          // Recarregar chats para atualizar status
          loadChats();
        }}
        chat={selectedChat}
        moderatorId={userProfile?.uid || ''}
        moderatorName={userProfile?.name || 'Moderador'}
      />
    </div>
  );
};

export default ManagerChats;