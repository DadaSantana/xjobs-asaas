import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { User, Briefcase } from "lucide-react";
import { AuthService } from "@/services/authService";
import { useAppDispatch } from "@/hooks/redux";
import { setUser, setUserProfile } from "@/store/authSlice";
import { useToast } from "@/hooks/use-toast";
import { RegisterFormData, UserProfile } from "@/types/user";
import AppHeader from "@/components/AppHeader";
import { RoleSelectionModal } from "@/components/RoleSelectionModal";
import { translateFirebaseRegisterError } from "@/utils/firebaseErrorTranslator";

const Cadastro = () => {
  const [userType, setUserType] = useState<"cliente" | "freelancer">("freelancer");
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [pendingUserProfile, setPendingUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const dispatch = useAppDispatch();
  const { toast } = useToast();

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



  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    
    const registerData: RegisterFormData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      role: userType === 'freelancer' ? 'freelancer' : 'client',
      skills: userType === 'freelancer' ? [(formData.get('skills') as string)] : undefined,
    };

    // Validações básicas
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (registerData.password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log('Iniciando cadastro:', registerData);
      
      const userProfile = await AuthService.registerUser(registerData);
      
      console.log('Cadastro realizado com sucesso:', userProfile);
      
      // Converter Timestamps para strings ISO antes de salvar no Redux
      const serializedProfile = {
        ...userProfile,
        createdAt: userProfile.createdAt?.toDate ? userProfile.createdAt.toDate().toISOString() : (userProfile.createdAt as any)?.toISOString?.() || new Date().toISOString(),
        lastLogin: userProfile.lastLogin?.toDate ? userProfile.lastLogin.toDate().toISOString() : (userProfile.lastLogin as any)?.toISOString?.() || new Date().toISOString(),
        lastSeen: userProfile.lastSeen?.toDate ? userProfile.lastSeen.toDate().toISOString() : (userProfile.lastSeen as any)?.toISOString?.() || new Date().toISOString(),
        updatedAt: userProfile.updatedAt?.toDate ? userProfile.updatedAt.toDate().toISOString() : (userProfile.updatedAt as any)?.toISOString?.() || new Date().toISOString(),
        planExpiresAt: userProfile.planExpiresAt?.toDate ? userProfile.planExpiresAt.toDate().toISOString() : (userProfile.planExpiresAt as any)?.toISOString?.() || undefined,
      };
      
      dispatch(setUserProfile(serializedProfile));
      
      toast({
        title: "Sucesso!",
        description: "Conta criada com sucesso!",
      });

      // Verificar se há plano pendente
      const action = searchParams.get('action');
      const hasPendingPlan = action === 'subscribe-plan';

      // Redirecionar baseado no tipo de usuário
      if (userProfile.role === 'client') {
        navigate('/dashboard-cliente');
      } else {
        // Se há plano pendente, redirecionar para área de planos
        if (hasPendingPlan) {
          navigate('/freelancer/meus-planos');
        } else {
          navigate('/dashboard-freelancer');
        }
      }
      
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      
      let errorMessage = "Erro ao criar conta. Tente novamente.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este email já está em uso.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "A senha é muito fraca.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Email inválido.";
      }
      
      toast({
        title: "Erro no cadastro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const userProfile = await AuthService.loginWithGoogle();
      
      if (userProfile.needsRoleSelection) {
        setPendingUserProfile(userProfile);
        setShowRoleSelection(true);
        setIsLoading(false);
        return;
      }
      
      // Converter Timestamps para strings ISO antes de salvar no Redux
      const serializedProfile = {
        ...userProfile,
        createdAt: userProfile.createdAt?.toDate ? userProfile.createdAt.toDate().toISOString() : (userProfile.createdAt as any)?.toISOString?.() || new Date().toISOString(),
        lastLogin: userProfile.lastLogin?.toDate ? userProfile.lastLogin.toDate().toISOString() : (userProfile.lastLogin as any)?.toISOString?.() || new Date().toISOString(),
        lastSeen: userProfile.lastSeen?.toDate ? userProfile.lastSeen.toDate().toISOString() : (userProfile.lastSeen as any)?.toISOString?.() || new Date().toISOString(),
        updatedAt: userProfile.updatedAt?.toDate ? userProfile.updatedAt.toDate().toISOString() : (userProfile.updatedAt as any)?.toISOString?.() || new Date().toISOString(),
        planExpiresAt: userProfile.planExpiresAt?.toDate ? userProfile.planExpiresAt.toDate().toISOString() : (userProfile.planExpiresAt as any)?.toISOString?.() || undefined,
      };
      
      dispatch(setUserProfile(serializedProfile));
      
      toast({
        title: "Sucesso!",
        description: "Conta criada com sucesso!",
      });
      
      // Verificar se há plano pendente
      const action = searchParams.get('action');
      const hasPendingPlan = action === 'subscribe-plan';

      // Redirecionar baseado no tipo de usuário
      if (userProfile.role === 'client') {
        navigate('/dashboard-cliente');
      } else {
        // Se há plano pendente, redirecionar para área de planos
        if (hasPendingPlan) {
          navigate('/freelancer/meus-planos');
        } else {
          navigate('/dashboard-freelancer');
        }
      }
      
    } catch (error: any) {
      console.error('Erro no cadastro com Google:', error);
      
      toast({
        title: "Erro no cadastro",
        description: "Erro ao criar conta com Google. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelected = () => {
    setShowRoleSelection(false);
    setPendingUserProfile(null);
    
    toast({
      title: "Sucesso!",
      description: "Conta criada com sucesso!",
    });
    
    // Verificar se há plano pendente
    const action = searchParams.get('action');
    const hasPendingPlan = action === 'subscribe-plan';

    // Redirecionar baseado no role selecionado
    if (pendingUserProfile?.role === 'freelancer') {
      // Se há plano pendente, redirecionar para área de planos
      if (hasPendingPlan) {
        navigate('/freelancer/meus-planos');
      } else {
        navigate('/dashboard-freelancer');
      }
    } else if (pendingUserProfile?.role === 'client') {
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
              Criar conta
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Ou{" "}
              <Link
                to={planInfo ? `/login?action=subscribe-plan&planId=${planInfo.planId}&planName=${encodeURIComponent(planInfo.planName)}` : "/login"}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                faça login na sua conta
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
                      Crie sua conta para continuar com a assinatura
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Type Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium text-gray-900">
              Eu sou um:
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setUserType("cliente")}
                className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                  userType === "cliente"
                    ? "border-blue-600 bg-blue-50 text-blue-600"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <User className="h-6 w-6" />
                <span className="font-medium">Cliente</span>
                <span className="text-xs text-center">
                  Quero contratar freelancers
                </span>
              </button>
              <button
                type="button"
                onClick={() => setUserType("freelancer")}
                className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                  userType === "freelancer"
                    ? "border-blue-600 bg-blue-50 text-blue-600"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <Briefcase className="h-6 w-6" />
                <span className="font-medium">Freelancer</span>
                <span className="text-xs text-center">
                  Quero oferecer serviços
                </span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="mt-1"
                  placeholder="Seu nome completo"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1"
                  placeholder="seu@email.com"
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="mt-1"
                  placeholder="Confirme sua senha"
                  disabled={isLoading}
                />
              </div>

              {userType === "freelancer" && (
                <div>
                  <Label htmlFor="skills">Principais habilidades</Label>
                  <Textarea
                    id="skills"
                    name="skills"
                    className="mt-1"
                    placeholder="Ex: Design, Desenvolvimento Web, Marketing Digital..."
                    rows={3}
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>

            <div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Criando conta..." : "Criar conta"}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Ou continue com
                </span>
              </div>
            </div>

            <div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {isLoading ? "Criando conta..." : "Continuar com Google"}
              </Button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Ao criar uma conta, você concorda com nossos{" "}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                Termos de Uso
              </a>{" "}
              e{" "}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                Política de Privacidade
              </a>
            </div>
          </form>
        </div>
      </div>
      
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

export default Cadastro;
