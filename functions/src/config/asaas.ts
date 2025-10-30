/**
 * Configuração da API Asaas
 * Detecta automaticamente entre Sandbox (desenvolvimento) e Produção
 */

// Detectar ambiente
const isProduction = process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR !== 'true';

// Chaves de API
const ASAAS_API_KEYS = {
  sandbox: '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjIwMjE5ZWVjLWI3OTUtNDNhYy1hMTIxLTc5MTAzOTUwNjFmMDo6JGFhY2hfYWIzMzc2OGQtZGZhMi00NDIzLTgwYjgtZmY2NjMyMTFlMWZk',
  production: '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjhiZjI1YWI4LWVjNTctNDY5OS1iYTBiLTBmNGIwODUxYzg4NTo6JGFhY2hfY2YwYWQ0MWItODljNi00NWYxLWJjMWItNDRkMjdkYzAwYThi'
};

// Wallet IDs
const ASAAS_WALLET_IDS = {
  sandbox: null, // Sandbox não precisa de Wallet ID específico
  production: 'f8a0607e-64dd-4deb-a414-4de740dc42f3'
};

export const ASAAS_CONFIG = {
  // Chave de API (seleciona automaticamente baseado no ambiente)
  apiKey: isProduction ? ASAAS_API_KEYS.production : ASAAS_API_KEYS.sandbox,
  
  // URL da API (seleciona automaticamente baseado no ambiente)
  apiUrl: isProduction ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3',
  
  // Wallet ID (apenas para produção)
  walletId: isProduction ? ASAAS_WALLET_IDS.production : ASAAS_WALLET_IDS.sandbox,
  
  // Ambiente atual
  environment: isProduction ? 'production' : 'sandbox',
  
  // Configurações de pagamento
  payment: {
    // Aceitar PIX e Cartão de Crédito
    billingTypes: ['PIX', 'CREDIT_CARD'] as const,
    
    // Tempo de expiração do PIX (em segundos) - 24 horas
    pixExpirationSeconds: 86400,
    
    // Dias de vencimento para boleto (se implementar futuramente)
    daysToExpire: 3,
  },
  
  // Configurações de split (controle próprio)
  split: {
    // Taxa da plataforma
    platformFeePercentage: 10, // 10%
    
    // Porcentagem que vai para o freelancer
    freelancerPercentage: 90, // 90%
  },
  
  // Configurações de transferência
  transfer: {
    // Tipo de transferência padrão
    type: 'PIX' as const,
    
    // Descrição padrão
    description: 'Pagamento de projeto - Plataforma XJobs',
  },
};

/**
 * Tipos de eventos do webhook Asaas
 * Documentação: https://docs.asaas.com/reference/notificacoes
 */
export const ASAAS_WEBHOOK_EVENTS = {
  // Eventos de Pagamento
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_UPDATED: 'PAYMENT_UPDATED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  PAYMENT_DELETED: 'PAYMENT_DELETED',
  PAYMENT_RESTORED: 'PAYMENT_RESTORED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_RECEIVED_IN_CASH: 'PAYMENT_RECEIVED_IN_CASH',
  PAYMENT_CHARGEBACK_REQUESTED: 'PAYMENT_CHARGEBACK_REQUESTED',
  PAYMENT_CHARGEBACK_DISPUTE: 'PAYMENT_CHARGEBACK_DISPUTE',
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  PAYMENT_DUNNING_RECEIVED: 'PAYMENT_DUNNING_RECEIVED',
  PAYMENT_DUNNING_REQUESTED: 'PAYMENT_DUNNING_REQUESTED',
  PAYMENT_BANK_SLIP_VIEWED: 'PAYMENT_BANK_SLIP_VIEWED',
  PAYMENT_CHECKOUT_VIEWED: 'PAYMENT_CHECKOUT_VIEWED',
  
  // Eventos de Assinatura (Subscription)
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_INACTIVATED: 'SUBSCRIPTION_INACTIVATED',
  SUBSCRIPTION_DELETED: 'SUBSCRIPTION_DELETED',
  SUBSCRIPTION_SPLIT_DISABLED: 'SUBSCRIPTION_SPLIT_DISABLED',
  SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK: 'SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK',
  SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK_FINISHED: 'SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK_FINISHED',
} as const;

export type AsaasWebhookEvent = typeof ASAAS_WEBHOOK_EVENTS[keyof typeof ASAAS_WEBHOOK_EVENTS];

