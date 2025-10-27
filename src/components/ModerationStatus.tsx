import React from 'react';
import { UserPlus, Clock, Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { CHAT_LOCALIZATIONS } from '@/utils/chatLocalizations';

interface ModerationStatusProps {
  status: 'pending' | 'assigned' | 'resolved' | 'rejected' | null;
  moderatorName?: string;
  requestedByName?: string;
  requestedByType?: 'client' | 'freelancer';
  assignedAt?: any;
  resolvedAt?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  onViewDetails?: () => void;
}

export const ModerationStatus: React.FC<ModerationStatusProps> = ({
  status,
  moderatorName,
  requestedByName,
  requestedByType,
  assignedAt,
  resolvedAt,
  priority,
  onViewDetails
}) => {
  if (!status) return null;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          title: 'Solicitação de Moderador Pendente',
          description: `Aguardando atribuição de moderador`,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-600',
          textColor: 'text-yellow-900'
        };
      case 'assigned':
        return {
          icon: Shield,
          title: 'Moderador Atribuído',
          description: `${moderatorName} está analisando a solicitação`,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-900'
        };
      case 'resolved':
        return {
          icon: CheckCircle,
          title: 'Solicitação Resolvida',
          description: 'A moderação foi concluída com sucesso',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          textColor: 'text-green-900'
        };
      case 'rejected':
        return {
          icon: XCircle,
          title: 'Solicitação Rejeitada',
          description: 'A solicitação de moderação foi rejeitada',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          textColor: 'text-red-900'
        };
      default:
        return null;
    }
  };

  const getPriorityBadge = () => {
    if (!priority) return null;

    const priorityConfig = {
      low: { label: 'Baixa', color: 'bg-green-100 text-green-800' },
      medium: { label: 'Média', color: 'bg-blue-100 text-blue-800' },
      high: { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800' }
    };

    const config = priorityConfig[priority];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        Prioridade {config.label}
      </span>
    );
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`rounded-lg border-2 ${config.borderColor} ${config.bgColor} p-4 mb-4 ${
      status === 'pending' ? 'animate-pulse' : ''
    } shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 p-2 rounded-full bg-white ${config.iconColor} ${
          status === 'pending' ? 'animate-bounce' : ''
        }`}>
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-semibold ${config.textColor}`}>
              {config.title}
            </h4>
            {getPriorityBadge()}
          </div>
          
          <p className={`text-sm ${config.textColor} opacity-80 mb-2`}>
            {config.description}
          </p>

          <div className="space-y-1 text-xs">
            {requestedByName && (
              <div className={`${config.textColor} opacity-70`}>
                <span className="font-medium">Solicitado por:</span> {requestedByName} 
                ({requestedByType === 'client' ? 'Cliente' : 'Freelancer'})
              </div>
            )}
            
            {assignedAt && (
              <div className={`${config.textColor} opacity-70`}>
                <span className="font-medium">Atribuído em:</span> {formatDate(assignedAt)}
              </div>
            )}
            
            {resolvedAt && (
              <div className={`${config.textColor} opacity-70`}>
                <span className="font-medium">Resolvido em:</span> {formatDate(resolvedAt)}
              </div>
            )}
          </div>

          {onViewDetails && status !== 'resolved' && (
            <button
              onClick={onViewDetails}
              className={`mt-3 text-xs font-medium ${config.iconColor} hover:underline`}
            >
              Ver detalhes da solicitação →
            </button>
          )}
        </div>

        {status === 'pending' && (
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-3 h-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 