/**
 * Firebase Functions para sistema de adiantamento de valores
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { 
  simulateAnticipation,
  createAnticipation,
  getAnticipationLimits
} from './asaasService';

// Inicializa o admin caso não esteja inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const corsHandler = cors({
  origin: function (origin, callback) {
    // Permitir localhost para desenvolvimento
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Permite todas as origens por enquanto
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true
});

/**
 * Verificar se o usuário está autenticado
 */
async function isAuthenticated(req: functions.https.Request): Promise<{ uid: string; email?: string; name?: string } | null> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name
    };
  } catch {
    return null;
  }
}


/**
 * Firebase Function: Simular antecipação antes de solicitar
 * POST /simulateAdvanceRequest
 */
export const simulateAdvanceRequest = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    try {
      // Verificar autenticação
      const user = await isAuthenticated(req);
      if (!user) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      const { projectId } = req.body;

      if (!projectId) {
        res.status(400).json({ error: 'ID do projeto é obrigatório' });
        return;
      }

      console.log('[Advance Simulation] Simulando antecipação para projeto:', projectId);

      // Buscar pagamento do projeto
      const paymentQuery = await db.collection('projectPayments')
        .where('projectId', '==', projectId)
        .where('freelancerId', '==', user.uid)
        .limit(1)
        .get();

      if (paymentQuery.empty) {
        res.status(404).json({ error: 'Pagamento do projeto não encontrado' });
        return;
      }

      const paymentDoc = paymentQuery.docs[0].data();
      
      // Validar que é cartão de crédito
      if (paymentDoc.paymentMethod !== 'CREDIT_CARD') {
        res.status(400).json({ 
          error: 'Antecipação disponível apenas para pagamentos em cartão de crédito' 
        });
        return;
      }

      // Validar que ainda está bloqueado
      const now = new Date();
      const availableAt = paymentDoc.availableAt?.toDate();
      
      if (!availableAt || availableAt <= now) {
        res.status(400).json({ 
          error: 'O valor já está disponível para saque' 
        });
        return;
      }

      const asaasPaymentId = paymentDoc.asaasPaymentId;

      if (!asaasPaymentId) {
        res.status(400).json({ 
          error: 'ID do pagamento no Asaas não encontrado' 
        });
        return;
      }

      // Simular antecipação no Asaas
      const simulation = await simulateAnticipation(asaasPaymentId);
      
      console.log('[Advance Simulation] Resultado:', simulation);

      res.status(200).json({
        success: true,
        asaasPaymentId,
        value: simulation.value,
        netValue: simulation.netValue,
        fee: simulation.fee,
        feePercentage: ((simulation.fee / simulation.value) * 100).toFixed(2),
        isDocumentationRequired: simulation.isDocumentationRequired,
        message: 'Simulação realizada com sucesso'
      });

    } catch (error) {
      console.error('[Advance Simulation] Erro:', error);
      res.status(500).json({
        error: 'Erro ao simular antecipação',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Firebase Function: Processar solicitação de adiantamento
 * POST /processAdvanceRequest
 */
export const processAdvanceRequest = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    try {
      // Verificar autenticação
      const user = await isAuthenticated(req);
      if (!user) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      const { advanceId } = req.body;

      if (!advanceId) {
        res.status(400).json({ error: 'ID do adiantamento é obrigatório' });
        return;
      }

      console.log('[Advance] Processando adiantamento:', advanceId);

      // Buscar solicitação de adiantamento
      const advanceRef = db.collection('advanceRequests').doc(advanceId);
      const advanceDoc = await advanceRef.get();

      if (!advanceDoc.exists) {
        res.status(404).json({ error: 'Adiantamento não encontrado' });
        return;
      }

      const advance = advanceDoc.data();

      if (advance?.status !== 'approved') {
        res.status(400).json({ error: 'Adiantamento não está aprovado' });
        return;
      }

      // Validar que o pagamento é de cartão de crédito e ainda está bloqueado
      const projectPaymentQuery = await db.collection('projectPayments')
        .where('projectId', '==', advance.projectId)
        .where('freelancerId', '==', advance.freelancerId)
        .limit(1)
        .get();

      if (projectPaymentQuery.empty) {
        res.status(404).json({ error: 'Pagamento do projeto não encontrado' });
        return;
      }

      const projectPayment = projectPaymentQuery.docs[0].data();

      // Validar que é pagamento em cartão de crédito
      if (projectPayment.paymentMethod !== 'CREDIT_CARD') {
        res.status(400).json({ 
          error: 'Adiantamento disponível apenas para pagamentos em cartão de crédito' 
        });
        return;
      }

      // Validar que o valor ainda está bloqueado
      const now = new Date();
      const availableAt = projectPayment.availableAt?.toDate();
      
      if (!availableAt || availableAt <= now) {
        res.status(400).json({ 
          error: 'O valor já está disponível para saque, não é necessário adiantamento' 
        });
        return;
      }

      // Buscar o asaasPaymentId do pagamento do projeto
      const paymentQuery = await db.collection('projectPayments')
        .where('projectId', '==', advance.projectId)
        .where('freelancerId', '==', advance.freelancerId)
        .limit(1)
        .get();

      if (paymentQuery.empty) {
        res.status(404).json({ error: 'Pagamento do projeto não encontrado' });
        return;
      }

      const paymentDoc = paymentQuery.docs[0].data();
      const asaasPaymentId = paymentDoc.asaasPaymentId;

      if (!asaasPaymentId) {
        res.status(400).json({ 
          error: 'ID do pagamento no Asaas não encontrado. Verifique se o pagamento foi processado corretamente.' 
        });
        return;
      }

      console.log('[Advance] asaasPaymentId encontrado:', asaasPaymentId);

      // Buscar limites de antecipação disponíveis
      try {
        const limits = await getAnticipationLimits();
        console.log('[Advance] Limites de antecipação:', limits);
        
        if (limits.creditCardLimit <= 0) {
          res.status(400).json({ 
            error: 'Não há limite disponível para antecipação no momento' 
          });
          return;
        }
      } catch (error) {
        console.error('[Advance] Erro ao buscar limites:', error);
        // Continua mesmo sem verificar limites
      }

      // Simular a antecipação para obter o valor real da taxa do Asaas
      console.log('[Advance] Simulando antecipação...');
      const simulation = await simulateAnticipation(asaasPaymentId);
      
      console.log('[Advance] Simulação:', {
        value: simulation.value,
        netValue: simulation.netValue,
        fee: simulation.fee,
        isDocumentationRequired: simulation.isDocumentationRequired
      });

      // Verificar se documentação é necessária
      if (simulation.isDocumentationRequired) {
        await advanceRef.update({
          status: 'rejected',
          rejectionReason: 'Documentação adicional necessária para antecipação',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(400).json({ 
          error: 'Documentação adicional é necessária para este tipo de antecipação' 
        });
        return;
      }

      // Solicitar a antecipação no Asaas
      console.log('[Advance] Solicitando antecipação no Asaas...');
      const anticipation = await createAnticipation(asaasPaymentId);
      
      console.log('[Advance] Antecipação criada:', {
        id: anticipation.id,
        status: anticipation.status,
        value: anticipation.value,
        netValue: anticipation.netValue,
        fee: anticipation.fee
      });

      // Atualizar status do adiantamento
      await advanceRef.update({
        status: 'processed',
        asaasAnticipationId: anticipation.id,
        anticipationStatus: anticipation.status,
        asaasValue: anticipation.value,
        asaasNetValue: anticipation.netValue,
        asaasFee: anticipation.fee,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Criar transação de adiantamento
      // Status será 'completed' apenas quando o Asaas realmente creditar (CREDITED)
      // Caso contrário, fica como 'pending' (em processamento)
      const isCompleted = anticipation.status === 'CREDITED' || anticipation.status === 'APPROVED';
      const advanceTransaction = {
        advanceRequestId: advanceId,
        freelancerId: advance.freelancerId,
        projectId: advance.projectId,
        type: 'advance_payment',
        amount: anticipation.netValue,
        description: `Antecipação Asaas - Valor: R$ ${anticipation.value.toFixed(2)} | Taxa Asaas: R$ ${anticipation.fee.toFixed(2)}`,
        status: isCompleted ? 'completed' : 'pending',
        gateway: 'asaas',
        asaasAnticipationId: anticipation.id,
        gatewayResponse: anticipation,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('advanceTransactions').add(advanceTransaction);

      // Criar transação da taxa Asaas
      const feeTransaction = {
        advanceRequestId: advanceId,
        freelancerId: advance.freelancerId,
        projectId: advance.projectId,
        type: 'anticipation_fee',
        amount: anticipation.fee,
        description: `Taxa de antecipação Asaas`,
        status: 'completed',
        gateway: 'asaas',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('advanceTransactions').add(feeTransaction);

      // Atualizar estatísticas do freelancer
      const statsRef = db.collection('freelancerAdvanceStats').doc(advance.freelancerId);
      const statsDoc = await statsRef.get();
      
      const stats = statsDoc.exists ? statsDoc.data() : {
        freelancerId: advance.freelancerId,
        totalAdvancesRequested: 0,
        totalAdvancesApproved: 0,
        totalAdvancesRejected: 0,
        totalAmountAdvanced: 0,
        totalFeesCharged: 0,
        monthlyAdvancesCount: 0,
        monthlyAmountAdvanced: 0,
        hasActiveAdvance: false,
        canRequestAdvance: true
      };

      const updatedStats = {
        ...stats,
        totalAdvancesApproved: (stats?.totalAdvancesApproved || 0) + 1,
        totalAmountAdvanced: (stats?.totalAmountAdvanced || 0) + anticipation.value,
        totalFeesCharged: (stats?.totalFeesCharged || 0) + anticipation.fee,
        hasActiveAdvance: false, // Processado, não está mais ativo
        lastAdvanceDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await statsRef.set(updatedStats);

      console.log('[Advance] Antecipação processada com sucesso');

      res.status(200).json({
        success: true,
        advanceId,
        asaasAnticipationId: anticipation.id,
        anticipationStatus: anticipation.status,
        value: anticipation.value,
        netValue: anticipation.netValue,
        asaasFee: anticipation.fee,
        message: 'Antecipação solicitada com sucesso no Asaas'
      });

    } catch (error) {
      console.error('[Advance] Erro ao processar adiantamento:', error);
      res.status(500).json({
        error: 'Erro ao processar adiantamento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Firebase Function: Listar adiantamentos (Admin)
 * GET /listAdvanceRequests
 */
export const listAdvanceRequests = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    try {
      // Verificar autenticação
      const user = await isAuthenticated(req);
      if (!user) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      const { status, freelancerId, limit: limitParam } = req.query;
      const limitValue = limitParam ? parseInt(limitParam as string) : 50;

      let query = db.collection('advanceRequests').orderBy('createdAt', 'desc');

      if (status) {
        query = query.where('status', '==', status);
      }

      if (freelancerId) {
        query = query.where('freelancerId', '==', freelancerId);
      }

      query = query.limit(limitValue);

      const snapshot = await query.get();
      const advances = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.status(200).json({
        success: true,
        advances,
        total: advances.length
      });

    } catch (error) {
      console.error('[Advance] Erro ao listar adiantamentos:', error);
      res.status(500).json({
        error: 'Erro ao listar adiantamentos',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Firebase Function: Aprovar adiantamento (Admin)
 * POST /approveAdvanceRequest
 */
export const approveAdvanceRequest = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    try {
      // Verificar autenticação
      const user = await isAuthenticated(req);
      if (!user) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      const { advanceId } = req.body;

      if (!advanceId) {
        res.status(400).json({ error: 'ID do adiantamento é obrigatório' });
        return;
      }

      // Atualizar status para aprovado
      await db.collection('advanceRequests').doc(advanceId).update({
        status: 'approved',
        approvedBy: user.uid,
        approvedByName: user.name || user.email,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Processar automaticamente - CHAMADA DIRETA AO INVÉS DE HTTP
      // Buscar solicitação de adiantamento
      const advanceRef = db.collection('advanceRequests').doc(advanceId);
      const advanceDoc = await advanceRef.get();

      if (!advanceDoc.exists) {
        res.status(404).json({ error: 'Adiantamento não encontrado' });
        return;
      }

      const advance = advanceDoc.data();

      if (advance?.status !== 'approved') {
        res.status(400).json({ error: 'Adiantamento não está aprovado' });
        return;
      }

      // Validar que o pagamento é de cartão de crédito e ainda está bloqueado
      const projectPaymentQuery = await db.collection('projectPayments')
        .where('projectId', '==', advance.projectId)
        .where('freelancerId', '==', advance.freelancerId)
        .limit(1)
        .get();

      if (projectPaymentQuery.empty) {
        res.status(404).json({ error: 'Pagamento do projeto não encontrado' });
        return;
      }

      const projectPayment = projectPaymentQuery.docs[0].data();
      const asaasPaymentId = projectPayment.asaasPaymentId;

      if (!asaasPaymentId) {
        res.status(400).json({ 
          error: 'ID do pagamento no Asaas não encontrado' 
        });
        return;
      }

      // Simular e criar antecipação
      const simulation = await simulateAnticipation(asaasPaymentId);
      
      if (simulation.isDocumentationRequired) {
        await advanceRef.update({
          status: 'rejected',
          rejectionReason: 'Documentação adicional necessária para antecipação',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(400).json({ 
          error: 'Documentação adicional é necessária para este tipo de antecipação' 
        });
        return;
      }

      const anticipation = await createAnticipation(asaasPaymentId);
      
      await advanceRef.update({
        status: 'processed',
        asaasAnticipationId: anticipation.id,
        anticipationStatus: anticipation.status,
        asaasValue: anticipation.value,
        asaasNetValue: anticipation.netValue,
        asaasFee: anticipation.fee,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Criar transações
      const isCompleted = anticipation.status === 'CREDITED' || anticipation.status === 'APPROVED';
      await db.collection('advanceTransactions').add({
        advanceRequestId: advanceId,
        freelancerId: advance.freelancerId,
        projectId: advance.projectId,
        type: 'advance_payment',
        amount: anticipation.netValue,
        description: `Antecipação Asaas - Valor: R$ ${anticipation.value.toFixed(2)} | Taxa Asaas: R$ ${anticipation.fee.toFixed(2)}`,
        status: isCompleted ? 'completed' : 'pending',
        gateway: 'asaas',
        asaasAnticipationId: anticipation.id,
        gatewayResponse: anticipation,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await db.collection('advanceTransactions').add({
        advanceRequestId: advanceId,
        freelancerId: advance.freelancerId,
        projectId: advance.projectId,
        type: 'anticipation_fee',
        amount: anticipation.fee,
        description: `Taxa de antecipação Asaas`,
        status: 'completed',
        gateway: 'asaas',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Atualizar estatísticas
      const statsRef = db.collection('freelancerAdvanceStats').doc(advance.freelancerId);
      const statsDoc = await statsRef.get();
      
      const stats = statsDoc.exists ? statsDoc.data() : {
        freelancerId: advance.freelancerId,
        totalAdvancesRequested: 0,
        totalAdvancesApproved: 0,
        totalAdvancesRejected: 0,
        totalAmountAdvanced: 0,
        totalFeesCharged: 0,
        monthlyAdvancesCount: 0,
        monthlyAmountAdvanced: 0,
        hasActiveAdvance: false,
        canRequestAdvance: true
      };

      await statsRef.set({
        ...stats,
        totalAdvancesApproved: (stats?.totalAdvancesApproved || 0) + 1,
        totalAmountAdvanced: (stats?.totalAmountAdvanced || 0) + anticipation.value,
        totalFeesCharged: (stats?.totalFeesCharged || 0) + anticipation.fee,
        hasActiveAdvance: false,
        lastAdvanceDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).json({
        success: true,
        advanceId,
        asaasAnticipationId: anticipation.id,
        anticipationStatus: anticipation.status,
        value: anticipation.value,
        netValue: anticipation.netValue,
        asaasFee: anticipation.fee,
        message: 'Antecipação solicitada com sucesso no Asaas'
      });

    } catch (error) {
      console.error('[Advance] Erro ao aprovar adiantamento:', error);
      res.status(500).json({
        error: 'Erro ao aprovar adiantamento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Firebase Function: Rejeitar adiantamento (Admin)
 * POST /rejectAdvanceRequest
 */
export const rejectAdvanceRequest = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    try {
      // Verificar autenticação
      const user = await isAuthenticated(req);
      if (!user) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      const { advanceId, reason } = req.body;

      if (!advanceId || !reason) {
        res.status(400).json({ error: 'ID do adiantamento e motivo são obrigatórios' });
        return;
      }

      // Atualizar status para rejeitado
      await db.collection('advanceRequests').doc(advanceId).update({
        status: 'rejected',
        rejectionReason: reason,
        approvedBy: user.uid,
        approvedByName: user.name || user.email,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Atualizar estatísticas do freelancer
      const advanceDoc = await db.collection('advanceRequests').doc(advanceId).get();
      if (advanceDoc.exists) {
        const advance = advanceDoc.data();
        const statsRef = db.collection('freelancerAdvanceStats').doc(advance?.freelancerId);
        
        await statsRef.update({
          totalAdvancesRejected: admin.firestore.FieldValue.increment(1),
          hasActiveAdvance: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      res.status(200).json({
        success: true,
        message: 'Adiantamento rejeitado com sucesso'
      });

    } catch (error) {
      console.error('[Advance] Erro ao rejeitar adiantamento:', error);
      res.status(500).json({
        error: 'Erro ao rejeitar adiantamento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Firebase Function: Corrigir status de transações antigas de adiantamento
 * POST /fixAdvanceTransactionsStatus
 * 
 * Esta função corrige transações que foram criadas antes da atualização
 * e estão com status 'completed' mas o Asaas ainda não aprovou (status PENDING)
 */
export const fixAdvanceTransactionsStatus = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    try {
      console.log('[Advance] Iniciando correção de status de transações antigas...');

      // Buscar todas as transações de adiantamento com status 'completed'
      const transactionsQuery = await db.collection('advanceTransactions')
        .where('type', '==', 'advance_payment')
        .where('status', '==', 'completed')
        .get();

      console.log(`[Advance] Encontradas ${transactionsQuery.size} transações com status 'completed'`);

      let correctedCount = 0;
      const batch = db.batch();
      let batchCount = 0;

      for (const doc of transactionsQuery.docs) {
        const transaction = doc.data();
        const gatewayResponse = transaction.gatewayResponse;

        // Verificar se o status do Asaas é PENDING
        if (gatewayResponse && gatewayResponse.status === 'PENDING') {
          console.log(`[Advance] Corrigindo transação ${doc.id}: status do Asaas é PENDING`);
          
          batch.update(doc.ref, {
            status: 'pending',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          correctedCount++;
          batchCount++;

          // Firestore limita batches a 500 operações
          if (batchCount >= 500) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }

      // Commit do batch restante
      if (batchCount > 0) {
        await batch.commit();
      }

      console.log(`[Advance] Correção concluída: ${correctedCount} transações corrigidas`);

      res.status(200).json({
        success: true,
        message: `Correção concluída: ${correctedCount} transações atualizadas de 'completed' para 'pending'`,
        totalFound: transactionsQuery.size,
        corrected: correctedCount
      });

    } catch (error) {
      console.error('[Advance] Erro ao corrigir status das transações:', error);
      res.status(500).json({
        error: 'Erro ao corrigir status das transações',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});
