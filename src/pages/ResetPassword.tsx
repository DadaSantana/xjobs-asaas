import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { getAuth } from 'firebase/auth';

export const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidCode, setIsValidCode] = useState(false);
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = getAuth();

  useEffect(() => {
    const validateResetCode = async () => {
      try {
        const oobCode = searchParams.get('oobCode');
        if (!oobCode) {
          toast({
            title: "Link inválido",
            description: "O link de redefinição de senha é inválido",
            variant: "destructive",
          });
          navigate('/esqueci-senha');
          return;
        }

        // Verificar se o código é válido e obter o email
        const email = await verifyPasswordResetCode(auth, oobCode);
        setEmail(email);
        setIsValidCode(true);
      } catch (error: any) {
        console.error('Erro ao validar código de reset:', error);
        toast({
          title: "Link inválido ou expirado",
          description: "O link de redefinição de senha é inválido ou expirou. Solicite um novo link.",
          variant: "destructive",
        });
        navigate('/esqueci-senha');
      } finally {
        setIsValidating(false);
      }
    };

    validateResetCode();
  }, [searchParams, auth, toast, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma nova senha",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const oobCode = searchParams.get('oobCode');
      
      if (!oobCode) {
        throw new Error('Código de redefinição não encontrado');
      }

      // Confirmar a redefinição de senha
      await confirmPasswordReset(auth, oobCode, password);
      
      toast({
        title: "Senha redefinida com sucesso",
        description: "Sua senha foi alterada com sucesso. Você pode fazer login agora.",
      });
      
      navigate('/login');
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      
      let errorMessage = "Erro ao redefinir senha";
      if (error.code === 'auth/expired-action-code') {
        errorMessage = "O link expirou. Solicite um novo link de redefinição.";
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = "Link inválido. Solicite um novo link de redefinição.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "A senha é muito fraca. Escolha uma senha mais forte.";
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Validando link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidCode) {
    return null; // Será redirecionado para /esqueci-senha
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Redefinir Senha
          </CardTitle>
          <CardDescription className="text-center">
            Digite sua nova senha para {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirme sua nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Redefinindo..." : "Redefinir Senha"}
            </Button>
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/login')}
              >
                Voltar para o Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
