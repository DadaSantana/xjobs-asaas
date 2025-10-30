/**
 * Serviço para integração com API Asaas
 * Documentação: https://docs.asaas.com/reference
 */

import { ASAAS_CONFIG } from './config/asaas';

// Tipos da API Asaas
export interface AsaasCustomer {
  id?: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
  additionalEmails?: string;
  municipalInscription?: string;
  stateInscription?: string;
  observations?: string;
}

export interface AsaasPayment {
  id?: string;
  customer: string; // ID do cliente
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string; // formato: YYYY-MM-DD
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  discount?: {
    value?: number;
    dueDateLimitDays?: number;
    type?: 'FIXED' | 'PERCENTAGE';
  };
  interest?: {
    value: number;
    type?: 'PERCENTAGE';
  };
  fine?: {
    value: number;
    type?: 'FIXED' | 'PERCENTAGE';
  };
  postalService?: boolean;
  split?: Array<{
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
  }>;
}

export interface AsaasPaymentResponse extends AsaasPayment {
  id: string;
  dateCreated: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
  invoiceNumber?: string;
  pixTransaction?: {
    encodedImage?: string;
    payload?: string;
    expirationDate?: string;
  };
  creditCard?: {
    creditCardNumber?: string;
    creditCardBrand?: string;
    creditCardToken?: string;
  };
}

export interface AsaasTransfer {
  value: number;
  bankAccount?: {
    bank: {
      code: string; // Código do banco (ex: "001", "237")
    };
    accountName: string; // Nome do titular
    ownerName: string; // Nome do titular
    cpfCnpj: string; // CPF/CNPJ do titular
    agency: string; // Agência
    account: string; // Conta
    accountDigit: string; // Dígito da conta
  };
  operationType?: 'PIX' | 'TED' | 'INTERNAL';
  pixAddressKey?: string; // Chave PIX para transferências PIX
  pixAddressKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP'; // Tipo da chave PIX
  description?: string;
  scheduleDate?: string; // Data agendada (YYYY-MM-DD)
  externalReference?: string; // Referência externa
}

export interface AsaasTransferResponse {
  id: string;
  dateCreated: string;
  status: 'PENDING' | 'BANK_PROCESSING' | 'DONE' | 'CANCELLED' | 'FAILED';
  effectiveDate?: string;
  endToEndIdentifier?: string;
  scheduleDate?: string;
  authorized?: boolean;
  failReason?: string;
  transactionReceiptUrl?: string;
  value: number;
  netValue: number;
  transferFee: number;
  operationType: 'PIX' | 'TED' | 'INTERNAL';
}

export interface AsaasSubscription {
  customer: string; // ID do cliente
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  nextDueDate: string; // formato: YYYY-MM-DD
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description?: string;
  externalReference?: string;
  discount?: {
    value?: number;
    dueDateLimitDays?: number;
    type?: 'FIXED' | 'PERCENTAGE';
  };
  interest?: {
    value: number;
  };
  fine?: {
    value: number;
  };
}

export interface AsaasSubscriptionResponse extends AsaasSubscription {
  id: string;
  dateCreated: string;
  status: 'ACTIVE' | 'EXPIRED' | 'OVERDUE' | 'ERROR';
  nextDueDate: string;
  invoiceUrl?: string;
}

/**
 * Realiza uma requisição para a API Asaas
 */
async function asaasRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: AsaasCustomer | AsaasPayment | AsaasSubscription | AsaasTransfer | Record<string, unknown>
): Promise<T> {
  const url = `${ASAAS_CONFIG.apiUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_CONFIG.apiKey,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  console.log(`[Asaas] ${method} ${endpoint}`);
  
  const response = await fetch(url, options);
  
  const responseText = await response.text();
  console.log(`[Asaas] Response Status: ${response.status}`);
  
  if (!response.ok) {
    console.error(`[Asaas] Error Response:`, responseText);
    let errorMessage = `Erro na API Asaas: ${response.status}`;
    
    try {
      const errorData = JSON.parse(responseText) as { errors?: Array<{ description?: string; message?: string }>; message?: string };
      if (errorData.errors && Array.isArray(errorData.errors)) {
        errorMessage = errorData.errors.map((e) => e.description || e.message || '').join(', ');
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      // Se não conseguir fazer parse, usa a mensagem padrão
    }
    
    throw new Error(errorMessage);
  }

  try {
    const data = JSON.parse(responseText);
    return data as T;
  } catch (e) {
    console.error('[Asaas] Failed to parse response:', responseText);
    throw new Error('Erro ao processar resposta da API Asaas');
  }
}

/**
 * Cria ou atualiza um cliente no Asaas
 */
export async function createOrUpdateCustomer(customerData: AsaasCustomer): Promise<AsaasCustomer> {
  try {
    // Primeiro, tentar buscar por CPF/CNPJ
    if (customerData.cpfCnpj) {
      const existingCustomers = await asaasRequest<{ data: AsaasCustomer[] }>(
        `/customers?cpfCnpj=${customerData.cpfCnpj}`,
        'GET'
      );

      if (existingCustomers.data && existingCustomers.data.length > 0) {
        const existingCustomer = existingCustomers.data[0];
        console.log('[Asaas] Cliente existente encontrado:', existingCustomer.id);
        
        // Atualizar cliente existente
        const updated = await asaasRequest<AsaasCustomer>(
          `/customers/${existingCustomer.id}`,
          'PUT',
          customerData
        );
        
        return updated;
      }
    }

    // Se não encontrou, criar novo cliente
    console.log('[Asaas] Criando novo cliente');
    const newCustomer = await asaasRequest<AsaasCustomer>(
      '/customers',
      'POST',
      customerData
    );

    return newCustomer;
  } catch (error) {
    console.error('[Asaas] Erro ao criar/atualizar cliente:', error);
    throw error;
  }
}

/**
 * Cria uma cobrança no Asaas
 */
export async function createPayment(paymentData: AsaasPayment): Promise<AsaasPaymentResponse> {
  try {
    console.log('[Asaas] Criando cobrança:', paymentData);
    
    const payment = await asaasRequest<AsaasPaymentResponse>(
      '/payments',
      'POST',
      paymentData
    );

    console.log('[Asaas] Cobrança criada com sucesso:', payment.id);
    return payment;
  } catch (error) {
    console.error('[Asaas] Erro ao criar cobrança:', error);
    throw error;
  }
}

/**
 * Consulta o status de um pagamento
 */
export async function getPaymentStatus(paymentId: string): Promise<AsaasPaymentResponse> {
  try {
    const payment = await asaasRequest<AsaasPaymentResponse>(
      `/payments/${paymentId}`,
      'GET'
    );

    return payment;
  } catch (error) {
    console.error('[Asaas] Erro ao consultar status do pagamento:', error);
    throw error;
  }
}

/**
 * Cria uma transferência (PIX/TED) no Asaas
 */
export async function createTransfer(transferData: AsaasTransfer): Promise<AsaasTransferResponse> {
  try {
    console.log('[Asaas] Criando transferência:', transferData);
    
    // Define operationType como PIX por padrão se não especificado
    const finalTransferData = {
      ...transferData,
      operationType: transferData.operationType || 'PIX',
    };
    
    const transfer = await asaasRequest<AsaasTransferResponse>(
      '/transfers',
      'POST',
      finalTransferData
    );

    console.log('[Asaas] Transferência criada com sucesso:', transfer.id);
    return transfer;
  } catch (error) {
    console.error('[Asaas] Erro ao criar transferência:', error);
    throw error;
  }
}

/**
 * Consulta o status de uma transferência
 */
export async function getTransferStatus(transferId: string): Promise<AsaasTransferResponse> {
  try {
    const transfer = await asaasRequest<AsaasTransferResponse>(
      `/transfers/${transferId}`,
      'GET'
    );

    return transfer;
  } catch (error) {
    console.error('[Asaas] Erro ao consultar status da transferência:', error);
    throw error;
  }
}

/**
 * Busca QR Code PIX de um pagamento
 */
export async function getPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string; expirationDate: string } | null> {
  try {
    const payment = await getPaymentStatus(paymentId);
    
    if (payment.pixTransaction) {
      return {
        encodedImage: payment.pixTransaction.encodedImage || '',
        payload: payment.pixTransaction.payload || '',
        expirationDate: payment.pixTransaction.expirationDate || '',
      };
    }

    return null;
  } catch (error) {
    console.error('[Asaas] Erro ao buscar QR Code PIX:', error);
    return null;
  }
}

/**
 * Cancela um pagamento
 */
export async function cancelPayment(paymentId: string): Promise<void> {
  try {
    await asaasRequest(
      `/payments/${paymentId}`,
      'DELETE'
    );

    console.log('[Asaas] Pagamento cancelado com sucesso:', paymentId);
  } catch (error) {
    console.error('[Asaas] Erro ao cancelar pagamento:', error);
    throw error;
  }
}

/**
 * Estorna um pagamento
 */
export async function refundPayment(paymentId: string): Promise<void> {
  try {
    await asaasRequest(
      `/payments/${paymentId}/refund`,
      'POST'
    );

    console.log('[Asaas] Pagamento estornado com sucesso:', paymentId);
  } catch (error) {
    console.error('[Asaas] Erro ao estornar pagamento:', error);
    throw error;
  }
}

/**
 * Cria uma assinatura recorrente no Asaas
 */
export async function createSubscription(subscriptionData: AsaasSubscription): Promise<AsaasSubscriptionResponse> {
  try {
    console.log('[Asaas] Criando assinatura:', subscriptionData);
    
    const subscription = await asaasRequest<AsaasSubscriptionResponse>(
      '/subscriptions',
      'POST',
      subscriptionData
    );

    console.log('[Asaas] Assinatura criada com sucesso:', subscription.id);
    return subscription;
  } catch (error) {
    console.error('[Asaas] Erro ao criar assinatura:', error);
    throw error;
  }
}

/**
 * Consulta o status de uma assinatura
 */
export async function getSubscriptionStatus(subscriptionId: string): Promise<AsaasSubscriptionResponse> {
  try {
    const subscription = await asaasRequest<AsaasSubscriptionResponse>(
      `/subscriptions/${subscriptionId}`,
      'GET'
    );

    return subscription;
  } catch (error) {
    console.error('[Asaas] Erro ao consultar status da assinatura:', error);
    throw error;
  }
}

/**
 * Cancela uma assinatura
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  try {
    await asaasRequest(
      `/subscriptions/${subscriptionId}`,
      'DELETE'
    );

    console.log('[Asaas] Assinatura cancelada com sucesso:', subscriptionId);
  } catch (error) {
    console.error('[Asaas] Erro ao cancelar assinatura:', error);
    throw error;
  }
}

/**
 * Formata CPF/CNPJ removendo caracteres especiais
 */
export function cleanDocument(document: string): string {
  return document.replace(/\D/g, '');
}

/**
 * Formata data para o formato aceito pelo Asaas (YYYY-MM-DD)
 */
export function formatDateForAsaas(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcula a data de vencimento (hoje + X dias)
 */
export function calculateDueDate(daysFromNow: number = 3): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return formatDateForAsaas(date);
}

/**
 * Converte categoria de plano (1, 3, 6, 12) para ciclo do Asaas
 */
export function getCycleFromCategory(category: number): 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY' {
  switch (category) {
    case 1:
      return 'MONTHLY';
    case 3:
      return 'QUARTERLY';
    case 6:
      return 'SEMIANNUALLY';
    case 12:
      return 'YEARLY';
    default:
      return 'MONTHLY';
  }
}

export default {
  createOrUpdateCustomer,
  createPayment,
  getPaymentStatus,
  createTransfer,
  getTransferStatus,
  getPixQrCode,
  cancelPayment,
  refundPayment,
  createSubscription,
  getSubscriptionStatus,
  cancelSubscription,
  cleanDocument,
  formatDateForAsaas,
  calculateDueDate,
  getCycleFromCategory,
};

