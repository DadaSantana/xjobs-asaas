import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Clock,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';

interface RecipientVerificationManagerProps {
  recipient: any;
  onRecipientUpdate?: (updatedRecipient: any) => void;
}

const RecipientVerificationManager: React.FC<RecipientVerificationManagerProps> = ({
  recipient,
  onRecipientUpdate
}) => {
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [kycLink, setKycLink] = useState<string | null>(null);
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const { toast } = useToast();

  // Verificar se o recipient precisa de verificação
  const needsVerification = recipient && (
    recipient.status !== 'active' && 
    !recipient.verified
  );

  // Verificar se há link de KYC salvo
  const savedKycLink = recipient?.kycLink;

  // Calcular tempo restante do link
  useEffect(() => {
    if (!linkExpiresAt && !savedKycLink?.expiresAt) return;

    const expirationTime = linkExpiresAt || savedKycLink?.expiresAt;
    if (!expirationTime) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiration = new Date(expirationTime).getTime();
      const difference = expiration - now;

      if (difference > 0) {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining('Expirado');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [linkExpiresAt, savedKycLink?.expiresAt]);

  // Gerar link de KYC
  const generateKycLink = async () => {
    try {
      setIsGeneratingLink(true);
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast({
          title: 'Erro',
          description: 'Usuário não autenticado',
          variant: 'destructive'
        });
        return;
      }

      const response = await fetch('https://us-central1-xjobs-a43d2.cloudfunctions.net/generateKycLinkV2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      const text = await response.text();
      console.log('Resposta do KYC link:', response.status, text);

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = JSON.parse(text);
        } catch {}

        throw new Error(errorData.error || 'Erro ao gerar link de verificação');
      }

      const result = JSON.parse(text);
      setKycLink(result.kycLink);
      setLinkExpiresAt(result.expiresAt);

      toast({
        title: 'Link gerado!',
        description: 'Link de verificação criado com sucesso. Válido por 20 minutos.',
      });

    } catch (error: any) {
      console.error('Erro ao gerar link de KYC:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao gerar link de verificação',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Verificar status do recipient
  const checkRecipientStatus = async () => {
    try {
      setIsCheckingStatus(true);
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast({
          title: 'Erro',
          description: 'Usuário não autenticado',
          variant: 'destructive'
        });
        return;
      }

      const response = await fetch('https://us-central1-xjobs-a43d2.cloudfunctions.net/updateRecipientVerification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      const text = await response.text();
      console.log('Resposta da verificação:', response.status, text);

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = JSON.parse(text);
        } catch {}

        throw new Error(errorData.error || 'Erro ao verificar status');
      }

      const result = JSON.parse(text);
      
      if (onRecipientUpdate) {
        onRecipientUpdate(result.recipient);
      }

      const isNowActive = result.recipient.status === 'active' || result.recipient.verified;
      
      toast({
        title: isNowActive ? 'Verificação concluída!' : 'Status atualizado',
        description: isNowActive 
          ? 'Seu recipient foi verificado com sucesso. Agora você pode receber transferências!'
          : 'Status do recipient atualizado.',
        variant: isNowActive ? 'default' : 'destructive'
      });

    } catch (error: any) {
      console.error('Erro ao verificar status:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao verificar status',
        variant: 'destructive'
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Abrir link de KYC
  const openKycLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Se não precisa de verificação, não mostrar o componente
  if (!needsVerification) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Recipient verificado!</strong> Você pode receber transferências normalmente.
        </AlertDescription>
      </Alert>
    );
  }

  const currentKycUrl = kycLink || savedKycLink?.url;
  const currentExpiresAt = linkExpiresAt || savedKycLink?.expiresAt;
  const isLinkExpired = currentExpiresAt && new Date(currentExpiresAt) < new Date();

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Shield className="h-5 w-5" />
          Verificação de Identidade Necessária
        </CardTitle>
        <CardDescription className="text-amber-700">
          Para receber transferências, você precisa completar a verificação de identidade (KYC) no Pagar.me.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Status atual */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            {recipient.status === 'registered' ? 'Aguardando Verificação' : 'Não Verificado'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={checkRecipientStatus}
            disabled={isCheckingStatus}
            className="text-xs"
          >
            {isCheckingStatus ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Verificar Status
          </Button>
        </div>

        {/* Link de KYC existente */}
        {currentKycUrl && !isLinkExpired && (
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Link de verificação ativo</strong>
                  <br />
                  <span className="text-sm">
                    Expira em: {timeRemaining}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => openKycLink(currentKycUrl)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Abrir Verificação
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Link expirado */}
        {currentKycUrl && isLinkExpired && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Link de verificação expirado</strong>
              <br />
              <span className="text-sm">
                Gere um novo link para continuar a verificação.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Botão para gerar novo link */}
        {(!currentKycUrl || isLinkExpired) && (
          <div className="space-y-3">
            <div className="text-sm text-amber-700">
              <p><strong>O que você precisa fazer:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Clique em "Gerar Link de Verificação"</li>
                <li>Complete o processo de verificação no Pagar.me</li>
                <li>Aguarde a aprovação (geralmente alguns minutos)</li>
                <li>Volte aqui e clique em "Verificar Status"</li>
              </ul>
            </div>
            
            <Button
              onClick={generateKycLink}
              disabled={isGeneratingLink}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {isGeneratingLink ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              {isGeneratingLink ? 'Gerando Link...' : 'Gerar Link de Verificação'}
            </Button>
          </div>
        )}

        {/* Informações adicionais */}
        <div className="text-xs text-amber-600 bg-amber-100 p-3 rounded-md">
          <p><strong>Importante:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>O link de verificação expira em 20 minutos</li>
            <li>Você pode gerar um novo link quantas vezes precisar</li>
            <li>A verificação é obrigatória para receber transferências</li>
            <li>O processo é seguro e realizado pelo Pagar.me</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecipientVerificationManager;
