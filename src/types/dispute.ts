import { Timestamp } from 'firebase/firestore';

export interface Dispute {
  id: string;
  chatId: string;
  projectId: string;
  projectTitle: string;
  projectValue: number;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  initiatedBy: string; // ID do usuário que iniciou
  initiatedByName: string;
  initiatedByType: 'client' | 'freelancer';
  reason: string;
  description?: string;
  status: 'open' | 'under_review' | 'resolved' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  moderatorId?: string;
  moderatorName?: string;
  assignedAt?: Timestamp;
  resolvedAt?: Timestamp;
  resolution?: string;
  resolutionType?: 'client_favor' | 'freelancer_favor' | 'partial_refund' | 'mediated_agreement';
  refundAmount?: number;
  evidence: DisputeEvidence[];
  messages: DisputeMessage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tags?: string[];
}

export interface DisputeEvidence {
  id: string;
  disputeId: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedByType: 'client' | 'freelancer' | 'moderator';
  type: 'image' | 'document' | 'video' | 'audio' | 'link';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  description: string;
  uploadedAt: Timestamp;
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderName: string;
  senderType: 'client' | 'freelancer' | 'moderator';
  content: string;
  isInternal: boolean; // Mensagem só para moderadores
  timestamp: Timestamp;
}

export interface DisputeAction {
  id: string;
  disputeId: string;
  moderatorId: string;
  moderatorName: string;
  action: 'assign' | 'resolve' | 'escalate' | 'request_evidence' | 'close' | 'reopen';
  details?: string;
  timestamp: Timestamp;
}

export interface DisputeStats {
  totalOpen: number;
  totalUnderReview: number;
  totalResolved: number;
  totalCancelled: number;
  averageResolutionTime: number; // em horas
  clientFavorResolutions: number;
  freelancerFavorResolutions: number;
  partialRefunds: number;
  mediatedAgreements: number;
} 