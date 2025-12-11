import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { firestore as v2firestore } from 'firebase-functions/v2';
import fetch from 'node-fetch';
import cors from 'cors';

interface UserData {
  name?: string;
  displayName?: string;
  email?: string;
  document?: string;
  cnpj?: string;
  phoneNumber?: string;
  phoneDDD?: string;
  phone_number?: string;
  phone_ddd?: string;
  street?: string;
  street_number?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  address?: {
    line1?: string;
    street?: string;
    zip_code?: string;
    zipCode?: string;
    city?: string;
    state?: string;
  };
}

// Inicializa o admin caso não esteja inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

// Chave de produção do Pagar.me
const PAGARME_SECRET = 'sk_d6c3531584364d8598899c2f470ae421';
// Modo simulação enquanto a chave está inválida
const SIMULATION_MODE = false;
// Formato de autenticação
const PAGARME_AUTH = 'Basic ' + Buffer.from(PAGARME_SECRET + ':').toString('base64');
const PAGARME_API = 'https://api.pagar.me/core/v5/plans';

const corsHandler = cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (como as do SDK do Firebase)
    // e também permite localhost para desenvolvimento
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Permite todas as origens para simplificar
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true
});

// Função utilitária para detectar tipo de documento
function getDocumentType(document: string): 'individual' | 'company' {
  const cleanDocument = document.replace(/\D/g, '');
  
  // CPF tem 11 dígitos, CNPJ tem 14 dígitos
  // Conforme documentação oficial do Pagar.me:
  // - 'individual' para CPF (pessoa física)
  // - 'company' para CNPJ (pessoa jurídica)
  if (cleanDocument.length === 11) {
    return 'individual'; // CPF = Pessoa Física
  } else if (cleanDocument.length === 14) {
    return 'company'; // CNPJ = Pessoa Jurídica
  }
  
  // Fallback: se não conseguir determinar, assume pessoa física
  return 'individual';
}

// Middleware para checar se é admin
async function isAdmin(req: functions.https.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded.admin === true;
  } catch {
    return false;
  }
}

// ============================================
// FUNÇÕES ANTIGAS DO PAGARME - DESCONTINUADAS
// Estas funções foram comentadas para reduzir uso de CPU
// ============================================
/*
export const createPlan = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).send('Método não permitido');
      return;
    }
    if (!(await isAdmin(req))) {
      res.status(403).send('Acesso negado');
      return;
    }
    try {
      console.log('Body recebido em createPlan:', req.body);
      const pagarmeRes = await fetch(PAGARME_API, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: PAGARME_AUTH,
        },
        body: JSON.stringify(req.body),
      });
      const text = await pagarmeRes.text();
      console.log('Resposta do Pagar.me:', text);
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      res.status(pagarmeRes.status).json(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });
});
*/

// ============================================
// FIM DAS FUNÇÕES ANTIGAS DO PAGARME
// ============================================

/*
export const editPlan = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'PUT') {
      res.status(405).send('Método não permitido');
      return;
    }
    if (!(await isAdmin(req))) {
      res.status(403).send('Acesso negado');
      return;
    }
    const { planId, ...body } = req.body;
    if (!planId) {
      res.status(400).send('planId é obrigatório');
      return;
    }
    try {
      const pagarmeRes = await fetch(`${PAGARME_API}/${planId}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: PAGARME_AUTH,
        },
        body: JSON.stringify(body),
      });
      const data = await pagarmeRes.json();
      res.status(pagarmeRes.status).json(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });
});

export const deletePlan = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'DELETE') {
      res.status(405).send('Método não permitido');
      return;
    }
    if (!(await isAdmin(req))) {
      res.status(403).send('Acesso negado');
      return;
    }
    const { planId } = req.body;
    if (!planId) {
      res.status(400).send('planId é obrigatório');
      return;
    }
    try {
      const pagarmeRes = await fetch(`${PAGARME_API}/${planId}`, {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          authorization: PAGARME_AUTH,
        },
      });
      const data = await pagarmeRes.json();
      res.status(pagarmeRes.status).json(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });
});

export const listPlans = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      res.status(405).send('Método não permitido');
      return;
    }
    if (!(await isAdmin(req))) {
      res.status(403).send('Acesso negado');
      return;
    }
    try {
      const pagarmeRes = await fetch(PAGARME_API, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: PAGARME_AUTH,
        },
      });
      const data = await pagarmeRes.json();
      res.status(pagarmeRes.status).json(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });
});

export const savePlanLimits = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).send('Método não permitido');
      return;
    }
    if (!(await isAdmin(req))) {
      res.status(403).send('Acesso negado');
      return;
    }
    const { planId, likeLimit, messageLimit, name, description, price, category } = req.body;
    if (!planId) {
      res.status(400).send('planId é obrigatório');
      return;
    }
    try {
      await admin.firestore().collection('plans').doc(planId).set({
        planId,
        likeLimit,
        messageLimit,
        name,
        description,
        price,
        category,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      res.status(200).json({ success: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });
});

export const createPaymentLink = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).send('Método não permitido');
      return;
    }
    if (!(await isAdmin(req))) {
      res.status(403).send('Acesso negado');
      return;
    }
    try {
      const pagarmeRes = await fetch('https://api.pagar.me/core/v5/paymentlinks', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: PAGARME_AUTH,
        },
        body: JSON.stringify(req.body),
      });
      const text = await pagarmeRes.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      res.status(pagarmeRes.status).json(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });
});

// Função para criar link de pagamento de planos (sem necessidade de admin)
export const createPlanPaymentLink = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    console.log('🔵 [createPlanPaymentLink] Iniciando função');
    console.log('🔵 [createPlanPaymentLink] Método:', req.method);
    
    if (req.method !== 'POST') {
      console.log('🔴 [createPlanPaymentLink] Método não permitido:', req.method);
      res.status(405).send('Método não permitido');
      return;
    }
    
    // Verificar se o usuário está autenticado
    const authHeader = req.headers.authorization;
    console.log('🔵 [createPlanPaymentLink] Authorization header presente?', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔴 [createPlanPaymentLink] Token de autenticação ausente ou inválido');
      res.status(401).json({ error: 'Token de autenticação necessário' });
      return;
    }
    
    try {
      const idToken = authHeader.split('Bearer ')[1];
      console.log('🔵 [createPlanPaymentLink] Verificando token...');
      const decoded = await admin.auth().verifyIdToken(idToken);
      const userId = decoded.uid;
      console.log('✅ [createPlanPaymentLink] Token válido, userId:', userId);
      
      const { planId, planName, price } = req.body;
      console.log('🔵 [createPlanPaymentLink] Dados recebidos:', { 
        planId, 
        planName, 
        price, 
        priceType: typeof price,
        fullBody: JSON.stringify(req.body)
      });
      
      if (!planId || !planName || price === undefined || price === null) {
        console.log('🔴 [createPlanPaymentLink] Dados do plano incompletos:', { planId, planName, price });
        res.status(400).json({ 
          error: 'Dados do plano incompletos',
          received: { planId, planName, price }
        });
        return;
      }
      
      // Buscar dados do usuário
      console.log('🔵 [createPlanPaymentLink] Buscando usuário no Firestore...');
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      if (!userDoc.exists) {
        console.log('🔴 [createPlanPaymentLink] Usuário não encontrado:', userId);
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }
      
      const userData = userDoc.data() as UserData;
      console.log('✅ [createPlanPaymentLink] Usuário encontrado:', {
        name: userData.name,
        email: userData.email,
        hasDocument: !!userData.document
      });
      
      // Criar payload para o Pagar.me (estrutura correta testada e funcional)
      const amountInCents = Math.round(price * 100);
      const paymentLinkData = {
        amount: amountInCents,
        type: 'order',
        cart_settings: {
          enabled: true,
          items: [{
            id: planId,
            name: `Assinatura ${planName}`,
            amount: amountInCents,
            quantity: 1,
            default_quantity: 1
          }]
        },
        payment_settings: {
          accepted_payment_methods: ['credit_card'],
          credit_card_settings: {
            operation_type: 'auth_and_capture',
            statement_descriptor: 'XJOBS PLANO',
            brand_installments: [{
              brand: 'visa',
              installments: [{
                number: 1,
                interest_rate: 0,
                total: amountInCents
              }]
            }]
          }
        },
        customer: {
          name: userData.name || userData.displayName || 'Cliente',
          email: userData.email || decoded.email,
          type: userData.document ? getDocumentType(userData.document) : 'individual'
        },
        items: [{
          amount: amountInCents,
          description: `Assinatura ${planName}`,
          quantity: 1
        }],
        metadata: {
          planId,
          planName,
          userId,
          type: 'plan_subscription'
        }
      };
      
      console.log('🔵 [createPlanPaymentLink] Payload para Pagar.me:', JSON.stringify(paymentLinkData, null, 2));
      console.log('🔵 [createPlanPaymentLink] Chamando API Pagar.me...');
      
      const pagarmeRes = await fetch('https://api.pagar.me/core/v5/paymentlinks', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: PAGARME_AUTH,
        },
        body: JSON.stringify(paymentLinkData),
      });
      
      console.log('🔵 [createPlanPaymentLink] Status da resposta Pagar.me:', pagarmeRes.status);
      
      const responseText = await pagarmeRes.text();
      console.log('🔵 [createPlanPaymentLink] Resposta Pagar.me (texto):', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('🔵 [createPlanPaymentLink] Resposta Pagar.me (parsed):', JSON.stringify(responseData, null, 2));
      } catch {
        console.log('🔴 [createPlanPaymentLink] Erro ao fazer parse da resposta');
        responseData = { error: responseText };
      }
      
      if (pagarmeRes.ok && responseData.url) {
        console.log('✅ [createPlanPaymentLink] Link criado com sucesso:', responseData.url);
        
        // Salvar informações do payment link no Firestore
        await admin.firestore().collection('paymentLinks').doc(responseData.id).set({
          paymentLinkId: responseData.id,
          userId,
          planId,
          planName,
          amount: price,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: paymentLinkData.metadata
        });
        
        console.log('✅ [createPlanPaymentLink] Payment link salvo no Firestore');
        
        res.status(200).json({ 
          success: true, 
          paymentUrl: responseData.url,
          paymentLinkId: responseData.id
        });
      } else {
        console.log('🔴 [createPlanPaymentLink] Erro ao criar link. Status:', pagarmeRes.status);
        console.log('🔴 [createPlanPaymentLink] Detalhes do erro:', JSON.stringify(responseData, null, 2));
        
        res.status(pagarmeRes.status).json({ 
          error: 'Erro ao criar link de pagamento', 
          details: responseData 
        });
      }
      
    } catch (err) {
      console.error('🔴 [createPlanPaymentLink] ERRO CRÍTICO:', err);
      console.error('🔴 [createPlanPaymentLink] Stack trace:', err instanceof Error ? err.stack : 'N/A');
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg, details: String(err) });
    }
  });
});

// Gerar link de pagamento para projeto
// Gerar link de pagamento para projeto
export const generateProjectPaymentLink = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    // Verificar se o usuário está autenticado
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).send('Token de autenticação necessário');
      return;
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    try {
      await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      res.status(401).send('Token de autenticação inválido');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Método não permitido');
      return;
    }

    try {
      const { projectId, projectTitle, amount, clientId, clientName, freelancerId, freelancerName } = req.body;

      console.log('Dados recebidos:', { projectId, projectTitle, amount, clientId, clientName, freelancerId, freelancerName });

      if (!projectId || !projectTitle || !amount || !clientId || !clientName || !freelancerId || !freelancerName) {
        res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        return;
      }

      // Buscar dados completos do cliente para enviar ao Pagar.me
      let customerPagarmeData: Record<string, unknown> = {};
      try {
        const clientDoc = await admin.firestore().collection('users').doc(clientId).get();
        if (clientDoc.exists) {
          const clientData = clientDoc.data() as UserData;
          const document = (clientData?.document || clientData?.cnpj || '11111111111').replace(/\D/g, '');
          const documentType = getDocumentType(document);
          
          customerPagarmeData = {
            name: clientData?.name || clientName,
            email: clientData?.email,
            type: documentType,
            document: document,
            phones: {
              mobile_phone: {
                country_code: '55',
                area_code: clientData?.phone_ddd || '11',
                number: clientData?.phone_number ? clientData.phone_number.replace(/\D/g, '') : '999999999'
              }
            },
            address: {
              line_1: clientData?.street ? `${clientData.street_number || ''}, ${clientData.street}`.trim() : 'Rua Principal, 123',
              zip_code: (clientData?.zip_code || '01310100').replace(/\D/g, ''),
              city: clientData?.city || 'São Paulo',
              state: clientData?.state || 'SP',
              country: 'BR'
            }
          }
        }
      } catch (custErr) {
        console.error('Erro ao montar dados do cliente para Pagar.me:', custErr);
      }

      // Valor total será recebido pelo sistema; fee de 10% fica como receita e 90% permanece retido para posterior repasse
      
      // Criar order com split para o sistema (100%)
      const requestBody = {
        items: [
          {
            amount: Math.round(amount * 100), // Valor em centavos
            description: `Garantia - ${projectTitle}`,
            quantity: 1,
            code: projectId
          }
        ],
        customer: customerPagarmeData,
        split: [
          {
            recipient_id: 're_cmb9mudkk5wxd0l9t53q9nm8w',
            amount: Math.round(amount * 100),
            type: 'flat',
            options: {
              charge_processing_fee: false,
              liable: false
            }
          }
        ],
        closed: false // Order aberta para pagamento posterior
      };

      const options = {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': PAGARME_AUTH
        },
        body: JSON.stringify(requestBody)
      };

      console.log('Request body para Pagar.me:', JSON.stringify(requestBody, null, 2));
      console.log('Authorization header:', PAGARME_AUTH.substring(0, 20) + '...');
      console.log('PAGARME_SECRET usado:', PAGARME_SECRET.substring(0, 10) + '...');
      console.log('URL da API:', 'https://api.pagar.me/core/v5/orders');
      console.log('Headers completos:', JSON.stringify(options.headers, null, 2));

      // Testar primeiro se a chave está funcionando com um endpoint simples
      console.log('Testando autenticação com endpoint de recipients...');
      try {
        const testResponse = await fetch('https://api.pagar.me/core/v5/recipients', {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'authorization': PAGARME_AUTH
          }
        });
        console.log('Teste de autenticação - Status:', testResponse.status);
        if (testResponse.ok) {
          console.log('✅ Autenticação funcionando!');
        } else {
          console.log('❌ Autenticação falhou:', testResponse.status);
          const testError = await testResponse.text();
          console.log('Erro do teste:', testError);
        }
      } catch (testError) {
        console.log('❌ Erro no teste de autenticação:', testError);
      }

      let data: { id: string; status?: string; amount?: number; created_at?: string };
      
      if (SIMULATION_MODE) {
        // Modo simulação para desenvolvimento
        console.log('⚠️ MODO SIMULAÇÃO ATIVADO - Usando dados de teste');
        const simulatedId = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        data = {
          id: simulatedId,
          status: 'pending',
          amount: Math.round(amount * 100),
          created_at: new Date().toISOString()
        };
        console.log('Link de pagamento simulado criado:', data);
      } else {
              // --- Requisição REAL ao Pagar.me ---
      console.log('Fazendo requisição para Pagar.me...');
      
      const response = await fetch('https://api.pagar.me/core/v5/orders', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': PAGARME_AUTH
        },
        body: JSON.stringify(requestBody)
      });
        console.log('Status da resposta:', response.status);
        console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro completo da API:', errorText);
          
          if (response.status === 401) {
            throw new Error('Chave de API do Pagar.me inválida. Verifique se a chave de teste está correta.');
          }
          
          throw new Error(`Erro na API do Pagar.me: ${response.status} - ${errorText}`);
        }

        try {
          const responseText = await response.text();
          console.log('Resposta da API:', responseText);
          data = JSON.parse(responseText);
          console.log('Order criada com sucesso:', { id: data.id, status: data.status });
        } catch (parseError) {
          console.error('Erro ao fazer parse da resposta:', parseError);
          throw new Error('Erro ao processar resposta da API do Pagar.me');
        }
      }
      
      // Salvar informações do pagamento no Firestore
      await admin.firestore().collection('projectPayments').doc(projectId).set({
        projectId,
        projectTitle,
        projectValue: amount,
        clientId,
        clientName,
        freelancerId,
        freelancerName,
        paymentStatus: 'pending',
        escrowStatus: 'not_held',
        totalPaid: 0,
        totalHeld: 0,
        totalReleased: 0,
        totalRefunded: 0,
        orderId: data.id,
        orderStatus: data.status,
        autoReleaseEnabled: false,
        transactions: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const responseData: { orderId: string; status?: string; warning?: string; simulationMode?: boolean } = {
        orderId: data.id,
        status: data.status
      };
      
      if (SIMULATION_MODE) {
        responseData.warning = '⚠️ MODO SIMULAÇÃO ATIVADO - Este é um link de pagamento simulado para testes';
        responseData.simulationMode = true;
      }
      
      res.status(200).json(responseData);

    } catch (error) {
      console.error('Erro geral na função:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: errMsg
      });
    }
  });
});

// Webhook para processar retorno de pagamento
// Processar pagamento de uma order existente
export const processOrderPayment = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).send('Token de autenticação necessário');
      return;
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    try {
      await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      res.status(401).send('Token de autenticação inválido');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Método não permitido');
      return;
    }

    try {
      const { orderId, payment, amount, freelancerId, clientData, paymentMethod } = req.body;

      console.log('=== PROCESSANDO PAGAMENTO ===');
      console.log('Dados recebidos:', JSON.stringify(req.body, null, 2));

      // Validação mais detalhada
      if (!orderId) {
        console.error('orderId não fornecido');
        res.status(422).json({ error: 'orderId é obrigatório' });
        return;
      }
      
      if (!payment) {
        console.error('payment não fornecido');
        res.status(422).json({ error: 'payment é obrigatório' });
        return;
      }
      
      if (!amount) {
        console.error('amount não fornecido');
        res.status(422).json({ error: 'amount é obrigatório' });
        return;
      }
      
      if (!freelancerId) {
        console.error('freelancerId não fornecido');
        res.status(422).json({ error: 'freelancerId é obrigatório' });
        return;
      }

      if (!paymentMethod) {
        console.error('paymentMethod não fornecido');
        res.status(422).json({ error: 'paymentMethod é obrigatório' });
        return;
      }

      // Validar estrutura do payment baseado no método
      if ((paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && !payment.credit_card) {
        console.error('payment.credit_card não fornecido para cartão');
        res.status(422).json({ error: 'payment.credit_card é obrigatório para cartão' });
        return;
      }

      if ((paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && !payment.credit_card.card) {
        console.error('payment.credit_card.card não fornecido');
        res.status(422).json({ error: 'payment.credit_card.card é obrigatório' });
        return;
      }

      // Validar dados do cartão apenas para métodos de cartão
      if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
        const card = payment.credit_card.card;
        if (!card.number || !card.holder_name || !card.holder_document || !card.exp_month || !card.exp_year || !card.cvv) {
          console.error('Dados do cartão incompletos:', {
            number: !!card.number,
            holder_name: !!card.holder_name,
            holder_document: !!card.holder_document,
            exp_month: !!card.exp_month,
            exp_year: !!card.exp_year,
            cvv: !!card.cvv
          });
          res.status(422).json({ error: 'Dados do cartão incompletos' });
          return;
        }
      }

      console.log('Processando pagamento para order:', orderId);
      console.log('Dados do pagamento:', JSON.stringify(payment, null, 2));

      // Construir dados do cliente a partir dos dados enviados pelo frontend ou do usuário autenticado
      let customerPagarmeData: Record<string, unknown> = {};
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
        const userData = userDoc.exists ? userDoc.data() as UserData : {};
        
        // Usar dados do frontend se disponíveis, senão usar dados do usuário
        const document = (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') 
          ? (payment.credit_card?.card?.holder_document || (userData?.document || '11111111111').replace(/\D/g, ''))
          : (userData?.document || '11111111111').replace(/\D/g, '');
        const documentType = getDocumentType(document);
        
        customerPagarmeData = {
          name: userData?.name || userData?.displayName || decodedToken.name,
          email: userData?.email || decodedToken.email,
          type: documentType,
          document: document,
          phones: {
            mobile_phone: {
              country_code: '55',
              area_code: clientData?.phone_number ? clientData.phone_number.substring(0, 2) : '11',
              number: clientData?.phone_number ? clientData.phone_number.substring(2).replace(/\D/g, '') : (userData?.phoneNumber?.replace(/\D/g, '') || '999999999')
            }
          },
          address: {
            line_1: clientData?.street && clientData?.street_number 
              ? `${clientData.street_number}, ${clientData.street}${clientData.complement ? ', ' + clientData.complement : ''}`
              : userData?.address?.line1 || userData?.address?.street || 'Rua Principal, 123',
            zip_code: clientData?.zip_code || userData?.address?.zip_code || userData?.address?.zipCode || '01310100',
            city: clientData?.city || userData?.address?.city || 'São Paulo',
            state: clientData?.state || userData?.address?.state || 'SP',
            country: 'BR'
          }
        };
      } catch (customerErr) {
        console.error('Erro ao montar dados do cliente:', customerErr);
      }
      console.log('Dados do cliente construídos:', JSON.stringify(customerPagarmeData, null, 2));
      
      if (!customerPagarmeData.name || !customerPagarmeData.email || !customerPagarmeData.document) {
        console.log('Dados de cliente incompletos:', {
          name: customerPagarmeData.name,
          email: customerPagarmeData.email,
          document: customerPagarmeData.document
        });
        res.status(400).json({ error: 'Dados de cliente incompletos.' });
        return;
      }

      // Buscar dados do freelancer e seu recipient
      let freelancerRecipientId = 're_cmdxu9hrn004w0k9tszjd59k0'; // Fallback
      
      try {
        const freelancerDoc = await admin.firestore()
          .collection('users')
          .doc(freelancerId)
          .get();

        if (freelancerDoc.exists) {
          const freelancerData = freelancerDoc.data();
          if (freelancerData?.recipient?.id) {
            freelancerRecipientId = freelancerData.recipient.id;
            console.log('Recipient do freelancer encontrado:', freelancerRecipientId);
          } else {
            console.log('Freelancer não possui recipient configurado, usando fallback');
          }
        } else {
          console.log('Freelancer não encontrado, usando fallback');
        }
      } catch (error) {
        console.error('Erro ao buscar dados do freelancer:', error);
        console.log('Usando recipient fallback');
      }

      // Construir payload para o Pagar.me baseado no método de pagamento
      let paymentPayload: Record<string, unknown> = {};
      
      if (paymentMethod === 'credit_card') {
        paymentPayload = {
          payment_method: 'credit_card',
          credit_card: {
            installments: payment.credit_card.installments,
            statement_descriptor: 'XJOBS',
            card: {
              ...payment.credit_card.card,
              billing_address: {
                line_1: clientData?.street && clientData?.street_number 
                  ? `${clientData.street_number}, ${clientData.street}${clientData.complement ? ', ' + clientData.complement : ''}`
                  : 'Rua Principal, 123',
                zip_code: clientData?.zip_code || '01310100',
                city: clientData?.city || 'São Paulo',
                state: clientData?.state || 'SP',
                country: 'BR'
              }
            }
          }
        };
      } else if (paymentMethod === 'debit_card') {
        paymentPayload = {
          payment_method: 'debit_card',
          debit_card: {
            installments: 1, // Cartão de débito sempre 1 parcela
            statement_descriptor: 'XJOBS',
            card: {
              ...payment.credit_card.card,
              billing_address: {
                line_1: clientData?.street && clientData?.street_number 
                  ? `${clientData.street_number}, ${clientData.street}${clientData.complement ? ', ' + clientData.complement : ''}`
                  : 'Rua Principal, 123',
                zip_code: clientData?.zip_code || '01310100',
                city: clientData?.city || 'São Paulo',
                state: clientData?.state || 'SP',
                country: 'BR'
              }
            }
          }
        };
      } else if (paymentMethod === 'pix') {
        paymentPayload = {
          payment_method: 'pix',
          pix: {
            expires_in: 3600 // 1 hora para expirar
          }
        };
      } else if (paymentMethod === 'boleto') {
        const today = new Date();
        const dueDate = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 dias
        
        paymentPayload = {
          payment_method: 'boleto',
          boleto: {
            instructions: 'Pagamento da garantia do projeto na plataforma XJobs',
            due_at: dueDate.toISOString(),
            document_number: orderId,
            type: 'DM'
          }
        };
      }

      const pagarmePayload = {
        items: [
          {
            amount: Math.round(amount * 100), // Converter para centavos
            description: 'Garantia do Projeto',
            quantity: 1,
            code: 'GARANTIA'
          }
        ],
        customer: customerPagarmeData,
        payments: [paymentPayload]
        // Removendo split temporariamente para testar PIX
      };

      console.log('Payload para Pagar.me:', JSON.stringify(pagarmePayload, null, 2));

      // Fazer requisição para processar o pagamento diretamente
      const response = await fetch(`https://api.pagar.me/core/v5/orders`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': PAGARME_AUTH
        },
        body: JSON.stringify(pagarmePayload)
      });

      const responseText = await response.text();
      console.log('Resposta do Pagar.me:', responseText);

      if (!response.ok) {
        console.error('Erro na API do Pagar.me:', response.status, responseText);
        res.status(response.status).json({ 
          error: 'Erro ao processar pagamento',
          details: responseText 
        });
        return;
      }

      const data = JSON.parse(responseText);
      console.log('Estrutura completa da resposta do Pagar.me:', JSON.stringify(data, null, 2));
      
      // Atualizar status no Firestore se o pagamento foi bem-sucedido
      if (data.status === 'paid' || data.status === 'authorized' || data.status === 'pending') {
        const paymentQuery = await admin.firestore()
          .collection('projectPayments')
          .where('orderId', '==', orderId)
          .limit(1)
          .get();

        if (!paymentQuery.empty) {
          const paymentDoc = paymentQuery.docs[0];
          await paymentDoc.ref.update({
            paymentStatus: 'paid',
            escrowStatus: 'held',
            totalPaid: data.amount / 100, // Converter de centavos para reais
            totalHeld: data.amount / 100,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Atualizar status do projeto
          const paymentData = paymentDoc.data();
          await admin.firestore()
            .collection('projects')
            .doc(paymentData.projectId)
            .update({
              status: 'executando',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
      }

      // Preparar resposta baseada no método de pagamento
      const responseData: Record<string, unknown> = {
        success: true,
        status: data.status,
        transactionId: data.id,
        paymentMethod: paymentMethod
      };

      // Adicionar informações específicas para PIX
      if (paymentMethod === 'pix' && data.charges && data.charges[0] && data.charges[0].last_transaction) {
        const pixTransaction = data.charges[0].last_transaction;
        console.log('Dados do PIX encontrados:', {
          qr_code: pixTransaction.qr_code,
          qr_code_url: pixTransaction.qr_code_url,
          qr_codes: pixTransaction.qr_codes,
          status: pixTransaction.status,
          success: pixTransaction.success
        });
        
        // Tentar diferentes estruturas para o QR Code
        if (pixTransaction.qr_codes && pixTransaction.qr_codes.length > 0) {
          const qrCode = pixTransaction.qr_codes[0];
          responseData.pixQrCode = qrCode.text || qrCode.qr_code;
          responseData.pixQrCodeUrl = qrCode.file || qrCode.qr_code_url;
          responseData.pixCode = qrCode.text || qrCode.qr_code;
        } else if (pixTransaction.qr_code) {
          responseData.pixQrCode = pixTransaction.qr_code;
          responseData.pixQrCodeUrl = pixTransaction.qr_code_url;
          responseData.pixCode = pixTransaction.qr_code;
        } else {
          console.log('Estrutura do PIX não reconhecida:', pixTransaction);
        }
      } else {
        console.log('Dados do PIX não encontrados:', {
          paymentMethod,
          hasCharges: !!data.charges,
          chargesLength: data.charges?.length,
          hasLastTransaction: !!(data.charges && data.charges[0] && data.charges[0].last_transaction),
          status: data.status
        });
      }

      // Adicionar informações específicas para boleto
      if (paymentMethod === 'boleto' && data.charges && data.charges[0] && data.charges[0].last_transaction) {
        const boletoTransaction = data.charges[0].last_transaction;
        responseData.boletoUrl = boletoTransaction.url;
        responseData.boletoBarcode = boletoTransaction.line;
        responseData.boletoDueDate = boletoTransaction.due_at;
      }

      res.status(200).json(responseData);

    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Erro interno' 
      });
    }
  });
});

export const paymentWebhook = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).send('Método não permitido');
      return;
    }

    try {
      const { type, data } = req.body;
      
      console.log('Webhook recebido:', { type, data });

      // Processar tanto webhooks reais quanto simulados
      if (type === 'payment.paid' || type === 'simulation.payment.paid') {
        const payment = data;
        
        // Verificar se é um pagamento de payment link
        if (payment.payment_link?.id) {
          await handlePaymentLinkPayment(payment);
        } else {
          // Processar pagamento tradicional
          const paymentLinkId = payment.paymentLinkId;
          
          if (!paymentLinkId) {
            console.error('ID do payment link não encontrado');
            res.status(400).json({ error: 'ID do payment link não encontrado' });
            return;
          }

          await handleTraditionalPayment(payment, paymentLinkId);
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });
});

/**
 * Processa pagamento de payment link
 */
async function handlePaymentLinkPayment(payment: PaymentWebhookData) {
  const paymentLinkId = payment.payment_link?.id;
  if (!paymentLinkId) {
    console.error('Payment link ID não encontrado');
    return;
  }
  console.log('Processando pagamento de payment link:', paymentLinkId);

  // Buscar informações do payment link
  const paymentLinkDoc = await admin.firestore()
    .collection('paymentLinks')
    .doc(paymentLinkId)
    .get();

  if (!paymentLinkDoc.exists) {
    console.error('Payment link não encontrado:', paymentLinkId);
    return;
  }

  const paymentLinkData = paymentLinkDoc.data();
  const projectId = paymentLinkData?.projectId;

  if (!projectId) {
    console.error('Project ID não encontrado no payment link');
    return;
  }

  const normalizedFreelancerId = paymentLinkData?.freelancerId || paymentLinkData?.selectedFreelancerId || null;
  const normalizedFreelancerName = paymentLinkData?.freelancerName || paymentLinkData?.selectedFreelancerName || null;

  // Criar/atualizar registro de pagamento
  const paymentDoc = {
    paymentLinkId: paymentLinkId,
    projectId: projectId,
    projectTitle: paymentLinkData?.projectTitle,
    amount: payment.amount / 100, // Converter de centavos para reais
    clientId: paymentLinkData?.clientId,
    clientName: paymentLinkData?.clientName,
    clientEmail: paymentLinkData?.clientEmail,
    freelancerId: normalizedFreelancerId,
    freelancerName: normalizedFreelancerName,
    paymentStatus: 'paid',
    escrowStatus: 'held',
    paymentMethod: payment.payment_method,
    gatewayId: payment.id,
    totalPaid: payment.amount / 100,
    totalHeld: payment.amount / 100,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await admin.firestore()
    .collection('projectPayments')
    .doc(paymentLinkId)
    .set(paymentDoc, { merge: true });

  // Atualizar status do payment link
  await paymentLinkDoc.ref.update({
    status: 'paid',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Atualizar status do projeto para 'executando'
  await admin.firestore()
    .collection('projects')
    .doc(projectId)
    .update({
      status: 'executando',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  // Criar log de sistema para pagamento realizado pelo cliente
  try {
    await admin.firestore().collection('logs').add({
      type: 'project_payment_made',
      level: 'info',
      title: 'Pagamento realizado',
      message: `Pagamento realizado pelo cliente (${paymentLinkData?.clientName}) para o projeto "${paymentLinkData?.projectTitle}".`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      source: 'pagarmePlans.handlePaymentLinkPayment',
      projectId: projectId,
      clientId: paymentLinkData?.clientId,
      freelancerId: normalizedFreelancerId,
      read: false
    });
  } catch (logError) {
    console.error('Erro ao criar log de sistema de pagamento realizado:', logError);
  }

  console.log('Pagamento de payment link processado com sucesso:', projectId);
}

/**
 * Processa falhas de pagamento de payment links
 */
async function handlePaymentLinkFailure(payment: PaymentWebhookData) {
  const paymentLinkId = payment.payment_link?.id;
  if (!paymentLinkId) {
    console.error('Payment link ID não encontrado');
    return;
  }
  console.log('Processando falha de pagamento de payment link:', paymentLinkId);

  // Buscar informações do payment link
  const paymentLinkDoc = await admin.firestore()
    .collection('paymentLinks')
    .doc(paymentLinkId)
    .get();

  if (!paymentLinkDoc.exists) {
    console.error('Payment link não encontrado:', paymentLinkId);
    return;
  }

  const paymentLinkData = paymentLinkDoc.data();
  const projectId = paymentLinkData?.projectId;

  if (!projectId) {
    console.error('Project ID não encontrado no payment link');
    return;
  }

  // Atualizar status do payment link
  await paymentLinkDoc.ref.update({
    status: 'failed',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Manter status do projeto como 'aguardando_garantia'
  console.log('Falha de pagamento de payment link processada:', projectId);
}

/**
 * Processa estornos de payment links
 */
async function handlePaymentLinkRefund(payment: PaymentWebhookData) {
  const paymentLinkId = payment.payment_link?.id;
  if (!paymentLinkId) {
    console.error('Payment link ID não encontrado');
    return;
  }
  console.log('Processando estorno de payment link:', paymentLinkId);

  // Buscar informações do payment link
  const paymentLinkDoc = await admin.firestore()
    .collection('paymentLinks')
    .doc(paymentLinkId)
    .get();

  if (!paymentLinkDoc.exists) {
    console.error('Payment link não encontrado:', paymentLinkId);
    return;
  }

  const paymentLinkData = paymentLinkDoc.data();
  const projectId = paymentLinkData?.projectId;

  if (!projectId) {
    console.error('Project ID não encontrado no payment link');
    return;
  }

  // Atualizar status do payment link
  await paymentLinkDoc.ref.update({
    status: 'refunded',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Reverter status do projeto para 'aguardando_garantia'
  await admin.firestore()
    .collection('projects')
    .doc(projectId)
    .update({
      status: 'aguardando_garantia',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  console.log('Estorno de payment link processado:', projectId);
}

/**
 * Processa pagamento tradicional
 */
async function handleTraditionalPayment(payment: PaymentWebhookData, paymentLinkId: string) {
  // Buscar informações do pagamento no Firestore
  const paymentQuery = await admin.firestore()
    .collection('projectPayments')
    .where('paymentLinkId', '==', paymentLinkId)
    .limit(1)
    .get();

  if (paymentQuery.empty) {
    console.error('Pagamento não encontrado no Firestore');
    return;
  }

  const paymentDoc = paymentQuery.docs[0];
  const paymentData = paymentDoc.data();

  // Atualizar status do pagamento
  await paymentDoc.ref.update({
    paymentStatus: 'paid',
    escrowStatus: 'held',
    totalPaid: paymentData.projectValue,
    totalHeld: paymentData.projectValue,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Atualizar status do projeto para 'executando'
  await admin.firestore()
    .collection('projects')
    .doc(paymentData.projectId)
    .update({
      status: 'executando',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  console.log('Pagamento tradicional processado com sucesso:', paymentData.projectId);
}

/**
 * Função para receber webhooks do Pagar.me
 * Esta função é responsável por capturar todas as notificações enviadas pelo Pagar.me
 * e registrar os eventos para análise e processamento futuro
 */
export const pagarmeWebhook = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    // Aceitar apenas requisições POST
    if (req.method !== 'POST') {
      console.log('Método não permitido:', req.method);
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    try {
      // Capturar headers importantes para validação futura (removendo valores undefined)
      const headers: Record<string, string> = {};
      if (req.headers['x-hub-signature']) headers['x-hub-signature'] = req.headers['x-hub-signature'] as string;
      if (req.headers['user-agent']) headers['user-agent'] = req.headers['user-agent'] as string;
      if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'] as string;

      // Capturar o corpo da requisição
      const webhookData = req.body;
      
      // Log detalhado do webhook recebido
      console.log('=== WEBHOOK PAGAR.ME RECEBIDO ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Headers:', JSON.stringify(headers, null, 2));
      console.log('Body:', JSON.stringify(webhookData, null, 2));
      console.log('================================');

      // Processar eventos específicos de pagamento
      await processPaymentWebhook(webhookData);

      // Salvar o webhook no Firestore para análise
      const webhookDoc = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        headers: headers,
        body: webhookData,
        type: webhookData.type || 'unknown',
        eventId: webhookData.id || null,
        processed: true,
        createdAt: new Date().toISOString()
      };

      // Salvar na coleção de webhooks
      await admin.firestore()
        .collection('pagarmeWebhooks')
        .add(webhookDoc);

      console.log('Webhook salvo no Firestore com sucesso');

      // Responder com sucesso para o Pagar.me
      res.status(200).json({ 
        success: true, 
        message: 'Webhook recebido e processado',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro ao processar webhook do Pagar.me:', error);
      
      // Tentar salvar o erro também
      try {
        const errorHeaders: Record<string, string> = {};
        Object.keys(req.headers).forEach(key => {
          if (req.headers[key]) {
            errorHeaders[key] = req.headers[key] as string;
          }
        });

        await admin.firestore()
          .collection('pagarmeWebhookErrors')
          .add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            body: req.body,
            headers: errorHeaders,
            createdAt: new Date().toISOString()
          });
      } catch (saveError) {
        console.error('Erro ao salvar erro do webhook:', saveError);
      }

      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Gera um link de pagamento externo do PagarMe
 * Esta função cria um payment link que pode ser usado externamente
 * com múltiplas opções de pagamento (PIX, cartão de crédito, cartão de débito)
 */
export const generateExternalPaymentLink = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).send('Método não permitido');
      return;
    }

    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Token de autenticação não fornecido'
      });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log('Usuário autenticado:', decodedToken.uid);
    } catch (error) {
      console.error('Erro na verificação do token:', error);
      res.status(401).json({
        error: 'Token de autenticação inválido'
      });
      return;
    }

    try {
      const {
        projectId,
        projectTitle,
        amount,
        clientId,
        clientName,
        clientEmail
      } = req.body;

      // Buscar dados do projeto para obter freelancer e like selecionado
      const projectSnap = await admin.firestore().collection('projects').doc(projectId).get();
      const projectData = projectSnap.exists ? projectSnap.data() : undefined;
      const selectedFreelancerId: string | undefined = projectData?.selectedFreelancerId as string | undefined;
      const likesRaw = (projectData?.likes ?? []) as unknown[];
      type Like = { freelancerId?: string; proposedValue?: number };
      const likes: Like[] = likesRaw.map(l => (l ?? {})) as Like[];
      const selectedLike = selectedFreelancerId
        ? likes.find(l => l && l.freelancerId === selectedFreelancerId)
        : undefined;

      // Recuperar recipient do freelancer (se existir)
      let freelancerRecipientId: string | undefined = undefined;
      if (selectedFreelancerId) {
        try {
          const freelancerUser = await admin.firestore().collection('users').doc(selectedFreelancerId).get();
          const freelancerData = freelancerUser.data();
          if (freelancerData?.recipient?.id) {
            freelancerRecipientId = String(freelancerData.recipient.id);
          }
        } catch (e) {
          console.warn('Não foi possível buscar recipient do freelancer:', e);
        }
      }

      // Calcular valores: total enviado pelo frontend (amount), valor proposto (like) e taxa (10%)
      const totalCents = Math.round(Number(amount) * 100);
      const proposedCents = selectedLike?.proposedValue
        ? Math.round(Number(selectedLike.proposedValue) * 100)
        : Math.round(Number(amount) * 100 / 1.10); // fallback caso não haja like
      const feeCents = Math.max(totalCents - proposedCents, 0);

      // Criar payment link no PagarMe
      const pagarmePaymentLinkData = {
        is_building: false,
        payment_settings: {
          credit_card_settings: {
            installments_setup: {
              interest_type: "simple",
              interest_rate: 0,
              max_installments: 12,
              amount: totalCents
            },
            operation_type: "auth_and_capture",
            delay_to_capture: 60
          },
          pix_settings: {
            expires_in: 3600
          },
          accepted_payment_methods: [
            "pix",
            "credit_card"
          ]
        },
        cart_settings: {
          items: [
            {
              name: `Garantia - ${projectTitle}`,
              amount: totalCents,
              default_quantity: 1
            }
          ]
        },
        // Metadados para rastrear toda a operação no webhook
        metadata: {
          projectId,
          projectTitle,
          clientId,
          clientName,
          clientEmail,
          selectedFreelancerId: selectedFreelancerId || null,
          freelancerRecipientId: freelancerRecipientId || null,
          proposedCents,
          feeCents,
          totalCents,
          source: 'xjobs:paymentlink'
        },
        type: "order"
      } as Record<string, unknown>;

      const response = await fetch('https://api.pagar.me/core/v5/paymentlinks', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': PAGARME_AUTH
        },
        body: JSON.stringify(pagarmePaymentLinkData)
      });

      const responseText = await response.text();
      console.log('Resposta do PagarMe (payment link):', responseText);

      if (!response.ok) {
        console.error('Erro na API do PagarMe:', response.status, responseText);
        res.status(response.status).json({
          error: 'Erro ao gerar link de pagamento',
          details: responseText
        });
        return;
      }

      const paymentLinkResponse = JSON.parse(responseText);
      console.log('Payment link criado com sucesso:', paymentLinkResponse);

      // Salvar informações do payment link no Firestore
      const paymentLinkData = {
        paymentLinkId: paymentLinkResponse.id,
        projectId: projectId,
        projectTitle: projectTitle,
        amount: amount,
        clientId: clientId,
        clientName: clientName,
        clientEmail: clientEmail,
        selectedFreelancerId: selectedFreelancerId || null,
        freelancerRecipientId: freelancerRecipientId || null,
        proposedCents,
        feeCents,
        totalCents,
        paymentUrl: paymentLinkResponse.url,
        status: 'pending',
        paymentMethods: ['pix', 'credit_card'],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await admin.firestore()
        .collection('paymentLinks')
        .doc(paymentLinkResponse.id)
        .set(paymentLinkData);

      res.status(200).json({
        success: true,
        paymentLinkId: paymentLinkResponse.id,
        paymentUrl: paymentLinkResponse.url,
        message: 'Link de pagamento gerado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao gerar payment link:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Gera um link de pagamento para planos de assinatura
 * Esta função cria um payment link específico para planos que, após o pagamento,
 * atribui os dados do plano ao usuário
 */
interface PlanSubscriptionData {
  planId: string;
  planName: string;
  planPrice: number;
  planFeatures?: Record<string, unknown>;
  planLimits?: Record<string, unknown>;
}

export const generatePlanSubscriptionPaymentLink = functions.https.onCall(async (request) => {
  const { data, auth } = request;
  
  // Verificar autenticação
  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const userId = auth.uid;
  console.log('Usuário autenticado:', userId);

  try {
    const {
      planId,
      planName,
      planPrice,
      planFeatures,
      planLimits
    } = data as PlanSubscriptionData;

    // Validar dados obrigatórios
    if (!planId || !planName || !planPrice) {
      throw new functions.https.HttpsError('invalid-argument', 'Dados do plano incompletos (planId, planName, planPrice são obrigatórios)');
    }

    // Buscar dados do usuário
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Usuário não encontrado');
    }

    const userData = userDoc.data() as UserData;
    const totalCents = Math.round(Number(planPrice) * 100);

      // Criar payment link no PagarMe
      const pagarmePaymentLinkData = {
        is_building: false,
        payment_settings: {
          credit_card_settings: {
            installments_setup: {
              interest_type: "simple",
              interest_rate: 0,
              max_installments: 12,
              amount: totalCents
            },
            operation_type: "auth_and_capture",
            delay_to_capture: 60
          },
          pix_settings: {
            expires_in: 3600
          },
          accepted_payment_methods: [
            "pix",
            "credit_card"
          ]
        },
        cart_settings: {
          items: [
            {
              name: `Plano ${planName}`,
              amount: totalCents,
              default_quantity: 1
            }
          ]
        },
        // Metadados para rastrear a operação no webhook
        metadata: {
          userId: userId,
          userEmail: userData.email || auth.token.email,
          userName: userData.name || userData.displayName || 'Cliente',
          planId,
          planName,
          planPrice,
          planFeatures: JSON.stringify(planFeatures || {}),
          planLimits: JSON.stringify(planLimits || {}),
          totalCents,
          source: 'xjobs:plan_subscription'
        },
        type: "order"
      } as Record<string, unknown>;

      const response = await fetch('https://api.pagar.me/core/v5/paymentlinks', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': PAGARME_AUTH
        },
        body: JSON.stringify(pagarmePaymentLinkData)
      });

      const responseText = await response.text();
      console.log('Resposta do PagarMe (plan payment link):', responseText);

      if (!response.ok) {
        console.error('Erro na API do PagarMe:', response.status, responseText);
        throw new functions.https.HttpsError('internal', 'Erro ao gerar link de pagamento do plano', {
          details: responseText
        });
      }

      const paymentLinkResponse = JSON.parse(responseText);
      console.log('Plan payment link criado com sucesso:', paymentLinkResponse);

      // Salvar informações do payment link no Firestore
      const paymentLinkData = {
        paymentLinkId: paymentLinkResponse.id,
        userId: userId,
        userEmail: userData.email || auth.token.email,
        userName: userData.name || userData.displayName || 'Cliente',
        planId: planId,
        planName: planName,
        planPrice: planPrice,
        planFeatures: planFeatures || {},
        planLimits: planLimits || {},
        amount: planPrice,
        totalCents,
        paymentUrl: paymentLinkResponse.url,
        status: 'pending',
        paymentMethods: ['pix', 'credit_card'],
        type: 'plan_subscription',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

    await admin.firestore()
      .collection('planPaymentLinks')
      .doc(paymentLinkResponse.id)
      .set(paymentLinkData);

    return {
      success: true,
      paymentLinkId: paymentLinkResponse.id,
      paymentUrl: paymentLinkResponse.url,
      message: 'Link de pagamento do plano gerado com sucesso'
    };

  } catch (error) {
    console.error('Erro ao gerar payment link do plano:', error);
    throw new functions.https.HttpsError('internal', 'Erro interno do servidor', {
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Verifica o status de um payment link
 */
export const checkPaymentLinkStatus = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      res.status(405).send('Método não permitido');
      return;
    }

    try {
      const { paymentLinkId } = req.query;

      if (!paymentLinkId) {
        res.status(400).json({
          error: 'ID do payment link não fornecido'
        });
        return;
      }

      // Buscar informações do payment link no Firestore
      const paymentLinkDoc = await admin.firestore()
        .collection('paymentLinks')
        .doc(paymentLinkId as string)
        .get();

      if (!paymentLinkDoc.exists) {
        res.status(404).json({
          error: 'Payment link não encontrado'
        });
        return;
      }

      const paymentLinkData = paymentLinkDoc.data();

      // Verificar se há pagamentos associados
      const paymentsQuery = await admin.firestore()
        .collection('projectPayments')
        .where('paymentLinkId', '==', paymentLinkId)
        .where('paymentStatus', '==', 'paid')
        .limit(1)
        .get();

      const isPaid = !paymentsQuery.empty;

      res.status(200).json({
        success: true,
        paymentLink: paymentLinkData,
        isPaid: isPaid,
        projectId: paymentLinkData?.projectId
      });

    } catch (error) {
      console.error('Erro ao verificar status do payment link:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

// Interfaces para tipagem dos dados do webhook
interface WebhookData {
  type: string;
  data: PaymentWebhookData;
}

interface PaymentWebhookData {
  id: string;
  amount: number;
  order?: {
    code: string;
  };
  gateway_response?: {
    message: string;
  };
  payment_link?: {
    id: string;
  };
  payment_method?: string;
}

interface PagarmeChargeData {
  amount: number;
  paid_amount?: number;
  status?: string;
  payment_method?: string;
  customer?: { email?: string; name?: string; id?: string };
  code?: string; // payment link code (pl_...)
}

async function resolvePaymentLinkByHeuristics(charge: PagarmeChargeData) {
  const email = charge.customer?.email || null;
  const amountUnits = (charge.paid_amount ?? charge.amount) / 100;
  const code = charge.code || null;
  let candidate: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData> | null = null;

  // 1) Tentar por ID do payment link (code: pl_...)
  if (code) {
    const byId = await admin.firestore().collection('paymentLinks').doc(code).get();
    if (byId.exists) {
      return byId as FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>;
    }
    const byField = await admin
      .firestore()
      .collection('paymentLinks')
      .where('paymentLinkId', '==', code)
      .limit(1)
      .get();
    if (!byField.empty) {
      return byField.docs[0];
    }
  }

  // 2) Heurística por email + status pending + valor
  if (email) {
    const snap = await admin
      .firestore()
      .collection('paymentLinks')
      .where('clientEmail', '==', email)
      .where('status', '==', 'pending')
      .limit(20)
      .get();
    const docs = snap.docs
      .map((doc) => ({ doc, createdAt: (doc.data().createdAt as FirebaseFirestore.Timestamp) || null }))
      .sort((a, b) => {
        const ta = a.createdAt ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
    for (const item of docs) {
      const d = item.doc.data();
      if (Number(d.amount) === Number(amountUnits)) {
        candidate = item.doc;
        break;
      }
    }
    if (!candidate && docs.length > 0) candidate = docs[0].doc;
  }

  return candidate;
}

async function handleOrderOrChargePaidWebhook(rawData: unknown) {
  const dataObj = rawData as { charges?: PagarmeChargeData[] } & PagarmeChargeData;
  const data: PagarmeChargeData = (dataObj?.charges && dataObj.charges[0]) ? dataObj.charges[0] : (dataObj as PagarmeChargeData);
  const paymentMethod = data.payment_method || 'unknown';

  // Tentar achar o payment link correspondente
  const resolved = await resolvePaymentLinkByHeuristics(data);
  if (!resolved) {
    console.warn('Não foi possível resolver payment link por heurística');
    return;
  }

  const paymentLinkDoc = resolved;
  const paymentLinkData = paymentLinkDoc.data();
  
  // Verificar se é um pagamento de plano de assinatura
  if (paymentLinkData.type === 'plan_subscription') {
    await handlePlanSubscriptionPayment(data, paymentLinkDoc, paymentMethod);
    return;
  }
  
  // Processar pagamento de projeto (lógica original)
  const projectId = paymentLinkData.projectId;
  const paymentLinkId = paymentLinkData.paymentLinkId || paymentLinkDoc.id;

  // Atualizar payment record
  const amountUnits = (data.paid_amount ?? data.amount) / 100;
  const paymentDoc = {
    paymentLinkId,
    projectId,
    projectTitle: paymentLinkData.projectTitle,
    amount: amountUnits,
    clientId: paymentLinkData.clientId,
    clientName: paymentLinkData.clientName,
    clientEmail: paymentLinkData.clientEmail,
    freelancerId: paymentLinkData.freelancerId || paymentLinkData.selectedFreelancerId || null,
    freelancerName: paymentLinkData.freelancerName || paymentLinkData.selectedFreelancerName || null,
    paymentStatus: 'paid',
    escrowStatus: 'held',
    paymentMethod,
    gatewayId: (rawData as { id?: string })?.id || null,
    totalPaid: amountUnits,
    totalHeld: amountUnits,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await admin.firestore().collection('projectPayments').doc(paymentLinkId).set(paymentDoc, { merge: true });

  await paymentLinkDoc.ref.update({ status: 'paid', updatedAt: admin.firestore.FieldValue.serverTimestamp() });

  await admin.firestore().collection('projects').doc(projectId).update({
    status: 'executando',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log('Pagamento processado via order/charge webhook para projeto:', projectId);
}

/**
 * Processa pagamento de plano de assinatura
 */
async function handlePlanSubscriptionPayment(data: PagarmeChargeData, paymentLinkDoc: FirebaseFirestore.DocumentSnapshot, paymentMethod: string) {
  const paymentLinkData = paymentLinkDoc.data();
  if (!paymentLinkData) {
    console.error('Dados do payment link não encontrados');
    return;
  }

  const userId = paymentLinkData.userId;
  const planId = paymentLinkData.planId;
  const planName = paymentLinkData.planName;
  const planFeatures = paymentLinkData.planFeatures || {};
  const planLimits = paymentLinkData.planLimits || {};
  const paymentLinkId = paymentLinkData.paymentLinkId || paymentLinkDoc.id;
  const amountUnits = (data.paid_amount ?? data.amount) / 100;

  try {
    // Atualizar status do payment link
    await paymentLinkDoc.ref.update({ 
      status: 'paid', 
      updatedAt: admin.firestore.FieldValue.serverTimestamp() 
    });

    // Registrar o pagamento
    const planPaymentDoc = {
      paymentLinkId,
      userId,
      planId,
      planName,
      amount: amountUnits,
      paymentStatus: 'paid',
      paymentMethod,
      gatewayId: data.code || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await admin.firestore().collection('planPayments').doc(paymentLinkId).set(planPaymentDoc);

    // Atribuir plano ao usuário
    const userPlanData = {
      planId,
      planName,
      planFeatures,
      planLimits,
      status: 'active',
      activatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentLinkId,
      lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Atualizar dados do usuário com o plano
    await admin.firestore().collection('users').doc(userId).update({
      currentPlan: userPlanData,
      planHistory: admin.firestore.FieldValue.arrayUnion({
        ...userPlanData,
        assignedAt: admin.firestore.FieldValue.serverTimestamp()
      }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Registrar na coleção de assinaturas ativas
    await admin.firestore().collection('activeSubscriptions').doc(userId).set({
      userId,
      planId,
      planName,
      planFeatures,
      planLimits,
      status: 'active',
      activatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentLinkId,
      lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Plano ${planName} (${planId}) atribuído com sucesso ao usuário ${userId}`);
    
  } catch (error) {
    console.error('Erro ao processar pagamento de plano:', error);
    throw error;
  }
}

/**
 * Processa eventos específicos de webhook do Pagar.me
 */
async function processPaymentWebhook(webhookData: WebhookData) {
  const { type, data } = webhookData;
  
  console.log(`Processando evento: ${type}`);

  // Eventos v5 comuns com Charge/Order
  if (type === 'charge.paid' || type === 'order.paid') {
    await handleOrderOrChargePaidWebhook(data as unknown);
    console.log(`Evento ${type} processado com sucesso`);
    return;
  }

  // Verificar se é um payment link
  const hasPaymentLink = (data as Partial<{ payment_link: { id: string } }>).payment_link?.id;
  if (hasPaymentLink) {
    console.log('Evento de payment link detectado');
    
    // Eventos de pagamento bem-sucedido para payment links
    if (type === 'payment.paid' || type === 'simulation.payment.paid') {
      await handlePaymentLinkPayment(data as PaymentWebhookData);
    }
    
    // Eventos de falha de pagamento para payment links
    else if (type === 'payment.failed' || type === 'payment.not_authorized' || 
             type === 'payment.refused' || type === 'payment.canceled') {
      await handlePaymentLinkFailure(data as PaymentWebhookData);
    }
    
    // Eventos de estorno para payment links
    else if (type === 'payment.refunded' || type === 'payment.chargeback') {
      await handlePaymentLinkRefund(data as PaymentWebhookData);
    }
  } else {
    // Eventos de pagamento tradicional
    if (type === 'payment.paid' || type === 'simulation.payment.paid') {
      await handlePaymentSuccess(data as PaymentWebhookData);
    }
    
    // Eventos de falha de pagamento
    else if (type === 'payment.failed' || type === 'payment.not_authorized' || 
             type === 'payment.refused' || type === 'payment.canceled') {
      await handlePaymentFailure(data as PaymentWebhookData);
    }
    
    // Eventos de estorno
    else if (type === 'payment.refunded' || type === 'payment.chargeback') {
      await handlePaymentRefund(data as PaymentWebhookData);
    }
  }
  
  console.log(`Evento ${type} processado com sucesso`);
}

/**
 * Processa pagamentos bem-sucedidos
 */
async function handlePaymentSuccess(paymentData: PaymentWebhookData) {
  console.log('Processando pagamento bem-sucedido:', paymentData.id);
  
  const orderId = paymentData.order?.code;
  if (!orderId) {
    console.error('Order ID não encontrado no pagamento');
    return;
  }

  // Buscar o pagamento no Firestore
  const paymentQuery = await admin.firestore()
    .collection('projectPayments')
    .where('orderId', '==', orderId)
    .limit(1)
    .get();

  if (paymentQuery.empty) {
    console.error('Pagamento não encontrado no Firestore:', orderId);
    return;
  }

  const paymentDoc = paymentQuery.docs[0];
  const paymentDocData = paymentDoc.data();

  // Atualizar status do pagamento
  await paymentDoc.ref.update({
    paymentStatus: 'paid',
    escrowStatus: 'held',
    totalPaid: paymentData.amount / 100,
    totalHeld: paymentData.amount / 100,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Atualizar status do projeto para 'executando'
  await admin.firestore()
    .collection('projects')
    .doc(paymentDocData.projectId)
    .update({
      status: 'executando',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  console.log('Pagamento e projeto atualizados com sucesso');
}

/**
 * Processa falhas de pagamento
 */
async function handlePaymentFailure(paymentData: PaymentWebhookData) {
  console.log('Processando falha de pagamento:', paymentData.id);
  
  const orderId = paymentData.order?.code;
  if (!orderId) {
    console.error('Order ID não encontrado no pagamento falhado');
    return;
  }

  // Buscar o pagamento no Firestore
  const paymentQuery = await admin.firestore()
    .collection('projectPayments')
    .where('orderId', '==', orderId)
    .limit(1)
    .get();

  if (paymentQuery.empty) {
    console.error('Pagamento não encontrado no Firestore:', orderId);
    return;
  }

  const paymentDoc = paymentQuery.docs[0];
  const paymentDocData = paymentDoc.data();

  // Atualizar status do pagamento para falha
  await paymentDoc.ref.update({
    paymentStatus: 'failed',
    escrowStatus: 'none',
    failureReason: paymentData.gateway_response?.message || 'Pagamento negado pelo banco',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Reverter status do projeto para 'aguardando_garantia'
  await admin.firestore()
    .collection('projects')
    .doc(paymentDocData.projectId)
    .update({
      status: 'aguardando_garantia',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  console.log('Status do pagamento e projeto revertidos devido à falha');
}

/**
 * Processa estornos de pagamento
 */
async function handlePaymentRefund(paymentData: PaymentWebhookData) {
  console.log('Processando estorno de pagamento:', paymentData.id);
  
  const orderId = paymentData.order?.code;
  if (!orderId) {
    console.error('Order ID não encontrado no estorno');
    return;
  }

  // Buscar o pagamento no Firestore
  const paymentQuery = await admin.firestore()
    .collection('projectPayments')
    .where('orderId', '==', orderId)
    .limit(1)
    .get();

  if (paymentQuery.empty) {
    console.error('Pagamento não encontrado no Firestore:', orderId);
    return;
  }

  const paymentDoc = paymentQuery.docs[0];
  const paymentDocData = paymentDoc.data();

  // Atualizar status do pagamento para estornado
  await paymentDoc.ref.update({
    paymentStatus: 'refunded',
    escrowStatus: 'refunded',
    refundReason: 'Estorno processado pelo Pagar.me',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Atualizar status do projeto para 'cancelado'
  await admin.firestore()
    .collection('projects')
    .doc(paymentDocData.projectId)
    .update({
      status: 'cancelado',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  console.log('Estorno processado e projeto cancelado');
}

// ===== Escrow: processamento de liberações de fundos =====
interface FundReleaseDoc {
  projectId: string;
  projectTitle?: string;
  projectValue: number;
  chatId?: string;
  clientId: string;
  clientName?: string;
  freelancerId: string;
  freelancerName?: string;
  releaseType: 'partial' | 'full';
  amount: number;
  percentage: number;
  cumulativeAmount?: number;
  cumulativePercentage?: number;
  remainingAmount?: number;
  remainingPercentage?: number;
  reason?: string;
  description?: string;
  milestone?: string;
  status: 'approved' | 'released' | 'rejected' | 'pending';
  approvedBy?: string;
  approvedByName?: string;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

// Utilitário: obter recipient do freelancer
async function getFreelancerRecipientId(freelancerId: string): Promise<string | undefined> {
  try {
    const userDoc = await admin.firestore().collection('users').doc(freelancerId).get();
    const data = userDoc.data();
    const recipientId = data?.recipient?.id as string | undefined;
    return recipientId;
  } catch (err) {
    console.error('Erro ao buscar recipient do freelancer:', err);
    return undefined;
  }
}

// Utilitário: obter payment record do projeto
async function getProjectPayment(projectId: string): Promise<{ id: string; data: FirebaseFirestore.DocumentData } | null> {
  const snap = await admin
    .firestore()
    .collection('projectPayments')
    .where('projectId', '==', projectId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, data: d.data() };
}

// Firestore trigger: ao criar uma liberação aprovada, efetuar transferência e atualizar saldos
export const onFundReleaseCreate = v2firestore.onDocumentCreated('fundReleases/{releaseId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const release = snap.data() as FundReleaseDoc | undefined;

  try {
    if (!release || release.status !== 'approved') {
      return;
    }

    // Aceitar qualquer percentual - não rejeitar por passo

    // Validar propriedade do projeto
    const projectDoc = await admin.firestore().collection('projects').doc(release.projectId).get();
    if (!projectDoc.exists) {
      console.error('Projeto não encontrado para liberação:', release.projectId);
      await snap.ref.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return;
    }
    const projectData = projectDoc.data();
    if (projectData?.clientId !== release.clientId) {
      console.error('Cliente da liberação não corresponde ao dono do projeto');
      await snap.ref.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return;
    }

    // Buscar recipient do freelancer
    const freelancerRecipientId = await getFreelancerRecipientId(release.freelancerId);
    if (!freelancerRecipientId) {
      console.error('Freelancer sem recipient configurado');
      await snap.ref.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp(), rejectionReason: 'FREELANCER_SEM_RECIPIENT' });
      return;
    }

    // Validar saldos e obter payment
    const payment = await getProjectPayment(release.projectId);
    if (!payment) {
      console.error('projectPayments não encontrado');
      await snap.ref.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return;
    }

    const payData = payment.data;
    // Priorizar o valor líquido informado na release (proposedValue), evitando totalValue com taxa
    const projectValue = Number(release.projectValue || payData.projectValue || 0);
    const totalReleased = Number(payData.totalReleased || 0);
    const remainingAmount = Math.max(projectValue - totalReleased, 0);
    
    // Calcular valor de liberação baseado no percentage (não no amount direto)
    const releasePercentage = Number(release.percentage || 0);
    let releaseAmount = (projectValue * releasePercentage) / 100;
    
    console.log('Cálculo de liberação:', {
      projectValue,
      totalReleased,
      remainingAmount,
      releasePercentage,
      calculatedReleaseAmount: releaseAmount,
      originalReleaseAmount: release.amount
    });
    
    if (releaseAmount <= 0) {
      console.error('Valor de liberação inválido (<= 0)');
      await snap.ref.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return;
    }
    if (releaseAmount > remainingAmount) {
      console.warn('Valor solicitado excede disponível. Aplicando clamping ao restante disponível.');
      releaseAmount = remainingAmount;
    }

    // Simular transferência para controle interno (não usar Pagar.me)
    const transferJson = {
      id: `internal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed',
      amount: Math.round(releaseAmount * 100)
    };

    // Atualizar release como liberado
    await snap.ref.update({
      status: 'released',
      releasedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      transferId: transferJson?.id || null
    });

    // Atualizar projectPayments
    const newTotalReleased = totalReleased + releaseAmount;
    const newEscrowStatus = newTotalReleased >= projectValue ? 'fully_released' : 'partially_released';
    const newPaymentStatus = newTotalReleased >= projectValue ? 'released' : 'partially_paid';

    await admin.firestore().collection('projectPayments').doc(payment.id).update({
      totalReleased: newTotalReleased,
      escrowStatus: newEscrowStatus,
      paymentStatus: newPaymentStatus,
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Atualizar fundHolds
    const holdSnap = await admin
      .firestore()
      .collection('fundHolds')
      .where('projectId', '==', release.projectId)
      .limit(1)
      .get();
    if (!holdSnap.empty) {
      const holdDoc = holdSnap.docs[0];
      const hold = holdDoc.data();
      const holdTotalReleased = Number(hold.totalReleased || 0) + releaseAmount;
      const availableForRelease = projectValue - holdTotalReleased;
      await holdDoc.ref.update({
        totalReleased: holdTotalReleased,
        availableForRelease,
        isActive: availableForRelease > 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Criar registro de transação
    const descPct = (typeof release.percentage === 'number' && !isNaN(Number(release.percentage)))
      ? Number(release.percentage)
      : Math.round((releaseAmount / Math.max(projectValue, 1)) * 100);
    const transactionData = {
      projectId: release.projectId,
      releaseId: event.params.releaseId,
      type: 'release',
      amount: releaseAmount,
      description: `Liberação de fundos - ${descPct}%`,
      fromUserId: release.clientId,
      toUserId: release.freelancerId,
      status: 'completed',
      netAmount: releaseAmount,
      transferId: transferJson?.id || null,
      // Adicionar informações extras para melhor visualização
      projectTitle: release.projectTitle,
      clientName: release.clientName,
      freelancerName: release.freelancerName,
      releaseType: release.releaseType,
      percentage: release.percentage,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    console.log('Criando transação com dados:', {
      toUserId: transactionData.toUserId,
      amount: transactionData.amount,
      type: transactionData.type,
      status: transactionData.status
    });
    
    const transactionRef = await admin.firestore().collection('fundTransactions').add(transactionData);
    console.log('Transação criada com ID:', transactionRef.id);

    // Criar log de sistema para pagamento recebido pelo freelancer
    try {
      await admin.firestore().collection('logs').add({
        type: 'project_payment_received',
        level: 'info',
        title: 'Pagamento recebido',
        message: `Pagamento recebido pelo freelancer (${release.freelancerName}) para o projeto "${release.projectTitle}".`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: 'pagarmePlans.onFundReleaseCreate',
        projectId: release.projectId,
        clientId: release.clientId,
        freelancerId: release.freelancerId,
        releaseId: event.params.releaseId,
        amount: releaseAmount,
        read: false
      });
    } catch (logError) {
      console.error('Erro ao criar log de sistema de pagamento recebido:', logError);
    }

    console.log('Liberação processada com sucesso:', event.params.releaseId);
    
    // Se foi liberação de 100%, finalizar projeto e enviar notificações de avaliação
    if (release.releaseType === 'full' || release.percentage >= 100) {
      try {
        // Atualizar status do projeto para 'concluido'
        await admin.firestore().collection('projects').doc(release.projectId).update({
          status: 'concluido',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Projeto finalizado:', release.projectId);
        
        // Enviar notificação para o cliente avaliar o freelancer
        await admin.firestore().collection('notifications').add({
          userId: release.clientId,
          type: 'rating_request',
          title: 'Avalie o freelancer',
          message: `O projeto "${release.projectTitle || 'Projeto'}" foi finalizado. Avalie o trabalho do freelancer.`,
          actionUrl: `/cliente/avaliar?projectId=${release.projectId}&targetUserId=${release.freelancerId}&targetRole=freelancer`,
          metadata: {
            projectId: release.projectId,
            targetUserId: release.freelancerId,
            targetRole: 'freelancer'
          },
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Enviar notificação para o freelancer avaliar o cliente
        await admin.firestore().collection('notifications').add({
          userId: release.freelancerId,
          type: 'rating_request',
          title: 'Avalie o cliente',
          message: `O projeto "${release.projectTitle || 'Projeto'}" foi finalizado. Avalie a experiência com o cliente.`,
          actionUrl: `/freelancer/avaliar?projectId=${release.projectId}&targetUserId=${release.clientId}&targetRole=client`,
          metadata: {
            projectId: release.projectId,
            targetUserId: release.clientId,
            targetRole: 'client'
          },
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Notificações de avaliação enviadas para cliente e freelancer');
      } catch (notificationError) {
        console.error('Erro ao enviar notificações de avaliação:', notificationError);
        // Não falhar o processo principal por erro nas notificações
      }
    }
  } catch (err) {
    console.error('Erro ao processar liberação (trigger):', err);
    try {
      await snap.ref.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp(), rejectionReason: 'INTERNAL_ERROR' });
    } catch (updateErr) {
      console.error('Falha ao atualizar release após erro interno:', updateErr);
    }
  }
});

// HTTPS: processar liberação explicitamente (fallback ao trigger)
export const processFundRelease = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    // Preflight CORS
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
    const { releaseId } = req.body || {};
    if (!releaseId) {
      res.status(400).json({ error: 'releaseId é obrigatório' });
      return;
    }
    try {
      const snap = await admin.firestore().collection('fundReleases').doc(releaseId).get();
      if (!snap.exists) {
        res.status(404).json({ error: 'Liberação não encontrada' });
        return;
      }
      // Reaproveitar a mesma lógica do trigger, executando inline
      // Copiamos a lógica principal do onFundReleaseCreate
      const release = snap.data() as {
        projectId: string;
        projectTitle?: string;
        projectValue?: number;
        chatId?: string;
        clientId: string;
        clientName?: string;
        freelancerId: string;
        freelancerName?: string;
        releaseType: 'partial' | 'full';
        amount: number;
        percentage: number;
        cumulativeAmount?: number;
        cumulativePercentage?: number;
        remainingAmount?: number;
        remainingPercentage?: number;
        status?: 'approved' | 'released' | 'rejected' | 'pending';
        createdAt?: FirebaseFirestore.Timestamp;
        updatedAt?: FirebaseFirestore.Timestamp;
      } | undefined;
      if (!release || release.status !== 'approved') {
        res.status(400).json({ error: 'Liberação não está em estado aprovado' });
        return;
      }

      // --- Início da lógica equivalente ao trigger ---
      // Aceitar qualquer percentual - não rejeitar por passo

      const projectDoc = await admin.firestore().collection('projects').doc(release.projectId).get();
      if (!projectDoc.exists) {
        await snap.ref.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(404).json({ error: 'Projeto não encontrado' });
        return;
      }
      const projectData = projectDoc.data();
      if (projectData?.clientId !== release.clientId) {
        await snap.ref.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(403).json({ error: 'Cliente inválido' });
        return;
      }

      const freelancerRecipientId = await getFreelancerRecipientId(release.freelancerId);
      if (!freelancerRecipientId) {
        await snap.ref.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp(), rejectionReason: 'FREELANCER_SEM_RECIPIENT' });
        res.status(422).json({ error: 'Freelancer sem recipient' });
        return;
      }

      const payment = await getProjectPayment(release.projectId);
      if (!payment) {
        await snap.ref.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(404).json({ error: 'Pagamento do projeto não encontrado' });
        return;
      }

      const payData = payment.data;
      // Priorizar o valor líquido informado na release (proposedValue), evitando totalValue com taxa
      const projectValue = Number(release.projectValue || payData.projectValue || 0);
      const totalReleased = Number(payData.totalReleased || 0);
      const remainingAmount = Math.max(projectValue - totalReleased, 0);
      
      // Calcular valor de liberação baseado no percentage (não no amount direto)
      const releasePercentage = Number(release.percentage || 0);
      let releaseAmount = (projectValue * releasePercentage) / 100;
      
      console.log('Cálculo de liberação (HTTP):', {
        projectValue,
        totalReleased,
        remainingAmount,
        releasePercentage,
        calculatedReleaseAmount: releaseAmount,
        originalReleaseAmount: release.amount
      });
      
      if (releaseAmount <= 0) {
        await snap.ref.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(422).json({ error: 'Valor de liberação inválido' });
        return;
      }
      if (releaseAmount > remainingAmount) {
        console.warn('Valor solicitado excede disponível. Aplicando clamping ao restante disponível.');
        releaseAmount = remainingAmount;
      }

      // Simular transferência para controle interno (não usar Pagar.me)
      const transferJson = {
        id: `internal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'completed',
        amount: Math.round(releaseAmount * 100)
      };

      await snap.ref.update({
        status: 'released',
        releasedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        transferId: transferJson?.id || null
      });

      const newTotalReleased = totalReleased + releaseAmount;
      const newEscrowStatus = newTotalReleased >= projectValue ? 'fully_released' : 'partially_released';
      const newPaymentStatus = newTotalReleased >= projectValue ? 'released' : 'partially_paid';
      await admin.firestore().collection('projectPayments').doc(payment.id).update({
        totalReleased: newTotalReleased,
        escrowStatus: newEscrowStatus,
        paymentStatus: newPaymentStatus,
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const holdSnap = await admin.firestore().collection('fundHolds').where('projectId', '==', release.projectId).limit(1).get();
      if (!holdSnap.empty) {
        const holdDoc = holdSnap.docs[0];
        const hold = holdDoc.data();
        const holdTotalReleased = Number(hold.totalReleased || 0) + releaseAmount;
        const availableForRelease = projectValue - holdTotalReleased;
        await holdDoc.ref.update({
          totalReleased: holdTotalReleased,
          availableForRelease,
          isActive: availableForRelease > 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      await admin.firestore().collection('fundTransactions').add({
        projectId: release.projectId,
        releaseId: releaseId,
        type: 'release',
        amount: releaseAmount,
        description: `Liberação de fundos - ${release.releaseType === 'partial' ? release.percentage + '%' : '100%'}`,
        fromUserId: release.clientId,
        toUserId: release.freelancerId,
        status: 'completed',
        netAmount: releaseAmount,
        transferId: transferJson?.id || null,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Erro no processamento explícito da liberação:', err);
      res.set('Access-Control-Allow-Origin', '*');
      res.status(500).json({ error: 'Erro interno' });
    }
  });
});

// HTTPS: solicitar saque imediato (consulta saldo na plataforma e transfere para o recipient do usuário)
export const requestWithdrawNow = functions.https.onRequest(async (req, res) => {
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
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      const uid = decoded.uid;
      const { amount } = req.body || {};
      
      console.log('🔵 requestWithdrawNow: Iniciando saque para usuário:', uid, 'Valor:', amount);
      
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        console.error('❌ Valor inválido:', amount);
        res.status(400).json({ error: 'amount inválido' });
        return;
      }

      // Buscar dados completos do recipient do usuário
      const userDoc = await admin.firestore().collection('users').doc(uid).get();
      const userData = userDoc.data();
      const recipient = userData?.recipient;
      
      console.log('🔵 Dados do recipient:', {
        exists: !!recipient,
        id: recipient?.id,
        code: recipient?.code,
        status: recipient?.status,
        verified: recipient?.verified
      });
      
      if (!recipient || !recipient.id) {
        console.error('❌ Recipient não configurado para o usuário:', uid);
        res.status(400).json({ error: 'Recipient não configurado. Configure seus dados bancários primeiro.' });
        return;
      }
      
      // Validar se o recipient está ativo
      if (recipient.status !== 'active' && !recipient.verified) {
        console.error('❌ Recipient não está ativo:', recipient.status);
        res.status(400).json({ 
          error: 'Recipient não está ativo. Aguarde a verificação dos seus dados bancários.', 
          recipientStatus: recipient.status 
        });
        return;
      }
      
      const recipientId = recipient.id;
      console.log('✅ Recipient ID válido:', recipientId);

      // Consultar operações de saldo da plataforma
      let availableCents = 0;
      try {
        console.log('🔵 Consultando saldo da plataforma...');
        const balanceRes = await fetch('https://api.pagar.me/core/v5/balance/operations', {
          method: 'GET',
          headers: {
            accept: 'application/json',
            authorization: PAGARME_AUTH,
          },
        });
        const text = await balanceRes.text();
        if (!balanceRes.ok) {
          console.error('❌ Falha ao consultar balance/operations:', balanceRes.status, text);
          if (!SIMULATION_MODE) {
            res.status(502).json({ error: 'Falha ao consultar saldo da plataforma', details: text });
            return;
          }
        }
        const json = text ? JSON.parse(text) : { data: [] };
        const data = Array.isArray(json?.data) ? json.data : [];
        for (const op of data) {
          const status = op?.status;
          const mov = op?.movement_object || {};
          const amt = Number(mov?.amount || 0);
          if (status === 'available' && amt > 0) {
            availableCents += Math.round(amt);
          }
        }
        console.log('✅ Saldo disponível na plataforma:', availableCents, 'centavos');
      } catch (err) {
        console.error('❌ Erro consultando balance/operations:', err);
        if (!SIMULATION_MODE) {
          res.status(502).json({ error: 'Erro consultando saldo da plataforma' });
          return;
        }
      }

      const requestedCents = Math.round(amount * 100);
      console.log('🔵 Valor solicitado:', requestedCents, 'centavos');
      
      if (!SIMULATION_MODE && availableCents < requestedCents) {
        console.error('❌ Saldo insuficiente na plataforma:', availableCents, '<', requestedCents);
        res.status(400).json({ 
          error: 'Saldo insuficiente na plataforma para este saque', 
          available: availableCents,
          requested: requestedCents
        });
        return;
      }

      // Efetuar transferência para o recipient do usuário
      let transferJson: Record<string, unknown> | null = null;
      let transferStatus = 'pending';
      
      try {
        console.log('🔵 Criando transferência no Pagar.me...');
        console.log('🔵 Payload:', JSON.stringify({
          amount: requestedCents,
          recipient_id: recipientId,
          description: `Saque XJOBS - Usuário ${uid}`,
        }, null, 2));
        
        const transferRes = await fetch('https://api.pagar.me/core/v5/transfers', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: PAGARME_AUTH,
          },
          body: JSON.stringify({
            amount: requestedCents,
            recipient_id: recipientId,
            description: `Saque XJOBS - Usuário ${uid}`,
            metadata: { 
              type: 'xjobs_withdraw', 
              userId: uid,
              freelancerName: decoded.name || decoded.email || 'Usuário'
            },
          }),
        });
        
        const tText = await transferRes.text();
        console.log('🔵 Resposta da transferência - Status:', transferRes.status);
        console.log('🔵 Resposta da transferência - Body:', tText);
        
        if (!transferRes.ok) {
          console.error('❌ Falha ao criar transferência:', transferRes.status, tText);
          
          // Tentar parsear o erro para obter mais detalhes
          let errorDetails = tText;
          try {
            const errorJson = JSON.parse(tText);
            errorDetails = JSON.stringify(errorJson, null, 2);
          } catch {
            // Ignorar erros de parse, usar texto bruto
          }
          
          if (SIMULATION_MODE) {
            transferJson = { id: `sim_${Date.now()}`, amount: requestedCents, status: 'pending_processing' };
            transferStatus = 'pending';
          } else {
            res.status(502).json({ 
              error: 'Falha ao criar transferência no Pagar.me', 
              statusCode: transferRes.status,
              details: errorDetails,
              recipientId: recipientId
            });
            return;
          }
        } else {
          transferJson = JSON.parse(tText);
          transferStatus = (transferJson?.status as string) || 'pending';
          console.log('✅ Transferência criada com sucesso:', transferJson?.id, 'Status:', transferStatus);
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error('❌ Erro na requisição de transferência:', error);
        console.error('❌ Stack trace:', error.stack);
        
        if (SIMULATION_MODE) {
          transferJson = { id: `sim_${Date.now()}`, amount: requestedCents, status: 'pending_processing' };
          transferStatus = 'pending';
        } else {
          res.status(502).json({ 
            error: 'Erro ao processar transferência', 
            message: error.message,
            recipientId: recipientId
          });
          return;
        }
      }

      // Determinar status final baseado no status da transferência
      // Transferências podem ter status: pending, processing, transferred, failed, canceled
      let finalStatus = 'pending';
      if (transferStatus === 'transferred' || transferStatus === 'paid') {
        finalStatus = 'completed';
      } else if (transferStatus === 'failed' || transferStatus === 'canceled') {
        finalStatus = 'failed';
      }
      
      console.log('🔵 Status final da solicitação:', finalStatus);

      // Registrar withdraw request com status correto
      const withdrawRequestRef = await admin.firestore().collection('withdrawRequests').add({
        freelancerId: uid,
        freelancerName: decoded.name || decoded.email || 'Usuário',
        amount,
        amountCents: requestedCents,
        status: finalStatus,
        transferId: transferJson?.id || null,
        transferStatus: transferStatus,
        recipientId: recipientId,
        pagarmeResponse: transferJson,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log('✅ withdrawRequest criado:', withdrawRequestRef.id);

      // Registrar transação somente se a transferência foi bem-sucedida ou está pendente
      if (finalStatus !== 'failed') {
        const transactionRef = await admin.firestore().collection('fundTransactions').add({
          type: 'withdraw',
          amount,
          amountCents: requestedCents,
          description: 'Saque do saldo disponível',
          fromUserId: uid,
          toUserId: uid,
          status: finalStatus,
          netAmount: amount,
          transferId: transferJson?.id || null,
          withdrawRequestId: withdrawRequestRef.id,
          recipientId: recipientId,
          processedAt: finalStatus === 'completed' ? admin.firestore.FieldValue.serverTimestamp() : null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        console.log('✅ fundTransaction criada:', transactionRef.id);
      }

      console.log('✅ requestWithdrawNow: Saque processado com sucesso');
      
      res.status(200).json({ 
        ok: true, 
        transfer: transferJson, 
        transferStatus: transferStatus,
        finalStatus: finalStatus,
        availableCents,
        withdrawRequestId: withdrawRequestRef.id,
        message: finalStatus === 'completed' 
          ? 'Transferência concluída com sucesso' 
          : 'Transferência em processamento. Aguarde a confirmação.'
      });
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Erro no requestWithdrawNow:', error);
      console.error('❌ Stack trace:', error.stack);
      res.status(500).json({ error: 'Erro interno', message: error.message });
    }
  });
});