import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Edit, Trash2, Star, Users, MessageSquare, Heart } from 'lucide-react';
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
  const bgColor = plan.cardStyle?.bgColor;
  const borderColor = plan.cardStyle?.borderColor;
  const textColor = plan.cardStyle?.textColor;
  const accentColor = plan.cardStyle?.accentColor;

  // Estilos customizados do plano ou padrão
  const cardBgStyle = bgColor ? { backgroundColor: bgColor } : {};
  const cardBorderStyle = borderColor ? { borderColor: borderColor } : {};
  const titleColor = textColor || (isHighlighted ? 'text-blue-700' : 'text-gray-900');
  const priceColor = accentColor || (isHighlighted ? 'text-blue-600' : 'text-gray-900');

  return (
    <Card
      className={`relative flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] overflow-hidden group ${
        isHighlighted
          ? 'border-2 border-blue-500 hover:border-blue-600 shadow-xl bg-gradient-to-br from-blue-50 to-white'
          : 'border-2 border-gray-200 hover:border-blue-300 shadow-md bg-white'
      }`}
      style={{
        ...cardBgStyle,
        ...cardBorderStyle,
      }}
    >
      {/* Badge destacado */}
      {isHighlighted && badge?.text && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <Badge
            className="px-4 py-1.5 text-sm font-bold shadow-lg animate-pulse"
            style={{
              backgroundColor: badge.bgColor,
              color: badge.textColor
            }}
          >
            <Star className="h-3.5 w-3.5 mr-1.5 fill-current" />
            {badge.text}
          </Badge>
        </div>
      )}

      {/* Gradiente decorativo no topo */}
      {isHighlighted && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600" />
      )}

      <CardHeader className={`text-center pb-4 ${isHighlighted ? 'pt-10' : 'pt-6'} relative`}>
        {/* Badges de status e categoria */}
        <div className="flex items-center justify-between mb-4">
          <Badge 
            variant={plan.status === 'active' ? 'default' : 'secondary'}
            className="text-xs font-semibold px-3 py-1"
          >
            {plan.status === 'active' ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Ativo
              </span>
            ) : (
              'Inativo'
            )}
          </Badge>
          <Badge 
            variant="outline" 
            className="text-xs font-semibold px-3 py-1 border-2"
          >
            {getCategoryLabel(plan.category)}
          </Badge>
        </div>

        {/* Título do plano */}
        <CardTitle className={`text-2xl font-extrabold mb-2 ${titleColor} transition-colors`}>
          {plan.name}
        </CardTitle>

        {/* Descrição */}
        {plan.description && (
          <p className="text-gray-600 text-sm mt-2 line-clamp-2 min-h-[2.5rem]">
            {plan.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="text-center flex-1 flex flex-col justify-between px-6">
        {/* Preço */}
        <div className="mb-6">
          <div className={`text-4xl font-extrabold mb-1 ${priceColor} transition-colors`}>
            R$ {(plan.price / 100).toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 font-medium">
            por mês
          </div>
          {plan.originalPrice && plan.originalPrice > plan.price && (
            <div className="mt-2">
              <span className="text-xs text-gray-400 line-through">
                R$ {(plan.originalPrice / 100).toFixed(2)}
              </span>
              <Badge variant="destructive" className="ml-2 text-xs">
                {Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)}% OFF
              </Badge>
            </div>
          )}
        </div>

        {/* Recursos do plano */}
        <div className="space-y-2.5 mb-6 text-left">
          {/* Mensagens */}
          <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="mt-0.5">
              <MessageSquare className={`h-4 w-4 ${isHighlighted ? 'text-blue-500' : 'text-green-500'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 flex-1">
              {plan.messageLimit === null ? (
                <span className="font-semibold text-green-600">Mensagens ilimitadas</span>
              ) : (
                `${plan.messageLimit} mensagens/projeto`
              )}
            </span>
          </div>

          {/* Curtidas */}
          <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="mt-0.5">
              <Heart className={`h-4 w-4 ${isHighlighted ? 'text-blue-500' : 'text-red-500'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 flex-1">
              {plan.likeLimit === null ? (
                <span className="font-semibold text-green-600">Curtidas ilimitadas</span>
              ) : (
                `${plan.likeLimit} curtidas/mês`
              )}
            </span>
          </div>

          {/* Features personalizadas */}
          {plan.features?.filter(f => f.enabled).map((feature) => (
            <div 
              key={feature.id} 
              className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="mt-0.5">
                <Check className={`h-4 w-4 ${isHighlighted ? 'text-blue-500' : 'text-green-500'}`} />
              </div>
              <span className="text-sm font-medium text-gray-700 flex-1">
                {feature.label}
              </span>
            </div>
          ))}
        </div>

        {/* Estatísticas */}
        <div className="text-sm border-t border-gray-200 pt-4 bg-gray-50 -mx-6 px-6 pb-2 rounded-b-lg">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="font-medium">Assinantes:</span>
            <span className={`font-bold ${isHighlighted ? 'text-blue-600' : 'text-gray-900'}`}>
              {plan.subscribers || 0}
            </span>
          </div>
        </div>
      </CardContent>

      {/* Botões de ação (Admin) */}
      {isAdmin && (
        <CardFooter className="flex gap-2 border-t border-gray-200 pt-4 bg-gray-50/50">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
            onClick={() => onEdit(plan)}
          >
            <Edit className="h-4 w-4 mr-1.5" />
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1 hover:bg-red-600 transition-all"
            onClick={() => onDelete(plan)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Excluir
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

