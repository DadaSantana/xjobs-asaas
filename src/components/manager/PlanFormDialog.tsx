import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Palette } from 'lucide-react';
import { Plan, CreatePlanInput, UpdatePlanInput, PlanFeature } from '@/types/plan';
import { getCategoryLabel } from '@/services/planService';

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePlanInput | UpdatePlanInput) => Promise<void>;
  plan?: Plan; // Se fornecido, modo edição
  loading?: boolean;
}

const defaultFeatures: PlanFeature[] = [
  { id: '1', label: 'Perfil profissional completo', enabled: true },
  { id: '2', label: 'Portfolio ilimitado', enabled: true },
  { id: '3', label: 'Suporte via chat', enabled: true },
];

export function PlanFormDialog({ open, onOpenChange, onSubmit, plan, loading = false }: PlanFormDialogProps) {
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    price: '',
    category: 1,
    messageLimit: '',
    likeLimit: '',
    features: defaultFeatures,
    cardStyle: {
      highlighted: false,
      badge: { text: '', bgColor: '#10b981', textColor: '#ffffff' }
    }
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        description: plan.description || '',
        price: (plan.price / 100).toFixed(2),
        category: plan.category,
        messageLimit: plan.messageLimit?.toString() || '',
        likeLimit: plan.likeLimit?.toString() || '',
        features: plan.features || defaultFeatures,
        cardStyle: plan.cardStyle || {
          highlighted: false,
          badge: { text: '', bgColor: '#10b981', textColor: '#ffffff' }
        }
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        category: 1,
        messageLimit: '',
        likeLimit: '',
        features: defaultFeatures,
        cardStyle: {
          highlighted: false,
          badge: { text: '', bgColor: '#10b981', textColor: '#ffffff' }
        }
      });
    }
  }, [plan, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Validações
      if (!formData.name.trim()) {
        throw new Error('Nome do plano é obrigatório');
      }

      const priceValue = parseFloat(formData.price.replace(',', '.'));
      if (isNaN(priceValue) || priceValue <= 0) {
        throw new Error('Preço inválido');
      }

      const messageLimitValue = formData.messageLimit === '' ? null : parseInt(formData.messageLimit);
      const likeLimitValue = formData.likeLimit === '' ? null : parseInt(formData.likeLimit);

      if (messageLimitValue !== null && (isNaN(messageLimitValue) || messageLimitValue < 0)) {
        throw new Error('Limite de mensagens inválido');
      }

      if (likeLimitValue !== null && (isNaN(likeLimitValue) || likeLimitValue < 0)) {
        throw new Error('Limite de curtidas inválido');
      }

      const data: CreatePlanInput | UpdatePlanInput = {
        ...(plan ? { id: plan.id } : {}),
        name: formData.name,
        description: formData.description,
        price: Math.round(priceValue * 100), // Converter para centavos
        category: formData.category,
        messageLimit: messageLimitValue,
        likeLimit: likeLimitValue,
        features: formData.features,
        cardStyle: formData.cardStyle
      };

      await onSubmit(data as any);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar plano');
    }
  };

  const addFeature = () => {
    setFormData({
      ...formData,
      features: [
        ...formData.features,
        { id: Date.now().toString(), label: '', enabled: true }
      ]
    });
  };

  const updateFeature = (id: string, updates: Partial<PlanFeature>) => {
    setFormData({
      ...formData,
      features: formData.features.map((f: PlanFeature) =>
        f.id === id ? { ...f, ...updates } : f
      )
    });
  };

  const removeFeature = (id: string) => {
    setFormData({
      ...formData,
      features: formData.features.filter((f: PlanFeature) => f.id !== id)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar Plano' : 'Criar Novo Plano'}</DialogTitle>
          <DialogDescription>
            {plan ? 'Atualize as informações do plano' : 'Preencha os dados para criar um novo plano de assinatura'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações Básicas</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Plano *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Plano Premium"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do plano..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Ciclo de Cobrança *</Label>
                <Select
                  value={formData.category.toString()}
                  onValueChange={(value) => setFormData({ ...formData, category: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Mensal</SelectItem>
                    <SelectItem value="3">Trimestral</SelectItem>
                    <SelectItem value="6">Semestral</SelectItem>
                    <SelectItem value="12">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Limites */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Limites</h3>
            <p className="text-sm text-gray-600">Deixe vazio para ilimitado</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="messageLimit">Mensagens por Projeto</Label>
                <Input
                  id="messageLimit"
                  type="number"
                  min="0"
                  value={formData.messageLimit}
                  onChange={(e) => setFormData({ ...formData, messageLimit: e.target.value })}
                  placeholder="Ilimitado"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="likeLimit">Curtidas por Mês</Label>
                <Input
                  id="likeLimit"
                  type="number"
                  min="0"
                  value={formData.likeLimit}
                  onChange={(e) => setFormData({ ...formData, likeLimit: e.target.value })}
                  placeholder="Ilimitado"
                />
              </div>
            </div>
          </div>

          {/* Features personalizáveis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recursos do Plano</h3>
              <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            <div className="space-y-2">
              {formData.features.map((feature: PlanFeature) => (
                <div key={feature.id} className="flex items-center gap-2">
                  <Input
                    value={feature.label}
                    onChange={(e) => updateFeature(feature.id, { label: e.target.value })}
                    placeholder="Descrição do recurso"
                  />
                  <Switch
                    checked={feature.enabled}
                    onCheckedChange={(checked) => updateFeature(feature.id, { enabled: checked })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFeature(feature.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Personalização do card */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Personalização do Card</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="highlighted">Plano em Destaque</Label>
                <Switch
                  id="highlighted"
                  checked={formData.cardStyle.highlighted}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      cardStyle: { ...formData.cardStyle, highlighted: checked }
                    })
                  }
                />
              </div>

              {formData.cardStyle.highlighted && (
                <div className="space-y-2">
                  <Label htmlFor="badgeText">Texto do Badge</Label>
                  <Input
                    id="badgeText"
                    value={formData.cardStyle.badge?.text || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cardStyle: {
                          ...formData.cardStyle,
                          badge: { ...formData.cardStyle.badge, text: e.target.value }
                        }
                      })
                    }
                    placeholder="Ex: MAIS POPULAR"
                  />
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : plan ? 'Atualizar' : 'Criar Plano'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

