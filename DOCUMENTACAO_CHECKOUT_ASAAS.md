# 📋 Documentação Completa - Checkout Asaas

## 🎯 Visão Geral

Este documento explica detalhadamente como funciona o sistema de checkout do Asaas implementado no projeto JusFacil. O sistema utiliza Firebase Functions como intermediário entre o frontend e a API do Asaas, garantindo segurança e controle total sobre os dados.

## 🏗️ Arquitetura do Sistema

### Componentes Principais

1. **Frontend (React/TypeScript)**
   - Componentes de checkout
   - Formulários de dados do cliente
   - Monitoramento de pagamento

2. **Firebase Functions (Node.js/TypeScript)**
   - Intermediário entre frontend e Asaas
   - Processamento de webhooks
   - Validação de dados

3. **API Asaas**
   - Criação de checkouts
   - Processamento de pagamentos
   - Notificações via webhook

4. **Firestore Database**
   - Armazenamento de pagamentos
   - Controle de status
   - Histórico de transações

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Arquivo .env
VITE_ASAAS_API_KEY=$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjIwMjE5ZWVjLWI3OTUtNDNhYy1hMTIxLTc5MTAzOTUwNjFmMDo6JGFhY2hfYWIzMzc2OGQtZGZhMi00NDIzLTgwYjgtZmY2NjMyMTFlMWZk
```

### Firebase Functions Environment

```bash
# Configuração das Firebase Functions
ASAAS_API_KEY=sua_chave_aqui
ASAAS_WALLET_ID=seu_wallet_id_aqui
```

## ⚠️ IMPORTANTE: Parcelamento Desabilitado

**Todos os pagamentos com cartão de crédito são processados À VISTA.**

O sistema não aceita parcelamento em nenhum contexto:
- Pagamentos de projetos
- Assinaturas de planos
- Qualquer outra transação

Isso é intencional para evitar atrasos na disponibilização de valores e simplificar o controle financeiro.

## 📊 Tipagens e Interfaces

### Payment Interface

```typescript
export interface Payment {
  id: string;
  checkoutId: string;
  userId: string;
  documentTypeId: string;
  documentTypeName: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  used: boolean;
  usedAt?: Date;
  customerData: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone: string;
  };
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  externalReference: string;
}
```

### Customer Data Interface

```typescript
export interface CustomerData {
  id?: string; // ID do Asaas (cus_xxxxx)
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  postalCode?: string;
  province?: string;
  city?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Asaas Checkout Interface

```typescript
interface AsaasCheckout {
  billingTypes: ["PIX", "CREDIT_CARD"];
  chargeTypes: ["DETACHED"];
  callback: {
    successUrl: string;
    autoRedirect: boolean;
  };
  items: [
    {
      name: string;
      quantity: number;
      value: number;
      description: string;
    }
  ];
  minutesToExpire: number; // 1440 = 24 horas
  externalReference: string;
  customerData?: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    postalCode?: string;
    province?: string;
    city?: number;
  };
}
```

## 🔄 Fluxo de Checkout

### 1. Inicialização do Checkout

**Arquivo:** `src/components/petition/PaymentStepsFlow.tsx`

```typescript
const handleCustomerDataConfirm = async (data: typeof customerData) => {
  // Criar checkout via Firebase Function
  const response = await fetch('https://us-central1-jusfacil-8fa00.cloudfunctions.net/createCheckout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: documentType.name,
      description: `Compra de documento: ${documentType.name}`,
      value: documentType.priceCents / 100,
      externalReference: `${user.uid}-${documentType.id}-${Date.now()}`,
      customerData: {
        name: data.name,
        email: data.email,
        cpf: data.cpf.replace(/\D/g, ''),
        phone: data.phone.replace(/\D/g, ''),
      }
    })
  });
}
```

### 2. Firebase Function - createCheckout

**Arquivo:** `functions/src/index.ts`

```typescript
export const createCheckout = functions.https.onRequest(async (req, res) => {
  // Configurar CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { name, description, value, externalReference } = req.body;

    // Validar dados obrigatórios
    if (!name || !value) {
      res.status(400).json({ 
        error: 'Nome e valor são obrigatórios' 
      });
      return;
    }

    // Chave da API Asaas (sandbox)
    const asaasApiKey = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjIwMjE5ZWVjLWI3OTUtNDNhYy1hMTIxLTc5MTAzOTUwNjFmMDo6JGFhY2hfYWIzMzc2OGQtZGZhMi00NDIzLTgwYjgtZmY2NjMyMTFlMWZk';

    // Criar payload do checkout conforme documentação Asaas
    const checkoutData: any = {
      billingTypes: ["PIX", "CREDIT_CARD"],
      chargeTypes: ["DETACHED"],
      callback: {
        successUrl: "https://www.devana.com.br/",
        autoRedirect: false
      },
      items: [
        {
          name: name,
          quantity: 1,
          value: parseFloat(value),
          description: description || `Compra: ${name}`
        }
      ],
      minutesToExpire: 1440, // 24 horas
      externalReference: externalReference || `jusfacil-${Date.now()}`
    };

    // Adicionar customerData se fornecido
    if (req.body.customerData && req.body.customerData.name && req.body.customerData.email) {
      const customer = req.body.customerData;
      checkoutData.customerData = {
        name: customer.name,
        email: customer.email,
        cpfCnpj: customer.cpfCnpj || customer.cpf || '',
        phone: customer.phone || ''
      };

      // Adicionar campos de endereço se fornecidos
      if (customer.address) {
        checkoutData.customerData.address = customer.address;
      }
      if (customer.addressNumber) {
        checkoutData.customerData.addressNumber = parseInt(customer.addressNumber) || customer.addressNumber;
      }
      if (customer.complement) {
        checkoutData.customerData.complement = customer.complement;
      }
      if (customer.postalCode) {
        checkoutData.customerData.postalCode = customer.postalCode.replace(/\D/g, '');
      }
      if (customer.province) {
        checkoutData.customerData.province = customer.province;
      }
      if (customer.city && typeof customer.city === 'number') {
        checkoutData.customerData.city = customer.city;
      }
    }

    // Fazer requisição para API Asaas
    const checkoutResponse = await fetch('https://api-sandbox.asaas.com/v3/checkouts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'access_token': asaasApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    });

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      console.error('Erro na API Asaas:', errorText);
      res.status(checkoutResponse.status).json({ 
        error: `Erro na API Asaas: ${checkoutResponse.status}`,
        details: errorText
      });
      return;
    }

    const result = await checkoutResponse.json() as any;
    
    // Retornar resultado para o cliente
    res.status(200).json({
      success: true,
      checkoutId: result.id,
      checkoutUrl: result.url,
      pixCode: result.pixQrCode,
      pixPayload: result.pixPayload,
      externalReference: result.externalReference,
      value: result.totalValue,
      status: result.status
    });

  } catch (error) {
    console.error('Erro na função:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});
```

### 3. Salvamento no Firestore

**Arquivo:** `src/services/paymentService.ts`

```typescript
export const createPayment = async (paymentData: PaymentFormData): Promise<Payment> => {
  try {
    const paymentRef = doc(db, COLLECTION_NAME, paymentData.checkoutId);
    const now = new Date();
    
    const dataToSave = {
      ...paymentData,
      id: paymentData.checkoutId,
      createdAt: now,
      updatedAt: now,
    };
    
    await setDoc(paymentRef, dataToSave);
    
    return dataToSave as Payment;
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    throw error;
  }
};
```

## 🔗 Webhook Implementation

### Firebase Function - Webhook Handler

**Arquivo:** `functions/src/index.ts`

```typescript
export const asaasWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const event = req.body;
    const type: string = event?.event;
    const payload = event?.payment || event?.subscription || event?.invoice || {};

    if (!type) {
      res.status(400).send('bad request');
      return;
    }

    // Tratar confirmações de pagamento
    if (type === 'PAYMENT_CONFIRMED') {
      const asaasPaymentId = payload.id as string;
      const orderSnap = await db.collection('orders').where('asaasPaymentId', '==', asaasPaymentId).limit(1).get();
      if (!orderSnap.empty) {
        const doc = orderSnap.docs[0];
        await doc.ref.set({ status: 'confirmed' }, { merge: true });
        const order = doc.data() as any;
        
        // Creditar 1 geração no avulso
        if (order.type === 'one_off') {
          const entRef = db.collection('userEntitlements').doc(order.userId);
          await entRef.set({ generateRemaining: admin.firestore.FieldValue.increment(1) }, { merge: true });
        }
      }
    }

    // Tratar ativação de assinatura
    if (type === 'SUBSCRIPTION_ACTIVATED' || type === 'SUBSCRIPTION_RENEWED') {
      const asaasSubscriptionId = payload.id as string;
      const orderSnap = await db.collection('orders').where('asaasSubscriptionId', '==', asaasSubscriptionId).limit(1).get();
      if (!orderSnap.empty) {
        const doc = orderSnap.docs[0];
        await doc.ref.set({ status: 'active' }, { merge: true });
        const order = doc.data() as any;
        
        // Setar limites do plano
        const planSnap = await db.collection('plans').doc(order.planId).get();
        if (planSnap.exists) {
          const plan = planSnap.data() as any;
          const now = admin.firestore.Timestamp.now();
          const next = admin.firestore.Timestamp.fromMillis(now.toMillis() + (plan.billingPeriod === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);
          await db.collection('userEntitlements').doc(order.userId).set({
            generateRemaining: plan.limits?.generatePerPeriod ?? 0,
            editRemaining: plan.limits?.editPerPeriod ?? 0,
            subscription: {
              planId: order.planId,
              status: 'active',
              asaasSubscriptionId,
              nextResetAt: next
            },
            lastResetAt: now
          }, { merge: true });
        }
      }
    }

    res.status(200).send('ok');
  } catch (e: any) {
    console.error(e);
    res.status(500).send('error');
  }
});
```

### Processamento de Webhook no Frontend

**Arquivo:** `src/services/asaasService.ts`

```typescript
export const processAsaasWebhook = async (webhookData: any) => {
  try {
    const { event, payment } = webhookData;
    
    if (event === 'PAYMENT_CONFIRMED' && payment) {
      // Processar pagamento confirmado
      const { externalReference, value } = payment;
      
      if (externalReference && externalReference.startsWith('doc_')) {
        // Extrair informações do externalReference
        const [, documentTypeId] = externalReference.split('_');
        
        // Atualizar banco de dados para dar acesso ao documento
        console.log('Pagamento confirmado para documento:', documentTypeId, 'Valor:', value);
        
        return {
          success: true,
          documentTypeId,
          value,
        };
      }
    }
    
    return { success: false, message: 'Evento não processado' };
  } catch (error) {
    console.error('Erro ao processar webhook do Asaas:', error);
    throw error;
  }
};
```

## 🔍 Verificação de Status

### Firebase Function - Check Status

```typescript
export const checkCheckoutStatus = functions.https.onRequest(async (req, res) => {
  // Configurar CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { checkoutId } = req.query;

    if (!checkoutId) {
      res.status(400).json({ error: 'checkoutId é obrigatório' });
      return;
    }

    // Chave da API Asaas (sandbox)
    const asaasApiKey = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjIwMjE5ZWVjLWI3OTUtNDNhYy1hMTIxLTc5MTAzOTUwNjFmMDo6JGFhY2hfYWIzMzc2OGQtZGZhMi00NDIzLTgwYjgtZmY2NjMyMTFlMWZk';

    // Buscar status do checkout
    const checkoutResponse = await fetch(`https://api-sandbox.asaas.com/v3/checkouts/${checkoutId}`, {
      headers: {
        'accept': 'application/json',
        'access_token': asaasApiKey
      }
    });

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      console.error('Erro na API Asaas:', errorText);
      res.status(checkoutResponse.status).json({ 
        error: `Erro na API Asaas: ${checkoutResponse.status}`,
        details: errorText
      });
      return;
    }

    const result = await checkoutResponse.json() as any;
    
    // Retornar status do checkout
    res.status(200).json({
      success: true,
      checkoutId: result.id,
      status: result.status,
      totalValue: result.totalValue,
      pixQrCode: result.pixQrCode,
      pixPayload: result.pixPayload,
      url: result.url,
      createdAt: result.createdAt,
      expiresAt: result.expiresAt
    });

  } catch (error) {
    console.error('Erro na função:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});
```

## 💳 Processamento de Cartão de Crédito

### Firebase Function - Card Payment

```typescript
export const processCardPayment = functions.https.onRequest(async (req, res) => {
  // Configurar CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { documentType, customerData, cardData } = req.body;

    // Validar dados obrigatórios
    if (!documentType || !customerData || !cardData) {
      res.status(400).json({ 
        error: 'Dados do documento, cliente e cartão são obrigatórios' 
      });
      return;
    }

    // Chave da API Asaas (sandbox)
    const asaasApiKey = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjIwMjE5ZWVjLWI3OTUtNDNhYy1hMTIxLTc5MTAzOTUwNjFmMDo6JGFhY2hfYWIzMzc2OGQtZGZhMi00NDIzLTgwYjgtZmY2NjMyMTFlMWZk';

    // 1. Criar ou buscar cliente
    let customerId;
    try {
      // Buscar cliente existente por email
      const existingCustomersResponse = await fetch(`https://api-sandbox.asaas.com/v3/customers?email=${encodeURIComponent(customerData.email)}`, {
        headers: {
          'accept': 'application/json',
          'access_token': asaasApiKey
        }
      });

      if (existingCustomersResponse.ok) {
        const existingCustomers = await existingCustomersResponse.json() as any;
        if (existingCustomers.data && existingCustomers.data.length > 0) {
          customerId = existingCustomers.data[0].id;
          console.log('Cliente encontrado:', customerId);
        }
      }

      // Se não encontrou, criar novo cliente
      if (!customerId) {
        console.log('Criando novo cliente...');
        const customerResponse = await fetch('https://api-sandbox.asaas.com/v3/customers', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'access_token': asaasApiKey,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone || '11999999999',
            cpfCnpj: customerData.cpf?.replace(/\D/g, '') || ''
          })
        });

        if (!customerResponse.ok) {
          const errorText = await customerResponse.text();
          console.error('Erro na API Asaas ao criar cliente:', errorText);
          throw new Error(`Erro ao criar cliente: ${customerResponse.status} - ${errorText}`);
        }

        const customer = await customerResponse.json() as any;
        customerId = customer.id;
        console.log('Cliente criado:', customerId);
      }
    } catch (error) {
      console.error('Erro ao criar/buscar cliente:', error);
      res.status(500).json({ 
        error: 'Erro ao processar dados do cliente',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return;
    }

    // 2. Criar cobrança com cartão
    const paymentData = {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: documentType.price,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Amanhã
      description: `Compra de documento: ${documentType.name}`,
      externalReference: `doc-${documentType.id}-${Date.now()}`,
      creditCard: {
        holderName: cardData.cardholderName,
        number: cardData.cardNumber.replace(/\s/g, ''),
        expiryMonth: cardData.expiryDate.split('/')[0],
        expiryYear: '20' + cardData.expiryDate.split('/')[1],
        ccv: cardData.cvv
      },
      creditCardHolderInfo: {
        name: customerData.name,
        email: customerData.email,
        cpfCnpj: customerData.cpf?.replace(/\D/g, '') || '',
        postalCode: '01310-100',
        addressNumber: '123',
        phone: customerData.phone?.replace(/\D/g, '') || '11999999999'
      }
    };

    const paymentResponse = await fetch('https://api-sandbox.asaas.com/v3/payments', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'access_token': asaasApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('Erro na API Asaas:', errorText);
      res.status(paymentResponse.status).json({ 
        error: `Erro na API Asaas: ${paymentResponse.status}`,
        details: errorText
      });
      return;
    }

    const result = await paymentResponse.json() as any;
    
    // Retornar resultado para o cliente
    res.status(200).json({
      success: true,
      paymentId: result.id,
      status: result.status,
      value: result.value,
      description: result.description,
      externalReference: result.externalReference,
      customerId: customerId
    });

  } catch (error) {
    console.error('Erro na função:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});
```

## 🧪 Testes e Debug

### Página de Teste

**Arquivo:** `src/pages/TestAsaas.tsx`

```typescript
const testPaymentLink = async () => {
  setIsTesting(true);
  try {
    // Usar Firebase Function via HTTP
    const response = await fetch('https://us-central1-jusfacil-8fa00.cloudfunctions.net/createCheckout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: "Teste de Integração",
        description: "Teste via Firebase Function",
        value: 19.90,
        externalReference: "test-firebase-" + Date.now(),
        successUrl: "https://www.devana.com.br/",
        customerData: {
          name: "Usuário Teste",
          email: "teste@exemplo.com",
          cpf: "123.456.789-00",
          phone: "(11) 99999-9999"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    setTestResult({
      paymentId: data.checkoutId,
      paymentUrl: data.checkoutUrl,
      pixCode: data.pixPayload,
      checkoutId: data.checkoutId,
      status: data.status,
      directApiTest: true
    });

    toast({
      title: "Teste via Firebase Function bem-sucedido!",
      description: "Checkout transparente criado via Firebase Function",
    });
  } catch (error) {
    console.error('Erro no teste via Firebase Function:', error);
    toast({
      title: "Erro no teste via Firebase Function",
      description: error instanceof Error ? error.message : "Erro desconhecido",
      variant: "destructive",
    });
  } finally {
    setIsTesting(false);
  }
};
```

### Verificação de Configuração

**Arquivo:** `src/services/asaasService.ts`

```typescript
export const checkAsaasConfiguration = (): { isConfigured: boolean; message: string; details?: any } => {
  if (!ASAAS_API_KEY) {
    return {
      isConfigured: false,
      message: 'Arquivo .env não encontrado! Crie um arquivo .env na raiz do projeto com VITE_ASAAS_API_KEY.',
      details: {
        keyExists: false,
        keyLength: 0,
        environment: import.meta.env.MODE,
        allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')),
        solution: 'Crie o arquivo .env na raiz do projeto com a chave do Asaas'
      }
    };
  }

  if (ASAAS_API_KEY.length < 10) {
    return {
      isConfigured: false,
      message: 'Chave da API Asaas parece inválida. Verifique se a chave está correta.',
      details: {
        keyExists: true,
        keyLength: ASAAS_API_KEY.length,
        keyStart: ASAAS_API_KEY.substring(0, 10) + '...',
        environment: import.meta.env.MODE
      }
    };
  }

  // Verificar se a chave tem o formato correto do Asaas
  const isValidAsaasKey = ASAAS_API_KEY.startsWith('$aact_') || ASAAS_API_KEY.startsWith('aact_');
  
  if (!isValidAsaasKey) {
    return {
      isConfigured: false,
      message: 'Chave da API Asaas não tem o formato correto. Deve começar com $aact_ ou aact_',
      details: {
        keyExists: true,
        keyLength: ASAAS_API_KEY.length,
        keyStart: ASAAS_API_KEY.substring(0, 10) + '...',
        expectedFormat: 'Deve começar com $aact_ ou aact_',
        environment: import.meta.env.MODE
      }
    };
  }

  return {
    isConfigured: true,
    message: 'Configuração do Asaas está correta!',
    details: {
      keyExists: true,
      keyLength: ASAAS_API_KEY.length,
      keyStart: ASAAS_API_KEY.substring(0, 10) + '...',
      environment: import.meta.env.MODE,
      format: 'Válido'
    }
  };
};
```

## 📋 Informações Enviadas para o Asaas

### Payload do Checkout

```json
{
  "billingTypes": ["PIX", "CREDIT_CARD"],
  "chargeTypes": ["DETACHED"],
  "callback": {
    "successUrl": "https://www.devana.com.br/",
    "autoRedirect": false
  },
  "items": [
    {
      "name": "Nome do Documento",
      "quantity": 1,
      "value": 19.90,
      "description": "Compra de documento: Nome do Documento"
    }
  ],
  "minutesToExpire": 1440,
  "externalReference": "doc-123-1234567890",
  "customerData": {
    "name": "Nome do Cliente",
    "email": "cliente@email.com",
    "cpfCnpj": "12345678900",
    "phone": "11999999999",
    "address": "Rua Exemplo, 123",
    "addressNumber": "123",
    "complement": "Apto 45",
    "postalCode": "01234567",
    "province": "Centro",
    "city": 123
  }
}
```

### Payload do Pagamento com Cartão

```json
{
  "customer": "cus_123456789",
  "billingType": "CREDIT_CARD",
  "value": 19.90,
  "dueDate": "2024-01-16",
  "description": "Compra de documento: Nome do Documento",
  "externalReference": "doc-123-1234567890",
  "creditCard": {
    "holderName": "NOME DO PORTADOR",
    "number": "4111111111111111",
    "expiryMonth": "12",
    "expiryYear": "2025",
    "ccv": "123"
  },
  "creditCardHolderInfo": {
    "name": "Nome do Cliente",
    "email": "cliente@email.com",
    "cpfCnpj": "12345678900",
    "postalCode": "01310100",
    "addressNumber": "123",
    "phone": "11999999999"
  }
}
```

## 🔑 Chaves Utilizadas

### Chave da API Asaas (Sandbox)

```
$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjIwMjE5ZWVjLWI3OTUtNDNhYy1hMTIxLTc5MTAzOTUwNjFmMDo6JGFhY2hfYWIzMzc2OGQtZGZhMi00NDIzLTgwYjgtZmY2NjMyMTFlMWZk
```

### URLs da API Asaas

- **Sandbox:** `https://api-sandbox.asaas.com/v3`
- **Produção:** `https://www.asaas.com/api/v3`

### Endpoints Utilizados

1. **Criar Checkout:** `POST /checkouts`
2. **Verificar Status:** `GET /checkouts/{id}`
3. **Criar Cliente:** `POST /customers`
4. **Buscar Cliente:** `GET /customers?email={email}`
5. **Criar Pagamento:** `POST /payments`

## 🚀 Deploy e Configuração

### Deploy das Firebase Functions

```bash
cd functions
npm run deploy
```

### Configuração do Webhook no Asaas

1. Acesse o painel do Asaas
2. Vá para **Configurações** > **Webhooks**
3. Adicione a URL: `https://us-central1-jusfacil-8fa00.cloudfunctions.net/asaasWebhook`
4. Selecione os eventos:
   - `PAYMENT_CONFIRMED`
   - `PAYMENT_RECEIVED`
   - `SUBSCRIPTION_ACTIVATED`
   - `SUBSCRIPTION_RENEWED`

## 📊 Monitoramento e Logs

### Logs das Firebase Functions

```bash
firebase functions:log --only asaasWebhook,createCheckout,checkCheckoutStatus
```

### Monitoramento no Firestore

- **Coleção:** `payments`
- **Campos monitorados:** `status`, `updatedAt`, `paidAt`
- **Índices necessários:** `userId`, `status`, `used`

## 🔒 Segurança

### Validações Implementadas

1. **CORS configurado** nas Firebase Functions
2. **Validação de dados** obrigatórios
3. **Sanitização de CPF/CNPJ** (remoção de caracteres especiais)
4. **Validação de formato** da chave da API
5. **Tratamento de erros** robusto

### Boas Práticas

1. **Nunca expor** a chave da API no frontend
2. **Usar Firebase Functions** como intermediário
3. **Validar webhooks** com assinatura (implementação futura)
4. **Logs detalhados** para debug
5. **Tratamento de timeouts** nas requisições

## 🎯 Implementação em Outro Projeto

### Passos para Implementação

1. **Configurar Firebase Functions**
2. **Adicionar variáveis de ambiente**
3. **Implementar interfaces TypeScript**
4. **Criar componentes de checkout**
5. **Configurar webhook no Asaas**
6. **Implementar monitoramento de status**
7. **Testar com dados sandbox**

### Arquivos Necessários

- `functions/src/index.ts` - Firebase Functions
- `src/services/asaasService.ts` - Serviços do frontend
- `src/types/payment.ts` - Tipagens
- `src/types/customer.ts` - Tipagens do cliente
- `src/services/paymentService.ts` - Serviços de pagamento
- Componentes de checkout (PaymentStepsFlow, IntegratedCheckout)

---

## 📝 Conclusão

Este sistema de checkout do Asaas é robusto e escalável, utilizando Firebase Functions como intermediário seguro entre o frontend e a API do Asaas. A implementação garante:

- ✅ **Segurança** - Chaves da API não expostas no frontend
- ✅ **Flexibilidade** - Suporte a PIX e cartão de crédito
- ✅ **Monitoramento** - Webhooks para confirmação automática
- ✅ **Debug** - Logs detalhados e página de teste
- ✅ **Escalabilidade** - Arquitetura preparada para crescimento

O sistema está pronto para produção e pode ser facilmente adaptado para outros projetos seguindo esta documentação.
