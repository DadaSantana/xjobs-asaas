import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Bell, 
  Trash2, 
  Settings,
  Briefcase,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  Star,
  Clock,
  User,
  Megaphone,
  UserPlus,
  UserCog,
  UserCheck,
  FilePlus,
  Slash,
  CheckCircle,
  Upload,
  CreditCard,
  Repeat,
  XCircle,
  RefreshCcw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from '@/hooks/useNotifications';
import { Notification, NotificationType } from '@/types/notification';
import { useNavigate } from 'react-router-dom';

interface NotificationDropdownProps {
  className?: string;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ className }) => {
  const navigate = useNavigate();
  const {
    notifications,
    stats,
    loading,
    actionLoading,
    markAsViewed,
    deleteAllNotifications
  } = useNotifications();

  const getNotificationIcon = (type: NotificationType) => {
    const iconMap = {
      project_proposal: Briefcase,
      proposal_accepted: CheckCircle,
      proposal_rejected: AlertTriangle,
      project_started: Briefcase,
      project_completed: CheckCircle,
      payment_received: DollarSign,
      payment_released: DollarSign,
      payment_failed: AlertTriangle,
      message_received: MessageSquare,
      dispute_created: AlertTriangle,
      dispute_resolved: CheckCircle,
      profile_approved: User,
      profile_rejected: AlertTriangle,
      system_announcement: Megaphone,
      deadline_reminder: Clock,
      rating_request: Star,
      user_registered: UserPlus,
      profile_updated: UserCog,
      account_updated: UserCheck,
      project_created: FilePlus,
      project_cancelled: Slash,
      project_approved: CheckCircle,
      project_for_payment: Upload,
      payment_pending: CreditCard,
      payment_refused: XCircle,
      payment_proof_uploaded: Upload,
      plan_subscribed: Repeat,
      plan_renewed: RefreshCcw,
      plan_cancelled: Slash,
      plan_changed: Repeat
    };

    const IconComponent = iconMap[type] || Bell;
    return <IconComponent className="h-4 w-4" />;
  };

  const getNotificationColor = (type: NotificationType) => {
    const colorMap = {
      project_proposal: 'text-blue-600',
      proposal_accepted: 'text-green-600',
      proposal_rejected: 'text-red-600',
      project_started: 'text-blue-600',
      project_completed: 'text-green-600',
      payment_received: 'text-green-600',
      payment_released: 'text-green-600',
      payment_failed: 'text-red-600',
      message_received: 'text-blue-600',
      dispute_created: 'text-orange-600',
      dispute_resolved: 'text-green-600',
      profile_approved: 'text-green-600',
      profile_rejected: 'text-red-600',
      system_announcement: 'text-purple-600',
      deadline_reminder: 'text-orange-600',
      rating_request: 'text-yellow-600',
      user_registered: 'text-blue-600',
      profile_updated: 'text-blue-600',
      account_updated: 'text-green-600',
      project_created: 'text-blue-600',
      project_cancelled: 'text-red-600',
      project_approved: 'text-green-600',
      project_for_payment: 'text-purple-600',
      payment_pending: 'text-orange-600',
      payment_refused: 'text-red-600',
      payment_proof_uploaded: 'text-purple-600',
      plan_subscribed: 'text-green-600',
      plan_renewed: 'text-green-600',
      plan_cancelled: 'text-red-600',
      plan_changed: 'text-blue-600'
    };

    return colorMap[type] || 'text-gray-600';
  };

  const normalizeActionUrl = (url: string, notification: Notification) => {
    try {
      // Corrigir rotas antigas para rotas atuais
      if (url.startsWith('/cliente/projetos/')) {
        return url.replace('/cliente/projetos/', '/cliente/projeto/');
      }
      if (url === '/freelancer/financas') {
        return '/freelancer/minhas-financas';
      }
      if (url.startsWith('/freelancer/projetos')) {
        return '/freelancer/meus-projetos';
      }
      // Corrigir rotas de chat baseadas no papel do usuário
      if (url.startsWith('/chat/')) {
        const chatId = url.replace('/chat/', '');
        const targetRole = notification.data?.targetRole;
        if (targetRole === 'cliente') {
          return `/cliente/mensagens?chatId=${chatId}`;
        } else if (targetRole === 'freelancer') {
          return `/freelancer/mensagens?chatId=${chatId}`;
        }
        // Fallback para usuários sem papel definido
        return `/cliente/mensagens?chatId=${chatId}`;
      }
      // Corrigir rota de avaliação genérica para dentro do layout correto
      if (url.startsWith('/avaliar')) {
        const [path, query = ''] = url.split('?');
        const params = new URLSearchParams(query);
        const targetRole = params.get('targetRole');
        if (targetRole === 'client') {
          return `/freelancer/avaliar?${params.toString()}`;
        }
        if (targetRole === 'freelancer') {
          return `/cliente/avaliar?${params.toString()}`;
        }
        // Fallback: direcionar para cliente
        return `/cliente/avaliar?${params.toString()}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como visualizada se não foi visualizada ainda
    if (!notification.viewedAt) {
      await markAsViewed(notification.id);
    }

    // Navegar para a URL de ação se existir
    if (notification.actionUrl) {
      const target = normalizeActionUrl(notification.actionUrl, notification);
      navigate(target);
    }
  };

  const formatTimeAgo = (date: Date) => {
    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  const getNotificationDisplayInfo = (notification: Notification) => {
    // Para notificações de usuário registrado, usar dados dos metadados
    if (notification.type === 'user_registered' && notification.data) {
      const { name, email, userType } = notification.data as any;
      const displayName = name || email || 'Usuário';
      const typeLabel = userType === 'freelancer' ? 'freelancer' : 'cliente';
      
      return {
        title: notification.title,
        message: `Novo ${typeLabel} cadastrado: ${displayName}`,
        subtitle: email && name ? email : undefined
      };
    }
    
    // Para outros tipos de notificação, usar dados padrão
    return {
      title: notification.title,
      message: notification.message,
      subtitle: undefined
    };
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`relative p-2 ${className}`}>
          <Bell className="h-5 w-5 text-gray-600" />
          {stats.unread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
            >
              {stats.unread > 99 ? '99+' : stats.unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {stats.unread > 0 && (
            <Badge variant="secondary" className="text-xs">
              {stats.unread} não lidas
            </Badge>
          )}
        </DropdownMenuLabel>

        {/* Botão para remover todas as notificações */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="outline"
                size="sm"
                onClick={deleteAllNotifications}
                disabled={actionLoading.deleteAll || loading}
                className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {actionLoading.deleteAll ? (
                  <span className="h-3 w-3 mr-1 animate-spin">⏳</span>
                ) : (
                  <Trash2 className="h-3 w-3 mr-1" />
                )}
                Remover todas as notificações
              </Button>
            </div>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Lista de notificações */}
        <ScrollArea className="max-h-64">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Carregando notificações...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              Nenhuma notificação
            </div>
          ) : (
            notifications.map((notification) => {
              const displayInfo = getNotificationDisplayInfo(notification);
              
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`p-3 cursor-pointer border-l-2 ${
                    notification.read 
                      ? 'border-l-transparent bg-white hover:bg-gray-50' 
                      : notification.viewedAt
                        ? 'border-l-orange-400 bg-orange-50 hover:bg-orange-100'
                        : 'border-l-blue-500 bg-blue-50 hover:bg-blue-100'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={`mt-0.5 flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-medium truncate ${
                          notification.read ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {displayInfo.title}
                        </h4>
                        
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                      
                      <p className={`text-xs mt-1 line-clamp-2 ${
                        notification.read ? 'text-gray-500' : 'text-gray-600'
                      }`}>
                        {displayInfo.message}
                      </p>
                      
                      {displayInfo.subtitle && (
                        <p className={`text-xs mt-1 ${
                          notification.read ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {displayInfo.subtitle}
                        </p>
                      )}
                      
                      {notification.actionLabel && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            {notification.actionLabel}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>

        {/* Configurações */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate('/settings/notifications')}
          className="text-gray-600"
        >
          <Settings className="h-4 w-4 mr-2" />
          Configurações de notificação
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;