/**
 * Firebase Functions para integração com Asaas
 * Sistema de pagamento de projetos com split próprio
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import {
  createOrUpdateCustomer,
  createPayment,
  getPaymentStatus,
  createTransfer,
  createSubscription,
  cleanDocument,
  calculateDueDate,
  getCycleFromCategory,
  type AsaasCustomer,
  type AsaasPayment,
  type AsaasTransfer,
  type AsaasSubscription,
} from './asaasService';
import { ASAAS_CONFIG, ASAAS_WEBHOOK_EVENTS } from './config/asaas';

// Inicializa o admin caso não esteja inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const corsHandler = cors({
  origin: function (origin, callback) {
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Permite todas as origens
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true
});

/**
 * Função para calcular split
 */
function calculateSplit(totalAmount: number): {
  totalAmount: number;
  platformFee: number;
  freelancerAmount: number;
} {
  const platformFee = Math.round((totalAmount * ASAAS_CONFIG.split.platformFeePercentage) / 100 * 100) / 100;
  const freelancerAmount = Math.round((totalAmount * ASAAS_CONFIG.split.freelancerPercentage) / 100 * 100) / 100;

  return {
    totalAmount,
    platformFee,
    freelancerAmount,
  };
}

/**
 * Firebase Function: Criar checkout do Asaas
 * POST /createAsaasCheckout
 */
export const createAsaasCheckout = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    // Configurar CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token de autenticação necessário' });
        return;
      }

      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const {
        projectId,
        projectTitle,
        amount, // Valor proposto pelo freelancer (90%)
        clientData,
        freelancerData,
      } = req.body;

      // Validar dados obrigatórios
      if (!projectId || !projectTitle || !amount || !clientData) {
        res.status(400).json({
          error: 'Dados obrigatórios ausentes',
          required: ['projectId', 'projectTitle', 'amount', 'clientData'],
        });
        return;
      }

      console.log('[Asaas Checkout] Iniciando criação para projeto:', projectId);

      // Calcular valor total com taxa de 10%
      const freelancerAmount = Number(amount);
      const totalAmount = freelancerAmount / 0.9; // Se 90% = amount, então 100% = amount/0.9
      const split = calculateSplit(totalAmount);

      console.log('[Asaas Checkout] Valores calculados:', split);

      // 1. Criar ou atualizar cliente no Asaas
      // CPF válido para testes em sandbox: 24971563792
      const cpfCnpj = cleanDocument(clientData.cpf || clientData.document || '');
      const validCpf = cpfCnpj && cpfCnpj.length === 11 ? cpfCnpj : '24971563792'; // CPF de teste válido
      
      const customerAsaas: AsaasCustomer = {
        name: clientData.name || 'Cliente Teste',
        email: clientData.email || `${userId}@xjobs.app`,
        cpfCnpj: validCpf,
        phone: cleanDocument(clientData.phone || '11999999999'),
        mobilePhone: cleanDocument(clientData.phone || '11999999999'),
        externalReference: userId,
        notificationDisabled: false,
      };

      const customer = await createOrUpdateCustomer(customerAsaas);
      console.log('[Asaas Checkout] Cliente criado/atualizado:', customer.id);

      // 2. Criar cobrança no Asaas
      const dueDate = calculateDueDate(3); // Vencimento em 3 dias
      
      const paymentAsaas: AsaasPayment = {
        customer: customer.id!,
        billingType: 'UNDEFINED', // Permite PIX e Cartão
        value: split.totalAmount,
        dueDate: dueDate,
        description: `Garantia - ${projectTitle}`,
        externalReference: `project_${projectId}_${Date.now()}`,
      };

      const payment = await createPayment(paymentAsaas);
      console.log('[Asaas Checkout] Cobrança criada:', payment.id);

      // 3. Salvar informações no Firestore
      const paymentDoc = {
        projectId,
        projectTitle,
        projectValue: freelancerAmount,
        totalAmount: split.totalAmount,
        platformFee: split.platformFee,
        freelancerAmount: split.freelancerAmount,
        clientId: userId,
        freelancerId: freelancerData?.freelancerId || null,
        freelancerName: freelancerData?.freelancerName || null,
        gateway: 'asaas',
        asaasPaymentId: payment.id,
        asaasCustomerId: customer.id,
        paymentStatus: 'pending',
        escrowStatus: 'not_held',
        totalPaid: 0,
        totalHeld: 0,
        totalReleased: 0,
        totalRefunded: 0,
        autoReleaseEnabled: false,
        transactions: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('projectPayments').doc(payment.id!).set(paymentDoc);
      console.log('[Asaas Checkout] Dados salvos no Firestore');

      // 4. Atualizar projeto para aguardando_garantia
      await db.collection('projects').doc(projectId).update({
        status: 'aguardando_garantia',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 5. Retornar resposta
      res.status(200).json({
        success: true,
        paymentId: payment.id,
        customerId: customer.id,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        pixQrCode: payment.pixTransaction?.encodedImage,
        pixPayload: payment.pixTransaction?.payload,
        pixExpirationDate: payment.pixTransaction?.expirationDate,
        dueDate: payment.dueDate,
        status: payment.status,
        totalAmount: split.totalAmount,
        platformFee: split.platformFee,
        freelancerAmount: split.freelancerAmount,
        message: 'Checkout criado com sucesso',
      });

    } catch (error) {
      console.error('[Asaas Checkout] Erro:', error);
      res.status(500).json({
        error: 'Erro ao criar checkout',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  });
});

/**
 * Firebase Function: Criar assinatura de plano no Asaas
 * POST /createAsaasSubscription
 */
export const createAsaasSubscription = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
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
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token de autenticação necessário' });
        return;
      }

      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const {
        planId,
        planName,
        price, // Valor em reais
        category, // 1, 3, 6, 12
        likeLimit,
        messageLimit,
      } = req.body;

      // Validar dados obrigatórios
      if (!planId || !planName || !price) {
        res.status(400).json({
          error: 'Dados obrigatórios ausentes',
          required: ['planId', 'planName', 'price'],
        });
        return;
      }

      console.log('[Asaas Subscription] Iniciando criação para plano:', planId);

      // Buscar dados do usuário
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      const userData = userDoc.data();

      // Criar ou atualizar cliente no Asaas
      // CPF válido para testes em sandbox: 24971563792
      const cpfCnpj = cleanDocument(userData?.document || '');
      const validCpf = cpfCnpj && cpfCnpj.length === 11 ? cpfCnpj : '24971563792'; // CPF de teste válido
      
      const customerAsaas: AsaasCustomer = {
        name: userData?.name || userData?.displayName || 'Usuário Teste',
        email: userData?.email || `${userId}@xjobs.app`,
        cpfCnpj: validCpf,
        phone: cleanDocument(userData?.phone || '11999999999'),
        mobilePhone: cleanDocument(userData?.phone || '11999999999'),
        externalReference: userId,
        notificationDisabled: false,
      };

      const customer = await createOrUpdateCustomer(customerAsaas);
      console.log('[Asaas Subscription] Cliente criado/atualizado:', customer.id);

      // Calcular próximo vencimento (hoje + 7 dias para primeira cobrança)
      const nextDueDate = calculateDueDate(7);

      // Criar assinatura recorrente
      const cycle = getCycleFromCategory(category || 1);
      
      const subscriptionAsaas: AsaasSubscription = {
        customer: customer.id!,
        billingType: 'UNDEFINED', // Permite PIX e Cartão
        value: Number(price),
        nextDueDate: nextDueDate,
        cycle: cycle,
        description: `Plano ${planName}`,
        externalReference: `plan_${planId}_user_${userId}`,
      };

      const subscription = await createSubscription(subscriptionAsaas);
      console.log('[Asaas Subscription] Assinatura criada:', subscription.id);

      // Salvar assinatura no Firestore
      const subscriptionDoc = {
        userId,
        planId,
        planName,
        price: Number(price),
        category: category || 1,
        likeLimit: likeLimit || null,
        messageLimit: messageLimit || null,
        gateway: 'asaas',
        asaasSubscriptionId: subscription.id,
        asaasCustomerId: customer.id,
        status: 'active',
        nextDueDate: subscription.nextDueDate,
        cycle: subscription.cycle,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('activeSubscriptions').doc(userId).set(subscriptionDoc);
      console.log('[Asaas Subscription] Assinatura salva no Firestore');

      // Atualizar plano do usuário
      await db.collection('users').doc(userId).update({
        currentPlan: {
          id: planId,
          name: planName,
          likeLimit: likeLimit || null,
          messageLimit: messageLimit || null,
          activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        success: true,
        subscriptionId: subscription.id,
        customerId: customer.id,
        status: subscription.status,
        nextDueDate: subscription.nextDueDate,
        invoiceUrl: subscription.invoiceUrl,
        message: 'Assinatura criada com sucesso',
      });

    } catch (error) {
      console.error('[Asaas Subscription] Erro:', error);
      res.status(500).json({
        error: 'Erro ao criar assinatura',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  });
});

/**
 * Firebase Function: Webhook do Asaas
 * POST /asaasWebhook
 */
export const asaasWebhook = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).send('Método não permitido');
      return;
    }

    try {
      const webhookData = req.body;
      const event = webhookData.event;

      console.log('[Asaas Webhook] Evento recebido:', event);
      console.log('[Asaas Webhook] Dados:', JSON.stringify(webhookData, null, 2));

      // Salvar webhook no Firestore para auditoria
      await db.collection('asaasWebhooks').add({
        event,
        data: webhookData,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Processar eventos de pagamento de projetos
      if (event === ASAAS_WEBHOOK_EVENTS.PAYMENT_CONFIRMED || 
          event === ASAAS_WEBHOOK_EVENTS.PAYMENT_RECEIVED) {
        await processPaymentConfirmed(webhookData.payment);
      }

      // Processar eventos de criação de assinatura
      if (event === ASAAS_WEBHOOK_EVENTS.SUBSCRIPTION_CREATED) {
        await processSubscriptionCreated(webhookData.subscription);
      }

      // Processar eventos de atualização de assinatura
      if (event === ASAAS_WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED) {
        await processSubscriptionUpdated(webhookData.subscription);
      }

      // Processar eventos de inativação de assinatura
      if (event === ASAAS_WEBHOOK_EVENTS.SUBSCRIPTION_INACTIVATED || 
          event === ASAAS_WEBHOOK_EVENTS.SUBSCRIPTION_DELETED) {
        await processSubscriptionInactivated(webhookData.subscription);
      }

      res.status(200).send('ok');
    } catch (error) {
      console.error('[Asaas Webhook] Erro ao processar:', error);
      res.status(500).send('error');
    }
  });
});

/**
 * Processa pagamento confirmado
 */
async function processPaymentConfirmed(paymentData: { 
  id: string; 
  billingType?: string; 
  clientPaymentDate?: string;
  confirmedDate?: string;
  value?: number;
  description?: string;
  externalReference?: string;
  customer?: string;
  [key: string]: unknown 
}) {
  try {
    const paymentId = paymentData.id;
    console.log('[Asaas Webhook] Processando pagamento confirmado:', paymentId);

    // Buscar registro do pagamento no Firestore
    const paymentDoc = await db.collection('projectPayments').doc(paymentId).get();

    if (!paymentDoc.exists) {
      console.log('[Asaas Webhook] Pagamento não encontrado no Firestore, tentando criar registro para pagamento externo:', paymentId);
      
      // Tentar extrair projectId do externalReference
      const externalRef = paymentData.externalReference as string;
      let projectId = null;
      
      if (externalRef && externalRef.includes('project_')) {
        // Formato esperado: project_PROJECTID_timestamp
        const parts = externalRef.split('_');
        if (parts.length >= 2) {
          projectId = parts[1];
        }
      }
      
      if (!projectId) {
        console.error('[Asaas Webhook] Não foi possível extrair projectId do externalReference:', externalRef);
        console.error('[Asaas Webhook] Pagamento externo ignorado - sem referência ao projeto');
        return;
      }
      
      // Verificar se o projeto existe
      const projectDoc = await db.collection('projects').doc(projectId).get();
      if (!projectDoc.exists) {
        console.error('[Asaas Webhook] Projeto não encontrado:', projectId);
        return;
      }
      
      const project = projectDoc.data();
      const paymentValue = Number(paymentData.value) || 0;
      
      // Calcular split (assumindo que o valor recebido já é o valor total com taxa)
      const split = calculateSplit(paymentValue);
      
      console.log('[Asaas Webhook] Criando registro para pagamento externo:', {
        paymentId,
        projectId,
        value: paymentValue,
        split
      });
      
      // Criar registro do pagamento no Firestore
      const externalPaymentDoc = {
        projectId,
        projectTitle: project?.title || 'Projeto sem título',
        projectValue: split.freelancerAmount,
        totalAmount: split.totalAmount,
        platformFee: split.platformFee,
        freelancerAmount: split.freelancerAmount,
        clientId: project?.clientId || 'unknown',
        freelancerId: project?.selectedFreelancerId || null,
        freelancerName: 'Freelancer não identificado',
        gateway: 'asaas',
        asaasPaymentId: paymentId,
        asaasCustomerId: paymentData.customer as string || 'unknown',
        paymentStatus: 'pending',
        escrowStatus: 'not_held',
        totalPaid: 0,
        totalHeld: 0,
        totalReleased: 0,
        totalRefunded: 0,
        autoReleaseEnabled: false,
        transactions: [],
        isExternalPayment: true, // Flag para identificar pagamentos criados externamente
        externalReference: externalRef,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      // Salvar o registro
      await db.collection('projectPayments').doc(paymentId).set(externalPaymentDoc);
      console.log('[Asaas Webhook] Registro de pagamento externo criado com sucesso');
      
      // Recarregar o documento para continuar o processamento
      const newPaymentDoc = await db.collection('projectPayments').doc(paymentId).get();
      if (!newPaymentDoc.exists) {
        console.error('[Asaas Webhook] Erro ao recarregar pagamento criado');
        return;
      }
      
      // Continuar com o processamento normal
      await processExistingPayment(newPaymentDoc, paymentData);
      return;
    }

    // Processar pagamento existente
    await processExistingPayment(paymentDoc, paymentData);

  } catch (error) {
    console.error('[Asaas Webhook] Erro ao processar pagamento confirmado:', error);
    throw error;
  }
}

/**
 * Processa um pagamento que já existe no Firestore
 */
async function processExistingPayment(paymentDoc: FirebaseFirestore.DocumentSnapshot, paymentData: { 
  billingType?: string; 
  clientPaymentDate?: string;
  confirmedDate?: string;
  [key: string]: unknown 
}) {
  const payment = paymentDoc.data();
  const projectId = payment?.projectId;

  if (!projectId) {
    console.error('[Asaas Webhook] Project ID não encontrado');
    return;
  }

  // Determinar método de pagamento
  const paymentMethod = paymentData.billingType as string || 'UNDEFINED';
  
  // Calcular data de disponibilidade
  // PIX: Disponível imediatamente
  // CREDIT_CARD: Disponível após 35 dias
  const paidDate = paymentData.clientPaymentDate || paymentData.confirmedDate || new Date().toISOString().split('T')[0];
  const paidTimestamp = admin.firestore.Timestamp.fromDate(new Date(paidDate));
  
  const availableDate = new Date(paidDate);
  if (paymentMethod === 'CREDIT_CARD') {
    // Cartão de crédito: +35 dias
    availableDate.setDate(availableDate.getDate() + 35);
  }
  // PIX e outros: disponível imediatamente
  
  const availableTimestamp = admin.firestore.Timestamp.fromDate(availableDate);

  // Atualizar status do pagamento
  await paymentDoc.ref.update({
    paymentStatus: 'paid',
    escrowStatus: 'held',
    totalPaid: payment.totalAmount || 0,
    totalHeld: payment.freelancerAmount || 0, // Apenas 90% fica retido para o freelancer
    paymentMethod: paymentMethod,
    paidAt: paidTimestamp,
    availableAt: availableTimestamp,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('[Asaas Webhook] Status do pagamento atualizado', {
    paymentMethod,
    paidAt: paidDate,
    availableAt: availableDate.toISOString().split('T')[0],
  });

  // Criar fundHold
  const holdData = {
    projectId: projectId,
    projectValue: payment.freelancerAmount || 0,
    totalHeld: payment.freelancerAmount || 0,
    totalReleased: 0,
    totalRefunded: 0,
    availableForRelease: payment.freelancerAmount || 0,
    isActive: true,
    releases: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('fundHolds').add(holdData);
  console.log('[Asaas Webhook] FundHold criado');

  // Atualizar status do projeto para 'executando'
  await db.collection('projects').doc(projectId).update({
    status: 'executando',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('[Asaas Webhook] Projeto atualizado para executando');
}

/**
 * Processa criação de assinatura (SUBSCRIPTION_CREATED)
 * Este evento ocorre quando uma assinatura é criada, mas ainda não foi paga
 */
async function processSubscriptionCreated(subscriptionData: { id: string; customer: string; [key: string]: unknown }) {
  try {
    const subscriptionId = subscriptionData.id;
    console.log('[Asaas Webhook] Assinatura criada:', subscriptionId);

    // Buscar assinatura no Firestore
    const subscriptionsQuery = await db.collection('activeSubscriptions')
      .where('asaasSubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();

    if (subscriptionsQuery.empty) {
      console.log('[Asaas Webhook] Assinatura não encontrada no Firestore (pode ser criada depois)');
      return;
    }

    const subscriptionDoc = subscriptionsQuery.docs[0];

    // Atualizar status para pendente (aguardando primeiro pagamento)
    await subscriptionDoc.ref.update({
      status: 'pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('[Asaas Webhook] Status da assinatura atualizado para pendente');

  } catch (error) {
    console.error('[Asaas Webhook] Erro ao processar criação de assinatura:', error);
    throw error;
  }
}

/**
 * Processa atualização de assinatura (SUBSCRIPTION_UPDATED)
 */
async function processSubscriptionUpdated(subscriptionData: { id: string; [key: string]: unknown }) {
  try {
    const subscriptionId = subscriptionData.id;
    console.log('[Asaas Webhook] Assinatura atualizada:', subscriptionId);

    // Buscar assinatura no Firestore
    const subscriptionsQuery = await db.collection('activeSubscriptions')
      .where('asaasSubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();

    if (subscriptionsQuery.empty) {
      console.log('[Asaas Webhook] Assinatura não encontrada no Firestore');
      return;
    }

    const subscriptionDoc = subscriptionsQuery.docs[0];

    // Atualizar dados da assinatura
    await subscriptionDoc.ref.update({
      ...subscriptionData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('[Asaas Webhook] Assinatura atualizada no Firestore');

  } catch (error) {
    console.error('[Asaas Webhook] Erro ao processar atualização de assinatura:', error);
    throw error;
  }
}

/**
 * Processa inativação/exclusão de assinatura
 */
async function processSubscriptionInactivated(subscriptionData: { id: string; [key: string]: unknown }) {
  try {
    const subscriptionId = subscriptionData.id;
    console.log('[Asaas Webhook] Assinatura inativada:', subscriptionId);

    // Buscar assinatura no Firestore
    const subscriptionsQuery = await db.collection('activeSubscriptions')
      .where('asaasSubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();

    if (subscriptionsQuery.empty) {
      console.log('[Asaas Webhook] Assinatura não encontrada no Firestore');
      return;
    }

    const subscriptionDoc = subscriptionsQuery.docs[0];
    const subscription = subscriptionDoc.data();

    // Atualizar status da assinatura
    await subscriptionDoc.ref.update({
      status: 'inactive',
      inactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Remover plano do usuário
    await db.collection('users').doc(subscription.userId).update({
      currentPlan: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('[Asaas Webhook] Assinatura inativada e plano removido do usuário');

  } catch (error) {
    console.error('[Asaas Webhook] Erro ao processar inativação de assinatura:', error);
    throw error;
  }
}

/**
 * Firebase Function: Verificar status de pagamento
 * GET /checkAsaasPaymentStatus?paymentId={id}
 */
export const checkAsaasPaymentStatus = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
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
      const paymentId = req.query.paymentId as string;

      if (!paymentId) {
        res.status(400).json({ error: 'paymentId é obrigatório' });
        return;
      }

      const payment = await getPaymentStatus(paymentId);

      res.status(200).json({
        success: true,
        paymentId: payment.id,
        status: payment.status,
        value: payment.value,
        dueDate: payment.dueDate,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        pixQrCode: payment.pixTransaction?.encodedImage,
        pixPayload: payment.pixTransaction?.payload,
      });

    } catch (error) {
      console.error('[Asaas Check Status] Erro:', error);
      res.status(500).json({
        error: 'Erro ao verificar status',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  });
});

/**
 * Firebase Function: Transferir valores para freelancer
 * POST /transferToFreelancerAsaas
 */
export const transferToFreelancerAsaas = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
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
      const { releaseId, freelancerId, amount, bankData } = req.body;

      if (!releaseId || !freelancerId || !amount || !bankData) {
        res.status(400).json({
          error: 'Dados obrigatórios ausentes',
          required: ['releaseId', 'freelancerId', 'amount', 'bankData'],
        });
        return;
      }

      console.log('[Asaas Transfer] Iniciando transferência para release:', releaseId);

      // Buscar dados bancários do freelancer se não fornecidos
      let finalBankData = bankData;
      if (!finalBankData) {
        const freelancerDoc = await db.collection('users').doc(freelancerId).get();
        if (!freelancerDoc.exists) {
          throw new Error('Freelancer não encontrado');
        }
        finalBankData = freelancerDoc.data()?.bankAccount;
        if (!finalBankData) {
          throw new Error('Dados bancários não cadastrados');
        }
      }

      // Criar transferência no Asaas
      const transferData: AsaasTransfer = {
        value: Number(amount),
        bankAccount: {
          bank: {
            code: finalBankData.bank,
          },
          accountName: finalBankData.holderName,
          ownerName: finalBankData.holderName,
          cpfCnpj: cleanDocument(finalBankData.holderDocument),
          agency: finalBankData.agency,
          account: finalBankData.account,
          accountDigit: finalBankData.accountDigit,
        },
        operationType: 'PIX',
        description: ASAAS_CONFIG.transfer.description,
      };

      const transfer = await createTransfer(transferData);
      console.log('[Asaas Transfer] Transferência criada:', transfer.id);

      // Atualizar fundRelease com ID da transferência
      await db.collection('fundReleases').doc(releaseId).update({
        status: 'released',
        gateway: 'asaas',
        asaasTransferId: transfer.id,
        transferId: transfer.id,
        releasedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        success: true,
        transferId: transfer.id,
        status: transfer.status,
        message: 'Transferência iniciada com sucesso',
      });

    } catch (error) {
      console.error('[Asaas Transfer] Erro:', error);
      res.status(500).json({
        error: 'Erro ao criar transferência',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  });
});

