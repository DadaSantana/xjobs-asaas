export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  viewedAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
}

export type NotificationType = 
  | 'project_proposal'      // Nova proposta recebida
  | 'proposal_accepted'     // Proposta aceita
  | 'proposal_rejected'     // Proposta rejeitada
  | 'project_started'       // Projeto iniciado
  | 'project_completed'     // Projeto concluído
  | 'payment_received'      // Pagamento recebido
  | 'payment_released'      // Pagamento liberado
  | 'payment_failed'        // Falha no pagamento
  | 'message_received'      // Nova mensagem
  | 'dispute_created'       // Disputa criada
  | 'dispute_resolved'      // Disputa resolvida
  | 'profile_approved'      // Perfil aprovado
  | 'profile_rejected'      // Perfil rejeitado
  | 'system_announcement'   // Anúncio do sistema
  | 'deadline_reminder'      // Lembrete de prazo
  | 'rating_request'        // Solicitação de avaliação
  | 'user_registered'       // Novo usuário registrado
  | 'profile_updated'       // Perfil atualizado
  | 'account_updated'       // Conta alterada
  | 'project_created'       // Novo projeto criado
  | 'project_cancelled'     // Projeto cancelado
  | 'project_approved'      // Projeto aprovado pelo cliente
  | 'project_for_payment'   // Projeto enviado para pagamento
  | 'payment_pending'       // Pagamento pendente
  | 'payment_refused'       // Pagamento recusado
  | 'payment_proof_uploaded'// Comprovante de pagamento enviado
  | 'plan_subscribed'       // Assinatura de plano realizada
  | 'plan_renewed'          // Plano renovado
  | 'plan_cancelled'        // Plano cancelado
  | 'plan_changed';         // Plano alterado

export interface NotificationPreferences {
  userId: string;
  email: {
    project_proposal: boolean;
    proposal_accepted: boolean;
    proposal_rejected: boolean;
    project_started: boolean;
    project_completed: boolean;
    payment_received: boolean;
    payment_released: boolean;
    payment_failed: boolean;
    message_received: boolean;
    dispute_created: boolean;
    dispute_resolved: boolean;
    system_announcement: boolean;
    deadline_reminder: boolean;
    rating_request: boolean;
    user_registered: boolean;
    profile_updated: boolean;
    account_updated: boolean;
    project_created: boolean;
    project_cancelled: boolean;
    project_approved: boolean;
    project_for_payment: boolean;
    payment_pending: boolean;
    payment_refused: boolean;
    payment_proof_uploaded: boolean;
    plan_subscribed: boolean;
    plan_renewed: boolean;
    plan_cancelled: boolean;
    plan_changed: boolean;
  };
  push: {
    project_proposal: boolean;
    proposal_accepted: boolean;
    proposal_rejected: boolean;
    project_started: boolean;
    project_completed: boolean;
    payment_received: boolean;
    payment_released: boolean;
    payment_failed: boolean;
    message_received: boolean;
    dispute_created: boolean;
    dispute_resolved: boolean;
    system_announcement: boolean;
    deadline_reminder: boolean;
    rating_request: boolean;
    user_registered: boolean;
    profile_updated: boolean;
    account_updated: boolean;
    project_created: boolean;
    project_cancelled: boolean;
    project_approved: boolean;
    project_for_payment: boolean;
    payment_pending: boolean;
    payment_refused: boolean;
    payment_proof_uploaded: boolean;
    plan_subscribed: boolean;
    plan_renewed: boolean;
    plan_cancelled: boolean;
    plan_changed: boolean;
  };
  updatedAt: Date;
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: Date;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}