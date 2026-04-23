import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, DollarSign, Shield, QrCode, ExternalLink, CheckCircle, Edit, User } from 'lucide-react';
import { Project } from '@/types/project';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/hooks/redux';
import { PaymentData, validatePaymentData, formatCPF, formatPhone, cleanDocument } from '@/types/paymentData';
import { calculateSplit, formatCurrency } from '@/services/splitService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface ProjectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onPaymentSuccess?: () => void;
}

const ProjectPaymentModal: React.FC<ProjectPaymentModalProps> = ({
  isOpen,
  onClose,
  project,
  onPaymentSuccess
}) => {
  const [step, setStep] = useState<'check' | 'form' | 'confirm' | 'processing'>('check');
  const [loading, setLoading] = useState(false);
  const [savedPaymentData, setSavedPaymentData] = useState<PaymentData | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentData>>({
    name: '',
    email: '',
    cpf: '',
    phone: '',
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const { toast } = useToast();
  const user = useAppSelector((state) => state.auth.user);

  // Verificar se o cliente já tem dados salvos
  useEffect(() => {
    const checkPaymentData = async () => {
      if (!isOpen || !user?.uid) return;

      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          if (userData.paymentData) {
            // Cliente já tem dados salvos
            setSavedPaymentData(userData.paymentData);
            setStep('confirm');
          } else {
            // Preencher com dados básicos do perfil
            setFormData({
              name: userData.name || user.displayName || '',
              email: userData.email || user.email || '',
              cpf: userData.document || '',
              phone: userData.phone || '',
            });
            setStep('form');
          }
        } else {
          setStep('form');
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setStep('form');
      } finally {
        setLoading(false);
      }
    };

    checkPaymentData();
  }, [isOpen, user]);

  const handleInputChange = (field: keyof PaymentData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setFormErrors([]);
  };

  const handleSaveAndContinue = async () => {
    // Validar dados
    const validation = validatePaymentData(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    if (!user?.uid) return;

    setLoading(true);
    try {
      // Salvar dados no Firestore
      const userRef = doc(db, 'users', user.uid);
      const paymentData: PaymentData = {
        name: formData.name!,
        email: formData.email!,
        cpf: cleanDocument(formData.cpf!),
        phone: cleanDocument(formData.phone!),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      };

      await updateDoc(userRef, {
        paymentData: paymentData,
        updatedAt: new Date(),
      });

      setSavedPaymentData(paymentData);
      setStep('confirm');
      
      toast({
        title: 'Dados salvos!',
        description: 'Seus dados de pagamento foram salvos com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar dados. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditData = () => {
    if (savedPaymentData) {
      setFormData({
        name: savedPaymentData.name,
        email: savedPaymentData.email,
        cpf: formatCPF(savedPaymentData.cpf),
        phone: formatPhone(savedPaymentData.phone),
      });
    }
    setStep('form');
  };

  const handleConfirmPayment = async () => {
    if (!user || !savedPaymentData) return;

    setStep('processing');
    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      // Determinar valor com base na proposta selecionada
      const selectedLike = project.selectedFreelancerId
        ? (project.likes || []).find(l => l.freelancerId === project.selectedFreelancerId)
        : undefined;
      const firstLike = (project.likes && project.likes.length > 0) ? project.likes[0] : undefined;
      const baseAmount = (selectedLike?.proposedValue && selectedLike.proposedValue > 0)
        ? selectedLike.proposedValue
        : (firstLike?.proposedValue || project.budget?.max || 0);

      const requestData = {
        projectId: project.id,
        projectTitle: project.title,
        amount: baseAmount, // Valor do freelancer (90%)
        clientData: {
          name: savedPaymentData.name,
          email: savedPaymentData.email,
          cpf: savedPaymentData.cpf,
          phone: savedPaymentData.phone,
        },
        freelancerData: {
          freelancerId: project.selectedFreelancerId || '',
          freelancerName: selectedLike?.freelancerName || firstLike?.freelancerName || '',
        },
      };

      const response = await fetch('https://us-central1-xjobs-a43d2.cloudfunctions.net/createAsaasCheckout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Erro ao criar checkout');
      }

      // Atualizar lastUsedAt
      await updateDoc(doc(db, 'users', user.uid), {
        'paymentData.lastUsedAt': new Date(),
      });

      // Abrir URL de pagamento se disponível
      if (result.invoiceUrl) {
        window.open(result.invoiceUrl, '_blank');
      }

      toast({
        title: 'Checkout criado!',
        description: 'Use PIX ou cartão de crédito para pagar',
      });

      onClose();
      
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }

    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar checkout",
        variant: "destructive"
      });
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return null;
  }

  // Calcular valores para exibição
  const selectedLike = project.selectedFreelancerId
    ? (project.likes || []).find(l => l.freelancerId === project.selectedFreelancerId)
    : undefined;
  const firstLike = (project.likes && project.likes.length > 0) ? project.likes[0] : undefined;
  const baseAmount = (selectedLike?.proposedValue && selectedLike.proposedValue > 0)
    ? selectedLike.proposedValue
    : (firstLike?.proposedValue || project.budget?.max || 0);
  
  const split = calculateSplit(baseAmount / 0.9);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Pagamento da Garantia
            </DialogTitle>
            <DialogDescription>
              {step === 'form' && 'Preencha seus dados para prosseguir com o pagamento'}
              {step === 'confirm' && 'Confirme seus dados e prossiga para o pagamento'}
              {step === 'processing' && 'Processando seu pagamento...'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-6">
          {/* Resumo do Projeto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Projeto: {project.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Valor do Projeto</span>
                <span className="font-medium">{formatCurrency(baseAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Taxa da Plataforma (10%)</span>
                <span className="font-medium">{formatCurrency(split.platformFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-lg font-semibold">Total a Pagar</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(split.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Etapa: Verificando */}
          {step === 'check' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Verificando seus dados...</span>
            </div>
          )}

          {/* Etapa: Formulário */}
          {step === 'form' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Seus Dados
                </CardTitle>
                <CardDescription>
                  Preencha seus dados para identificação no pagamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <ul className="list-disc list-inside text-sm">
                        {formErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="João Silva"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="joao@email.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => {
                        const formatted = formatCPF(e.target.value);
                        handleInputChange('cpf', formatted);
                      }}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        handleInputChange('phone', formatted);
                      }}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveAndContinue}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Salvar e Continuar
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Etapa: Confirmação */}
          {step === 'confirm' && savedPaymentData && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Seus Dados
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditData}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-gray-50 p-4 rounded-lg">
                    <div>
                      <span className="text-gray-600">Nome:</span>
                      <p className="font-medium">{savedPaymentData.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium">{savedPaymentData.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">CPF:</span>
                      <p className="font-medium">{formatCPF(savedPaymentData.cpf)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Telefone:</span>
                      <p className="font-medium">{formatPhone(savedPaymentData.phone)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Formas de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center p-4 border-2 rounded-lg bg-green-50 border-green-200">
                      <QrCode className="h-8 w-8 text-green-600 mb-2" />
                      <span className="font-medium">PIX</span>
                      <span className="text-xs text-gray-600">Aprovação instantânea</span>
                    </div>
                    <div className="flex flex-col items-center p-4 border-2 rounded-lg bg-blue-50 border-blue-200">
                      <CreditCard className="h-8 w-8 text-blue-600 mb-2" />
                      <span className="font-medium">Cartão</span>
                      <span className="text-xs text-gray-600">Aprovação imediata</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Pagamento Seguro</strong>
                  <p className="text-sm mt-1">
                    Seus dados estão protegidos e o valor ficará retido até a conclusão do projeto.
                  </p>
                </AlertDescription>
              </Alert>

            </>
          )}

          {/* Etapa: Processando */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
              <p className="text-lg font-medium">Criando checkout...</p>
              <p className="text-sm text-gray-600">Por favor, aguarde</p>
            </div>
          )}
        </div>
        </div>

        {/* Rodapé fixo com os botões de ação */}
        {step === 'confirm' && (
          <div className="flex-shrink-0 flex gap-3 px-6 py-4 border-t bg-background">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="lg"
              disabled={loading}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Prosseguir para Pagamento
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProjectPaymentModal;
