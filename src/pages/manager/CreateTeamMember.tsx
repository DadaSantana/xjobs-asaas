import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { AuthService } from "@/services/authService";
import { ArrowLeft, UserPlus } from "lucide-react";

const CreateTeamMember = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (!formData.role) {
      toast({
        title: "Erro",
        description: "Selecione um cargo para o novo membro",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Criar o usuário administrativo
      const memberData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role as 'manager' | 'moderator'
      };

      await AuthService.createTeamMember(memberData);
      
      toast({
        title: "Sucesso!",
        description: `${formData.role === 'manager' ? 'Gestor' : 'Moderador'} criado com sucesso!`,
      });

      navigate('/manager/dashboard');
      
    } catch (error: any) {
      console.error('Erro ao criar membro da equipe:', error);
      
      let errorMessage = "Erro ao criar membro da equipe. Tente novamente.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este email já está em uso.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "A senha é muito fraca.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Email inválido.";
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/manager/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-blue-600">Adicionar Membro da Equipe</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Cadastrar Novo Membro
            </CardTitle>
            <CardDescription>
              Crie uma conta para um novo gestor ou moderador da plataforma
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    placeholder="Nome completo"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="role">Cargo</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => handleInputChange('role', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Gestor</SelectItem>
                    <SelectItem value="moderator">Moderador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  {formData.role === 'manager' && "Gestores têm acesso completo ao sistema administrativo"}
                  {formData.role === 'moderator' && "Moderadores podem gerenciar chats e disputas"}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="Senha (mín. 6 caracteres)"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    placeholder="Confirme a senha"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/manager/dashboard')}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? "Criando..." : "Criar Membro"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateTeamMember; 