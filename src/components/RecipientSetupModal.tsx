import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RecipientSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RecipientData) => Promise<void>;
  loading: boolean;
}

export interface RecipientData {
  // Tipo de pessoa
  personType: 'individual' | 'corporation';
  
  // Informações pessoais/empresariais
  name: string;
  email: string;
  document: string;
  birthdate: string;
  monthly_income: string;
  professional_occupation: string;
  
  // Informações específicas para PJ
  company_name?: string;
  trading_name?: string;
  site_url?: string;
  annual_revenue?: string;
  corporation_type?: string;
  founding_date?: string;
  mother_name?: string;
  
  // Telefone
  phone_ddd: string;
  phone_number: string;
  
  // Endereço
  street: string;
  complementary: string;
  street_number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  reference_point: string;
  
  // Dados bancários
  holder_name: string;
  bank: string;
  branch_number: string;
  branch_check_digit?: string;
  account_number: string;
  account_check_digit: string;
  account_type: 'checking' | 'savings';
}

const RecipientSetupModal: React.FC<RecipientSetupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading
}) => {
  const [formData, setFormData] = useState<RecipientData>({
    personType: 'individual',
    name: '',
    email: '',
    document: '',
    birthdate: '',
    monthly_income: '',
    professional_occupation: '',
    phone_ddd: '',
    phone_number: '',
    street: '',
    complementary: '',
    street_number: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
    reference_point: '',
    holder_name: '',
    bank: '',
    branch_number: '',
    branch_check_digit: '',
    account_number: '',
    account_check_digit: '',
    account_type: 'checking'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showValidationError, setShowValidationError] = useState(false);

  const handleInputChange = (field: keyof RecipientData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Campos obrigatórios básicos
    if (!formData.name.trim()) {
      newErrors.name = formData.personType === 'individual' ? 'Nome completo é obrigatório' : 'Nome da empresa é obrigatório';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail deve ter um formato válido';
    }
    
    if (!formData.document.trim()) {
      newErrors.document = formData.personType === 'individual' ? 'CPF é obrigatório' : 'CNPJ é obrigatório';
    }
    
    if (!formData.birthdate) {
      newErrors.birthdate = 'Data de nascimento é obrigatória';
    }
    
    if (!formData.monthly_income.trim()) {
      newErrors.monthly_income = 'Renda mensal é obrigatória';
    }
    
    if (!formData.professional_occupation.trim()) {
      newErrors.professional_occupation = 'Profissão é obrigatória';
    }
    
    // Telefone
    if (!formData.phone_ddd.trim()) {
      newErrors.phone_ddd = 'DDD é obrigatório';
    }
    
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Número do telefone é obrigatório';
    }
    
    // Campos específicos para PJ
    if (formData.personType === 'corporation') {
      if (!formData.company_name?.trim()) {
        newErrors.company_name = 'Nome fantasia é obrigatório';
      }
      
      if (!formData.trading_name?.trim()) {
        newErrors.trading_name = 'Razão social é obrigatória';
      }
      
      if (!formData.site_url?.trim()) {
        newErrors.site_url = 'Site da empresa é obrigatório';
      }
      
      if (!formData.annual_revenue?.trim()) {
        newErrors.annual_revenue = 'Faturamento anual é obrigatório';
      }
      
      if (!formData.corporation_type?.trim()) {
        newErrors.corporation_type = 'Tipo de empresa é obrigatório';
      }
      
      if (!formData.founding_date?.trim()) {
        newErrors.founding_date = 'Data de fundação é obrigatória';
      }
      
      if (!formData.mother_name?.trim()) {
        newErrors.mother_name = 'Nome da mãe é obrigatório';
      }
    }
    
    // Endereço
    if (!formData.street.trim()) {
      newErrors.street = 'Rua é obrigatória';
    }
    
    if (!formData.complementary.trim()) {
      newErrors.complementary = 'Complemento é obrigatório';
    }
    
    if (!formData.street_number.trim()) {
      newErrors.street_number = 'Número é obrigatório';
    }
    
    if (!formData.neighborhood.trim()) {
      newErrors.neighborhood = 'Bairro é obrigatório';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'Cidade é obrigatória';
    }
    
    if (!formData.state.trim()) {
      newErrors.state = 'Estado é obrigatório';
    }
    
    if (!formData.zip_code.trim()) {
      newErrors.zip_code = 'CEP é obrigatório';
    }
    
    if (!formData.reference_point.trim()) {
      newErrors.reference_point = 'Ponto de referência é obrigatório';
    }
    
    // Dados bancários
    if (!formData.holder_name.trim()) {
      newErrors.holder_name = 'Nome do titular é obrigatório';
    }
    
    if (!formData.bank.trim()) {
      newErrors.bank = 'Banco é obrigatório';
    }
    
    if (!formData.branch_number.trim()) {
      newErrors.branch_number = 'Agência é obrigatória';
    }
    
    if (!formData.branch_check_digit?.trim()) {
      newErrors.branch_check_digit = 'Dígito verificador da agência é obrigatório';
    }
    
    if (!formData.account_number.trim()) {
      newErrors.account_number = 'Número da conta é obrigatório';
    }
    
    if (!formData.account_check_digit.trim()) {
      newErrors.account_check_digit = 'Dígito verificador da conta é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidationError(false);
    
    if (!validateForm()) {
      setShowValidationError(true);
      return;
    }
    
    await onSubmit(formData);
  };

  const getFieldError = (field: string): string | undefined => {
    return errors[field];
  };

  const hasFieldError = (field: string): boolean => {
    return !!errors[field];
  };

  const banks = [
    { code: '001', name: 'Banco do Brasil' },
    { code: '104', name: 'Caixa Econômica Federal' },
    { code: '033', name: 'Santander' },
    { code: '341', name: 'Itaú' },
    { code: '237', name: 'Bradesco' },
    { code: '756', name: 'Sicoob' },
    { code: '422', name: 'Safra' },
    { code: '655', name: 'Banco Votorantim' },
    { code: '260', name: 'Nubank' },
    { code: '077', name: 'Inter' },
    { code: '212', name: 'Banco Original' },
    { code: '341', name: 'Itaú Unibanco' },
    { code: '237', name: 'Bradesco' },
    { code: '001', name: 'Banco do Brasil' },
    { code: '104', name: 'Caixa Econômica Federal' },
    { code: '033', name: 'Santander' },
    { code: '756', name: 'Sicoob' },
    { code: '422', name: 'Safra' },
    { code: '655', name: 'Banco Votorantim' },
    { code: '260', name: 'Nubank' },
    { code: '077', name: 'Inter' },
    { code: '212', name: 'Banco Original' }
  ];

  const states = [
    { code: 'AC', name: 'Acre' },
    { code: 'AL', name: 'Alagoas' },
    { code: 'AP', name: 'Amapá' },
    { code: 'AM', name: 'Amazonas' },
    { code: 'BA', name: 'Bahia' },
    { code: 'CE', name: 'Ceará' },
    { code: 'DF', name: 'Distrito Federal' },
    { code: 'ES', name: 'Espírito Santo' },
    { code: 'GO', name: 'Goiás' },
    { code: 'MA', name: 'Maranhão' },
    { code: 'MT', name: 'Mato Grosso' },
    { code: 'MS', name: 'Mato Grosso do Sul' },
    { code: 'MG', name: 'Minas Gerais' },
    { code: 'PA', name: 'Pará' },
    { code: 'PB', name: 'Paraíba' },
    { code: 'PR', name: 'Paraná' },
    { code: 'PE', name: 'Pernambuco' },
    { code: 'PI', name: 'Piauí' },
    { code: 'RJ', name: 'Rio de Janeiro' },
    { code: 'RN', name: 'Rio Grande do Norte' },
    { code: 'RS', name: 'Rio Grande do Sul' },
    { code: 'RO', name: 'Rondônia' },
    { code: 'RR', name: 'Roraima' },
    { code: 'SC', name: 'Santa Catarina' },
    { code: 'SP', name: 'São Paulo' },
    { code: 'SE', name: 'Sergipe' },
    { code: 'TO', name: 'Tocantins' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:max-w-4xl md:max-h-[90dvh] md:rounded-lg p-0 flex flex-col">
        <DialogHeader className="p-4 md:p-6 border-b">
          <DialogTitle>Configuração de Recebimento</DialogTitle>
          <DialogDescription>
            Para receber pagamentos pelos seus trabalhos, precisamos de algumas informações. 
            Todas as informações são seguras e criptografadas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Alerta de validação */}
            {showValidationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Por favor, preencha todos os campos obrigatórios marcados em vermelho.
                </AlertDescription>
              </Alert>
            )}
          
          {/* Tipo de Pessoa */}
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Pessoa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="personType">Tipo de Pessoa *</Label>
                <Select
                  value={formData.personType}
                  onValueChange={(value: 'individual' | 'corporation') => handleInputChange('personType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de pessoa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Pessoa Física (CPF)</SelectItem>
                    <SelectItem value="corporation">Pessoa Jurídica (CNPJ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Informações Pessoais/Empresariais */}
          <Card>
            <CardHeader>
              <CardTitle>
                {formData.personType === 'individual' ? 'Informações Pessoais' : 'Informações Empresariais'}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {formData.personType === 'individual' ? 'Nome Completo *' : 'Nome da Empresa *'}
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={formData.personType === 'individual' ? "Seu nome completo" : "Nome da empresa"}
                  className={hasFieldError('name') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('name') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('name')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="seu@email.com"
                  className={hasFieldError('email') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('email') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('email')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="document">
                  {formData.personType === 'individual' ? 'CPF *' : 'CNPJ *'}
                </Label>
                <Input
                  id="document"
                  value={formData.document}
                  onChange={(e) => handleInputChange('document', e.target.value)}
                  placeholder={formData.personType === 'individual' ? "000.000.000-00" : "00.000.000/0000-00"}
                  className={hasFieldError('document') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('document') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('document')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="birthdate">Data de Nascimento *</Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) => handleInputChange('birthdate', e.target.value)}
                  className={hasFieldError('birthdate') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('birthdate') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('birthdate')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="monthly_income">Renda Mensal *</Label>
                <Input
                  id="monthly_income"
                  value={formData.monthly_income}
                  onChange={(e) => handleInputChange('monthly_income', e.target.value)}
                  placeholder="Ex: 3000"
                  className={hasFieldError('monthly_income') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('monthly_income') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('monthly_income')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="professional_occupation">Profissão *</Label>
                <Input
                  id="professional_occupation"
                  value={formData.professional_occupation}
                  onChange={(e) => handleInputChange('professional_occupation', e.target.value)}
                  placeholder="Ex: Desenvolvedor Web"
                  className={hasFieldError('professional_occupation') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('professional_occupation') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('professional_occupation')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone_ddd">DDD *</Label>
                <Input
                  id="phone_ddd"
                  value={formData.phone_ddd}
                  onChange={(e) => handleInputChange('phone_ddd', e.target.value)}
                  placeholder="11"
                  maxLength={2}
                  className={hasFieldError('phone_ddd') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('phone_ddd') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('phone_ddd')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone_number">Telefone *</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  placeholder="98765-4321"
                  className={hasFieldError('phone_number') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('phone_number') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('phone_number')}</p>
                )}
              </div>
              
              {/* Campos específicos para PJ */}
              {formData.personType === 'corporation' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nome Fantasia *</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name || ''}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      placeholder="Nome fantasia da empresa"
                      className={hasFieldError('company_name') ? 'border-red-500 focus:border-red-500' : ''}
                      required
                    />
                    {hasFieldError('company_name') && (
                      <p className="text-sm text-red-500 mt-1">{getFieldError('company_name')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="trading_name">Razão Social *</Label>
                    <Input
                      id="trading_name"
                      value={formData.trading_name || ''}
                      onChange={(e) => handleInputChange('trading_name', e.target.value)}
                      placeholder="Razão social da empresa"
                      className={hasFieldError('trading_name') ? 'border-red-500 focus:border-red-500' : ''}
                      required
                    />
                    {hasFieldError('trading_name') && (
                      <p className="text-sm text-red-500 mt-1">{getFieldError('trading_name')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="site_url">Site da Empresa *</Label>
                    <Input
                      id="site_url"
                      value={formData.site_url || ''}
                      onChange={(e) => handleInputChange('site_url', e.target.value)}
                      placeholder="https://www.empresa.com.br"
                      className={hasFieldError('site_url') ? 'border-red-500 focus:border-red-500' : ''}
                      required
                    />
                    {hasFieldError('site_url') && (
                      <p className="text-sm text-red-500 mt-1">{getFieldError('site_url')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="annual_revenue">Faturamento Anual *</Label>
                    <Input
                      id="annual_revenue"
                      value={formData.annual_revenue || ''}
                      onChange={(e) => handleInputChange('annual_revenue', e.target.value)}
                      placeholder="Ex: 1000000"
                      className={hasFieldError('annual_revenue') ? 'border-red-500 focus:border-red-500' : ''}
                      required
                    />
                    {hasFieldError('annual_revenue') && (
                      <p className="text-sm text-red-500 mt-1">{getFieldError('annual_revenue')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="corporation_type">Tipo de Empresa *</Label>
                    <Select
                      value={formData.corporation_type || ''}
                      onValueChange={(value) => handleInputChange('corporation_type', value)}
                    >
                      <SelectTrigger className={hasFieldError('corporation_type') ? 'border-red-500 focus:border-red-500' : ''}>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LTDA">LTDA</SelectItem>
                        <SelectItem value="SA">SA</SelectItem>
                        <SelectItem value="MEI">MEI</SelectItem>
                        <SelectItem value="EPP">EPP</SelectItem>
                      </SelectContent>
                    </Select>
                    {hasFieldError('corporation_type') && (
                      <p className="text-sm text-red-500 mt-1">{getFieldError('corporation_type')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="founding_date">Data de Fundação *</Label>
                    <Input
                      id="founding_date"
                      type="date"
                      value={formData.founding_date || ''}
                      onChange={(e) => handleInputChange('founding_date', e.target.value)}
                      className={hasFieldError('founding_date') ? 'border-red-500 focus:border-red-500' : ''}
                      required
                    />
                    {hasFieldError('founding_date') && (
                      <p className="text-sm text-red-500 mt-1">{getFieldError('founding_date')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mother_name">Nome da Mãe *</Label>
                    <Input
                      id="mother_name"
                      value={formData.mother_name || ''}
                      onChange={(e) => handleInputChange('mother_name', e.target.value)}
                      placeholder="Nome completo da mãe"
                      className={hasFieldError('mother_name') ? 'border-red-500 focus:border-red-500' : ''}
                      required
                    />
                    {hasFieldError('mother_name') && (
                      <p className="text-sm text-red-500 mt-1">{getFieldError('mother_name')}</p>
                    )}
                  </div>
                </>
              )}
              
              {/* Campos específicos para PF */}
              {formData.personType === 'individual' && (
                <div className="space-y-2">
                  <Label htmlFor="mother_name">Nome da Mãe</Label>
                  <Input
                    id="mother_name"
                    value={formData.mother_name || ''}
                    onChange={(e) => handleInputChange('mother_name', e.target.value)}
                    placeholder="Nome completo da mãe"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="street">Rua *</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  placeholder="Nome da rua"
                  className={hasFieldError('street') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('street') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('street')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="street_number">Número *</Label>
                <Input
                  id="street_number"
                  value={formData.street_number}
                  onChange={(e) => handleInputChange('street_number', e.target.value)}
                  placeholder="123"
                  className={hasFieldError('street_number') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('street_number') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('street_number')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="complementary">Complemento *</Label>
                <Input
                  id="complementary"
                  value={formData.complementary}
                  onChange={(e) => handleInputChange('complementary', e.target.value)}
                  placeholder="Apto, casa, etc."
                  className={hasFieldError('complementary') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('complementary') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('complementary')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                  placeholder="Nome do bairro"
                  className={hasFieldError('neighborhood') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('neighborhood') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('neighborhood')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Nome da cidade"
                  className={hasFieldError('city') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('city') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('city')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">Estado *</Label>
                <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                  <SelectTrigger className={hasFieldError('state') ? 'border-red-500 focus:border-red-500' : ''}>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasFieldError('state') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('state')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP *</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  placeholder="00000-000"
                  className={hasFieldError('zip_code') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('zip_code') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('zip_code')}</p>
                )}
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reference_point">Ponto de Referência *</Label>
                <Textarea
                  id="reference_point"
                  value={formData.reference_point}
                  onChange={(e) => handleInputChange('reference_point', e.target.value)}
                  placeholder="Próximo ao shopping, farmácia, etc."
                  className={hasFieldError('reference_point') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('reference_point') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('reference_point')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dados Bancários */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Bancários</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="holder_name">Nome do Titular *</Label>
                <Input
                  id="holder_name"
                  value={formData.holder_name}
                  onChange={(e) => handleInputChange('holder_name', e.target.value)}
                  placeholder="Nome completo do titular"
                  className={hasFieldError('holder_name') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('holder_name') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('holder_name')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bank">Banco *</Label>
                <Select value={formData.bank} onValueChange={(value) => handleInputChange('bank', value)}>
                  <SelectTrigger className={hasFieldError('bank') ? 'border-red-500 focus:border-red-500' : ''}>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasFieldError('bank') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('bank')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="branch_number">Agência *</Label>
                <Input
                  id="branch_number"
                  value={formData.branch_number}
                  onChange={(e) => handleInputChange('branch_number', e.target.value)}
                  placeholder="0000"
                  className={hasFieldError('branch_number') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('branch_number') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('branch_number')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="branch_check_digit">Dígito da Agência *</Label>
                <Input
                  id="branch_check_digit"
                  value={formData.branch_check_digit || ''}
                  onChange={(e) => handleInputChange('branch_check_digit', e.target.value)}
                  placeholder="0"
                  maxLength={1}
                  className={hasFieldError('branch_check_digit') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('branch_check_digit') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('branch_check_digit')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account_number">Conta *</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => handleInputChange('account_number', e.target.value)}
                  placeholder="00000000"
                  className={hasFieldError('account_number') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('account_number') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('account_number')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account_check_digit">Dígito *</Label>
                <Input
                  id="account_check_digit"
                  value={formData.account_check_digit}
                  onChange={(e) => handleInputChange('account_check_digit', e.target.value)}
                  placeholder="0"
                  maxLength={1}
                  className={hasFieldError('account_check_digit') ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {hasFieldError('account_check_digit') && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError('account_check_digit')}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account_type">Tipo de Conta *</Label>
                <Select value={formData.account_type} onValueChange={(value: 'checking' | 'savings') => handleInputChange('account_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Conta Corrente</SelectItem>
                    <SelectItem value="savings">Conta Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Botões de ação fixos na parte inferior */}
          <div className="border-t p-4 md:p-6 bg-white">
            <div className="flex flex-col md:flex-row md:justify-end gap-2 md:space-x-2 md:gap-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1 md:flex-none">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 md:flex-none">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Configurar Recebimento
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecipientSetupModal;