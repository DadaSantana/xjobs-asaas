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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  onSuccess?: () => void;
}

export function AdvanceRequestDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  onSuccess
}: AdvanceRequestDialogProps) {
  const [loading, setLoading] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibility, setEligibility] = useState<AdvanceEligibility | null>(null);
  const [formData, setFormData] = useState<AdvanceFormData>({
    amount: '',
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Verificar elegibilidade quando o dialog abrir
  useEffect(() => {
    if (open && projectId) {
      checkEligibility();
    }
  }, [open, projectId]);

  const checkEligibility = async () => {
    setCheckingEligibility(true);
    setError(null);
    try {
      const result = await checkAdvanceEligibility('current-user', projectId);
      setEligibility(result);
      
      if (!result.eligible) {
        setError(result.reason || 'Não elegível para adiantamento');
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

      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setFormData({ amount: '', notes: '' });
      
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar adiantamento');
    } finally {
      setLoading(false);
    }
  };

  const calculateFee = (amount: number) => {
    return (amount * 5) / 100; // 5% de taxa
  };

  const calculateNetAmount = (amount: number) => {
    return amount - calculateFee(amount);
  };

  const requestedAmount = parseFloat(formData.amount) || 0;
  const feeAmount = calculateFee(requestedAmount);
  const netAmount = calculateNetAmount(requestedAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Adiantamento</DialogTitle>
          <DialogDescription>
            Receba antecipadamente os valores do projeto "{projectTitle}"
          </DialogDescription>
        </DialogHeader>

        {checkingEligibility ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Verificando elegibilidade...</span>
          </div>
        ) : !eligibility?.eligible ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Informações de elegibilidade */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Valor disponível:</span>
                <span className="font-semibold">R$ {eligibility.availableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Valor máximo:</span>
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
                    Taxa (5%):
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
                <strong>Importante:</strong> O adiantamento será transferido via PIX em até 1 hora útil. 
                Uma taxa de 5% será descontada do valor solicitado.
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
                onClick={() => onOpenChange(false)}
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
