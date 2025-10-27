import React, { useState, useEffect } from 'react';
import { AlertTriangle, Scale, Clock, CheckCircle, XCircle, Filter, Search, Eye, FileText, User, Calendar, DollarSign, MessageSquare, ArrowLeft } from 'lucide-react';
import { CHAT_LOCALIZATIONS } from '@/utils/chatLocalizations';
import { DisputeService } from '@/services/disputeService';
import { useAppSelector } from '@/hooks/redux';
import { useToast } from '@/hooks/use-toast';
import { Dispute } from '@/types/dispute';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DisputeCardProps {
  dispute: Dispute;
  onResolve: (disputeId: string) => void;
  onViewDetails: (disputeId: string) => void;
}

const DisputeCard: React.FC<DisputeCardProps> = ({ dispute, onResolve, onViewDetails }) => {
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 border-red-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <div>
            <h3 className="font-semibold text-gray-900">{dispute.projectTitle}</h3>
            <p className="text-sm text-gray-600">Valor: {formatCurrency(dispute.projectValue)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(dispute.priority)}`}>
            {dispute.priority.toUpperCase()}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(dispute.status)}`}>
            {CHAT_LOCALIZATIONS.DISPUTES.STATUS[dispute.status.toUpperCase() as keyof typeof CHAT_LOCALIZATIONS.DISPUTES.STATUS]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-600">Cliente:</span>
          <p className="font-medium">{dispute.clientName}</p>
        </div>
        <div>
          <span className="text-gray-600">Freelancer:</span>
          <p className="font-medium">{dispute.freelancerName}</p>
        </div>
        <div>
          <span className="text-gray-600">Iniciado por:</span>
          <p className="font-medium">
            {dispute.initiatedByName} ({dispute.initiatedByType === 'client' ? 'Cliente' : 'Freelancer'})
          </p>
        </div>
        <div>
          <span className="text-gray-600">Data:</span>
          <p className="font-medium">{formatDate(dispute.createdAt)}</p>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-1">Motivo:</h4>
        <p className="text-sm text-gray-700">{dispute.reason}</p>
      </div>

      {dispute.description && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Descrição:</h4>
          <p className="text-sm text-gray-700 line-clamp-2">{dispute.description}</p>
        </div>
      )}

      {dispute.moderatorId && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Moderador: {dispute.moderatorName}
            </span>
          </div>
          {dispute.assignedAt && (
            <p className="text-xs text-blue-700 mt-1">
              Atribuído em: {formatDate(dispute.assignedAt)}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onViewDetails(dispute.id)}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Eye className="h-4 w-4" />
          Ver Detalhes
        </button>
        
        {dispute.status !== 'resolved' && dispute.status !== 'cancelled' && (
          <button
            onClick={() => onResolve(dispute.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            Resolver
          </button>
        )}
      </div>
    </div>
  );
};

export const ManagerDisputes: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [filteredDisputes, setFilteredDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'under_review' | 'urgent' | 'mine'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  const userProfile = useAppSelector(state => state.auth.userProfile);
  const { toast } = useToast();

  // Verificar permissões
  const hasPermission = userProfile?.role === 'moderator' || userProfile?.role === 'manager';

  useEffect(() => {
    if (!hasPermission) return;

    const unsubscribe = DisputeService.subscribeToOpenDisputes((newDisputes) => {
      setDisputes(newDisputes);
      setLoading(false);
    });

    return unsubscribe;
  }, [hasPermission]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = disputes;

    // Filtro por status
    if (filter === 'open') {
      filtered = filtered.filter(d => d.status === 'open');
    } else if (filter === 'under_review') {
      filtered = filtered.filter(d => d.status === 'under_review');
    } else if (filter === 'urgent') {
      filtered = filtered.filter(d => d.priority === 'urgent');
    } else if (filter === 'mine') {
      filtered = filtered.filter(d => d.moderatorId === userProfile?.uid);
    }

    // Filtro por busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        d.projectTitle.toLowerCase().includes(search) ||
        d.clientName.toLowerCase().includes(search) ||
        d.freelancerName.toLowerCase().includes(search) ||
        d.reason.toLowerCase().includes(search)
      );
    }

    setFilteredDisputes(filtered);
  }, [disputes, filter, searchTerm, userProfile]);

  const handleViewDetails = (disputeId: string) => {
    const dispute = disputes.find(d => d.id === disputeId);
    if (dispute) {
      setSelectedDispute(dispute);
      setShowDetailsModal(true);
    }
  };

  const handleResolve = (disputeId: string) => {
    const dispute = disputes.find(d => d.id === disputeId);
    if (dispute) {
      setSelectedDispute(dispute);
      setResolution('');
      setShowResolveModal(true);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute || !resolution.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, descreva a resolução da disputa',
        variant: 'destructive'
      });
      return;
    }

    try {
      setResolving(true);
      
      // Aqui você implementaria a lógica para resolver a disputa
      // Por exemplo, chamar um serviço que atualiza o status da disputa
      await DisputeService.resolveDispute(selectedDispute.id, resolution.trim(), userProfile?.uid || '', userProfile?.name || 'Moderador');
      
      toast({
        title: 'Sucesso',
        description: 'Disputa resolvida com sucesso'
      });

      setShowResolveModal(false);
      setSelectedDispute(null);
      setResolution('');
      
      // Recarregar disputas
      const unsubscribe = DisputeService.subscribeToOpenDisputes((newDisputes) => {
        setDisputes(newDisputes);
      });
      
    } catch (error) {
      console.error('Erro ao resolver disputa:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao resolver disputa. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setResolving(false);
    }
  };

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Negado</h3>
          <p className="text-gray-600">
            Você não tem permissão para acessar o painel de disputas.
          </p>
        </div>
      </div>
    );
  }

  const stats = {
    total: disputes.length,
    open: disputes.filter(d => d.status === 'open').length,
    under_review: disputes.filter(d => d.status === 'under_review').length,
    urgent: disputes.filter(d => d.priority === 'urgent').length,
    resolved: disputes.filter(d => d.status === 'resolved').length
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Scale className="h-6 w-6 text-blue-600" />
          {CHAT_LOCALIZATIONS.DISPUTES.DASHBOARD}
        </h1>
        <p className="text-gray-600">
          Gerencie e resolva disputas entre clientes e freelancers
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total de Disputas</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{stats.open}</div>
          <div className="text-sm text-gray-600">Abertas</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.under_review}</div>
          <div className="text-sm text-gray-600">Em Análise</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.urgent}</div>
          <div className="text-sm text-gray-600">Urgentes</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          <div className="text-sm text-gray-600">Resolvidas</div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">Todas as Disputas</option>
              <option value="open">Abertas</option>
              <option value="under_review">Em Análise</option>
              <option value="urgent">Urgentes</option>
              <option value="mine">Minhas Disputas</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por projeto, cliente, freelancer ou motivo..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Lista de Disputas */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Carregando disputas...</p>
          </div>
        </div>
      ) : filteredDisputes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {CHAT_LOCALIZATIONS.DISPUTES.MESSAGES.NO_DISPUTES}
          </h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'Não há disputas no momento.' 
              : `Não há disputas ${filter === 'mine' ? 'atribuídas a você' : 'com este filtro'}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredDisputes.map((dispute) => (
            <DisputeCard
              key={dispute.id}
              dispute={dispute}
              onResolve={handleResolve}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Modal de Detalhes da Disputa */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:max-w-4xl md:max-h-[90dvh] md:rounded-lg overflow-y-auto p-0 flex flex-col">
          <DialogHeader className="p-4 md:p-6 border-b">
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Detalhes da Disputa
            </DialogTitle>
            <DialogDescription>
              Informações completas sobre a disputa selecionada
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {selectedDispute && (
              <div className="space-y-6">
              {/* Informações do Projeto */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Informações do Projeto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Título do Projeto</Label>
                      <p className="text-gray-900 font-medium">{selectedDispute.projectTitle}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Valor do Projeto</Label>
                      <p className="text-gray-900 font-medium">
                        {selectedDispute.projectValue.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Participantes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Participantes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Cliente</Label>
                      <p className="text-gray-900 font-medium">{selectedDispute.clientName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Freelancer</Label>
                      <p className="text-gray-900 font-medium">{selectedDispute.freelancerName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Iniciado por</Label>
                      <p className="text-gray-900 font-medium">
                        {selectedDispute.initiatedByName} ({selectedDispute.initiatedByType === 'client' ? 'Cliente' : 'Freelancer'})
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Data de Criação</Label>
                      <p className="text-gray-900 font-medium">
                        {selectedDispute.createdAt.toDate ? 
                          selectedDispute.createdAt.toDate().toLocaleString('pt-BR') :
                          new Date(selectedDispute.createdAt).toLocaleString('pt-BR')
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status e Prioridade */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Status e Prioridade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Status</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className={
                          selectedDispute.status === 'open' ? 'bg-red-100 text-red-800 border-red-200' :
                          selectedDispute.status === 'under_review' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          selectedDispute.status === 'resolved' ? 'bg-green-100 text-green-800 border-green-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }>
                          {CHAT_LOCALIZATIONS.DISPUTES.STATUS[selectedDispute.status.toUpperCase() as keyof typeof CHAT_LOCALIZATIONS.DISPUTES.STATUS]}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Prioridade</Label>
                      <div className="mt-1">
                        <Badge className={
                          selectedDispute.priority === 'urgent' ? 'bg-red-500 text-white' :
                          selectedDispute.priority === 'high' ? 'bg-orange-500 text-white' :
                          selectedDispute.priority === 'medium' ? 'bg-blue-500 text-white' :
                          'bg-green-500 text-white'
                        }>
                          {selectedDispute.priority.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Motivo e Descrição */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Detalhes da Disputa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Motivo</Label>
                    <p className="text-gray-900 mt-1">{selectedDispute.reason}</p>
                  </div>
                  {selectedDispute.description && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Descrição Detalhada</Label>
                      <p className="text-gray-900 mt-1 whitespace-pre-wrap">{selectedDispute.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Moderador (se atribuído) */}
              {selectedDispute.moderatorId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Moderador Responsável
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Moderador</Label>
                        <p className="text-gray-900 font-medium">{selectedDispute.moderatorName}</p>
                      </div>
                      {selectedDispute.assignedAt && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Atribuído em</Label>
                          <p className="text-gray-900 font-medium">
                            {selectedDispute.assignedAt.toDate ? 
                              selectedDispute.assignedAt.toDate().toLocaleString('pt-BR') :
                              new Date(selectedDispute.assignedAt).toLocaleString('pt-BR')
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Resolução */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Resolver Disputa
            </DialogTitle>
            <DialogDescription>
              Descreva a resolução para esta disputa
            </DialogDescription>
          </DialogHeader>
          
          {selectedDispute && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{selectedDispute.projectTitle}</h4>
                <p className="text-sm text-gray-600">
                  <strong>Motivo:</strong> {selectedDispute.reason}
                </p>
              </div>
              
              <div>
                <Label htmlFor="resolution">Resolução da Disputa *</Label>
                <Textarea
                  id="resolution"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Descreva detalhadamente como a disputa foi resolvida, incluindo as decisões tomadas e os próximos passos..."
                  rows={6}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Esta resolução será enviada para ambas as partes envolvidas na disputa.
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowResolveModal(false)}
                  disabled={resolving}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleResolveDispute}
                  disabled={resolving || !resolution.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {resolving ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Resolvendo...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolver Disputa
                    </>
                  )}
                </Button>
              </div>
            </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 