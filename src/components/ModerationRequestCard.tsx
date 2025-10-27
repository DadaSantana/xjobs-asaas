import React, { useState } from 'react';
import { Clock, User, MessageSquare, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';
import { ModerationRequest } from '@/types/moderation';
import { CHAT_LOCALIZATIONS } from '@/utils/chatLocalizations';
import { useToast } from '@/hooks/use-toast';

interface ModerationRequestCardProps {
  request: ModerationRequest;
  onAssign?: (requestId: string) => void;
  onResolve?: (requestId: string, resolution: string) => void;
  onReject?: (requestId: string, reason: string) => void;
  onViewChat?: (chatId: string) => void;
  onViewProject?: (projectId: string) => void;
  currentUserId?: string;
  isLoading?: boolean;
}

export const ModerationRequestCard: React.FC<ModerationRequestCardProps> = ({
  request,
  onAssign,
  onResolve,
  onReject,
  onViewChat,
  onViewProject,
  currentUserId,
  isLoading = false
}) => {
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [resolution, setResolution] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('pt-BR');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSelfAssign = () => {
    if (onAssign && currentUserId) {
      onAssign(request.id);
    }
  };

  const handleResolve = () => {
    if (!resolution.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, descreva a resolução',
        variant: 'destructive'
      });
      return;
    }
    if (onResolve) {
      onResolve(request.id, resolution);
      setShowResolutionForm(false);
      setResolution('');
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, explique o motivo da rejeição',
        variant: 'destructive'
      });
      return;
    }
    if (onReject) {
      onReject(request.id, rejectionReason);
      setShowRejectionForm(false);
      setRejectionReason('');
    }
  };

  const canTakeActions = request.status === 'pending' || 
    (request.status === 'assigned' && request.moderatorId === currentUserId);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {request.projectTitle}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
              {CHAT_LOCALIZATIONS.MODERATION.STATUS[request.status.toUpperCase() as keyof typeof CHAT_LOCALIZATIONS.MODERATION.STATUS]}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
              {CHAT_LOCALIZATIONS.MODERATION.PRIORITY[request.priority.toUpperCase() as keyof typeof CHAT_LOCALIZATIONS.MODERATION.PRIORITY]}
            </span>
          </div>
        </div>
        
        {request.priority === 'urgent' && (
          <AlertTriangle className="h-5 w-5 text-red-500" />
        )}
      </div>

      {/* Informações do solicitante */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">{CHAT_LOCALIZATIONS.MODERATION.REQUEST_INFO.REQUESTED_BY}:</span>
            <p className="text-gray-900">{request.requestedByName}</p>
            <p className="text-gray-600 capitalize">({request.requestedByType})</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">{CHAT_LOCALIZATIONS.MODERATION.REQUEST_INFO.PARTICIPANTS}:</span>
            <p className="text-gray-900">{request.clientName} ({CHAT_LOCALIZATIONS.CLIENT})</p>
            <p className="text-gray-900">{request.freelancerName} ({CHAT_LOCALIZATIONS.FREELANCER})</p>
          </div>
        </div>
        
        {request.reason && (
          <div className="mt-3">
            <span className="font-medium text-gray-700">{CHAT_LOCALIZATIONS.MODERATION.REQUEST_INFO.REASON}:</span>
            <p className="text-gray-900 mt-1">{request.reason}</p>
          </div>
        )}
      </div>

      {/* Informações do moderador */}
      {request.moderatorId && (
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">{CHAT_LOCALIZATIONS.MODERATION.REQUEST_INFO.MODERATOR}:</span>
            <span className="text-blue-800">{request.moderatorName}</span>
          </div>
          {request.assignedAt && (
            <p className="text-blue-700 text-sm mt-1">
              {CHAT_LOCALIZATIONS.MODERATION.REQUEST_INFO.ASSIGNED_AT}: {formatDate(request.assignedAt)}
            </p>
          )}
        </div>
      )}

      {/* Resolução/Rejeição */}
      {(request.status === 'resolved' || request.status === 'rejected') && request.notes && (
        <div className={`rounded-lg p-3 mb-4 ${
          request.status === 'resolved' ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {request.status === 'resolved' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className={`font-medium ${
              request.status === 'resolved' ? 'text-green-900' : 'text-red-900'
            }`}>
              {request.status === 'resolved' 
                ? CHAT_LOCALIZATIONS.MODERATION.REQUEST_INFO.RESOLUTION 
                : CHAT_LOCALIZATIONS.MODERATION.REQUEST_INFO.NOTES
              }:
            </span>
          </div>
          <p className={request.status === 'resolved' ? 'text-green-800' : 'text-red-800'}>
            {request.notes}
          </p>
          {request.resolvedAt && (
            <p className={`text-sm mt-1 ${
              request.status === 'resolved' ? 'text-green-700' : 'text-red-700'
            }`}>
              {CHAT_LOCALIZATIONS.MODERATION.REQUEST_INFO.RESOLVED_AT}: {formatDate(request.resolvedAt)}
            </p>
          )}
        </div>
      )}

      {/* Timestamps */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{CHAT_LOCALIZATIONS.MODERATION.REQUEST_INFO.CREATED_AT}: {formatDate(request.createdAt)}</span>
        </div>
      </div>

      {/* Formulário de resolução */}
      {showResolutionForm && (
        <div className="bg-green-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-green-900 mb-2">
            {CHAT_LOCALIZATIONS.MODERATION.ACTIONS.RESOLVE}
          </h4>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder={CHAT_LOCALIZATIONS.MODERATION.PLACEHOLDERS.RESOLUTION}
            className="w-full p-3 border border-green-200 rounded-lg resize-none"
            rows={3}
            disabled={isLoading}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleResolve}
              disabled={isLoading || !resolution.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {CHAT_LOCALIZATIONS.MODERATION.ACTIONS.RESOLVE}
            </button>
            <button
              onClick={() => setShowResolutionForm(false)}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              {CHAT_LOCALIZATIONS.CANCEL}
            </button>
          </div>
        </div>
      )}

      {/* Formulário de rejeição */}
      {showRejectionForm && (
        <div className="bg-red-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-red-900 mb-2">
            {CHAT_LOCALIZATIONS.MODERATION.ACTIONS.REJECT}
          </h4>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={CHAT_LOCALIZATIONS.MODERATION.PLACEHOLDERS.REJECTION}
            className="w-full p-3 border border-red-200 rounded-lg resize-none"
            rows={3}
            disabled={isLoading}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleReject}
              disabled={isLoading || !rejectionReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {CHAT_LOCALIZATIONS.MODERATION.ACTIONS.REJECT}
            </button>
            <button
              onClick={() => setShowRejectionForm(false)}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              {CHAT_LOCALIZATIONS.CANCEL}
            </button>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        {/* Ações de visualização */}
        {onViewChat && (
          <button
            onClick={() => onViewChat(request.chatId)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
          >
            <MessageSquare className="h-4 w-4" />
            {CHAT_LOCALIZATIONS.MODERATION.ACTIONS.VIEW_CHAT}
          </button>
        )}

        {onViewProject && (
          <button
            onClick={() => onViewProject(request.projectId)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
          >
            <Eye className="h-4 w-4" />
            {CHAT_LOCALIZATIONS.MODERATION.ACTIONS.VIEW_PROJECT}
          </button>
        )}

        {/* Ações de moderação */}
        {canTakeActions && (
          <>
            {request.status === 'pending' && onAssign && (
              <button
                onClick={handleSelfAssign}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm disabled:opacity-50"
              >
                <User className="h-4 w-4" />
                {CHAT_LOCALIZATIONS.MODERATION.ACTIONS.SELF_ASSIGN}
              </button>
            )}

            {request.status === 'assigned' && request.moderatorId === currentUserId && (
              <>
                <button
                  onClick={() => setShowResolutionForm(true)}
                  disabled={isLoading || showResolutionForm}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {CHAT_LOCALIZATIONS.MODERATION.ACTIONS.RESOLVE}
                </button>

                <button
                  onClick={() => setShowRejectionForm(true)}
                  disabled={isLoading || showRejectionForm}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  {CHAT_LOCALIZATIONS.MODERATION.ACTIONS.REJECT}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 