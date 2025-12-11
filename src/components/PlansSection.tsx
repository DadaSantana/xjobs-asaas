import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Plan } from '@/types/plan';
import { getActivePlans, getCategoryLabel } from '@/services/planService';
import { CheckoutDialog } from '@/components/CheckoutDialog';

const periodLabels: Record<number, string> = {
  1: 'Mensal',
  3: 'Trimestral',
  6: 'Semestral',
  12: 'Anual',
};

interface PlansSectionProps {
  showAsSection?: boolean;
  currentPlan?: string;
  onSelectPlan?: (planName: string, duration: string) => void;
  isLandingPage?: boolean; // Indica se está na landing page (requer login)
}

const PlansSection = ({ showAsSection = true, currentPlan, onSelectPlan, isLandingPage = false }: PlansSectionProps) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [plansStatus, setPlansStatus] = useState<boolean | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    const fetchPlansStatusAndPlans = async () => {
      setLoading(true);
      setError(null);
      try {
        // Buscar status em settings/plans
        const settingsDoc = await getDoc(doc(db, 'settings', 'plans'));
        const status = settingsDoc.exists() ? settingsDoc.data().status === true : false;
        setPlansStatus(status);
        if (status) {
          // Buscar planos ativos do Asaas
          const plansData = await getActivePlans();
          setPlans(plansData);
        } else {
          setPlans([]);
        }
      } catch (err: any) {
        console.error('Erro ao buscar planos:', err);
        setError(err.message || 'Erro desconhecido');
        setPlansStatus(false);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPlansStatusAndPlans();
  }, [showAsSection]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Criar plano gratuito com destaque
  const freePlan: Plan = {
    id: 'free',
    name: 'Plano Gratuito',
    description: 'Perfeito para começar sua jornada freelancer',
    status: 'active',
    price: 0,
    messageLimit: 1,
    likeLimit: 12,
    category: 1,
    cycle: 'MONTHLY',
    gateway: 'asaas',
    features: [
      { id: '1', label: 'Perfil profissional completo', enabled: true },
      { id: '2', label: 'Portfolio ilimitado', enabled: true },
    ],
    cardStyle: {
      highlighted: true,
      badge: { text: 'RECOMENDADO', bgColor: '#10b981', textColor: '#ffffff' }
    }
  };

  // Agrupar planos por categoria
  const plansByPeriod: Record<number, Plan[]> = { 1: [], 3: [], 6: [], 12: [] };
  // Organizar planos por categoria
  plans.forEach(plan => {
    const category = plan.category || 1; // Default para mensal se não especificado
    if (plansByPeriod[category]) {
      plansByPeriod[category].push(plan);
    }
  });
  // Ordenar planos por preço (menor para maior) em cada categoria
  [1, 3, 6, 12].forEach(period => {
    plansByPeriod[period].sort((a, b) => {
      const priceA = a.price || 0;
      const priceB = b.price || 0;
      return priceA - priceB;
    });
  });

  const handlePlanSelect = async (plan: Plan) => {
    // Se for o plano gratuito, redirecionar para cadastro
    if (plan.id === 'free') {
      window.location.href = '/cadastro';
      return;
    }
  
    // Se não está autenticado, redirecionar para login
    if (!user) {
      // Salvar intenção de assinar plano no localStorage
      localStorage.setItem('pendingPlanSubscription', JSON.stringify({
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        timestamp: Date.now()
      }));
      
      // Redirecionar para login com parâmetro de retorno
      const currentPath = window.location.pathname;
      const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}&action=subscribe-plan&planId=${plan.id}&planName=${encodeURIComponent(plan.name)}`;
      
      window.location.href = redirectUrl;
      return;
    }
  
    // Se está autenticado, abrir modal de checkout
    setCheckoutPlan(plan);
    setShowCheckout(true);
  };

  const renderPlanCard = (plan: Plan) => {
    const isFreePlan = plan.id === 'free';
    const isHighlighted = plan.cardStyle?.highlighted || false;
    const badge = plan.cardStyle?.badge;
    
    return (
      <Card key={plan.id} className={`relative flex flex-col h-full min-w-[320px] transition-all duration-300 hover:shadow-xl border-2 ${
        isHighlighted 
          ? 'border-blue-500 hover:border-blue-600 shadow-lg' 
          : 'border-gray-200 hover:border-blue-300'
      }`}>
        {isHighlighted && badge?.text && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
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
        
        {/* Header com título e preço */}
        <CardHeader className="text-center pb-4 pt-10 px-8">
          <CardTitle className={`text-2xl font-bold mb-2 ${isHighlighted ? 'text-blue-700' : 'text-gray-900'}`}>
            {plan.name}
          </CardTitle>
          
          {/* Preço em destaque */}
          <div className="mb-4">
            <div className={`text-4xl font-bold mb-1 ${isHighlighted ? 'text-blue-600' : 'text-gray-900'}`}>
              R$ {(plan.price / 100).toFixed(2)}
              <span className="text-lg text-gray-500 font-normal">/mês</span>
            </div>
            {isFreePlan && (
              <p className="text-green-600 font-semibold text-sm">Para sempre!</p>
            )}
          </div>
          
          {plan.description && (
            <p className="text-gray-600 text-sm leading-relaxed">{plan.description}</p>
          )}
        </CardHeader>

        {/* Conteúdo com features */}
        <CardContent className="flex-1 px-8 pb-8">
          <div className="space-y-5 mb-8">
            {/* Limites principais em destaque */}
            <div className={`rounded-lg p-4 space-y-3 ${
              isHighlighted ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  isHighlighted ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  <Check className={`h-4 w-4 ${
                    isHighlighted ? 'text-blue-600' : 'text-green-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-gray-900 block">
                    {plan.likeLimit === null ? 'Curtidas ilimitadas' : `${plan.likeLimit} curtidas`}
                  </span>
                  <span className="text-sm text-gray-600">por mês</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  isHighlighted ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  <Check className={`h-4 w-4 ${
                    isHighlighted ? 'text-blue-600' : 'text-green-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-gray-900 block">
                    {plan.messageLimit === null ? 'Mensagens ilimitadas' : `${plan.messageLimit} mensagens`}
                  </span>
                  <span className="text-sm text-gray-600">por projeto</span>
                </div>
              </div>
            </div>
            
            {/* Features adicionais */}
            {plan.features?.filter(f => f.enabled).length > 0 && (
              <>
                <div className="border-t border-gray-200 my-4"></div>
                <div className="space-y-3">
                  {plan.features?.filter(f => f.enabled).map((feature) => (
                    <div key={feature.id} className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        isHighlighted ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Check className={`h-4 w-4 ${
                          isHighlighted ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <span className="text-gray-700 font-medium">{feature.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* Botão de ação */}
          <Button 
            className={`w-full text-base py-3 h-12 font-semibold transition-all duration-200 ${
              isFreePlan 
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl' 
                : isHighlighted
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg'
            }`} 
            onClick={() => handlePlanSelect(plan)}
          >
            {isFreePlan ? 'Começar Agora - Grátis!' : 'Assinar Agora'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const content = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {showAsSection && (
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Comece Sua Jornada Freelancer</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {plansStatus === false ?
              'Estamos construindo nossa comunidade! Por enquanto, oferecemos um plano gratuito completo para você começar sua carreira freelancer sem custos.' :
              'Escolha o plano ideal para sua jornada freelancer!'}
          </p>
        </div>
      )}
      {loading ? (
        <div className="text-center py-12">Carregando planos...</div>
      ) : error ? (
        <div className="text-center text-red-600 py-12">{error}</div>
      ) : plansStatus === true ? (
        <Tabs defaultValue="1" className="w-full">
          <TabsList className="flex justify-center mb-8">
            <TabsTrigger value="1">Mensal</TabsTrigger>
            <TabsTrigger value="3">Trimestral</TabsTrigger>
            <TabsTrigger value="6">Semestral</TabsTrigger>
            <TabsTrigger value="12">Anual</TabsTrigger>
          </TabsList>
          {[1, 3, 6, 12].map(period => (
            <TabsContent key={period} value={period.toString()} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 justify-items-center">
              {plansByPeriod[period].length === 0 ? (
                <div className="col-span-full text-center text-gray-500 py-12">Nenhum plano disponível.</div>
              ) : (
                plansByPeriod[period].map(plan => renderPlanCard(plan))
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="flex justify-center">
          <div className="w-full max-w-sm">
            {renderPlanCard(freePlan)}
          </div>
        </div>
      )}
      {showAsSection && plansStatus === false && (
        <div className="text-center mt-16">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">Em Breve: Planos Premium</h3>
            <p className="text-blue-800 mb-6">
              Estamos trabalhando para trazer planos premium com mais curtidas, mensagens ilimitadas e recursos avançados. 
              Fique de olho nas novidades!
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-blue-700">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" />
                <span>Mais curtidas por mês</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" />
                <span>Mensagens ilimitadas</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" />
                <span>Destaque nos resultados</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" />
                <span>Suporte prioritário</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (showAsSection) {
    return (
      <>
        <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
          {content}
        </section>
        <CheckoutDialog 
          open={showCheckout} 
          onOpenChange={setShowCheckout} 
          plan={checkoutPlan}
        />
      </>
    );
  }
  return (
    <>
      {content}
      <CheckoutDialog 
        open={showCheckout} 
        onOpenChange={setShowCheckout} 
        plan={checkoutPlan}
      />
    </>
  );
};

export default PlansSection;