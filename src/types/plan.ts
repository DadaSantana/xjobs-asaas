/**
 * Tipos para planos de assinatura Asaas
 */

export interface PlanFeature {
  id: string;
  label: string;
  enabled: boolean;
  icon?: string;
}

export interface PlanCardStyle {
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  accentColor?: string;
  highlighted?: boolean;
  badge?: {
    text: string;
    bgColor: string;
    textColor: string;
  };
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  price: number; // Em centavos
  originalPrice?: number; // Preço original em centavos (para mostrar desconto)
  category: 1 | 3 | 6 | 12; // Mensal, Trimestral, Semestral, Anual
  cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  messageLimit: number | null; // null = ilimitado
  likeLimit: number | null; // null = ilimitado
  features?: PlanFeature[]; // Recursos personalizáveis do plano
  cardStyle?: PlanCardStyle; // Personalização visual do card
  asaasExternalReference?: string; // Referência externa no Asaas
  subscribers?: number; // Quantidade de assinantes
  createdAt?: Date | any;
  updatedAt?: Date | any;
  gateway: 'asaas'; // Sempre Asaas agora
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  price: number; // Em centavos
  category: 1 | 3 | 6 | 12;
  messageLimit: number | null;
  likeLimit: number | null;
  features?: PlanFeature[];
  cardStyle?: PlanCardStyle;
}

export interface UpdatePlanInput extends Partial<CreatePlanInput> {
  id: string;
  status?: 'active' | 'inactive';
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  price: number;
  category: 1 | 3 | 6 | 12;
  likeLimit: number | null;
  messageLimit: number | null;
  gateway: 'asaas';
  asaasSubscriptionId: string;
  asaasCustomerId: string;
  status: 'active' | 'inactive' | 'cancelled' | 'pending';
  nextDueDate: string;
  cycle: string;
  createdAt?: Date | any;
  updatedAt?: Date | any;
}

