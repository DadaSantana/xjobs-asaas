import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { AdminService, SystemLog } from '@/services/adminService';
import { EmailService } from '@/services/emailService';
import { 
  MessageSquare, 
  Mail,
  Calendar,
  User,
  Clock,
  Send,
  Eye,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SupportRequest extends SystemLog {
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  response?: string;
  respondedAt?: Date;
  respondedBy?: string;
  details?: {
    userName: string;
    userEmail: string;
    subject: string;
    message: string;
    confirmationSent: boolean;
    requestDate: string;
    requestTime: string;
  };
}

const ManagerSupport: React.FC = () => {
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [responseText, setResponseText] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const { toast } = useToast();

  const fetchSupportRequests = async () => {
    try {
      setLoading(true);
      const logs = await AdminService.getSystemLogs(100, false);
      
      // Filtrar apenas logs de suporte
      const supportLogs = logs
        .filter(log => 
          log.title?.toLowerCase().includes('suporte') || 
          log.metadata?.type === 'support_request' ||
          log.source === 'support_system'
        )
        .map(log => ({
          ...log,
          userName: log.metadata?.userName || 'Usuário não identificado',
          userEmail: log.metadata?.userEmail || '',
          subject: log.metadata?.subject || log.title,
          message: log.metadata?.message || log.message,
          status: (log.metadata?.status as 'pending' | 'in_progress' | 'resolved' | 'closed') || 'pending',
          response: log.metadata?.response,
          respondedAt: log.metadata?.respondedAt,
          respondedBy: log.metadata?.respondedBy,
          details: {
            userName: log.metadata?.userName || 'Usuário não identificado',
            userEmail: log.metadata?.userEmail || '',
            subject: log.metadata?.subject || log.title,
            message: log.metadata?.message || log.message,
            confirmationSent: log.metadata?.confirmationSent || false,
            requestDate: log.metadata?.requestDate || format(log.timestamp, 'dd/MM/yyyy'),
            requestTime: log.metadata?.requestTime || format(log.timestamp, 'HH:mm')
          }
        } as SupportRequest))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setSupportRequests(supportLogs);
      setFilteredRequests(supportLogs);
    } catch (error) {
      console.error('Erro ao buscar solicitações de suporte:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as solicitações de suporte.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportRequests();
  }, []);

  useEffect(() => {
    let filtered = supportRequests;

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(request => 
        request.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.message?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  }, [supportRequests, searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', variant: 'destructive' as const },
      in_progress: { label: 'Em Andamento', variant: 'default' as const },
      resolved: { label: 'Resolvido', variant: 'secondary' as const },
      closed: { label: 'Fechado', variant: 'outline' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleSendResponse = async () => {
    if (!selectedRequest || !responseText.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, escreva uma resposta antes de enviar.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSendingResponse(true);
      
      // Enviar email de resposta
      await EmailService.sendSupportResponse(
        selectedRequest.userEmail,
        selectedRequest.userName,
        selectedRequest.subject,
        responseText
      );

      // Atualizar status da solicitação
      await AdminService.updateSupportRequestStatus(selectedRequest.id, {
        status: 'resolved',
        response: responseText,
        respondedAt: new Date(),
        respondedBy: 'Manager' // Aqui você pode pegar o nome do usuário logado
      });

      toast({
        title: "Sucesso",
        description: "Resposta enviada com sucesso!"
      });

      // Atualizar a lista
      await fetchSupportRequests();
      setSelectedRequest(null);
      setResponseText('');
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a resposta. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSendingResponse(false);
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      await AdminService.updateSupportRequestStatus(requestId, { status: newStatus });
      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso!"
      });
      await fetchSupportRequests();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (timestamp: Date | any) => {
    if (!timestamp) return 'Data não disponível';
    
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-lg">Carregando solicitações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gerenciar Suporte</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Visualize e responda às solicitações de suporte dos usuários
          </p>
        </div>
        <Button onClick={fetchSupportRequests} variant="outline" className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{supportRequests.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-red-600">
                  {supportRequests.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Em Andamento</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {supportRequests.filter(r => r.status === 'in_progress').length}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolvidos</p>
                <p className="text-2xl font-bold text-green-600">
                  {supportRequests.filter(r => r.status === 'resolved').length}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email, assunto ou mensagem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="resolved">Resolvidos</SelectItem>
                  <SelectItem value="closed">Fechados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Solicitações */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações de Suporte</CardTitle>
          <CardDescription>
            {filteredRequests.length} solicitação(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma solicitação encontrada
              </h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Nenhuma solicitação de suporte foi enviada ainda'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{request.subject || 'Sem assunto'}</h3>
                        {getStatusBadge(request.status || 'pending')}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          <span>{request.userName || 'Nome não disponível'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span>{request.userEmail || 'Email não disponível'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(request.timestamp)}</span>
                        </div>
                        {request.details?.requestDate && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>{request.details.requestDate} - {request.details.requestTime}</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-gray-700 mb-3 line-clamp-2">
                        {request.message || 'Mensagem não disponível'}
                      </p>
                      
                      {request.response && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                          <p className="text-sm font-medium text-green-800 mb-1">Resposta enviada:</p>
                          <p className="text-sm text-green-700">{request.response}</p>
                          {request.respondedAt && (
                            <p className="text-xs text-green-600 mt-1">
                              Respondido em {formatDate(request.respondedAt)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:max-w-2xl md:max-h-[90dvh] md:rounded-lg overflow-y-auto p-0 flex flex-col">
                          <DialogHeader className="p-4 md:p-6 border-b">
                            <DialogTitle>Detalhes da Solicitação</DialogTitle>
                            <DialogDescription>
                              Visualize e responda à solicitação de suporte
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="flex-1 overflow-y-auto p-4 md:p-6">
                            {selectedRequest && (
                              <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-700">Nome:</label>
                                  <p className="text-sm text-gray-900">{selectedRequest.userName}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-700">Email:</label>
                                  <p className="text-sm text-gray-900">{selectedRequest.userEmail}</p>
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium text-gray-700">Assunto:</label>
                                <p className="text-sm text-gray-900">{selectedRequest.subject}</p>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium text-gray-700">Mensagem:</label>
                                <div className="bg-gray-50 rounded-lg p-3 mt-1">
                                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                    {selectedRequest.message}
                                  </p>
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium text-gray-700">Status Atual:</label>
                                <div className="mt-1">
                                  {getStatusBadge(selectedRequest.status || 'pending')}
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Select 
                                  value={selectedRequest.status || 'pending'} 
                                  onValueChange={(value) => handleUpdateStatus(selectedRequest.id, value)}
                                >
                                  <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Alterar status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pendente</SelectItem>
                                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                                    <SelectItem value="resolved">Resolvido</SelectItem>
                                    <SelectItem value="closed">Fechado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {!selectedRequest.response && (
                                <div className="space-y-3">
                                  <label className="text-sm font-medium text-gray-700">Resposta:</label>
                                  <Textarea
                                    placeholder="Digite sua resposta para o usuário..."
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                    rows={4}
                                  />
                                  <Button 
                                    onClick={handleSendResponse} 
                                    disabled={sendingResponse || !responseText.trim()}
                                    className="w-full"
                                  >
                                    {sendingResponse ? (
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Send className="h-4 w-4 mr-2" />
                                    )}
                                    {sendingResponse ? 'Enviando...' : 'Enviar Resposta'}
                                  </Button>
                                </div>
                              )}
                            </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerSupport;