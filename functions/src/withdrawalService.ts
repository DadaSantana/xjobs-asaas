/**
 * Firebase Functions para sistema de saque via Asaas
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
 * Firebase Function: Processar saque via Asaas
 * POST /processWithdrawalAsaas
 */
export const processWithdrawalAsaas = functions.https.onRequest(async (req, res) => {
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

      const { amount } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({ error: 'Valor inválido' });
        return;
      }

      console.log('[Withdrawal] Processando saque:', { userId: user.uid, amount });

      // Buscar dados do freelancer
      const freelancerDoc = await db.collection('users').doc(user.uid).get();
      if (!freelancerDoc.exists) {
        res.status(404).json({ error: 'Freelancer não encontrado' });
        return;
      }

      const freelancerData = freelancerDoc.data();

      // Verificar saldo disponível
      const balance = await getFreelancerBalance(user.uid);
      if (balance.availableBalance < amount) {
        res.status(400).json({ 
          error: 'Saldo insuficiente',
          availableBalance: balance.availableBalance,
          requestedAmount: amount
        });
        return;
      }

      // Criar ou atualizar cliente no Asaas
      const cpfCnpj = cleanDocument(freelancerData?.document || '');
      const validCpf = cpfCnpj && cpfCnpj.length === 11 ? cpfCnpj : '24971563792'; // CPF de teste

      // Formatar telefone corretamente (formato: 11999999999)
      const rawPhone = freelancerData?.phone || '11999999999';
      const cleanPhone = rawPhone.replace(/\D/g, ''); // Remove tudo que não é número
      const formattedPhone = cleanPhone.length >= 10 ? cleanPhone : '11999999999';

      const customerAsaas: AsaasCustomer = {
        name: freelancerData?.name || freelancerData?.displayName || 'Freelancer',
        email: freelancerData?.email || `${user.uid}@xjobs.app`,
        cpfCnpj: validCpf,
        phone: formattedPhone,
        mobilePhone: formattedPhone,
        externalReference: user.uid,
        notificationDisabled: false,
      };

      const customer = await createOrUpdateCustomer(customerAsaas);
      console.log('[Withdrawal] Cliente Asaas criado/atualizado:', customer.id);

      // Buscar chave PIX do freelancer
      let pixKey = freelancerData?.pixKey;
      
      // Se não tiver PIX, usar email como fallback
      if (!pixKey) {
        pixKey = freelancerData?.email;
      }

      if (!pixKey) {
        res.status(400).json({ 
          error: 'Freelancer precisa configurar chave PIX para receber saque' 
        });
        return;
      }

      // Criar transferência no Asaas via PIX conforme documentação
      const transferAsaas: AsaasTransfer = {
        value: amount,
        operationType: 'PIX',
        pixAddressKey: pixKey,
        pixAddressKeyType: pixKey.includes('@') ? 'EMAIL' : 
                          pixKey.length === 11 ? 'CPF' : 
                          pixKey.length === 14 ? 'CNPJ' : 'EVP',
        description: `Saque de saldo - Freelancer ${freelancerData?.name || user.uid}`,
        externalReference: `withdrawal_${user.uid}_${Date.now()}`
      };

      console.log('[Withdrawal] Criando transferência Asaas:', transferAsaas);

      const transfer = await createTransfer(transferAsaas);
      console.log('[Withdrawal] Transferência criada:', transfer.id);

      // Criar registro de saque
      const withdrawalRequest = {
        freelancerId: user.uid,
        freelancerName: freelancerData?.name || user.email || 'Freelancer',
        amount,
        status: transfer.status === 'PENDING' ? 'pending' : 'completed',
        gateway: 'asaas',
        transferId: transfer.id,
        transferStatus: transfer.status,
        asaasCustomerId: customer.id,
        pixKey,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const withdrawalRef = await db.collection('withdrawRequests').add(withdrawalRequest);
      console.log('[Withdrawal] Solicitação de saque criada:', withdrawalRef.id);

      // Criar transação de saque
      const withdrawalTransaction = {
        type: 'withdraw',
        amount,
        description: `Saque do saldo disponível`,
        fromUserId: user.uid,
        toUserId: user.uid,
        status: transfer.status === 'PENDING' ? 'pending' : 'completed',
        netAmount: amount,
        transferId: transfer.id,
        withdrawRequestId: withdrawalRef.id,
        gateway: 'asaas',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('fundTransactions').add(withdrawalTransaction);

      console.log('[Withdrawal] Saque processado com sucesso');

      res.status(200).json({
        success: true,
        withdrawalId: withdrawalRef.id,
        transferId: transfer.id,
        amount,
        transferStatus: transfer.status,
        message: 'Saque processado com sucesso'
      });

    } catch (error) {
      console.error('[Withdrawal] Erro ao processar saque:', error);
      res.status(500).json({
        error: 'Erro ao processar saque',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Função auxiliar para calcular saldo do freelancer
 */
async function getFreelancerBalance(freelancerId: string): Promise<{
  totalEarnings: number;
  totalReleased: number;
  pendingAmount: number;
  availableBalance: number;
  pendingBalance: number;
  pendingWithdrawals: number;
}> {
  try {
    // Buscar todas as transações de liberação para o freelancer
    const releasesQuery = db.collection('fundTransactions')
      .where('toUserId', '==', freelancerId)
      .where('type', '==', 'release')
      .where('status', '==', 'completed');

    const releasesSnapshot = await releasesQuery.get();
    
    let totalReleased = 0;
    releasesSnapshot.forEach(doc => {
      const transaction = doc.data();
      totalReleased += Number(transaction.amount || 0);
    });

    // Buscar saques concluídos
    const withdrawalsQuery = db.collection('fundTransactions')
      .where('fromUserId', '==', freelancerId)
      .where('type', '==', 'withdraw')
      .where('status', 'in', ['completed', 'pending']);

    const withdrawalsSnapshot = await withdrawalsQuery.get();
    
    let totalWithdrawn = 0;
    let pendingWithdrawals = 0;
    
    withdrawalsSnapshot.forEach(doc => {
      const transaction = doc.data();
      const amount = Number(transaction.amount || 0);
      
      if (transaction.status === 'completed') {
        totalWithdrawn += amount;
      } else if (transaction.status === 'pending') {
        pendingWithdrawals += amount;
      }
    });

    const availableBalance = Math.max(0, totalReleased - totalWithdrawn - pendingWithdrawals);

    return {
      totalEarnings: totalReleased,
      totalReleased,
      pendingAmount: 0, // Valores ainda não liberados
      availableBalance,
      pendingBalance: 0, // Valores liberados mas bloqueados por prazo
      pendingWithdrawals
    };

  } catch (error) {
    console.error('Erro ao calcular saldo:', error);
    return {
      totalEarnings: 0,
      totalReleased: 0,
      pendingAmount: 0,
      availableBalance: 0,
      pendingBalance: 0,
      pendingWithdrawals: 0
    };
  }
}
