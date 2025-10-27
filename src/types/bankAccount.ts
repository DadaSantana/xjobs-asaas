/**
 * Tipos para dados bancários simplificados
 * Usado para cadastro de freelancers sem necessidade de recipient
 */

export interface BankAccount {
  // Código do banco (ex: 001, 237, 341)
  bank: string;
  
  // Nome do banco para exibição
  bankName: string;
  
  // Número da agência
  agency: string;
  
  // Número da conta (sem dígito)
  account: string;
  
  // Dígito verificador da conta
  accountDigit: string;
  
  // Tipo de conta
  accountType: 'checking' | 'savings';
  
  // Nome do titular da conta
  holderName: string;
  
  // CPF do titular (apenas números)
  holderDocument: string;
  
  // Metadados
  createdAt?: Date;
  updatedAt?: Date;
  verified?: boolean;
}

/**
 * Lista dos principais bancos brasileiros
 */
export const BANKS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú' },
  { code: '077', name: 'Banco Inter' },
  { code: '260', name: 'Nubank' },
  { code: '290', name: 'PagBank' },
  { code: '323', name: 'Mercado Pago' },
  { code: '380', name: 'PicPay' },
  { code: '422', name: 'Banco Safra' },
  { code: '041', name: 'Banrisul' },
  { code: '389', name: 'Banco Mercantil' },
  { code: '212', name: 'Banco Original' },
  { code: '756', name: 'Bancoob (Sicoob)' },
  { code: '748', name: 'Sicredi' },
  { code: '336', name: 'Banco C6' },
  { code: '655', name: 'Neon' },
  { code: '637', name: 'Sofisa Direto' },
  { code: '074', name: 'Banco J. Safra' },
] as const;

/**
 * Tipos de conta bancária
 */
export const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Conta Poupança' },
] as const;

/**
 * Validação básica de dados bancários
 */
export const validateBankAccount = (account: Partial<BankAccount>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!account.bank || account.bank.trim() === '') {
    errors.push('Banco é obrigatório');
  }

  if (!account.agency || account.agency.trim() === '') {
    errors.push('Agência é obrigatória');
  }

  if (!account.account || account.account.trim() === '') {
    errors.push('Conta é obrigatória');
  }

  if (!account.accountDigit || account.accountDigit.trim() === '') {
    errors.push('Dígito da conta é obrigatório');
  }

  if (!account.accountType) {
    errors.push('Tipo de conta é obrigatório');
  }

  if (!account.holderName || account.holderName.trim() === '') {
    errors.push('Nome do titular é obrigatório');
  }

  if (!account.holderDocument || account.holderDocument.trim() === '') {
    errors.push('CPF do titular é obrigatório');
  } else {
    // Validação básica de CPF (apenas formato)
    const cpf = account.holderDocument.replace(/\D/g, '');
    if (cpf.length !== 11) {
      errors.push('CPF deve conter 11 dígitos');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Formatar CPF para exibição
 */
export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Limpar CPF (remover formatação)
 */
export const cleanCPF = (cpf: string): string => {
  return cpf.replace(/\D/g, '');
};

