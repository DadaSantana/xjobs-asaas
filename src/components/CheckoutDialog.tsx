import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Check } from 'lucide-react';
import { Plan } from '@/types/plan';
import { createSubscription } from '@/services/planService';
import { useToast } from '@/hooks/use-toast';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
}

export function CheckoutDialog({ open, onOpenChange, plan }: CheckoutDialogProps) {
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCheckout = async () => {
    if (!plan) return;

    setLoading(true);
    try {
      const result = await createSubscription(plan.id);
      
      // Se houver URL de checkout, abrir em nova aba
      if (result.checkoutUrl) {
        setCheckoutUrl(result.checkoutUrl);
        window.open(result.checkoutUrl, '_blank');
        
        toast({
          title: 'Checkout iniciado',
          description: 'Complete o pagamento na janela aberta',
        });
      } else {
        // Redirecionar para área de planos
        toast({
          title: 'Assinatura criada',
          description: 'Sua assinatura foi criada com sucesso!',
        });
        
        setTimeout(() => {
          window.location.href = '/freelancer/meus-planos';
        }, 2000);
      }
    } catch (error: any) {
      console.error('Erro ao criar assinatura:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar assinatura',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCheckoutUrl(null);
    onOpenChange(false);
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Assinatura</DialogTitle>
          <DialogDescription>
            Você está prestes a assinar o plano {plan.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumo do plano */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">{plan.name}</span>
              <span className="text-2xl font-bold text-blue-600">
                R$ {(plan.price / 100).toFixed(2)}
                <span className="text-sm text-gray-500">/mês</span>
              </span>
            </div>

            {plan.description && (
              <p className="text-sm text-gray-600">{plan.description}</p>
            )}

            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>
                  {plan.messageLimit === null
                    ? 'Mensagens ilimitadas'
                    : `${plan.messageLimit} mensagens por projeto`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>
                  {plan.likeLimit === null
                    ? 'Curtidas ilimitadas'
                    : `${plan.likeLimit} curtidas por mês`}
                </span>
              </div>
              {plan.features?.filter(f => f.enabled).map((feature) => (
                <div key={feature.id} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Informações importantes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Informações importantes:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Cobrança recorrente mensal</li>
              <li>Cancele quando quiser</li>
              <li>Pagamento via PIX ou Cartão de Crédito</li>
              <li>Ativação imediata após pagamento</li>
            </ul>
          </div>

          {checkoutUrl && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 mb-2">
                Uma janela de pagamento foi aberta. Complete o pagamento para ativar sua assinatura.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(checkoutUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Reabrir página de pagamento
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar Assinatura'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

