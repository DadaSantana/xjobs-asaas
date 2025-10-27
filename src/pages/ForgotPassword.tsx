import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AuthService } from '@/services/authService';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();




  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira seu e-mail",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      await AuthService.resetPassword(email);
      
      toast({
        title: "E-mail enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha",
      });
      
      navigate('/login');
    } catch (error: any) {
      console.error('Erro ao enviar e-mail de recuperação:', error);
      
      let errorMessage = "Erro ao enviar e-mail de recuperação";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "E-mail não encontrado";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "E-mail inválido";
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Recuperar Senha
          </CardTitle>
          <CardDescription className="text-center">
            Digite seu e-mail para receber as instruções de recuperação de senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Enviando..." : "Enviar E-mail de Recuperação"}
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