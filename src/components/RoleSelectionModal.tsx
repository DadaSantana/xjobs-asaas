import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Briefcase } from "lucide-react";
import { AuthService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/types/user";
import { Timestamp } from "firebase/firestore";

interface RoleSelectionModalProps {
  isOpen: boolean;
  userProfile: UserProfile;
  onRoleSelected: (updatedProfile: UserProfile) => void;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  isOpen,
  userProfile,
  onRoleSelected,
}) => {
  const [selectedRole, setSelectedRole] = useState<'client' | 'freelancer' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRoleSelection = async () => {
    if (!selectedRole) {
      toast({
        title: "Seleção obrigatória",
        description: "Por favor, selecione como você pretende usar a plataforma.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Atualizar o role do usuário no Firestore
      await AuthService.updateUserRole(userProfile.uid, selectedRole);

      // Criar o perfil atualizado para retornar
      const updatedProfile: UserProfile = {
        ...userProfile,
        role: selectedRole,
        needsRoleSelection: false,
        updatedAt: Timestamp.now(),
      };

      toast({
        title: "Perfil configurado!",
        description: `Bem-vindo(a) como ${selectedRole === 'client' ? 'cliente' : 'freelancer'}!`,
      });

      onRoleSelected(updatedProfile);
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      toast({
        title: "Erro",
        description: "Erro ao configurar seu perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:max-w-md md:max-h-[90dvh] md:rounded-lg [&>button]:hidden flex flex-col">
        <DialogHeader className="p-4 md:p-6 border-b">
          <DialogTitle className="text-center text-xl md:text-2xl font-bold text-gray-900">
            Como você pretende usar a Xjobs?
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 text-sm md:text-base">
            Selecione a opção que melhor descreve como você pretende usar nossa plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 gap-4">
          <button
            type="button"
            onClick={() => setSelectedRole("client")}
            className={`p-6 border-2 rounded-lg flex flex-col items-center space-y-3 transition-colors ${
              selectedRole === "client"
                ? "border-blue-600 bg-blue-50 text-blue-600"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <User className="h-8 w-8" />
            <div className="text-center">
              <span className="font-semibold text-lg block">Cliente</span>
              <span className="text-sm text-gray-600">
                Quero contratar freelancers para meus projetos
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("freelancer")}
            className={`p-6 border-2 rounded-lg flex flex-col items-center space-y-3 transition-colors ${
              selectedRole === "freelancer"
                ? "border-blue-600 bg-blue-50 text-blue-600"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <Briefcase className="h-8 w-8" />
            <div className="text-center">
              <span className="font-semibold text-lg block">Freelancer</span>
              <span className="text-sm text-gray-600">
                Quero oferecer meus serviços e encontrar projetos
              </span>
            </div>
          </button>
        </div>

        <div className="mt-6">
          <Button
            onClick={handleRoleSelection}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            disabled={!selectedRole || isLoading}
          >
            {isLoading ? "Configurando..." : "Continuar"}
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};