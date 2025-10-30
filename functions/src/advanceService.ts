/**
 * Firebase Functions para sistema de adiantamento de valores
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { 
  createOrUpdateCustomer,
  createTransfer,
  type AsaasCustomer,
  type AsaasTransfer,
  cleanDocument
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

      // Buscar dados do freelancer
      const freelancerDoc = await db.collection('users').doc(advance.freelancerId).get();
      if (!freelancerDoc.exists) {
        res.status(404).json({ error: 'Freelancer não encontrado' });
        return;
      }

      const freelancerData = freelancerDoc.data();

      // Criar ou atualizar cliente no Asaas
      const cpfCnpj = cleanDocument(freelancerData?.document || '');
      const validCpf = cpfCnpj && cpfCnpj.length === 11 ? cpfCnpj : '24971563792'; // CPF de teste

      const customerAsaas: AsaasCustomer = {
        name: freelancerData?.name || freelancerData?.displayName || 'Freelancer',
        email: freelancerData?.email || `${advance.freelancerId}@xjobs.app`,
        cpfCnpj: validCpf,
        phone: cleanDocument(freelancerData?.phone || '11999999999'),
        mobilePhone: cleanDocument(freelancerData?.phone || '11999999999'),
        externalReference: advance.freelancerId,
        notificationDisabled: false,
      };

      const customer = await createOrUpdateCustomer(customerAsaas);
      console.log('[Advance] Cliente Asaas criado/atualizado:', customer.id);

      // Buscar chave PIX do freelancer (se disponível)
      let pixKey = freelancerData?.pixKey;
      
      // Se não tiver PIX, usar email como fallback
      if (!pixKey) {
        pixKey = freelancerData?.email;
      }

      if (!pixKey) {
        await advanceRef.update({
          status: 'rejected',
          rejectionReason: 'Freelancer sem chave PIX configurada',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(400).json({ 
          error: 'Freelancer precisa configurar chave PIX para receber adiantamento' 
        });
        return;
      }

      // Criar transferência no Asaas via PIX
      const transferAsaas: AsaasTransfer = {
        value: advance.netAmount, // Valor líquido (já descontada a taxa)
        operationType: 'PIX',
        pixAddressKey: pixKey,
        pixAddressKeyType: pixKey.includes('@') ? 'EMAIL' : 
                          pixKey.length === 11 ? 'CPF' : 
                          pixKey.length === 14 ? 'CNPJ' : 'EVP',
        description: `Adiantamento - ${advance.projectTitle}`,
        externalReference: `advance_${advance.id}`
      };

      console.log('[Advance] Criando transferência Asaas:', transferAsaas);

      const transfer = await createTransfer(transferAsaas);
      console.log('[Advance] Transferência criada:', transfer.id);

      // Atualizar status do adiantamento
      await advanceRef.update({
        status: 'processed',
        transferId: transfer.id,
        transferStatus: transfer.status,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Criar transação de adiantamento
      const advanceTransaction = {
        advanceRequestId: advanceId,
        freelancerId: advance.freelancerId,
        projectId: advance.projectId,
        type: 'advance_payment',
        amount: advance.netAmount,
        description: `Adiantamento de R$ ${advance.requestedAmount.toFixed(2)} (taxa: R$ ${advance.feeAmount.toFixed(2)})`,
        status: transfer.status === 'PENDING' ? 'pending' : 'completed',
        gateway: 'asaas',
        transferId: transfer.id,
        gatewayResponse: transfer,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('advanceTransactions').add(advanceTransaction);

      // Criar transação da taxa
      const feeTransaction = {
        advanceRequestId: advanceId,
        freelancerId: advance.freelancerId,
        projectId: advance.projectId,
        type: 'advance_fee',
        amount: advance.feeAmount,
        description: `Taxa de adiantamento (${advance.feePercentage}%)`,
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
        totalAmountAdvanced: (stats?.totalAmountAdvanced || 0) + advance.requestedAmount,
        totalFeesCharged: (stats?.totalFeesCharged || 0) + advance.feeAmount,
        hasActiveAdvance: false, // Processado, não está mais ativo
        lastAdvanceDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await statsRef.set(updatedStats);

      console.log('[Advance] Adiantamento processado com sucesso');

      res.status(200).json({
        success: true,
        advanceId,
        transferId: transfer.id,
        netAmount: advance.netAmount,
        feeAmount: advance.feeAmount,
        transferStatus: transfer.status,
        message: 'Adiantamento processado com sucesso'
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

      // Processar automaticamente
      // Processar automaticamente chamando a função diretamente
      const processResponse = await fetch(
        'https://processadvancerequest-bo5fg4zxxq-uc.a.run.app',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization as string
          },
          body: JSON.stringify({ advanceId })
        }
      );

      if (!processResponse.ok) {
        const error = await processResponse.json();
        throw new Error(error.message || 'Erro ao processar adiantamento');
      }

      const result = await processResponse.json();
      res.status(200).json(result);

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
