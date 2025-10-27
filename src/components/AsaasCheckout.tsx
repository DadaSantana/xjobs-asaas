/**
 * Componente para exibir checkout do Asaas
 * Mostra QR Code PIX, permite pagamento com cartão e monitora status
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  Clock,
  CreditCard,
  QrCode,
  Copy,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/services/splitService';

interface AsaasCheckoutProps {
  paymentId: string;
  totalAmount: number;
  platformFee: number;
  freelancerAmount: number;
  pixQrCode?: string; // Base64 da imagem QR Code
  pixPayload?: string; // String do PIX copia e cola
  pixExpirationDate?: string;
  invoiceUrl?: string;
  dueDate?: string;
  onPaymentConfirmed?: () => void;
}

export const AsaasCheckout: React.FC<AsaasCheckoutProps> = ({
  paymentId,
  totalAmount,
  platformFee,
  freelancerAmount,
  pixQrCode,
  pixPayload,
  pixExpirationDate,
  invoiceUrl,
  dueDate,
  onPaymentConfirmed,
}) => {
  const [paymentStatus, setPaymentStatus] = useState<string>('PENDING');
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Polling para verificar status do pagamento
  useEffect(() => {
    if (paymentStatus === 'CONFIRMED' || paymentStatus === 'RECEIVED') {
      return; // Já foi pago, não precisa mais verificar
    }

    const checkStatus = async () => {
      try {
        setIsChecking(true);
        const response = await fetch(
          `https://us-central1-xjobs-a43d2.cloudfunctions.net/checkAsaasPaymentStatus?paymentId=${paymentId}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.status !== paymentStatus) {
            setPaymentStatus(data.status);

            if (data.status === 'CONFIRMED' || data.status === 'RECEIVED') {
              toast({
                title: 'Pagamento Confirmado!',
                description: 'Seu pagamento foi confirmado com sucesso.',
              });

              if (onPaymentConfirmed) {
                onPaymentConfirmed();
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Verificar a cada 5 segundos
    const interval = setInterval(checkStatus, 5000);

    // Verificar imediatamente também
    checkStatus();

    return () => clearInterval(interval);
  }, [paymentId, paymentStatus, onPaymentConfirmed, toast]);

  const handleCopyPixCode = () => {
    if (pixPayload) {
      navigator.clipboard.writeText(pixPayload);
      setCopied(true);
      toast({
        title: 'Código copiado!',
        description: 'Cole no aplicativo do seu banco para pagar.',
      });

      setTimeout(() => setCopied(false), 3000);
    }
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'CONFIRMED':
      case 'RECEIVED':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Pago
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4 mr-1" />
            Aguardando Pagamento
          </Badge>
        );
      case 'OVERDUE':
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertCircle className="w-4 h-4 mr-1" />
            Vencido
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {paymentStatus}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Status do Pagamento</CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          {isChecking && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando status...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo de Valores */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Pagamento</CardTitle>
          <CardDescription>Detalhamento dos valores</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Valor do Projeto (Freelancer)</span>
            <span className="font-medium">{formatCurrency(freelancerAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Taxa da Plataforma (10%)</span>
            <span className="font-medium">{formatCurrency(platformFee)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total a Pagar</span>
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAmount)}
            </span>
          </div>
          {dueDate && (
            <div className="text-xs text-gray-500 text-center pt-2">
              Vencimento: {new Date(dueDate).toLocaleDateString('pt-BR')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PIX */}
      {pixQrCode && pixPayload && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Pagar com PIX
            </CardTitle>
            <CardDescription>
              Escaneie o QR Code ou copie o código PIX
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <img
                  src={`data:image/png;base64,${pixQrCode}`}
                  alt="QR Code PIX"
                  className="w-64 h-64"
                />
              </div>
            </div>

            {/* Código PIX Copia e Cola */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Código PIX (Copia e Cola)</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 border rounded-lg p-3 font-mono text-xs break-all">
                  {pixPayload}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPixCode}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Instruções */}
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Como pagar:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Abra o aplicativo do seu banco</li>
                  <li>Escolha pagar com PIX</li>
                  <li>Escaneie o QR Code ou cole o código acima</li>
                  <li>Confirme o pagamento</li>
                </ol>
              </AlertDescription>
            </Alert>

            {pixExpirationDate && (
              <div className="text-xs text-center text-gray-500">
                PIX válido até: {new Date(pixExpirationDate).toLocaleString('pt-BR')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cartão de Crédito */}
      {invoiceUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pagar com Cartão de Crédito
            </CardTitle>
            <CardDescription>
              Complete o pagamento no site do Asaas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => window.open(invoiceUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Página de Pagamento
            </Button>
            <p className="text-xs text-gray-500 text-center mt-3">
              Você será redirecionado para completar o pagamento com segurança
            </p>
          </CardContent>
        </Card>
      )}

      {/* Alerta de Confirmação */}
      {(paymentStatus === 'CONFIRMED' || paymentStatus === 'RECEIVED') && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>Pagamento Confirmado!</strong>
            <p className="mt-1">
              Seu pagamento foi confirmado e o projeto será iniciado em breve.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de Pendente */}
      {paymentStatus === 'PENDING' && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Aguardando confirmação do pagamento. O status será atualizado automaticamente.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AsaasCheckout;

