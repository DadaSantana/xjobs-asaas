import React, { useState } from 'react';
import { AlertTriangle, FileText, X } from 'lucide-react';
import { CHAT_LOCALIZATIONS } from '@/utils/chatLocalizations';
import { DisputeService } from '@/services/disputeService';
import { useToast } from '@/hooks/use-toast';

interface CreateDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  projectId: string;
  projectValue: number;
  initiatedBy: string;
  initiatedByName: string;
  initiatedByType: 'client' | 'freelancer';
  onDisputeCreated?: () => void;
}

const disputeReasons = [
  'Trabalho não entregue',
  'Trabalho entregue fora do prazo',
  'Qualidade do trabalho insatisfatória',
  'Especificações não atendidas',
  'Comunicação inadequada',
  'Alterações não autorizadas no escopo',
  'Problemas com pagamento',
  'Outros'
];

export const CreateDisputeModal: React.FC<CreateDisputeModalProps> = ({
  isOpen,
  onClose,
  chatId,
  projectId,
  projectValue,
  initiatedBy,
  initiatedByName,
  initiatedByType,
  onDisputeCreated
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      const finalReason = selectedReason === 'Outros' ? customReason : selectedReason;
      
      if (!finalReason.trim()) {
        toast({
          title: 'Erro',
          description: 'Por favor, selecione ou descreva o motivo da disputa',
          variant: 'destructive'
        });
        return;
      }

      if (!description.trim()) {
        toast({
          title: 'Erro',
          description: 'Por favor, descreva detalhadamente o problema',
          variant: 'destructive'
        });
        return;
      }

      setLoading(true);

      await DisputeService.createDispute(
        chatId,
        projectId,
        projectValue,
        initiatedBy,
        initiatedByName,
        initiatedByType,
        finalReason.trim(),
        description.trim()
      );

      toast({
        title: 'Sucesso',
        description: CHAT_LOCALIZATIONS.DISPUTES.MESSAGES.DISPUTE_CREATED
      });

      // Reset form
      setSelectedReason('');
      setCustomReason('');
      setDescription('');
      
      onClose();
      
      if (onDisputeCreated) {
        onDisputeCreated();
      }

    } catch (error) {
      console.error('Erro ao criar disputa:', error);
      toast({
        title: 'Erro',
        description: (error as Error).message || 'Erro ao criar disputa',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-semibold">{CHAT_LOCALIZATIONS.DISPUTES.CREATE_DISPUTE}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Informações do Projeto */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-orange-900 mb-2">Informações do Projeto</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-orange-700">Valor do Projeto:</span>
              <p className="font-semibold text-orange-900">{formatCurrency(projectValue)}</p>
            </div>
            <div>
              <span className="text-orange-700">Iniciado por:</span>
              <p className="font-semibold text-orange-900">
                {initiatedByName} ({initiatedByType === 'client' ? 'Cliente' : 'Freelancer'})
              </p>
            </div>
          </div>
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Importante:</strong> Uma disputa deve ser criada apenas quando não for possível resolver o problema através de comunicação direta. Um moderador será atribuído para analisar o caso.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Motivo da Disputa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo da Disputa *
            </label>
            <div className="grid grid-cols-1 gap-2">
              {disputeReasons.map((reason) => (
                <label key={reason} className="flex items-center">
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mr-3 text-orange-600"
                  />
                  <span className="text-sm text-gray-700">{reason}</span>
                </label>
              ))}
            </div>
            
            {/* Campo customizado para "Outros" */}
            {selectedReason === 'Outros' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Descreva o motivo da disputa..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}
          </div>

          {/* Descrição Detalhada */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição Detalhada do Problema *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={CHAT_LOCALIZATIONS.DISPUTES.PLACEHOLDERS.DISPUTE_REASON}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Descreva detalhadamente o que aconteceu, quando ocorreu e por que acredita que uma disputa é necessária.
            </p>
          </div>

          {/* Próximos Passos */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              O que acontece após criar a disputa?
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Um moderador será automaticamente atribuído ao caso</li>
              <li>• Ambas as partes receberão notificação sobre a disputa</li>
              <li>• O chat será marcado como "em disputa"</li>
              <li>• Você poderá adicionar evidências e se comunicar com o moderador</li>
              <li>• O moderador analisará o caso e tomará uma decisão</li>
            </ul>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedReason || !description.trim() || (selectedReason === 'Outros' && !customReason.trim())}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {CHAT_LOCALIZATIONS.DISPUTES.CREATE_DISPUTE}
          </button>
        </div>
      </div>
    </div>
  );
}; 