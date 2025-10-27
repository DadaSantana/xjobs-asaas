import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import { RoleSelectionModal } from "@/components/RoleSelectionModal";
import { UserProfile } from "@/types/user";
import { translateFirebaseError } from "@/utils/firebaseErrorTranslator";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [pendingUserProfile, setPendingUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { toast } = useToast();

  // Verificar se há um plano pendente para assinatura
  const checkPendingSubscription = () => {
    const action = searchParams.get('action');
    if (action === 'subscribe-plan') {
      const pendingPlan = localStorage.getItem('pendingPlanSubscription');
      return pendingPlan ? JSON.parse(pendingPlan) : null;
    }
    return null;
  };

  // Obter informações do plano da URL
  const getPlanInfoFromUrl = () => {
    const action = searchParams.get('action');
    const planName = searchParams.get('planName');
    const planId = searchParams.get('planId');
    
    if (action === 'subscribe-plan' && planName) {
      return { planName, planId };
    }
    return null;
  };

  const planInfo = getPlanInfoFromUrl();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Iniciando login para:', email);
      const userProfile = await AuthService.loginUser(email, password);
      console.log('Login realizado com sucesso:', userProfile);
      
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo(a), ${userProfile.name}!`,
      });

      // Verificar se há plano pendente
      const pendingPlan = checkPendingSubscription();
      
      // Navegar baseado no role do usuário
      console.log('Role do usuário:', userProfile.role);
      if (userProfile.role === 'freelancer') {
        console.log('Navegando para /freelancer');
        // Se há plano pendente, redirecionar para aba de planos
        if (pendingPlan) {
          console.log('Redirecionando para aba de planos com plano pendente:', pendingPlan);
          navigate('/freelancer?tab=planos');
        } else {
          navigate('/freelancer');
        }
      } else if (userProfile.role === 'client') {
        console.log('Navegando para /dashboard-cliente');
        navigate('/dashboard-cliente');
      } else {
        console.log('Role desconhecido, navegando para /');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast({
        title: "Erro no login",
        description: translateFirebaseError(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    try {
      console.log('Iniciando login com Google');
      const userProfile = await AuthService.loginWithGoogle();
      console.log('Login com Google realizado com sucesso:', userProfile);
      
      // Verificar se o usuário precisa selecionar um role
      if (userProfile.needsRoleSelection) {
        setPendingUserProfile(userProfile);
        setShowRoleSelection(true);
        setIsLoading(false);
        return;
      }
      
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo(a), ${userProfile.name}!`,
      });

      // Verificar se há plano pendente
      const pendingPlan = checkPendingSubscription();

      // Navegar baseado no role do usuário
      console.log('Role do usuário:', userProfile.role);
      if (userProfile.role === 'freelancer') {
        console.log('Navegando para /freelancer');
        // Se há plano pendente, redirecionar para aba de planos
        if (pendingPlan) {
          console.log('Redirecionando para aba de planos com plano pendente:', pendingPlan);
          navigate('/freelancer?tab=planos');
        } else {
          navigate('/freelancer');
        }
      } else if (userProfile.role === 'client') {
        console.log('Navegando para /dashboard-cliente');
        navigate('/dashboard-cliente');
      } else {
        console.log('Role desconhecido, navegando para /');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Erro no login com Google:', error);
      toast({
        title: "Erro no login com Google",
        description: translateFirebaseError(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelected = (updatedProfile: UserProfile) => {
    setShowRoleSelection(false);
    setPendingUserProfile(null);
    
    toast({
      title: "Login realizado com sucesso!",
      description: `Bem-vindo(a), ${updatedProfile.name}!`,
    });

    // Verificar se há plano pendente
    const pendingPlan = checkPendingSubscription();

    // Redirecionar baseado no role selecionado
    if (updatedProfile.role === 'freelancer') {
      // Se há plano pendente, redirecionar para aba de planos
      if (pendingPlan) {
        console.log('Redirecionando para aba de planos com plano pendente:', pendingPlan);
        navigate('/freelancer?tab=planos');
      } else {
        navigate('/freelancer');
      }
    } else if (updatedProfile.role === 'client') {
      navigate('/dashboard-cliente');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AppHeader showMenuItems={false} />
      
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('/lovable-uploads/b0a90a33-fed5-4fb5-b014-f55c6e45b605.png')`
        }}
      ></div>
      
      {/* Blue overlay */}
      <div className="absolute inset-0 bg-blue-500/40"></div>
      
      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-sm p-8 rounded-lg shadow-xl">
          <div>
            <Link to="/" className="flex justify-center">
              <h1 className="text-3xl font-bold text-gray-800">Xjobs</h1>
            </Link>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Entrar na sua conta
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Ou{" "}
              <Link
                to={planInfo ? `/cadastro?action=subscribe-plan&planId=${planInfo.planId}&planName=${encodeURIComponent(planInfo.planName)}` : "/cadastro"}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                crie uma nova conta
              </Link>
            </p>
            
            {/* Mensagem do plano pendente */}
            {planInfo && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-blue-800">
                      Assinar {planInfo.planName}
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Faça login ou crie uma conta para continuar com a assinatura
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Lembrar de mim
                </label>
              </div>

              <div className="text-sm">
                <Link to="/esqueci-senha" className="font-medium text-blue-600 hover:text-blue-500">
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Ou continue com</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled
                >
                  Facebook
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
      
      {/* Modal de seleção de role */}
      {showRoleSelection && pendingUserProfile && (
        <RoleSelectionModal
          isOpen={showRoleSelection}
          userProfile={pendingUserProfile}
          onRoleSelected={handleRoleSelected}
        />
      )}
    </div>
  );
};

export default Login;
