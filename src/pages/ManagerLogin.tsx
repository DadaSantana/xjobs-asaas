import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { AuthService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { translateFirebaseError } from "@/utils/firebaseErrorTranslator";

const ManagerLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Iniciando login de gestor para:', email);
      const userProfile = await AuthService.loginManager(email, password);
      console.log('Login realizado com sucesso:', userProfile);
      
      // Verificar se o usuário tem permissão para acessar a área administrativa
      if (userProfile.role !== 'manager' && userProfile.role !== 'moderator') {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta área.",
          variant: "destructive",
        });
        await AuthService.logoutUser();
        return;
      }
      
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo(a), ${userProfile.name}!`,
      });

      // Navegar para o painel administrativo
      navigate('/manager/dashboard');
      
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="flex justify-center mb-4">
            <h1 className="text-3xl font-bold text-blue-600">Xjobs</h1>
          </Link>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Acesso Administrativo
          </CardTitle>
          <CardDescription>
            Entre com suas credenciais de gestor ou moderador
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Voltar ao site principal
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerLogin;