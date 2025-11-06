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
      const { event, transfer } = req.body;

      console.log('[Asaas Webhook] Evento recebido:', event);
      console.log('[Asaas Webhook] Dados da transferência:', transfer);

      // Eventos possíveis:
      // - TRANSFER_CREATED
      // - TRANSFER_PENDING
      // - TRANSFER_BANK_PROCESSING
      // - TRANSFER_DONE
      // - TRANSFER_CANCELLED
      // - TRANSFER_FAILED

      if (!transfer || !transfer.id) {
        console.log('[Asaas Webhook] Transferência inválida, ignorando');
        res.status(200).json({ received: true });
        return;
      }

      // Buscar a solicitação de saque correspondente
      const withdrawRequestsQuery = await db.collection('withdrawRequests')
        .where('transferId', '==', transfer.id)
        .limit(1)
        .get();

      if (withdrawRequestsQuery.empty) {
        console.log('[Asaas Webhook] Nenhuma solicitação de saque encontrada para transferId:', transfer.id);
        res.status(200).json({ received: true });
        return;
      }

      const withdrawRequestDoc = withdrawRequestsQuery.docs[0];
      const withdrawRequestData = withdrawRequestDoc.data();

      console.log('[Asaas Webhook] Solicitação de saque encontrada:', withdrawRequestDoc.id);

      // Mapear status do Asaas para status interno
      let newStatus = 'pending';
      let statusMessage = '';

      switch (event) {
        case 'TRANSFER_CREATED':
        case 'TRANSFER_PENDING':
          newStatus = 'processing';
          statusMessage = 'Transferência em processamento';
          break;
        
        case 'TRANSFER_BANK_PROCESSING':
          newStatus = 'processing';
          statusMessage = 'Transferência sendo processada pelo banco';
          break;
        
        case 'TRANSFER_DONE':
          newStatus = 'completed';
          statusMessage = 'Transferência concluída';
          break;
        
        case 'TRANSFER_CANCELLED':
          newStatus = 'cancelled';
          statusMessage = 'Transferência cancelada';
          break;
        
        case 'TRANSFER_FAILED':
          newStatus = 'failed';
          statusMessage = `Transferência falhou: ${transfer.failReason || 'Motivo desconhecido'}`;
          break;
        
        default:
          console.log('[Asaas Webhook] Evento desconhecido:', event);
          res.status(200).json({ received: true });
          return;
      }

      // Buscar também pelos withdrawals
      const withdrawalsQuery = await db.collection('withdrawals')
        .where('asaasTransferId', '==', transfer.id)
        .limit(1)
        .get();

      if (!withdrawalsQuery.empty) {
        const withdrawalDoc = withdrawalsQuery.docs[0];
        
        await db.collection('withdrawals').doc(withdrawalDoc.id).update({
          status: newStatus,
          transferStatus: transfer.status,
          statusMessage,
          lastWebhookEvent: event,
          lastWebhookData: transfer,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('[Asaas Webhook] Withdrawal atualizado:', withdrawalDoc.id, 'novo status:', newStatus);
      }

      // Atualizar solicitação de saque
      await db.collection('withdrawRequests').doc(withdrawRequestDoc.id).update({
        status: newStatus,
        transferStatus: transfer.status,
        statusMessage,
        lastWebhookEvent: event,
        lastWebhookData: transfer,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('[Asaas Webhook] Solicitação atualizada:', withdrawRequestDoc.id, 'novo status:', newStatus);

      // Atualizar transação de saque correspondente
      const transactionsQuery = await db.collection('fundTransactions')
        .where('withdrawRequestId', '==', withdrawRequestDoc.id)
        .limit(1)
        .get();

      if (!transactionsQuery.empty) {
        const transactionDoc = transactionsQuery.docs[0];
        
        await db.collection('fundTransactions').doc(transactionDoc.id).update({
          status: newStatus,
          statusMessage,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('[Asaas Webhook] Transação atualizada:', transactionDoc.id);
      }

      // Se a transferência foi concluída ou falhou, notificar o usuário
      if (newStatus === 'completed' || newStatus === 'failed') {
        const freelancerId = withdrawRequestData.freelancerId;
        const amount = withdrawRequestData.amount;
        const netAmount = withdrawRequestData.netAmount || amount;

        const notificationData = {
          userId: freelancerId,
          type: newStatus === 'completed' ? 'withdrawal_completed' : 'withdrawal_failed',
          title: newStatus === 'completed' ? 'Saque Concluído' : 'Saque Falhou',
          message: newStatus === 'completed' 
            ? `Seu saque de R$ ${netAmount.toFixed(2)} foi concluído e transferido para sua conta.`
            : `Seu saque de R$ ${amount.toFixed(2)} falhou. ${transfer.failReason || 'Entre em contato com o suporte.'}`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('notifications').add(notificationData);
        console.log('[Asaas Webhook] Notificação criada para usuário:', freelancerId);

        // Se concluído, criar registro de valor liberado
        if (newStatus === 'completed') {
          await db.collection('fundTransactions').add({
            type: 'withdrawal_released',
            freelancerId: freelancerId,
            amount: netAmount,
            description: 'Saque confirmado e liberado pelo Asaas',
            status: 'completed',
            gateway: 'asaas',
            asaasTransferId: transfer.id,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      res.status(200).json({ 
        received: true,
        processed: true,
        status: newStatus
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

