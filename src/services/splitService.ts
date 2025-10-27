/**
 * Serviço para cálculos de split de pagamentos
 * Gerencia a divisão entre plataforma (10%) e freelancer (90%)
 */

const PLATFORM_FEE_PERCENTAGE = 10; // 10%
const FREELANCER_PERCENTAGE = 90; // 90%

export interface SplitResult {
  totalAmount: number; // Valor total (100%)
  platformFee: number; // Taxa da plataforma (10%)
  freelancerAmount: number; // Valor líquido para freelancer (90%)
  platformFeePercentage: number; // 10
  freelancerPercentage: number; // 90
}

/**
 * Calcula o split de valores entre plataforma e freelancer
 * @param totalAmount Valor total a ser dividido
 * @returns Objeto com valores calculados
 */
export const calculateSplit = (totalAmount: number): SplitResult => {
  const platformFee = Math.round((totalAmount * PLATFORM_FEE_PERCENTAGE) / 100 * 100) / 100;
  const freelancerAmount = Math.round((totalAmount * FREELANCER_PERCENTAGE) / 100 * 100) / 100;

  return {
    totalAmount,
    platformFee,
    freelancerAmount,
    platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
    freelancerPercentage: FREELANCER_PERCENTAGE,
  };
};

/**
 * Calcula o valor bruto necessário para que o freelancer receba um valor específico líquido
 * @param freelancerAmount Valor que o freelancer deve receber (90%)
 * @returns Valor total que deve ser cobrado (100%)
 */
export const calculateTotalFromFreelancerAmount = (freelancerAmount: number): number => {
  // Se freelancerAmount é 90%, então totalAmount é 100%
  // totalAmount = freelancerAmount / 0.9
  return Math.round((freelancerAmount / (FREELANCER_PERCENTAGE / 100)) * 100) / 100;
};

/**
 * Calcula o valor de liberação baseado no valor do freelancer e porcentagem
 * @param freelancerAmount Valor líquido do freelancer (90% do total)
 * @param percentage Porcentagem a ser liberada (10, 20, 30, etc.)
 * @returns Valor a ser liberado
 */
export const calculateReleaseAmount = (freelancerAmount: number, percentage: number): number => {
  if (percentage <= 0 || percentage > 100) {
    throw new Error('Porcentagem deve estar entre 1 e 100');
  }

  const releaseAmount = Math.round((freelancerAmount * percentage) / 100 * 100) / 100;
  return releaseAmount;
};

/**
 * Formata valores de split para exibição
 * @param split Resultado do split
 * @returns Objeto formatado para exibição
 */
export const formatSplitDisplay = (split: SplitResult): {
  totalFormatted: string;
  platformFeeFormatted: string;
  freelancerAmountFormatted: string;
  breakdown: string;
} => {
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return {
    totalFormatted: formatter.format(split.totalAmount),
    platformFeeFormatted: formatter.format(split.platformFee),
    freelancerAmountFormatted: formatter.format(split.freelancerAmount),
    breakdown: `Total: ${formatter.format(split.totalAmount)} = Freelancer: ${formatter.format(split.freelancerAmount)} (90%) + Taxa: ${formatter.format(split.platformFee)} (10%)`,
  };
};

/**
 * Valida se um valor de split está correto
 * @param totalAmount Valor total
 * @param platformFee Taxa da plataforma
 * @param freelancerAmount Valor do freelancer
 * @returns true se os valores batem, false caso contrário
 */
export const validateSplit = (
  totalAmount: number,
  platformFee: number,
  freelancerAmount: number
): boolean => {
  const expectedSplit = calculateSplit(totalAmount);
  
  // Tolerância de 1 centavo para arredondamentos
  const tolerance = 0.01;
  
  const platformFeeMatch = Math.abs(expectedSplit.platformFee - platformFee) <= tolerance;
  const freelancerAmountMatch = Math.abs(expectedSplit.freelancerAmount - freelancerAmount) <= tolerance;
  const sumMatch = Math.abs((platformFee + freelancerAmount) - totalAmount) <= tolerance;

  return platformFeeMatch && freelancerAmountMatch && sumMatch;
};

/**
 * Formata um valor monetário para exibição
 * @param value Valor numérico
 * @returns String formatada em BRL
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Calcula valores disponíveis para liberação com base no total já liberado
 * @param freelancerAmount Valor líquido total do freelancer
 * @param totalReleased Valor já liberado
 * @returns Informações sobre valores disponíveis
 */
export const calculateAvailableForRelease = (
  freelancerAmount: number,
  totalReleased: number
): {
  available: number;
  released: number;
  releasedPercentage: number;
  availablePercentage: number;
} => {
  const available = Math.max(freelancerAmount - totalReleased, 0);
  const releasedPercentage = freelancerAmount > 0 ? (totalReleased / freelancerAmount) * 100 : 0;
  const availablePercentage = freelancerAmount > 0 ? (available / freelancerAmount) * 100 : 0;

  return {
    available: Math.round(available * 100) / 100,
    released: Math.round(totalReleased * 100) / 100,
    releasedPercentage: Math.round(releasedPercentage * 100) / 100,
    availablePercentage: Math.round(availablePercentage * 100) / 100,
  };
};

export default {
  calculateSplit,
  calculateTotalFromFreelancerAmount,
  calculateReleaseAmount,
  formatSplitDisplay,
  validateSplit,
  formatCurrency,
  calculateAvailableForRelease,
  PLATFORM_FEE_PERCENTAGE,
  FREELANCER_PERCENTAGE,
};

