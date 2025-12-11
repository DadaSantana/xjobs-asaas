/**
 * Firebase Functions para sistema de saque via Asaas
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { 
  createOrUpdateCustomer,
  createTransfer,
  type AsaasCustomer,
  type AsaasTransfer,
  type AsaasTransferResponse,
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
      console.log('[Withdrawal] Saldo calculado:', balance);
      
      if (balance.availableBalance < amount) {
        res.status(400).json({ 
          error: 'Saldo insuficiente',
          availableBalance: balance.availableBalance,
          requestedAmount: amount,
          details: {
            totalReleased: balance.totalReleased,
            pendingWithdrawals: balance.pendingWithdrawals,
            pendingBalance: balance.pendingBalance
          }
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

      // Descontar taxa PIX fixa de R$ 2,00
      const PIX_FEE = 2.00;
      const netAmount = amount - PIX_FEE;

      if (netAmount <= 0) {
        res.status(400).json({ 
          error: 'Valor insuficiente para cobrir a taxa PIX de R$ 2,00',
          requestedAmount: amount,
          pixFee: PIX_FEE
        });
        return;
      }

      // Tentar diferentes chaves PIX em ordem de prioridade
      const pixKeysToTry = [];
      
      // 1. Chave PIX cadastrada manualmente (se existir)
      if (freelancerData?.pixKey) {
        pixKeysToTry.push({
          key: freelancerData.pixKey,
          type: freelancerData.pixKey.includes('@') ? 'EMAIL' : 
                freelancerData.pixKey.length === 11 ? 'CPF' : 
                freelancerData.pixKey.length === 14 ? 'CNPJ' : 
                freelancerData.pixKey.replace(/\D/g, '').length >= 10 ? 'PHONE' : 'EVP',
          source: 'manual'
        });
      }

      // 2. CPF do freelancer (mais comum)
      if (validCpf && validCpf.length === 11) {
        pixKeysToTry.push({
          key: validCpf,
          type: 'CPF',
          source: 'cpf'
        });
      }

      // 3. Email do freelancer
      if (freelancerData?.email) {
        pixKeysToTry.push({
          key: freelancerData.email,
          type: 'EMAIL',
          source: 'email'
        });
      }

      // 4. Telefone do freelancer
      if (formattedPhone && formattedPhone !== '11999999999') {
        pixKeysToTry.push({
          key: formattedPhone,
          type: 'PHONE',
          source: 'phone'
        });
      }

      if (pixKeysToTry.length === 0) {
        res.status(400).json({ 
          error: 'Nenhuma chave PIX disponível',
          details: 'Configure seus dados (CPF, email ou cadastre uma chave PIX) para receber saques.'
        });
        return;
      }

      console.log('[Withdrawal] Tentando chaves PIX:', pixKeysToTry.map(p => `${p.type} (${p.source})`));

      let transfer: AsaasTransferResponse | null = null;
      let lastError: Error | null = null;
      let usedPixKey: { key: string; type: string; source: string } | null = null;

      // Tentar cada chave PIX até uma funcionar
      for (const pixInfo of pixKeysToTry) {
        try {
          console.log(`[Withdrawal] Tentando transferência com chave ${pixInfo.type}: ${pixInfo.key}`);
          
          const transferAsaas: AsaasTransfer = {
            value: netAmount,
            operationType: 'PIX',
            pixAddressKey: pixInfo.key,
            pixAddressKeyType: pixInfo.type as 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP',
            description: `Saque de saldo - Freelancer ${freelancerData?.name || user.uid}`,
            externalReference: `withdrawal_${user.uid}_${Date.now()}`
          };

          transfer = await createTransfer(transferAsaas);
          usedPixKey = pixInfo;
          console.log(`[Withdrawal] ✓ Transferência criada com sucesso usando ${pixInfo.type}:`, transfer.id);
          break; // Sucesso! Sair do loop
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.log(`[Withdrawal] ✗ Falha com chave ${pixInfo.type}:`, lastError.message);
          // Continuar tentando a próxima chave
        }
      }

      // Se nenhuma chave funcionou
      if (!transfer) {
        console.error('[Withdrawal] Nenhuma chave PIX funcionou. Último erro:', lastError);
        res.status(400).json({ 
          error: 'Chave PIX inválida ou não cadastrada',
          details: 'Nenhuma das suas chaves PIX (CPF, email ou telefone) está cadastrada no seu banco. Por favor, cadastre uma chave PIX válida no aplicativo do seu banco e tente novamente.',
          triedKeys: pixKeysToTry.map(p => p.type),
          suggestion: 'Cadastre seu CPF, email ou telefone como chave PIX no seu banco e aguarde a ativação (geralmente é instantâneo).'
        });
        return;
      }

      // Criar registro de saque (usedPixKey é garantido não-null aqui pois transfer não é null)
      const withdrawalRequest = {
        freelancerId: user.uid,
        freelancerName: freelancerData?.name || user.email || 'Freelancer',
        amount,
        netAmount,
        pixFee: PIX_FEE,
        status: transfer.status === 'PENDING' ? 'pending' : 'completed',
        gateway: 'asaas',
        transferId: transfer.id,
        transferStatus: transfer.status,
        asaasCustomerId: customer.id,
        pixKey: usedPixKey!.key,
        pixKeyType: usedPixKey!.type,
        pixKeySource: usedPixKey!.source,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const withdrawalRef = await db.collection('withdrawRequests').add(withdrawalRequest);
      console.log('[Withdrawal] Solicitação de saque criada:', withdrawalRef.id);

      // Criar transação de saque
      const withdrawalTransaction = {
        type: 'withdraw',
        amount,
        description: `Saque do saldo disponível (Líquido: R$ ${netAmount.toFixed(2)}, Taxa PIX: R$ ${PIX_FEE.toFixed(2)})`,
        fromUserId: user.uid,
        toUserId: user.uid,
        status: transfer.status === 'PENDING' ? 'pending' : 'completed',
        netAmount,
        pixFee: PIX_FEE,
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
        netAmount,
        pixFee: PIX_FEE,
        transferStatus: transfer.status,
        finalStatus: transfer.status === 'PENDING' ? 'pending' : 'completed',
        pixKeyUsed: usedPixKey!.type,
        message: `Saque processado com sucesso via PIX (${usedPixKey!.type}). Você receberá R$ ${netAmount.toFixed(2)} (Taxa PIX: R$ ${PIX_FEE.toFixed(2)})`
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
 * Sincronizada com a lógica do frontend (FundsService.getFreelancerBalance)
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
    console.log('[getFreelancerBalance] Calculando saldo para:', freelancerId);
    
    // Buscar todas as transações de liberação para o freelancer
    const transactionsQuery = db.collection('fundTransactions')
      .where('toUserId', '==', freelancerId)
      .where('type', '==', 'release')
      .where('status', '==', 'completed');

    const transactionsSnapshot = await transactionsQuery.get();
    
    let totalReleasedFromTx = 0;
    transactionsSnapshot.forEach(doc => {
      const transaction = doc.data();
      totalReleasedFromTx += Number(transaction.amount || 0);
    });
    console.log('[getFreelancerBalance] totalReleasedFromTx:', totalReleasedFromTx);

    // Fallback: buscar de fundReleases também (caso transações ainda não foram criadas)
    const releasesQuery = db.collection('fundReleases')
      .where('freelancerId', '==', freelancerId)
      .where('status', '==', 'released');
    
    const releasesSnapshot = await releasesQuery.get();
    
    let totalReleasedFromReleases = 0;
    releasesSnapshot.forEach(doc => {
      const release = doc.data();
      totalReleasedFromReleases += Number(release.amount || 0);
    });
    console.log('[getFreelancerBalance] totalReleasedFromReleases:', totalReleasedFromReleases);

    // Usar o maior valor entre transações e releases
    const totalReleased = Math.max(totalReleasedFromTx, totalReleasedFromReleases);
    console.log('[getFreelancerBalance] totalReleased (max):', totalReleased);

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
    console.log('[getFreelancerBalance] totalWithdrawn:', totalWithdrawn);
    console.log('[getFreelancerBalance] pendingWithdrawals:', pendingWithdrawals);

    const availableBalance = Math.max(0, totalReleased - totalWithdrawn - pendingWithdrawals);
    console.log('[getFreelancerBalance] availableBalance final:', availableBalance);

    return {
      totalEarnings: totalReleased,
      totalReleased,
      pendingAmount: 0, // Valores ainda não liberados
      availableBalance,
      pendingBalance: 0, // Valores liberados mas bloqueados por prazo
      pendingWithdrawals
    };

  } catch (error) {
    console.error('[getFreelancerBalance] Erro ao calcular saldo:', error);
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
