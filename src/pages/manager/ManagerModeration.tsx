import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Clock, CheckCircle, UserCheck, Filter } from 'lucide-react';
import { CHAT_LOCALIZATIONS } from '@/utils/chatLocalizations';
import { ModerationService } from '@/services/moderationService';
import { ModerationRequest, ModerationDashboardData } from '@/types/moderation';
import { ModerationRequestCard } from '@/components/ModerationRequestCard';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/hooks/redux';
import { useNavigate } from 'react-router-dom';

type FilterType = 'all' | 'pending' | 'assigned' | 'urgent' | 'my-requests';

export default function ManagerModeration() {
  const [dashboardData, setDashboardData] = useState<ModerationDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const navigate = useNavigate();

  // Verificar se é moderador
  useEffect(() => {
    if (!userProfile) {
      navigate('/manager/login');
      return;
    }
    
    // Verificar se tem permissão (moderator ou manager)
    if (userProfile.role !== 'moderator' && userProfile.role !== 'manager') {
      navigate('/manager/dashboard');
      return;
    }
  }, [userProfile, navigate]);

  // Carregar dados do dashboard
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Subscrever a solicitações em tempo real
  useEffect(() => {
    if (!userProfile) return;

    const unsubscribe = ModerationService.subscribeToPendingRequests((requests) => {
      setDashboardData(prev => prev ? {
        ...prev,
        pendingRequests: requests.slice(0, 10)
      } : null);
    });

    return unsubscribe;
  }, [userProfile]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await ModerationService.getModerationDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: CHAT_LOCALIZATIONS.MODERATION.ERRORS.LOAD_REQUESTS,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (requestId: string) => {
    if (!userProfile) return;

    try {
      setActionLoading(requestId);
      await ModerationService.assignModerator(requestId, userProfile.uid, userProfile.name);
      
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.SUCCESS,
        description: CHAT_LOCALIZATIONS.MODERATION.MESSAGES.REQUEST_ASSIGNED
      });

      await loadDashboardData();
    } catch (error) {
      console.error('Erro ao atribuir:', error);
      toast({
        title: 'Erro',
        description: CHAT_LOCALIZATIONS.MODERATION.ERRORS.ASSIGN_MODERATOR,
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (requestId: string, resolution: string) => {
    if (!userProfile) return;

    try {
      setActionLoading(requestId);
      await ModerationService.resolveModerationRequest(requestId, userProfile.uid, userProfile.name, resolution);
      
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.SUCCESS,
        description: CHAT_LOCALIZATIONS.MODERATION.MESSAGES.REQUEST_RESOLVED
      });

      await loadDashboardData();
    } catch (error) {
      console.error('Erro ao resolver:', error);
      toast({
        title: 'Erro',
        description: CHAT_LOCALIZATIONS.MODERATION.ERRORS.RESOLVE_REQUEST,
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    if (!userProfile) return;

    try {
      setActionLoading(requestId);
      await ModerationService.rejectModerationRequest(requestId, userProfile.uid, userProfile.name, reason);
      
      toast({
        title: CHAT_LOCALIZATIONS.TOASTS.SUCCESS,
        description: CHAT_LOCALIZATIONS.MODERATION.MESSAGES.REQUEST_REJECTED
      });

      await loadDashboardData();
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      toast({
        title: 'Erro',
        description: CHAT_LOCALIZATIONS.MODERATION.ERRORS.REJECT_REQUEST,
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewChat = (chatId: string) => {
    navigate(`/manager/chats?id=${chatId}`);
  };

  const handleViewProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const getFilteredRequests = (): ModerationRequest[] => {
    if (!dashboardData) return [];

    const allRequests = [
      ...dashboardData.pendingRequests,
      ...dashboardData.assignedRequests
    ];

    switch (filter) {
      case 'pending':
        return dashboardData.pendingRequests;
      case 'assigned':
        return dashboardData.assignedRequests;
      case 'urgent':
        return allRequests.filter(r => r.priority === 'urgent');
      case 'my-requests':
        return allRequests.filter(r => r.moderatorId === userProfile?.uid);
      case 'all':
      default:
        return allRequests;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{CHAT_LOCALIZATIONS.LOADING}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex-1 p-4 md:p-8">
        <div className="text-center">
          <p className="text-gray-600">Erro ao carregar dados</p>
        </div>
      </div>
    );
  }

  const filteredRequests = getFilteredRequests();

  return (
    <div className="flex-1 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {CHAT_LOCALIZATIONS.MODERATION.DASHBOARD}
          </h1>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {CHAT_LOCALIZATIONS.MODERATION.STATS.TOTAL_PENDING}
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {dashboardData.totalPending}
              </p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {CHAT_LOCALIZATIONS.MODERATION.STATS.TOTAL_ASSIGNED}
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {dashboardData.totalAssigned}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {CHAT_LOCALIZATIONS.MODERATION.STATS.TOTAL_URGENT}
              </p>
              <p className="text-2xl font-bold text-red-600">
                {dashboardData.totalUrgent}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {CHAT_LOCALIZATIONS.MODERATION.STATS.TOTAL_RESOLVED}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {dashboardData.totalResolved}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {Object.entries({
            all: CHAT_LOCALIZATIONS.MODERATION.FILTERS.ALL,
            pending: CHAT_LOCALIZATIONS.MODERATION.FILTERS.PENDING,
            assigned: CHAT_LOCALIZATIONS.MODERATION.FILTERS.ASSIGNED,
            urgent: CHAT_LOCALIZATIONS.MODERATION.FILTERS.URGENT,
            'my-requests': CHAT_LOCALIZATIONS.MODERATION.FILTERS.MY_REQUESTS
          }).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key as FilterType)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de solicitações */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {CHAT_LOCALIZATIONS.MODERATION.REQUESTS} ({filteredRequests.length})
          </h2>
        </div>

        <div className="p-6">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {filter === 'pending' 
                  ? CHAT_LOCALIZATIONS.MODERATION.MESSAGES.NO_PENDING_REQUESTS
                  : filter === 'assigned'
                  ? CHAT_LOCALIZATIONS.MODERATION.MESSAGES.NO_ASSIGNED_REQUESTS
                  : CHAT_LOCALIZATIONS.MODERATION.MESSAGES.NO_REQUESTS
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredRequests.map((request) => (
                <ModerationRequestCard
                  key={request.id}
                  request={request}
                  onAssign={handleAssign}
                  onResolve={handleResolve}
                  onReject={handleReject}
                  onViewChat={handleViewChat}
                  onViewProject={handleViewProject}
                  currentUserId={userProfile?.uid}
                  isLoading={actionLoading === request.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}