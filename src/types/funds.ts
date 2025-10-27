import { Timestamp } from 'firebase/firestore';

export interface FundRelease {
  id: string;
  projectId: string;
  projectTitle: string;
  projectValue: number;
  chatId: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  releaseType: 'partial' | 'full' | 'milestone' | 'dispute_resolution';
  amount: number;
  percentage: number; // Porcentagem do valor total
  cumulativeAmount: number; // Valor total já liberado até agora
  cumulativePercentage: number; // Porcentagem total já liberada
  remainingAmount: number; // Valor restante para liberar
  remainingPercentage: number; // Porcentagem restante
  reason?: string;
  description?: string;
  status: 'pending' | 'approved' | 'released' | 'cancelled' | 'disputed' | 'rejected';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Timestamp;
  releasedAt?: Timestamp;
  transactionId?: string;
  moderatorId?: string; // Para liberações via disputa
  moderatorName?: string;
  isAutomated: boolean; // Se foi liberação automática ou manual
  milestone?: string; // Descrição do milestone se aplicável
  
  // Gateway usado para transferência
  gateway?: 'pagarme' | 'asaas';
  
  // Campos específicos do Asaas
  asaasTransferId?: string; // ID da transferência no Asaas
  transferId?: string; // ID genérico da transferência
  rejectionReason?: string; // Motivo de rejeição, se aplicável
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FundHold {
  id: string;
  projectId: string;
  projectValue: number;
  totalHeld: number;
  totalReleased: number;
  totalRefunded: number;
  availableForRelease: number;
  isActive: boolean;
  releases: FundRelease[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FundTransaction {
  id: string;
  projectId: string;
  releaseId?: string;
  type: 'hold' | 'release' | 'refund' | 'fee' | 'penalty' | 'withdraw';
  amount: number;
  description: string;
  fromUserId?: string;
  toUserId?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string; // ID da transação externa (stripe, pagarme, asaas, etc)
  paymentMethod?: string;
  fees?: number;
  netAmount?: number;
  // Informações extras para melhor visualização
  projectTitle?: string;
  clientName?: string;
  freelancerName?: string;
  releaseType?: 'partial' | 'full';
  percentage?: number;
  processedAt?: Timestamp;
  
  // Gateway usado
  gateway?: 'pagarme' | 'asaas';
  
  // Campos específicos do Asaas para transferências
  asaasTransferId?: string; // ID da transferência no Asaas
  pixKey?: string; // Chave PIX usada (se aplicável)
  
  createdAt: Timestamp;
}

export interface ProjectPayment {
  id: string;
  projectId: string;
  projectTitle: string;
  projectValue: number;
  clientId: string;
  freelancerId: string;
  paymentStatus: 'not_paid' | 'partially_paid' | 'paid' | 'in_escrow' | 'released' | 'refunded';
  escrowStatus: 'not_held' | 'held' | 'partially_released' | 'fully_released' | 'disputed';
  totalPaid: number;
  totalHeld: number;
  totalReleased: number;
  totalRefunded: number;
  releaseSchedule?: ReleaseSchedule[];
  autoReleaseEnabled: boolean;
  autoReleaseDays?: number; // Liberação automática após X dias
  lastActivity?: Timestamp;
  fundHold?: FundHold;
  transactions: FundTransaction[];
  
  // Gateway de pagamento usado
  gateway?: 'pagarme' | 'asaas';
  
  // Campos específicos do Asaas
  asaasPaymentId?: string; // ID do pagamento no Asaas
  asaasCustomerId?: string; // ID do cliente no Asaas
  asaasCheckoutId?: string; // ID do checkout no Asaas (se usar checkout)
  
  // Valores de split (para controle próprio)
  totalAmount?: number; // Valor bruto total (100%)
  platformFee?: number; // Taxa da plataforma (10%)
  freelancerAmount?: number; // Valor líquido para o freelancer (90%)
  
  // Método de pagamento e datas
  paymentMethod?: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'DEBIT_CARD' | 'UNDEFINED';
  paidAt?: Timestamp; // Data que o pagamento foi confirmado
  availableAt?: Timestamp; // Data que o valor ficará disponível para saque
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReleaseSchedule {
  id: string;
  milestone: string;
  percentage: number;
  amount: number;
  dueDate?: Timestamp;
  status: 'pending' | 'completed' | 'overdue';
  completedAt?: Timestamp;
  description?: string;
}

export interface FundReleaseRequest {
  projectId: string;
  chatId: string;
  releaseType: 'partial' | 'full';
  percentage?: number; // Para liberação parcial (10, 20, 30, etc.)
  amount?: number; // Valor específico se não for por porcentagem
  reason?: string;
  description?: string;
  milestone?: string;
} 