import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useEffect, useState } from 'react';
import { auth, functions } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

interface Plan {
  id: string;
  name: string;
  description?: string;
  status: string;
  pricing_scheme?: { price?: number };
  messageLimit?: number;
  likeLimit?: number;
  subscribers?: number;
  interval_count?: number;
  price?: number; // Added for rendering
  category?: number; // Categoria do plano (1, 3, 6, 12)
}

const LIST_PLANS_URL = 'https://us-central1-xjobs-a43d2.cloudfunctions.net/listPlans';
const CREATE_ASAAS_SUBSCRIPTION_URL = 'https://us-central1-xjobs-a43d2.cloudfunctions.net/createAsaasSubscription';

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
          // Buscar planos do Firestore
          const plansSnap = await getDocs(collection(db, 'plans'));
          const plansData = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Plan[];
          setPlans(plansData.filter((p: any) => !p.status || p.status === 'active'));
        } else {
          setPlans([]);
        }
      } catch (err: any) {
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
  
    // Se está na landing page, SEMPRE redirecionar para login/cadastro primeiro
    if (isLandingPage) {
      // Salvar intenção de assinar plano no localStorage
      localStorage.setItem('pendingPlanSubscription', JSON.stringify({
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        timestamp: Date.now()
      }));
      
      // Se não está logado, redirecionar para login
      if (!user) {
        const currentPath = window.location.pathname;
        const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}&action=subscribe-plan&planId=${plan.id}&planName=${encodeURIComponent(plan.name)}`;
        
        window.location.href = redirectUrl;
        return;
      }
      
      // Se está logado, redirecionar para área de planos
      window.location.href = '/freelancer/meus-planos';
      return;
    }
  
    // Se não está na landing page, verificar se o usuário está autenticado
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
  
    // Lógica para planos pagos: criar assinatura no Asaas
    try {
      console.log('Iniciando criação de assinatura Asaas para plano:', plan);
      const idToken = await user.getIdToken();

      const body = {
        planId: plan.id,
        planName: plan.name,
        price: plan.price ? plan.price / 100 : 0, // Converter de centavos para reais
        category: plan.category || 1, // 1, 3, 6, 12 (mensal, trimestral, semestral, anual)
        likeLimit: plan.likeLimit ?? null,
        messageLimit: plan.messageLimit ?? null,
      };

      console.log('Dados enviados para createAsaasSubscription:', body);

      const resp = await fetch(CREATE_ASAAS_SUBSCRIPTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });

      const json = await resp.json().catch(() => ({}));
      console.log('Resposta da função Asaas:', json);

      if (!resp.ok) {
        const message = (json && (json.error || json.message)) || 'Erro ao criar assinatura.';
        throw new Error(message);
      }

      if (json && json.success) {
        alert(`Assinatura criada com sucesso! ID: ${json.subscriptionId}`);
        
        // Redirecionar para página de planos do usuário
        window.location.href = '/freelancer/meus-planos';
        return;
      }

      throw new Error('Resposta inesperada ao criar assinatura.');
    } catch (err: any) {
      console.error('Erro ao criar assinatura:', err);
      alert(err?.message || 'Erro desconhecido ao criar assinatura.');
    }
  };

  const renderPlanCard = (plan: Plan) => {
    const isFreePlan = plan.id === 'free';
    
    return (
      <Card key={plan.id} className={`relative flex flex-col h-full transition-all duration-300 hover:shadow-xl border-2 ${isFreePlan ? 'border-green-500 hover:border-green-600 bg-gradient-to-br from-green-50 to-white shadow-lg' : 'border-gray-200 hover:border-blue-300'}`}>
        {isFreePlan && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-green-500 text-white px-4 py-1 text-sm font-semibold">
              <Star className="h-3 w-3 mr-1" />
              RECOMENDADO
            </Badge>
          </div>
        )}
        <CardHeader className="text-center pb-6 pt-8">
          <CardTitle className={`text-3xl font-bold ${isFreePlan ? 'text-green-700' : 'text-gray-900'}`}>
            {plan.name}
          </CardTitle>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="font-medium">{plan.likeLimit ?? '-'} curtidas/mês</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="font-medium">{plan.messageLimit ?? '-'} mensagem por projeto</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="font-medium">Perfil profissional completo</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="font-medium">Portfolio ilimitado</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-center flex-1 flex flex-col justify-between">
          <div className="mb-6">
            <div className={`text-5xl font-bold mb-2 ${isFreePlan ? 'text-green-600' : 'text-blue-600'}`}>
              {isFreePlan ? 'R$ 0,00' : (plan.price ? `R$ ${(plan.price / 100).toFixed(2)}` : '-')}
              <span className="text-lg text-gray-500">/mês</span>
            </div>
            {isFreePlan && (
              <p className="text-green-600 font-semibold text-lg">Para sempre!</p>
            )}
          </div>
          <Button 
            className={`w-full text-lg py-3 ${isFreePlan ? 'bg-green-600 hover:bg-green-700 text-white font-semibold' : 'bg-blue-600 hover:bg-blue-700'}`} 
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
            <TabsContent key={period} value={period.toString()} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {plansByPeriod[period].length === 0 ? (
                <div className="col-span-full text-center text-gray-500">Nenhum plano disponível.</div>
              ) : (
                plansByPeriod[period].map(plan => renderPlanCard(plan))
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="flex justify-center">
          <div className="max-w-md w-full">
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
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        {content}
      </section>
    );
  }
  return content;
};

export default PlansSection;