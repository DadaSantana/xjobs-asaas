import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inicializa o admin caso não esteja inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

// Função para garantir que a URL tenha protocolo
function ensureValidUrl(url: string | undefined): string {
  if (!url) return 'https://sitedorecebedor.com.br';
  
  // Se já tem protocolo, retorna como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Se não tem protocolo, adiciona https://
  return `https://${url}`;
}

interface RecipientData {
  personType: 'individual' | 'corporation';
  name: string;
  email: string;
  document: string;
  birthdate: string;
  monthly_income: string;
  professional_occupation: string;
  phone_ddd: string;
  phone_number: string;
  street: string;
  complementary: string;
  street_number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  reference_point: string;
  holder_name: string;
  bank: string;
  branch_number: string;
  branch_check_digit?: string;
  account_number: string;
  account_check_digit: string;
  account_type: 'checking' | 'savings';
  // Campos específicos para PJ
  company_name?: string;
  trading_name?: string;
  site_url?: string;
  annual_revenue?: string;
  corporation_type?: string;
  founding_date?: string;
  mother_name?: string;
}

export const createRecipient = onRequest({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: '256MiB'
}, async (request, response) => {
  // Configurar CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    // Verificar autenticação
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Token de autenticação necessário' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const recipientData: RecipientData = request.body;

    // Validar dados obrigatórios
    if (!recipientData.name || !recipientData.email || !recipientData.document) {
      response.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
      return;
    }

    // Gerar código único para o recipient
    const code = `recipient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface PagarmeRecipientData {
  register_information: {
    phone_numbers: Array<{
      ddd: string;
      number: string;
      type: string;
    }>;
    address?: {
      street: string;
      complementary: string;
      street_number: string;
      neighborhood: string;
      city: string;
      state: string;
      zip_code: string;
      reference_point: string;
    };
    main_address?: {
      street: string;
      complementary: string;
      street_number: string;
      neighborhood: string;
      city: string;
      state: string;
      zip_code: string;
      reference_point: string;
    };
    name?: string;
    company_name?: string;
    trading_name?: string;
    email: string;
    document: string;
    type: string;
    site_url?: string;
    mother_name?: string;
    birthdate?: string;
    monthly_income?: string;
    professional_occupation?: string;
    annual_revenue?: number;
    corporation_type?: string;
    founding_date?: string;
    managing_partners?: Array<{
      name: string;
      email: string;
      document: string;
      type: string;
      mother_name: string;
      birthdate: string;
      monthly_income: string;
      professional_occupation: string;
      self_declared_legal_representative: boolean;
      address: {
        street: string;
        complementary: string;
        street_number: string;
        neighborhood: string;
        city: string;
        state: string;
        zip_code: string;
        reference_point: string;
      };
      phone_numbers: Array<{
        ddd: string;
        number: string;
        type: string;
      }>;
    }>;
  };
  default_bank_account: {
    holder_name: string;
    holder_type: string;
    holder_document: string;
    bank: string;
    branch_number: string;
    branch_check_digit?: string;
    account_number: string;
    account_check_digit: string;
    type: string;
  };
  code: string;
}

// ... existing code ...

    // Preparar dados para o Pagar.me
    let pagarmeData: PagarmeRecipientData;

    if (recipientData.personType === 'individual') {
      // Pessoa Física
      pagarmeData = {
        register_information: {
          phone_numbers: [
            {
              ddd: recipientData.phone_ddd,
              number: recipientData.phone_number.replace(/\D/g, ''),
              type: 'mobile'
            }
          ],
          address: {
            street: recipientData.street,
            complementary: recipientData.complementary || '',
            street_number: recipientData.street_number,
            neighborhood: recipientData.neighborhood,
            city: recipientData.city,
            state: recipientData.state,
            zip_code: recipientData.zip_code,
            reference_point: recipientData.reference_point || ''
          },
          name: recipientData.name,
          email: recipientData.email,
          document: recipientData.document.replace(/\D/g, ''),
          type: 'individual',
          site_url: ensureValidUrl(recipientData.site_url),
          mother_name: recipientData.mother_name || 'Nome da mae',
          birthdate: recipientData.birthdate.split('-').reverse().join('/'), // Converter YYYY-MM-DD para DD/MM/YYYY
          monthly_income: recipientData.monthly_income,
          professional_occupation: recipientData.professional_occupation
        },
        default_bank_account: {
          holder_name: recipientData.holder_name,
          holder_type: 'individual',
          holder_document: recipientData.document.replace(/\D/g, ''),
          bank: recipientData.bank,
          branch_number: recipientData.branch_number,
          branch_check_digit: recipientData.branch_check_digit || '6',
          account_number: recipientData.account_number,
          account_check_digit: recipientData.account_check_digit,
          type: recipientData.account_type
        },
        code: code
      };
    } else {
      // Pessoa Jurídica
      pagarmeData = {
        register_information: {
          phone_numbers: [
            {
              ddd: recipientData.phone_ddd,
              number: recipientData.phone_number.replace(/\D/g, ''),
              type: 'mobile'
            }
          ],
          main_address: {
            street: recipientData.street,
            complementary: recipientData.complementary || '',
            street_number: recipientData.street_number,
            neighborhood: recipientData.neighborhood,
            city: recipientData.city,
            state: recipientData.state,
            zip_code: recipientData.zip_code,
            reference_point: recipientData.reference_point || ''
          },
          company_name: recipientData.company_name || recipientData.name,
          trading_name: recipientData.trading_name || recipientData.name,
          email: recipientData.email,
          document: recipientData.document.replace(/\D/g, ''),
          type: 'corporation',
          site_url: ensureValidUrl(recipientData.site_url),
          annual_revenue: parseInt(recipientData.annual_revenue || '1000000'),
          corporation_type: recipientData.corporation_type || 'LTDA',
          founding_date: recipientData.founding_date || '2010-10-30',
          managing_partners: [
            {
              name: recipientData.name,
              email: recipientData.email,
              document: recipientData.document.replace(/\D/g, ''),
              type: 'individual',
              mother_name: recipientData.mother_name || 'Nome da mae',
              birthdate: recipientData.birthdate.split('-').reverse().join('/'), // Converter YYYY-MM-DD para DD/MM/YYYY
              monthly_income: recipientData.monthly_income,
              professional_occupation: recipientData.professional_occupation,
              self_declared_legal_representative: true,
              address: {
                street: recipientData.street,
                complementary: recipientData.complementary || '',
                street_number: recipientData.street_number,
                neighborhood: recipientData.neighborhood,
                city: recipientData.city,
                state: recipientData.state,
                zip_code: recipientData.zip_code,
                reference_point: recipientData.reference_point || ''
              },
              phone_numbers: [
                {
                  ddd: recipientData.phone_ddd,
                  number: recipientData.phone_number.replace(/\D/g, ''),
                  type: 'mobile'
                }
              ]
            }
          ]
        },
        default_bank_account: {
          holder_name: recipientData.holder_name,
          holder_type: 'company',
          holder_document: recipientData.document.replace(/\D/g, ''),
          bank: recipientData.bank,
          branch_number: recipientData.branch_number,
          branch_check_digit: recipientData.branch_check_digit || '6',
          account_number: recipientData.account_number,
          account_check_digit: recipientData.account_check_digit,
          type: recipientData.account_type
        },
        code: code
      };
    }

    logger.info('Dados preparados para Pagar.me:', JSON.stringify(pagarmeData, null, 2));

    // Criar recipient no Pagar.me
    const PAGARME_SECRET = 'sk_d6c3531584364d8598899c2f470ae421';
    const PAGARME_AUTH = 'Basic ' + Buffer.from(PAGARME_SECRET + ':').toString('base64');
    
    logger.info('Fazendo requisição para Pagar.me...');
    
    const pagarmeResponse = await fetch('https://api.pagar.me/core/v5/recipients', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authorization': PAGARME_AUTH
      },
      body: JSON.stringify(pagarmeData)
    });
    
    logger.info('Status da resposta do Pagar.me:', pagarmeResponse.status);
    logger.info('Headers da resposta:', JSON.stringify(Object.fromEntries(pagarmeResponse.headers.entries()), null, 2));
    
    const pagarmeResult = await pagarmeResponse.json();
    logger.info('Resposta do Pagar.me:', JSON.stringify(pagarmeResult, null, 2));
    
    if (!pagarmeResponse.ok) {
      logger.error('Erro ao criar recipient no Pagar.me:', pagarmeResult);
      response.status(400).json({ 
        error: 'Erro ao criar recipient no Pagar.me',
        details: pagarmeResult 
      });
      return;
    }
    
    // Determinar se o recipient está verificado baseado no status
    const isVerified = pagarmeResult.status === 'active' || pagarmeResult.verified === true;
    
    // ✅ IMPORTANTE: Garantir que o ID do Pagar.me seja salvo corretamente
    const recipientDoc = {
      ...pagarmeResult,
      id: pagarmeResult.id,  // Garantir que o ID do Pagar.me seja prioritário
      verified: isVerified,
      userId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    logger.info('Recipient salvo no Firestore com ID:', pagarmeResult.id);
    logger.info('Recipient completo:', JSON.stringify(recipientDoc, null, 2));

    // Salvar recipient no Firestore
    await db.collection('users').doc(userId).update({
      recipient: recipientDoc
    });

    logger.info('Recipient criado com sucesso para o usuário:', userId);

    response.status(200).json({
      success: true,
      recipient: recipientDoc
    });

  } catch (error) {
    logger.error('Erro ao criar recipient:', error);
    response.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    }
});

// Função para atualizar o status de verificação do recipient
export const updateRecipientVerification = onRequest({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: '256MiB'
}, async (request, response) => {
  // Configurar CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    // Verificar autenticação
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Token de autenticação necessário' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Buscar usuário no Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      response.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const userData = userDoc.data();
    const recipient = userData?.recipient;

    if (!recipient) {
      response.status(404).json({ error: 'Recipient não encontrado' });
      return;
    }

    // Verificar status atual no Pagar.me
    const PAGARME_SECRET = 'sk_d6c3531584364d8598899c2f470ae421';
    const PAGARME_AUTH = 'Basic ' + Buffer.from(PAGARME_SECRET + ':').toString('base64');
    
    const pagarmeResponse = await fetch(`https://api.pagar.me/core/v5/recipients/${recipient.id}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'authorization': PAGARME_AUTH
      }
    });

    if (!pagarmeResponse.ok) {
      logger.error('Erro ao buscar recipient no Pagar.me:', await pagarmeResponse.text());
      response.status(400).json({ error: 'Erro ao verificar status do recipient' });
      return;
    }

    const pagarmeResult = await pagarmeResponse.json();
    
    // Atualizar status de verificação
    const isVerified = pagarmeResult.status === 'active' || pagarmeResult.verified === true;
    
    const updatedRecipient = {
      ...recipient,
      ...pagarmeResult,
      verified: isVerified,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Salvar no Firestore
    await db.collection('users').doc(userId).update({
      recipient: updatedRecipient
    });

    logger.info('Status de verificação do recipient atualizado:', {
      userId,
      recipientId: recipient.id,
      status: pagarmeResult.status,
      verified: isVerified
    });

    response.status(200).json({
      success: true,
      recipient: updatedRecipient
    });

  } catch (error) {
    logger.error('Erro ao atualizar verificação do recipient:', error);
    response.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}); 

// Função para gerar link de KYC (Prova de Vida)
export const generateKycLinkV2 = onRequest({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: '256MiB'
}, async (request, response) => {
  // Configurar CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    // Verificar autenticação
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Token de autenticação necessário' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Buscar usuário no Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      response.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const userData = userDoc.data();
    const recipient = userData?.recipient;

    if (!recipient || !recipient.id) {
      response.status(404).json({ error: 'Recipient não encontrado. Configure seus dados bancários primeiro.' });
      return;
    }

    // Gerar link de KYC no Pagar.me (somente chamadas reais; sem simulação)
    const PAGARME_SECRET = process.env.PAGARME_SECRET || 'sk_d6c3531584364d8598899c2f470ae421';
    const PAGARME_AUTH = 'Basic ' + Buffer.from(PAGARME_SECRET + ':').toString('base64');
    
    logger.info('Gerando link de KYC para recipient:', recipient.id);
    
    // Descobrir o IP de saída da Cloud Function
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      logger.info('🌐 IP de saída da Cloud Function:', ipData.ip);
      console.log('🌐 IP DE SAÍDA DA CLOUD FUNCTION:', ipData.ip);
    } catch (ipError) {
      logger.warn('Não foi possível obter o IP de saída:', ipError);
    }
    
    logger.info('🔗 Fazendo requisição para Pagar.me API...');
    console.log('🔗 FAZENDO REQUISIÇÃO PARA PAGAR.ME API...');
    
    const kycResponse = await fetch(`https://api.pagar.me/core/v5/recipients/${recipient.id}/kyc_links`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authorization': PAGARME_AUTH
      },
      body: JSON.stringify({})
    });
    
    const kycText = await kycResponse.text();
    logger.info('📋 Resposta do KYC link - Status:', kycResponse.status, 'Body:', kycText);
    console.log('📋 RESPOSTA DO PAGAR.ME - STATUS:', kycResponse.status);
    console.log('📋 RESPOSTA DO PAGAR.ME - BODY:', kycText);
    
    if (!kycResponse.ok) {
      logger.error('❌ Erro ao gerar link de KYC:', kycResponse.status, kycText);
      console.log('❌ ERRO DETALHADO DO PAGAR.ME:');
      console.log('   Status:', kycResponse.status);
      console.log('   Status Text:', kycResponse.statusText);
      console.log('   Body:', kycText);
      console.log('   Headers:', Object.fromEntries(kycResponse.headers.entries()));
      
      let errorMessage = 'Erro ao gerar link de verificação';
      try {
        const errorData = JSON.parse(kycText);
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.map((e: unknown) => {
            const error = e as { message?: string };
            return error.message || String(e);
          }).join(', ');
        }
      } catch {
        // Ignorar erros de parse
      }

      // Tratar caso específico de IP Allowlist do Pagar.me para orientar o desenvolvedor
      if (errorMessage.includes('IP de origem não autorizado')) {
        console.log('🚫 ERRO DE IP NÃO AUTORIZADO DETECTADO!');
        console.log('🚫 ADICIONE O IP MOSTRADO ACIMA NA ALLOWLIST DO PAGAR.ME!');
        
        response.status(403).json({
          error: 'IP de origem não autorizado a realizar essa operação.',
          hint:
            'Adicione o IP de saída (egress) do seu Cloud Functions/Cloud Run à IP Allowlist no Dashboard do Pagar.me ou ative SIMULATION_MODE_KYC=true para desenvolvimento.',
          docs: 'Configurar IP fixo: VPC Connector + Cloud NAT com IP estático; ou desabilite a Allowlist no ambiente de testes.',
          details: kycText
        });
        return;
      }

      response.status(400).json({ error: errorMessage, details: kycText });
      return;
    }
    
    const kycResult = JSON.parse(kycText);
    logger.info('Link de KYC gerado com sucesso:', kycResult.url);
    
    // Salvar informações do link no Firestore
    const kycData = {
      url: kycResult.url,
      expiresAt: kycResult.expires_at,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      recipientId: recipient.id,
      userId: userId
    };
    
    // Atualizar recipient com informações do KYC
    const updatedRecipient = {
      ...recipient,
      kycLink: kycData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc(userId).update({
      recipient: updatedRecipient
    });
    
    logger.info('Link de KYC salvo no Firestore para usuário:', userId);

    response.status(200).json({
      success: true,
      kycLink: kycResult.url,
      expiresAt: kycResult.expires_at,
      message: 'Link de verificação gerado com sucesso. Válido por 20 minutos.'
    });

  } catch (error) {
    logger.error('Erro ao gerar link de KYC:', error);
    response.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export const checkRecipient = onRequest({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: '256MiB'
}, async (request, response) => {
  // Configurar CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    // Verificar autenticação
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Token de autenticação necessário' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Buscar usuário no Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      response.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const userData = userDoc.data();
    const recipient = userData?.recipient;
    const hasRecipient = recipient && (recipient.status === 'active' || recipient.verified === true);

    response.status(200).json({
      hasRecipient,
      recipient: hasRecipient ? userData.recipient : null
    });

  } catch (error) {
    logger.error('Erro ao verificar recipient:', error);
    response.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}); 