/**
 * Página de Testes da Integração Asaas
 * Permite testar criação de checkout, verificação de status e cálculos de split
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { calculateSplit, formatCurrency } from '@/services/splitService';
import AsaasCheckout from '@/components/AsaasCheckout';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const TestAsaas = () => {
  const [testData, setTestData] = useState({
    projectTitle: 'Teste de Integração Asaas',
    amount: '1000',
    clientName: 'João Teste',
    clientEmail: 'joao@teste.com',
    clientCPF: '12345678900',
    clientPhone: '11999999999',
  });

  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const { toast } = useToast();

  // Calcular split baseado no valor
  const amount = parseFloat(testData.amount) || 0;
  const split = calculateSplit(amount / 0.9); // Calcula o total se amount for 90%

  const handleCreateCheckout = async () => {
    setLoading(true);
    try {
      // Simular chamada à Firebase Function
      const response = await fetch(
        'https://us-central1-xjobs-a43d2.cloudfunctions.net/createAsaasCheckout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Em produção, adicionar token de autenticação
            // 'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId: `test_${Date.now()}`,
            projectTitle: testData.projectTitle,
            amount: parseFloat(testData.amount),
            clientData: {
              name: testData.clientName,
              email: testData.clientEmail,
              cpf: testData.clientCPF,
              phone: testData.clientPhone,
            },
            freelancerData: {
              freelancerId: 'test_freelancer',
              freelancerName: 'Maria Freelancer',
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar checkout');
      }

      const data = await response.json();
      setCheckoutData(data);

      toast({
        title: 'Checkout criado!',
        description: 'Checkout do Asaas criado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar checkout',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearTest = () => {
    setCheckoutData(null);
    toast({
      title: 'Teste limpo',
      description: 'Pronto para um novo teste.',
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teste de Integração Asaas</h1>
        <p className="text-gray-600">
          Teste a criação de checkouts e pagamentos do Asaas em ambiente sandbox
        </p>
      </div>

      {/* Informações de Configuração */}
      <Alert>
        <AlertDescription>
          <strong>Ambiente: Sandbox (Homologação)</strong>
          <p className="text-sm mt-1">
            Esta página utiliza a chave de sandbox do Asaas para testes.
          </p>
        </AlertDescription>
      </Alert>

      {/* Cálculo de Split */}
      <Card>
        <CardHeader>
          <CardTitle>Cálculo de Split (10% Plataforma)</CardTitle>
          <CardDescription>
            Visualize como os valores são divididos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span className="font-medium">Valor do Freelancer (90%)</span>
              <span className="text-lg font-bold">{formatCurrency(split.freelancerAmount)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
              <span className="font-medium">Taxa da Plataforma (10%)</span>
              <span className="text-lg font-bold">{formatCurrency(split.platformFee)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="text-xl font-semibold">Total a Cobrar</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(split.totalAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {!checkoutData ? (
        /* Formulário de Teste */
        <Card>
          <CardHeader>
            <CardTitle>Criar Checkout de Teste</CardTitle>
            <CardDescription>
              Preencha os dados para criar um checkout de teste
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectTitle">Título do Projeto</Label>
                <Input
                  id="projectTitle"
                  value={testData.projectTitle}
                  onChange={(e) => setTestData({ ...testData, projectTitle: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="amount">Valor (R$) - Freelancer</Label>
                <Input
                  id="amount"
                  type="number"
                  value={testData.amount}
                  onChange={(e) => setTestData({ ...testData, amount: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="clientName">Nome do Cliente</Label>
                <Input
                  id="clientName"
                  value={testData.clientName}
                  onChange={(e) => setTestData({ ...testData, clientName: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="clientEmail">Email do Cliente</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={testData.clientEmail}
                  onChange={(e) => setTestData({ ...testData, clientEmail: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="clientCPF">CPF do Cliente</Label>
                <Input
                  id="clientCPF"
                  value={testData.clientCPF}
                  onChange={(e) => setTestData({ ...testData, clientCPF: e.target.value })}
                  maxLength={11}
                />
              </div>

              <div>
                <Label htmlFor="clientPhone">Telefone do Cliente</Label>
                <Input
                  id="clientPhone"
                  value={testData.clientPhone}
                  onChange={(e) => setTestData({ ...testData, clientPhone: e.target.value })}
                  maxLength={11}
                />
              </div>
            </div>

            <Button
              onClick={handleCreateCheckout}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando Checkout...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Criar Checkout de Teste
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Resultado do Checkout */
        <div className="space-y-6">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Checkout criado com sucesso!</strong>
              <p className="text-sm mt-1">ID: {checkoutData.paymentId}</p>
            </AlertDescription>
          </Alert>

          <AsaasCheckout
            paymentId={checkoutData.paymentId}
            totalAmount={checkoutData.totalAmount}
            platformFee={checkoutData.platformFee}
            freelancerAmount={checkoutData.freelancerAmount}
            pixQrCode={checkoutData.pixQrCode}
            pixPayload={checkoutData.pixPayload}
            pixExpirationDate={checkoutData.pixExpirationDate}
            invoiceUrl={checkoutData.invoiceUrl}
            dueDate={checkoutData.dueDate}
            onPaymentConfirmed={() => {
              toast({
                title: 'Pagamento Confirmado!',
                description: 'O teste foi concluído com sucesso.',
              });
            }}
          />

          <Button
            onClick={handleClearTest}
            variant="outline"
            className="w-full"
          >
            Limpar e Fazer Novo Teste
          </Button>
        </div>
      )}

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações de Teste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>Cartões de Teste (Sandbox):</strong>
            <ul className="list-disc list-inside mt-1 text-gray-600">
              <li>Aprovado: 5162306219378829</li>
              <li>Recusado: 5162308800158211</li>
              <li>CVV: qualquer | Validade: qualquer data futura</li>
            </ul>
          </div>
          <div className="pt-2">
            <strong>PIX de Teste:</strong>
            <p className="text-gray-600">
              Use o QR Code gerado ou o código copia e cola. Em sandbox, o pagamento é simulado
              automaticamente após alguns segundos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestAsaas;

