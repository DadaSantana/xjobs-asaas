
import { useUserPresence } from '@/hooks/usePresence';
import { PresenceStatus } from '@/types/user';

interface PresenceIndicatorProps {
  uid: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const PresenceIndicator = ({ uid, showText = false, size = 'md' }: PresenceIndicatorProps) => {
  const { presence, loading } = useUserPresence(uid);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-gray-300 rounded-full animate-pulse"></div>
        {showText && <span className="text-sm text-gray-500">Carregando...</span>}
      </div>
    );
  }

  const getStatusColor = (status: PresenceStatus) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: PresenceStatus) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Ausente';
      case 'offline':
      default:
        return 'Offline';
    }
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'lg':
        return 'w-4 h-4';
      case 'md':
      default:
        return 'w-3 h-3';
    }
  };

  const status = presence?.status || 'offline';

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`${getSizeClass(size)} ${getStatusColor(status)} rounded-full border-2 border-white shadow-sm`}
      ></div>
      {showText && (
        <span className="text-sm text-gray-600">
          {getStatusText(status)}
        </span>
      )}
    </div>
  );
};

export default PresenceIndicator;
