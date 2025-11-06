import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, TrendingUp, Minus } from 'lucide-react';
import { AdvanceEligibility, AdvanceFormData } from '@/types/advance';
import { checkAdvanceEligibility, requestAdvance } from '@/services/advanceService';
import { useToast } from '@/hooks/use-toast';

interface AdvanceRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  freelancerId: string;
  onSuccess?: () => void;
}

export function AdvanceRequestDialog({
  isOpen,
  onClose,
  projectId,
  freelancerId,
  onSuccess
}: AdvanceRequestDialogProps) {
  const [loading, setLoading] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [simulatingAdvance, setSimulatingAdvance] = useState(false);
  const [eligibility, setEligibility] = useState<AdvanceEligibility | null>(null);
  const [simulation, setSimulation] = useState<{
    value: number;
    netValue: number;
    fee: number;
    feePercentage: string;
    isDocumentationRequired: boolean;
  } | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [formData, setFormData] = useState<AdvanceFormData>({
    amount: '',
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Verificar elegibilidade e simular quando o dialog abrir
  useEffect(() => {
    if (isOpen && projectId) {
      checkEligibility();
      simulateAdvanceWithAsaas();
    }
  }, [isOpen, projectId]);

  // Simular antecipação com Asaas (taxa real)
  const simulateAdvanceWithAsaas = async () => {
    setSimulatingAdvance(true);
    setError(null);
    try {
      const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch('https://simulateadvancerequest-bo5fg4zxxq-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao simular antecipação');
      }

      setSimulation(data);
      console.log('[Simulação Asaas]', data);
      
    } catch (err: any) {
      console.error('[Erro na simulação]', err);
      setError(err.message || 'Erro ao simular antecipação com Asaas');
    } finally {
      setSimulatingAdvance(false);
    }
  };

  const checkEligibility = async () => {
    setCheckingEligibility(true);
    setError(null);
    try {
      const result = await checkAdvanceEligibility(freelancerId, projectId);
      setEligibility(result);
      
      if (!result.eligible) {
        setError(result.reason || 'Não elegível para adiantamento');
      }

      // Buscar título do projeto
      const { db } = await import('@/lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        setProjectTitle(projectDoc.data().title || 'Projeto');
      }
      
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar elegibilidade');
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibility?.eligible) return;

    setLoading(true);
    setError(null);

    try {
      const requestedAmount = parseFloat(formData.amount);
      
      if (isNaN(requestedAmount) || requestedAmount <= 0) {
        throw new Error('Valor inválido');
      }

      if (requestedAmount > eligibility.maxAdvanceAmount) {
        throw new Error(`Valor máximo permitido é R$ ${eligibility.maxAdvanceAmount.toFixed(2)}`);
      }

      await requestAdvance(projectId, formData);

      toast({
        title: 'Adiantamento solicitado',
        description: 'Sua solicitação foi enviada e será processada em breve.',
      });

      onClose();
      onSuccess?.();
      
      // Reset form
      setFormData({ amount: '', notes: '' });
      setSimulation(null);
      
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar adiantamento');
    } finally {
      setLoading(false);
    }
  };

  // Usar simulação do Asaas se disponível, senão calcular 2%
  const requestedAmount = parseFloat(formData.amount) || 0;
  const feeAmount = simulation ? simulation.fee : (requestedAmount * 2) / 100;
  const netAmount = simulation ? simulation.netValue : (requestedAmount - feeAmount);
  const feePercentage = simulation ? simulation.feePercentage : '2.00';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Adiantamento</DialogTitle>
          <DialogDescription>
            Receba antecipadamente os valores bloqueados (pagamentos em cartão de crédito) do projeto {projectTitle && `"${projectTitle}"`}
          </DialogDescription>
        </DialogHeader>

        {(checkingEligibility || simulatingAdvance) ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>{checkingEligibility ? 'Verificando elegibilidade...' : 'Simulando com Asaas...'}</span>
          </div>
        ) : !eligibility?.eligible ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Simulação do Asaas */}
            {simulation && (
              <div className="bg-green-50 border border-green-300 rounded-lg p-4 space-y-2">
                <div className="text-xs text-green-700 mb-2 font-medium flex items-center gap-2">
                  ✅ Simulação Asaas confirmada
                </div>
                <div className="flex justify-between text-sm">
                  <span>Valor disponível:</span>
                  <span className="font-semibold">R$ {simulation.value.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span>Taxa Asaas ({simulation.feePercentage}%):</span>
                  <span className="font-semibold">- R$ {simulation.fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-700 font-bold border-t border-green-300 pt-2">
                  <span>Você receberá:</span>
                  <span>R$ {simulation.netValue.toFixed(2)}</span>
                </div>
                {simulation.isDocumentationRequired && (
                  <div className="text-xs text-amber-600 mt-2">
                    ⚠ Documentação adicional pode ser necessária
                  </div>
                )}
              </div>
            )}

            {/* Informações de elegibilidade */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="text-xs text-blue-600 mb-2 font-medium">
                💳 Adiantamento de valores bloqueados (cartão de crédito - 35 dias)
              </div>
              <div className="flex justify-between text-sm">
                <span>Valor bloqueado disponível:</span>
                <span className="font-semibold">R$ {eligibility.availableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Valor máximo p/ adiantamento:</span>
                <span className="font-semibold">R$ {eligibility.maxAdvanceAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Adiantamentos este mês:</span>
                <span className="font-semibold">{eligibility.currentMonthCount}/{eligibility.maxMonthlyCount}</span>
              </div>
            </div>

            {/* Campo de valor */}
            <div className="space-y-2">
              <Label htmlFor="amount">Valor do Adiantamento (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={eligibility.maxAdvanceAmount}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>

            {/* Cálculo da taxa */}
            {requestedAmount > 0 && (
              <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Valor solicitado:</span>
                  <span className="font-semibold">R$ {requestedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span className="text-sm flex items-center">
                    <Minus className="h-3 w-3 mr-1" />
                    Taxa ({feePercentage}%):
                  </span>
                  <span className="font-semibold">R$ {feeAmount.toFixed(2)}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center text-green-600">
                  <span className="font-semibold flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Você receberá:
                  </span>
                  <span className="font-bold text-lg">R$ {netAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Campo de observações */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Motivo do adiantamento..."
                rows={3}
              />
            </div>

            {/* Informações importantes */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Importante:</strong> O adiantamento será processado pelo Asaas. 
                {simulation && (
                  <span className="block mt-1">
                    Taxa confirmada: <strong>{simulation.feePercentage}%</strong>
                  </span>
                )}
                {requestedAmount > 0 && requestedAmount <= 500 ? (
                  <span className="block mt-1 text-green-600 font-medium">✓ Aprovação automática (até R$ 500)</span>
                ) : requestedAmount > 500 ? (
                  <span className="block mt-1 text-amber-600 font-medium">⚠ Requer aprovação manual (acima de R$ 500)</span>
                ) : null}
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !requestedAmount || requestedAmount > eligibility.maxAdvanceAmount}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Solicitando...
                  </>
                ) : (
                  'Solicitar Adiantamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

