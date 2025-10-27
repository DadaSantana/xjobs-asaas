/**
 * Tipos para dados de pagamento do cliente
 * Armazenados em users/{uid}.paymentData
 */

export interface PaymentData {
  // Dados pessoais
  name: string;
  email: string;
  cpf: string; // CPF formatado ou apenas números
  phone: string; // Telefone com DDD
  
  // Endereço (opcional, mas útil para algumas formas de pagamento)
  address?: string;
  addressNumber?: string;
  complement?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  
  // Metadados
  createdAt?: Date;
  updatedAt?: Date;
  lastUsedAt?: Date;
}

/**
 * Validação de dados de pagamento
 */
export const validatePaymentData = (data: Partial<PaymentData>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.name || data.name.trim() === '') {
    errors.push('Nome completo é obrigatório');
  }

  if (!data.email || data.email.trim() === '') {
    errors.push('Email é obrigatório');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email inválido');
  }

  if (!data.cpf || data.cpf.trim() === '') {
    errors.push('CPF é obrigatório');
  } else {
    const cpf = data.cpf.replace(/\D/g, '');
    if (cpf.length !== 11) {
      errors.push('CPF deve conter 11 dígitos');
    }
  }

  if (!data.phone || data.phone.trim() === '') {
    errors.push('Telefone é obrigatório');
  } else {
    const phone = data.phone.replace(/\D/g, '');
    if (phone.length < 10 || phone.length > 11) {
      errors.push('Telefone deve conter DDD + número (10 ou 11 dígitos)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Formata CPF para exibição
 */
export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formata telefone para exibição
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

/**
 * Limpa formatação
 */
export const cleanDocument = (document: string): string => {
  return document.replace(/\D/g, '');
};

