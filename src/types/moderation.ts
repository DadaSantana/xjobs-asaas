import { Timestamp } from 'firebase/firestore';

export interface ModerationRequest {
  id: string;
  chatId: string;
  projectId: string;
  projectTitle: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  requestedBy: string; // ID do usuário que solicitou
  requestedByName: string;
  requestedByType: 'client' | 'freelancer';
  reason?: string;
  status: 'pending' | 'assigned' | 'resolved' | 'rejected';
  moderatorId?: string;
  moderatorName?: string;
  assignedAt?: Timestamp;
  resolvedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  notes?: string;
}

export interface ModerationAction {
  id: string;
  moderationRequestId: string;
  moderatorId: string;
  moderatorName: string;
  action: 'assign' | 'resolve' | 'reject' | 'escalate' | 'note';
  details?: string;
  timestamp: Timestamp;
}

export interface ModeratorStats {
  id: string;
  moderatorId: string;
  moderatorName: string;
  totalAssigned: number;
  totalResolved: number;
  totalRejected: number;
  averageResolutionTime: number; // em horas
  currentActive: number;
  rating: number;
  lastActive: Timestamp;
}

export interface ModerationDashboardData {
  totalPending: number;
  totalAssigned: number;
  totalResolved: number;
  totalUrgent: number;
  pendingRequests: ModerationRequest[];
  assignedRequests: ModerationRequest[];
  recentActions: ModerationAction[];
  moderatorStats: ModeratorStats[];
} 