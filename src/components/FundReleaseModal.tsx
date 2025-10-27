import React, { useState, useEffect } from 'react';
import { DollarSign, Percent, Calculator, Clock, CheckCircle } from 'lucide-react';
import { CHAT_LOCALIZATIONS } from '@/utils/chatLocalizations';
import { FundsService } from '@/services/fundsService';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface FundReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  projectValue: number;
  chatId: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  onReleaseComplete?: () => void;
}

type ReleaseMode = 'percentage' | 'custom' | 'full';

export const FundReleaseModal: React.FC<FundReleaseModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  projectValue,
  chatId,
  clientId,
  clientName,
  freelancerId,
  freelancerName,
  onReleaseComplete
}) => {
  const [releaseMode, setReleaseMode] = useState<ReleaseMode>('percentage');
  const [selectedPercentage, setSelectedPercentage] = useState<number>(0);
  const [customPercentage, setCustomPercentage] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [milestone, setMilestone] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [calculatedRelease, setCalculatedRelease] = useState<{
    amount: number;
    percentage: number;
    remaining: number;
  } | null>(null);

  const { toast } = useToast();

  const percentageOptions = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setReleaseMode('percentage');
      setSelectedPercentage(0);
      setCustomPercentage('');
      setCustomAmount('');
      setReason('');
      setMilestone('');
      setCalculatedRelease(null);
    }
  }, [isOpen]);

  const calculateAmount = (percentage: number): number => {
    return (projectValue * percentage) / 100;
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handlePercentageSelect = (percentage: number) => {
    setSelectedPercentage(percentage);
    setReleaseMode('percentage');
    const calc = calculateAmount(percentage);
    setCalculatedRelease({
      amount: calc,
      percentage,
      remaining: projectValue - calc
    });
  };

  const handleCustomPercentageChange = (value: string) => {
    setCustomPercentage(value);
    setReleaseMode('custom');
    
    const percentage = parseFloat(value);
    if (!isNaN(percentage) && percentage > 0 && percentage <= 100) {
      const calc = calculateAmount(percentage);
      setCalculatedRelease({
        amount: calc,
        percentage,
        remaining: projectValue - calc
      });
    } else {
      setCalculatedRelease(null);
    }
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setReleaseMode('custom');
    
    const amount = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!isNaN(amount) && amount > 0 && amount <= projectValue) {
      const percentage = (amount / projectValue) * 100;
      setCalculatedRelease({
        amount,
        percentage,
        remaining: projectValue - amount
      });
    } else {
      setCalculatedRelease(null);
    }
  };

  const handleFullRelease = () => {
    setReleaseMode('full');
    setCalculatedRelease({
      amount: projectValue,
      percentage: 100,
      remaining: 0
    });
  };

  const validateRelease = (): boolean => {
    if (!calculatedRelease) {
      toast({
        title: 'Erro',
        description: 'Selecione um valor válido para liberação',
        variant: 'destructive'
      });
      return false;
    }

    if (calculatedRelease.amount <= 0) {
      toast({
        title: 'Erro',
        description: CHAT_LOCALIZATIONS.FUNDS.MESSAGES.INVALID_AMOUNT,
        variant: 'destructive'
      });
      return false;
    }

    if (calculatedRelease.percentage > 100) {
      toast({
        title: 'Erro',
        description: CHAT_LOCALIZATIONS.FUNDS.MESSAGES.INVALID_PERCENTAGE,
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleConfirmRelease = () => {
    if (!validateRelease()) return;
    setShowConfirmDialog(true);
  };

  const handleRelease = async () => {
    try {
      setLoading(true);
      
      let releasePercentage = 0;
      
      if (releaseMode === 'percentage') {
        releasePercentage = selectedPercentage;
      } else if (releaseMode === 'custom') {
        releasePercentage = parseFloat(customPercentage);
      } else if (releaseMode === 'full') {
        releasePercentage = 100;
      }

      if (releasePercentage <= 0 || releasePercentage > 100) {
        throw new Error('Porcentagem inválida');
      }

      await FundsService.requestFundRelease(
        {
          projectId,
          chatId,
          releaseType: releaseMode === 'full' ? 'full' : 'partial',
          percentage: releasePercentage,
          reason: reason.trim() || undefined
        },
        clientId,
        clientName,
        freelancerId,
        freelancerName,
        projectTitle,
        projectValue
      );

      toast({
        title: 'Sucesso',
        description: CHAT_LOCALIZATIONS.FUNDS.MESSAGES.FUNDS_RELEASED
      });

      setShowConfirmDialog(false);
      onClose();
      
      if (onReleaseComplete) {
        onReleaseComplete();
      }

    } catch (error) {
      console.error('Erro ao liberar fundos:', error);
      toast({
        title: 'Erro',
        description: (error as Error).message || 'Erro ao liberar fundos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-semibold">{CHAT_LOCALIZATIONS.FUNDS.RELEASE_FUNDS}</h2>
        </div>

        {/* Informações do Projeto */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">{projectTitle}</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">{CHAT_LOCALIZATIONS.FUNDS.INFO.PROJECT_VALUE}:</span>
              <p className="font-semibold text-gray-900">{formatCurrency(projectValue)}</p>
            </div>
            <div>
              <span className="text-gray-600">Freelancer:</span>
              <p className="font-semibold text-gray-900">{freelancerName}</p>
            </div>
          </div>
        </div>

        {/* Opções de Liberação */}
        <div className="space-y-6">
          {/* Porcentagens predefinidas */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Liberação por Porcentagem
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {percentageOptions.map((percentage) => {
                const amount = calculateAmount(percentage);
                const isSelected = selectedPercentage === percentage && releaseMode === 'percentage';
                
                return (
                  <button
                    key={percentage}
                    onClick={() => handlePercentageSelect(percentage)}
                    className={`flex flex-col h-auto py-2 px-3 rounded-md border text-sm transition-colors ${
                      isSelected 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-semibold">{percentage}%</span>
                    <span className="text-xs opacity-75">
                      {formatCurrency(amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Valor personalizado */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Valor Personalizado
            </h4>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-gray-600">Porcentagem (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  value={customPercentage}
                  onChange={(e) => {
                    setCustomPercentage(e.target.value);
                    setReleaseMode('custom');
                  }}
                  placeholder="Digite a porcentagem..."
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {customPercentage && (
                <div className="flex-1">
                  <label className="text-sm text-gray-600">Valor Calculado</label>
                  <div className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                    {formatCurrency(calculateAmount(parseFloat(customPercentage) || 0))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Liberação total */}
          <div>
            <button
              onClick={() => setReleaseMode('full')}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md border transition-colors ${
                releaseMode === 'full'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              Liberar 100% - {formatCurrency(projectValue)}
            </button>
          </div>

          {/* Motivo (opcional) */}
          <div>
            <label className="text-sm text-gray-600">
              Motivo da liberação (opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da liberação..."
              rows={3}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleRelease}
            disabled={loading || (releaseMode === 'percentage' && selectedPercentage === 0) || (releaseMode === 'custom' && !customPercentage)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Clock className="h-4 w-4 animate-spin" />
            ) : (
              <DollarSign className="h-4 w-4" />
            )}
            Liberar Fundos
          </button>
        </div>
      </div>

      {/* Diálogo de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {CHAT_LOCALIZATIONS.FUNDS.CONFIRM_RELEASE.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {CHAT_LOCALIZATIONS.FUNDS.CONFIRM_RELEASE.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {calculatedRelease && (
            <div className="bg-gray-50 rounded-lg p-4 my-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{CHAT_LOCALIZATIONS.FUNDS.CONFIRM_RELEASE.amountLabel}</span>
                  <span className="font-semibold">{formatCurrency(calculatedRelease.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{CHAT_LOCALIZATIONS.FUNDS.CONFIRM_RELEASE.percentageLabel}</span>
                  <span className="font-semibold">{calculatedRelease.percentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>{CHAT_LOCALIZATIONS.FUNDS.CONFIRM_RELEASE.remainingLabel}</span>
                  <span className="font-semibold">{formatCurrency(calculatedRelease.remaining)}</span>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              {CHAT_LOCALIZATIONS.FUNDS.CONFIRM_RELEASE.cancelButton}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRelease}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              {CHAT_LOCALIZATIONS.FUNDS.CONFIRM_RELEASE.confirmButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}; 