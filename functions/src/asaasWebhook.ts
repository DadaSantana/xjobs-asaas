/**
 * Webhook do Asaas para receber notificações de transferências
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';

const db = admin.firestore();

const corsHandler = cors({
  origin: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'asaas-access-token'],
  credentials: true
});

/**
 * Webhook para receber notificações do Asaas sobre transferências
 * POST /asaasWebhook
 */
export const asaasWebhook = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, asaas-access-token');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    try {
      const { event, transfer, receivableAnticipation } = req.body;

      console.log('[Asaas Webhook] Evento recebido:', event);
      console.log('[Asaas Webhook] Dados:', { transfer, receivableAnticipation });

      // Processar eventos de transferência (saques)
      if (event.startsWith('TRANSFER_') && transfer && transfer.id) {
        await handleTransferEvent(event, transfer);
      }
      
      // Processar eventos de antecipação (adiantamentos)
      else if (event.startsWith('RECEIVABLE_ANTICIPATION_') && receivableAnticipation && receivableAnticipation.id) {
        await handleAnticipationEvent(event, receivableAnticipation);
      }
      
      else {
        console.log('[Asaas Webhook] Evento não tratado ou dados inválidos:', event);
      }

      res.status(200).json({ 
        received: true,
        processed: true
      });

    } catch (error) {
      console.error('[Asaas Webhook] Erro ao processar webhook:', error);
      res.status(500).json({
        error: 'Erro ao processar webhook',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Processar eventos de transferência (saques)
 */
async function handleTransferEvent(eventType: string, transfer: Record<string, unknown>): Promise<void> {
  console.log('[Asaas Webhook] Processando evento de transferência:', eventType, transfer.id);

  try {
    // Buscar a transação de saque pelo ID da transferência Asaas
    const withdrawalQuery = await db.collection('withdrawals')
      .where('asaasTransferId', '==', transfer.id)
      .limit(1)
      .get();

    if (withdrawalQuery.empty) {
      console.log('[Asaas Webhook] Saque não encontrado para transferência:', transfer.id);
      return;
    }

    const withdrawalDoc = withdrawalQuery.docs[0];
    const withdrawal = withdrawalDoc.data();

    let newStatus = 'pending';
    let statusMessage = '';

    switch (eventType) {
      case 'TRANSFER_CREATED':
      case 'TRANSFER_PENDING':
      case 'TRANSFER_IN_BANK_PROCESSING':
      case 'TRANSFER_BLOCKED':
        newStatus = 'processing';
        statusMessage = 'Transferência em processamento';
        break;

      case 'TRANSFER_DONE':
        newStatus = 'completed';
        statusMessage = 'Transferência concluída';
        
        // Criar registro de valor liberado
        await db.collection('fundTransactions').add({
          type: 'withdrawal_completed',
          freelancerId: withdrawal.freelancerId,
          amount: withdrawal.netAmount || withdrawal.amount,
          description: 'Saque concluído via Asaas',
          status: 'completed',
          gateway: 'asaas',
          asaasTransferId: transfer.id,
          withdrawalId: withdrawalDoc.id,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        break;

      case 'TRANSFER_FAILED':
        newStatus = 'failed';
        statusMessage = `Transferência falhou: ${transfer.failReason || 'Erro no processamento'}`;
        
        // Estornar valor para o saldo disponível
        await db.collection('fundTransactions').add({
          type: 'withdrawal_reversal',
          freelancerId: withdrawal.freelancerId,
          amount: withdrawal.amount,
          description: `Estorno de saque falho: ${transfer.failReason || 'Erro no processamento'}`,
          status: 'completed',
          gateway: 'asaas',
          asaasTransferId: transfer.id,
          withdrawalId: withdrawalDoc.id,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        break;

      case 'TRANSFER_CANCELLED':
        newStatus = 'cancelled';
        statusMessage = 'Transferência cancelada';
        
        // Estornar valor para o saldo disponível
        await db.collection('fundTransactions').add({
          type: 'withdrawal_reversal',
          freelancerId: withdrawal.freelancerId,
          amount: withdrawal.amount,
          description: 'Estorno de saque cancelado',
          status: 'completed',
          gateway: 'asaas',
          asaasTransferId: transfer.id,
          withdrawalId: withdrawalDoc.id,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        break;
    }

    // Atualizar status do saque
    await withdrawalDoc.ref.update({
      status: newStatus,
      asaasStatus: transfer.status,
      statusMessage,
      lastWebhookEvent: eventType,
      lastWebhookData: transfer,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(newStatus === 'completed' ? { completedAt: admin.firestore.FieldValue.serverTimestamp() } : {})
    });

    console.log('[Asaas Webhook] Saque atualizado:', withdrawalDoc.id, 'novo status:', newStatus);

  } catch (error) {
    console.error('[Asaas Webhook] Erro ao processar evento de transferência:', error);
  }
}

/**
 * Processar eventos de antecipação (adiantamentos)
 */
async function handleAnticipationEvent(eventType: string, anticipation: Record<string, unknown>): Promise<void> {
  console.log('[Asaas Webhook] Processando evento de antecipação:', eventType, anticipation.id);

  try {
    // Buscar a solicitação de adiantamento pelo ID da antecipação Asaas
    const advanceQuery = await db.collection('advanceRequests')
      .where('asaasAnticipationId', '==', anticipation.id)
      .limit(1)
      .get();

    if (advanceQuery.empty) {
      console.log('[Asaas Webhook] Adiantamento não encontrado para antecipação:', anticipation.id);
      return;
    }

    const advanceDoc = advanceQuery.docs[0];
    const advance = advanceDoc.data();

    let newStatus = advance.status;
    let statusMessage = '';

    switch (eventType) {
      case 'RECEIVABLE_ANTICIPATION_PENDING':
        statusMessage = 'Antecipação em análise';
        break;

      case 'RECEIVABLE_ANTICIPATION_SCHEDULED':
        statusMessage = 'Antecipação agendada';
        break;

      case 'RECEIVABLE_ANTICIPATION_CREDITED':
        newStatus = 'completed';
        statusMessage = 'Antecipação creditada - valor disponível';
        break;

      case 'RECEIVABLE_ANTICIPATION_DEBITED':
        statusMessage = 'Antecipação debitada';
        break;

      case 'RECEIVABLE_ANTICIPATION_DENIED':
        newStatus = 'rejected';
        statusMessage = 'Antecipação negada pelo Asaas';
        break;

      case 'RECEIVABLE_ANTICIPATION_CANCELLED':
        newStatus = 'cancelled';
        statusMessage = 'Antecipação cancelada';
        break;

      case 'RECEIVABLE_ANTICIPATION_OVERDUE':
        newStatus = 'failed';
        statusMessage = 'Antecipação vencida';
        break;
    }

    // Atualizar status do adiantamento
    await advanceDoc.ref.update({
      status: newStatus,
      anticipationStatus: anticipation.status,
      statusMessage,
      lastWebhookEvent: eventType,
      lastWebhookData: anticipation,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(newStatus === 'completed' ? { completedAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
      ...(newStatus === 'rejected' ? { rejectionReason: statusMessage } : {})
    });

    console.log('[Asaas Webhook] Adiantamento atualizado:', advanceDoc.id, 'novo status:', newStatus);

  } catch (error) {
    console.error('[Asaas Webhook] Erro ao processar evento de antecipação:', error);
  }
}

