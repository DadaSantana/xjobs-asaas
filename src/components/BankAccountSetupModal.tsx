/**
 * Modal simplificado para cadastro de dados bancários
 * Substitui o RecipientSetupModal complexo do Pagarme
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, Save } from 'lucide-react';
import { BankAccount, BANKS, ACCOUNT_TYPES, validateBankAccount, formatCPF, cleanCPF } from '@/types/bankAccount';

interface BankAccountSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BankAccount) => Promise<void>;
  loading: boolean;
  initialData?: BankAccount;
}

export const BankAccountSetupModal: React.FC<BankAccountSetupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<BankAccount>>(initialData || {
    bank: '',
    bankName: '',
    agency: '',
    account: '',
    accountDigit: '',
    accountType: 'checking',
    holderName: '',
    holderDocument: '',
  });

  const [errors, setErrors] = useState<string[]>([]);

  const handleInputChange = (field: keyof BankAccount, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Limpar erros quando o usuário começa a digitar
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleBankSelect = (bankCode: string) => {
    const selectedBank = BANKS.find(b => b.code === bankCode);
    setFormData(prev => ({
      ...prev,
      bank: bankCode,
      bankName: selectedBank?.name || '',
    }));
  };

  const handleCPFChange = (value: string) => {
    // Permitir apenas números e limitar a 11 dígitos
    const cleaned = cleanCPF(value);
    const formatted = formatCPF(cleaned);
    handleInputChange('holderDocument', formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar dados
    const validation = validateBankAccount(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      await onSubmit({
        ...formData,
        holderDocument: cleanCPF(formData.holderDocument || ''),
      } as BankAccount);
    } catch (error) {
      console.error('Erro ao salvar dados bancários:', error);
      setErrors(['Erro ao salvar dados bancários. Tente novamente.']);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            Dados Bancários para Recebimento
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Configure sua conta bancária para receber pagamentos dos projetos
          </p>
        </DialogHeader>

        {/* Banner informativo */}
        <Alert className="bg-blue-50 border-blue-200">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <strong>Configure seus dados bancários.</strong>{' '}
            Após salvar, você poderá receber os pagamentos dos projetos diretamente na sua conta.
          </AlertDescription>
        </Alert>

        {/* Erros de validação */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coluna Esquerda */}
            <div className="space-y-4">
              {/* Banco */}
              <div>
                <Label htmlFor="bank">
                  Banco <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.bank}
                  onValueChange={handleBankSelect}
                >
                  <SelectTrigger id="bank">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.code} - {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agência */}
              <div>
                <Label htmlFor="agency">
                  Agência <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="agency"
                  placeholder="0001"
                  value={formData.agency}
                  onChange={(e) => handleInputChange('agency', e.target.value)}
                  maxLength={10}
                />
              </div>

              {/* Nome do Titular */}
              <div>
                <Label htmlFor="holderName">
                  Nome do Titular <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="holderName"
                  placeholder="NOME COMPLETO"
                  value={formData.holderName}
                  onChange={(e) => handleInputChange('holderName', e.target.value.toUpperCase())}
                />
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-4">
              {/* Tipo de Conta */}
              <div>
                <Label htmlFor="accountType">
                  Tipo de Conta <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.accountType}
                  onValueChange={(value: 'checking' | 'savings') => handleInputChange('accountType', value)}
                >
                  <SelectTrigger id="accountType">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conta e Dígito */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label htmlFor="account">
                    Conta <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="account"
                    placeholder="5389697"
                    value={formData.account}
                    onChange={(e) => handleInputChange('account', e.target.value)}
                    maxLength={15}
                  />
                </div>
                <div>
                  <Label htmlFor="accountDigit">
                    Dígito <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="accountDigit"
                    placeholder="1"
                    value={formData.accountDigit}
                    onChange={(e) => handleInputChange('accountDigit', e.target.value)}
                    maxLength={2}
                  />
                </div>
              </div>

              {/* CPF do Titular */}
              <div>
                <Label htmlFor="holderDocument">
                  CPF do Titular <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="holderDocument"
                  placeholder="000.000.000-00"
                  value={formData.holderDocument}
                  onChange={(e) => handleCPFChange(e.target.value)}
                  maxLength={14}
                />
              </div>
            </div>
          </div>

          {/* Botão de Salvar */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Dados Bancários
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BankAccountSetupModal;

