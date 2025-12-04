/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Funções de liberação de fundos (mantidas do pagarmePlans.ts)
export {
  onFundReleaseCreate,
  processFundRelease
} from './pagarmePlans';
// requestWithdrawNow - REMOVIDA (substituída por processWithdrawalAsaas)

// Funções do Pagarme removidas - sistema antigo descontinuado
// createPlan, editPlan, deletePlan, listPlans, savePlanLimits
// createPaymentLink, createPlanPaymentLink, generateProjectPaymentLink
// generateExternalPaymentLink, generatePlanSubscriptionPaymentLink
// checkPaymentLinkStatus, processOrderPayment, paymentWebhook, pagarmeWebhook

// Funções do Asaas (novo gateway de pagamento)
export {
  createAsaasCheckout,
  createAsaasSubscription,
  asaasWebhook,
  checkAsaasPaymentStatus
} from './asaasPlans';
// transferToFreelancerAsaas - REMOVIDA (não utilizada)

// Funções de gerenciamento de planos Asaas
export {
  createAsaasPlan,
  updateAsaasPlan,
  deleteAsaasPlan,
  listAsaasPlans
} from './asaasPlansManagement';

// Funções do sistema de adiantamento
export {
  simulateAdvanceRequest,
  processAdvanceRequest,
  listAdvanceRequests,
  approveAdvanceRequest,
  rejectAdvanceRequest
} from './advanceService';

// Funções do sistema de saque Asaas
export {
  processWithdrawalAsaas
} from './withdrawalService';

// Webhook Asaas para transferências - já exportado acima como asaasWebhook
// asaasTransferWebhook - REMOVIDA (era apenas alias de asaasWebhook)

export {
  createRecipient,
  checkRecipient,
  updateRecipientVerification,
  generateKycLinkV2
} from './recipientService';

export {
  createNotification,
  markNotificationAsViewed,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteReadNotifications,
  deleteAllNotifications,
  cleanupExpiredNotifications,
  onProjectProposalCreated,
  onProjectStatusChangedV2,
  onProjectCreated,
  onPaymentStatusChanged,
  onSubscriptionCreated,
  onSubscriptionStatusChanged,
  onUserCreated,
  onModerationRequestCreated,
  onModerationRequestUpdated
} from './notificationService';

export {
  forceUpdateUserEmail
} from './accountService';

export {
  checkProjectDeadlines,
  checkPendingPayments,
  checkOpenDisputes,
  cleanupOldNotifications,
  checkInactiveProjects
} from './alertService';

export {
  createSystemLog,
  getSystemLogs,
  cleanupOldLogs,
  LogHelpers
} from './logService';
