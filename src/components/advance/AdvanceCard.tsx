import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import { AdvanceRequest } from '@/types/advance';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdvanceCardProps {
  advance: AdvanceRequest;
  onApprove?: (advanceId: string) => void;
  onReject?: (advanceId: string, reason: string) => void;
  onCancel?: (advanceId: string) => void;
  showActions?: boolean;
  isAdmin?: boolean;
}

const statusConfig = {
  pending: {
    label: 'Pendente',
    color: 'bg-yellow-500',
    icon: Clock,
    variant: 'secondary' as const
  },
  approved: {
    label: 'Aprovado',
    color: 'bg-blue-500',
    icon: CheckCircle,
    variant: 'default' as const
  },
  processed: {
    label: 'Processado',
    color: 'bg-green-500',
    icon: CheckCircle,
    variant: 'default' as const
  },
  rejected: {
    label: 'Rejeitado',
    color: 'bg-red-500',
    icon: XCircle,
    variant: 'destructive' as const
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-gray-500',
    icon: XCircle,
    variant: 'secondary' as const
  }
};

export function AdvanceCard({
  advance,
  onApprove,
  onReject,
  onCancel,
  showActions = false,
  isAdmin = false
}: AdvanceCardProps) {
  const status = statusConfig[advance.status];
  const StatusIcon = status.icon;

  const handleReject = () => {
    const reason = prompt('Motivo da rejeição:');
    if (reason && onReject) {
      onReject(advance.id, reason);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">
              {advance.projectTitle}
            </CardTitle>
            <div className="flex items-center text-sm text-gray-600">
              <User className="h-4 w-4 mr-1" />
              {advance.freelancerName}
            </div>
          </div>
          <Badge variant={status.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Valores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Valor Solicitado</p>
            <p className="text-lg font-semibold">
              R$ {advance.requestedAmount.toFixed(2)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Taxa ({advance.feePercentage}%)</p>
            <p className="text-lg font-semibold text-red-600">
              -R$ {advance.feeAmount.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-800">
              Valor Líquido
            </span>
            <span className="text-xl font-bold text-green-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              R$ {advance.netAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Datas */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            Solicitado em {format(advance.requestedAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </div>
        </div>

        {advance.processedAt && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Processado em {format(advance.processedAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </div>
          </div>
        )}

        {/* Observações */}
        {advance.notes && (
          <div className="space-y-1">
            <div className="flex items-center text-sm text-gray-600">
              <FileText className="h-4 w-4 mr-1" />
              Observações
            </div>
            <p className="text-sm bg-gray-50 p-2 rounded border">
              {advance.notes}
            </p>
          </div>
        )}

        {/* Motivo de rejeição */}
        {advance.status === 'rejected' && advance.rejectionReason && (
          <div className="space-y-1">
            <div className="flex items-center text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              Motivo da Rejeição
            </div>
            <p className="text-sm bg-red-50 text-red-800 p-2 rounded border border-red-200">
              {advance.rejectionReason}
            </p>
          </div>
        )}

        {/* Informações de transferência */}
        {advance.transferId && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <p>ID da Transferência: {advance.transferId}</p>
            {advance.transferStatus && (
              <p>Status: {advance.transferStatus}</p>
            )}
          </div>
        )}
      </CardContent>

      {/* Ações */}
      {showActions && (
        <CardFooter className="pt-3 border-t">
          <div className="flex gap-2 w-full">
            {isAdmin && advance.status === 'pending' && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => onApprove?.(advance.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aprovar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={handleReject}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Rejeitar
                </Button>
              </>
            )}
            
            {!isAdmin && advance.status === 'pending' && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onCancel?.(advance.id)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

