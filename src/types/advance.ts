/**
 * Tipos para sistema de adiantamento de valores
 */

import { Timestamp } from 'firebase/firestore';

export interface AdvanceRequest {
  id: string;
  freelancerId: string;
  freelancerName: string;
  projectId: string;
  projectTitle: string;
  clientId: string;
  clientName: string;
  
  // Valores
  originalAmount: number; // Valor original disponível para adiantamento
  requestedAmount: number; // Valor solicitado pelo freelancer
  feePercentage: number; // Percentual da taxa (padrão 5%)
  feeAmount: number; // Valor da taxa em reais
  netAmount: number; // Valor líquido que o freelancer receberá
  
  // Status e datas
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'cancelled';
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  
  // Informações de processamento
  approvedBy?: string; // ID do admin que aprovou (se manual)
  approvedByName?: string;
  rejectionReason?: string;
  
  // Integração com gateway
  gateway: 'asaas' | 'pagarme';
  transferId?: string; // ID da transferência no gateway
  transferStatus?: string; // Status da transferência
  
  // Referências
  fundReleaseId?: string; // ID da liberação original que está sendo adiantada
  paymentId?: string; // ID do pagamento original
  transactionId?: string; // ID da transação de adiantamento
  
  // Metadados
  automaticApproval: boolean; // Se foi aprovado automaticamente
  notes?: string; // Observações
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AdvanceTransaction {
  id: string;
  advanceRequestId: string;
  freelancerId: string;
  projectId: string;
  
  type: 'advance_payment' | 'advance_fee';
  amount: number;
  description: string;
  
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  
  // Gateway info
  gateway: 'asaas' | 'pagarme';
  transferId?: string;
  gatewayResponse?: any;
  
  processedAt?: Timestamp;
  createdAt: Timestamp;
}

export interface AdvanceSettings {
  enabled: boolean;
  feePercentage: number; // Percentual da taxa (padrão 5%)
  minAmount: number; // Valor mínimo para adiantamento
  maxAmount: number; // Valor máximo para adiantamento
  automaticApproval: boolean; // Se aprovação é automática
  automaticApprovalLimit: number; // Limite para aprovação automática
  
  // Restrições
  maxAdvancesPerMonth: number; // Máximo de adiantamentos por mês por freelancer
  cooldownDays: number; // Dias de espera entre adiantamentos
  
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface FreelancerAdvanceStats {
  freelancerId: string;
  
  // Estatísticas gerais
  totalAdvancesRequested: number;
  totalAdvancesApproved: number;
  totalAdvancesRejected: number;
  totalAmountAdvanced: number;
  totalFeesCharged: number;
  
  // Estatísticas do mês atual
  monthlyAdvancesCount: number;
  monthlyAmountAdvanced: number;
  
  // Última atividade
  lastAdvanceDate?: Timestamp;
  
  // Status atual
  hasActiveAdvance: boolean;
  canRequestAdvance: boolean;
  nextAvailableDate?: Timestamp; // Quando pode solicitar próximo adiantamento
  
  updatedAt: Timestamp;
}

export interface AdvanceEligibility {
  eligible: boolean;
  reason?: string;
  availableAmount: number;
  maxAdvanceAmount: number;
  currentMonthCount: number;
  maxMonthlyCount: number;
  nextAvailableDate?: Date;
  cooldownRemaining?: number; // Dias restantes de cooldown
}

// Tipos para componentes
export interface AdvanceFormData {
  amount: string;
  notes?: string;
}

export interface AdvanceCardProps {
  advance: AdvanceRequest;
  onApprove?: (advanceId: string) => void;
  onReject?: (advanceId: string, reason: string) => void;
  onCancel?: (advanceId: string) => void;
  showActions?: boolean;
  isAdmin?: boolean;
}

export interface AdvanceHistoryFilters {
  status?: AdvanceRequest['status'];
  dateFrom?: Date;
  dateTo?: Date;
  projectId?: string;
  freelancerId?: string;
}

