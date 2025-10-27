import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Edit, Trash2, Star } from 'lucide-react';
import { Plan } from '@/types/plan';
import { getCategoryLabel } from '@/services/planService';

interface PlanCardProps {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  isAdmin?: boolean;
}

export function PlanCard({ plan, onEdit, onDelete, isAdmin = false }: PlanCardProps) {
  const isHighlighted = plan.cardStyle?.highlighted || false;
  const badge = plan.cardStyle?.badge;

  return (
    <Card
      className={`relative flex flex-col h-full transition-all duration-300 hover:shadow-xl border-2 ${
        isHighlighted
          ? 'border-blue-500 hover:border-blue-600 shadow-lg'
          : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      {isHighlighted && badge?.text && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge
            className="px-4 py-1 text-sm font-semibold"
            style={{
              backgroundColor: badge.bgColor,
              color: badge.textColor
            }}
          >
            <Star className="h-3 w-3 mr-1" />
            {badge.text}
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-6 pt-8">
        <div className="flex items-center justify-between mb-2">
          <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
            {plan.status === 'active' ? 'Ativo' : 'Inativo'}
          </Badge>
          <Badge variant="outline">{getCategoryLabel(plan.category)}</Badge>
        </div>

        <CardTitle className={`text-3xl font-bold ${isHighlighted ? 'text-blue-700' : 'text-gray-900'}`}>
          {plan.name}
        </CardTitle>

        {plan.description && (
          <p className="text-gray-600 text-sm mt-2">{plan.description}</p>
        )}
      </CardHeader>

      <CardContent className="text-center flex-1 flex flex-col justify-between">
        <div className="mb-6">
          <div className={`text-5xl font-bold mb-2 ${isHighlighted ? 'text-blue-600' : 'text-gray-900'}`}>
            R$ {(plan.price / 100).toFixed(2)}
            <span className="text-lg text-gray-500">/mês</span>
          </div>
        </div>

        {/* Recursos do plano */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span className="font-medium">
              {plan.messageLimit === null ? 'Mensagens ilimitadas' : `${plan.messageLimit} mensagens/projeto`}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span className="font-medium">
              {plan.likeLimit === null ? 'Curtidas ilimitadas' : `${plan.likeLimit} curtidas/mês`}
            </span>
          </div>
          {plan.features?.filter(f => f.enabled).map((feature) => (
            <div key={feature.id} className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="font-medium">{feature.label}</span>
            </div>
          ))}
        </div>

        {/* Estatísticas */}
        <div className="text-sm text-gray-600 border-t pt-4">
          <div className="flex justify-between">
            <span>Assinantes:</span>
            <span className="font-semibold">{plan.subscribers || 0}</span>
          </div>
        </div>
      </CardContent>

      {isAdmin && (
        <CardFooter className="flex gap-2 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(plan)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={() => onDelete(plan)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

