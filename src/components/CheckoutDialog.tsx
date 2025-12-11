import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink, Check, AlertCircle, ChevronRight, User, FileText, CreditCard } from 'lucide-react';
import { Plan } from '@/types/plan';
import { createSubscription, getSubscriptionPaymentUrl } from '@/services/planService';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
}

interface UserData {
  phone?: string;
  document?: string;
  name?: string;
  email?: string;
}

type Step = 'data' | 'review' | 'payment';

export function CheckoutDialog({ open, onOpenChange, plan }: CheckoutDialogProps) {
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [needsData, setNeedsData] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('data');
  const [userData, setUserData] = useState<UserData>({});
  const [formData, setFormData] = useState({
    phone: '',
    document: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  // Verificar dados do usuário quando o dialog abrir
  useEffect(() => {
    if (open && plan) {
      checkUserData();
    } else if (!open) {
      // Reset ao fechar
      setCurrentStep('data');
      setCheckoutUrl(null);
      setErrors([]);
    }
  }, [open, plan]);

  const checkUserData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        const phone = data.phone || '';
        const document = data.document || '';
        
        setUserData({
          phone,
          document,
          name: data.name || data.displayName || '',
          email: data.email || user.email || '',
        });

        // Verificar se precisa de dados
        const cleanPhone = phone.replace(/\D/g, '');
        const cleanDocument = document.replace(/\D/g, '');
        
        const needsPhone = !cleanPhone || cleanPhone.length < 10;
        const needsDocument = !cleanDocument || (cleanDocument.length !== 11 && cleanDocument.length !== 14);
        
        if (needsPhone || needsDocument) {
          setNeedsData(true);
          setCurrentStep('data');
          setFormData({
            phone: phone || '',
            document: document || '',
          });
        } else {
          setNeedsData(false);
          setCurrentStep('review');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar dados do usuário:', error);
    }
  };

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  };

  const validateDocument = (document: string): boolean => {
    const cleaned = document.replace(/\D/g, '');
    return cleaned.length === 11 || cleaned.length === 14; // CPF ou CNPJ
  };

  const formatPhone = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  const formatDocument = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const newErrors: string[] = [];
    
    if (!validatePhone(formData.phone)) {
      newErrors.push('Telefone inválido. Informe um telefone com DDD (ex: (11) 99999-9999)');
    }
    
    if (!validateDocument(formData.document)) {
      newErrors.push('CPF/CNPJ inválido. Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    // Salvar dados no perfil do usuário
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const cleanPhone = formData.phone.replace(/\D/g, '');
      const cleanDocument = formData.document.replace(/\D/g, '');

      await updateDoc(userRef, {
        phone: cleanPhone,
        document: cleanDocument,
        updatedAt: new Date(),
      });

      setUserData({
        ...userData,
        phone: cleanPhone,
        document: cleanDocument,
      });
      setNeedsData(false);
      setCurrentStep('review');
      
      toast({
        title: 'Dados atualizados',
        description: 'Seus dados foram salvos com sucesso!',
      });
    } catch (error: any) {
      console.error('Erro ao salvar dados:', error);
      setErrors(['Erro ao salvar dados. Tente novamente.']);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 'data') {
      setCurrentStep('review');
    } else if (currentStep === 'review') {
      setCurrentStep('payment');
      handleCheckout();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'review') {
      if (needsData) {
        setCurrentStep('data');
      } else {
        // Se não precisa de dados, não pode voltar
        return;
      }
    } else if (currentStep === 'payment') {
      setCurrentStep('review');
    }
  };

  const handleCheckout = async () => {
    if (!plan) return;

    setLoading(true);
    try {
      const result = await createSubscription(plan.id);
      
      // Se houver URL de checkout, abrir em nova aba
      if (result.checkoutUrl) {
        setCheckoutUrl(result.checkoutUrl);
        setCurrentStep('payment');
        
        // Criar link temporário e clicar nele - mais confiável que window.open
        const link = document.createElement('a');
        link.href = result.checkoutUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: 'Checkout iniciado',
          description: 'Complete o pagamento na janela aberta. Seu plano será ativado automaticamente após confirmação do pagamento.',
        });
      } else {
        // Se não houver URL, tentar buscar após alguns segundos
        setCurrentStep('payment');
        toast({
          title: 'Assinatura criada',
          description: 'Sua assinatura foi criada. Buscando URL de pagamento...',
        });
        
        // Tentar buscar a URL após 3 segundos (tempo para webhook processar)
        setTimeout(async () => {
          try {
            const paymentUrl = await getSubscriptionPaymentUrl(result.subscriptionId);
            if (paymentUrl) {
              setCheckoutUrl(paymentUrl);
              
              // Abrir automaticamente
              const link = document.createElement('a');
              link.href = paymentUrl;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              toast({
                title: 'URL encontrada!',
                description: 'Abrindo página de pagamento...',
              });
            }
          } catch (error) {
            console.error('Erro ao buscar URL de pagamento:', error);
          }
        }, 3000);
      }
    } catch (error: any) {
      console.error('Erro ao criar assinatura:', error);
      
      // Verificar se o erro é relacionado a dados faltantes
      const errorMessage = error.message || '';
      if (errorMessage.includes('telefone') || errorMessage.includes('celular') || errorMessage.includes('inválido')) {
        setNeedsData(true);
        setCurrentStep('data');
        setErrors(['Por favor, verifique e atualize seus dados de contato.']);
      } else {
        setCurrentStep('review');
      }
      
      toast({
        title: 'Erro',
        description: errorMessage || 'Erro ao criar assinatura',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCheckoutUrl(null);
    setCurrentStep(needsData ? 'data' : 'review');
    onOpenChange(false);
  };

  if (!plan) return null;

  // Definir steps baseado se precisa de dados
  const steps = needsData 
    ? [
        { id: 'data' as Step, label: 'Dados', icon: User },
        { id: 'review' as Step, label: 'Revisão', icon: FileText },
        { id: 'payment' as Step, label: 'Pagamento', icon: CreditCard },
      ]
    : [
        { id: 'review' as Step, label: 'Revisão', icon: FileText },
        { id: 'payment' as Step, label: 'Pagamento', icon: CreditCard },
      ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const canGoNext = currentStepIndex < steps.length - 1;
  const canGoPrevious = currentStepIndex > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirmar Assinatura</DialogTitle>
          <DialogDescription>
            Você está prestes a assinar o plano {plan.name}
          </DialogDescription>
        </DialogHeader>

        {/* Steps Indicator */}
        <div className="flex items-center justify-between py-4 border-b">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="space-y-4 py-4 min-h-[300px]">
          {/* Step 1: Dados Pessoais */}
          {currentStep === 'data' && needsData && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Precisamos de algumas informações para processar sua assinatura.
                </AlertDescription>
              </Alert>

              <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(e); }} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Complete seus dados
                  </h4>
                  
                  {errors.length > 0 && (
                    <div className="mb-4 space-y-1">
                      {errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-600">{error}</p>
                      ))}
                    </div>
                  )}

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone/Celular *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setFormData({ ...formData, phone: formatted });
                  }}
                  maxLength={15}
                  required
                />
                <p className="text-xs text-gray-500">Formato: (DDD) 99999-9999</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">CPF/CNPJ *</Label>
                <Input
                  id="document"
                  type="text"
                  placeholder="000.000.000-00"
                  value={formData.document}
                  onChange={(e) => {
                    const formatted = formatDocument(e.target.value);
                    setFormData({ ...formData, document: formatted });
                  }}
                  maxLength={18}
                  required
                />
                <p className="text-xs text-gray-500">CPF (11 dígitos) ou CNPJ (14 dígitos)</p>
              </div>

                </div>
              </form>
            </div>
          )}

          {/* Step 2: Revisão do Plano */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              {/* Resumo do plano */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">{plan.name}</span>
                  <span className="text-3xl font-extrabold text-blue-600">
                    R$ {(plan.price / 100).toFixed(2)}
                    <span className="text-sm text-gray-500 font-normal">/mês</span>
                  </span>
                </div>

                {plan.description && (
                  <p className="text-sm text-gray-700">{plan.description}</p>
                )}

                <div className="border-t border-blue-200 pt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="font-medium">
                      {plan.messageLimit === null
                        ? 'Mensagens ilimitadas'
                        : `${plan.messageLimit} mensagens por projeto`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="font-medium">
                      {plan.likeLimit === null
                        ? 'Curtidas ilimitadas'
                        : `${plan.likeLimit} curtidas por mês`}
                    </span>
                  </div>
                  {plan.features?.filter(f => f.enabled).map((feature) => (
                    <div key={feature.id} className="flex items-center gap-3 text-sm">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="font-medium">{feature.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Informações importantes */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Informações importantes
                </h4>
                <ul className="text-sm text-blue-800 space-y-2 list-none">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Cobrança recorrente mensal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Cancele quando quiser</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Pagamento via PIX ou Cartão de Crédito</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Ativação imediata após pagamento</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 3: Pagamento */}
          {currentStep === 'payment' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                  <p className="text-gray-600">Processando sua assinatura...</p>
                </div>
              ) : checkoutUrl ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900 mb-2">Checkout iniciado!</h4>
                    <p className="text-sm text-green-800 mb-2">
                      Uma janela de pagamento foi aberta. Complete o pagamento para ativar sua assinatura.
                    </p>
                    <p className="text-xs text-green-700 mb-4 bg-green-100 p-2 rounded">
                      ⚠️ <strong>Importante:</strong> Seu plano será ativado automaticamente após a confirmação do pagamento. Você receberá uma notificação quando isso acontecer.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (checkoutUrl) {
                          // Criar link temporário e clicar - mais confiável
                          const link = document.createElement('a');
                          link.href = checkoutUrl;
                          link.target = '_blank';
                          link.rel = 'noopener noreferrer';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir página de pagamento
                    </Button>
                    {checkoutUrl && (
                      <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline text-center block mt-2"
                        onClick={(e) => {
                          // Garantir que abre em nova aba
                          e.preventDefault();
                          const link = document.createElement('a');
                          link.href = checkoutUrl;
                          link.target = '_blank';
                          link.rel = 'noopener noreferrer';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        Ou clique aqui se o botão não funcionar
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center space-y-4">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-2">Preparando pagamento...</h4>
                    <p className="text-sm text-yellow-800 mb-4">
                      Sua assinatura foi criada com sucesso. A URL de pagamento estará disponível em alguns instantes.
                    </p>
                    <p className="text-xs text-yellow-700">
                      Você pode fechar esta janela e verificar seus planos em alguns minutos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer com botões de navegação */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          
          {canGoPrevious && (
            <Button
              variant="outline"
              onClick={handlePreviousStep}
              disabled={loading}
            >
              Voltar
            </Button>
          )}
          
          {currentStep === 'data' && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                handleFormSubmit(e as any);
              }}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  Continuar
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
          
          {currentStep === 'review' && (
            <Button
              onClick={handleNextStep}
              disabled={loading}
              className="flex-1"
            >
              Confirmar e Pagar
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

