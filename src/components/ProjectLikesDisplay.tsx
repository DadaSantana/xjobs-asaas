import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Star, 
  Clock, 
  User,
  MessageCircle,
  ExternalLink,
  CheckCircle,
  Crown
} from 'lucide-react';
import { ProjectLike } from '@/types/project';
import { ProjectLikesService } from '@/services/projectLikesService';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfileService } from '@/services/userProfileService';
import { getAuth } from 'firebase/auth';

interface ProjectLikesDisplayProps {
  projectId: string;
  isProjectOwner?: boolean;
  onAcceptProposal?: (likeId: string, freelancerId: string) => void;
  onContactFreelancer?: (freelancerId: string) => void;
  canAcceptProposals?: boolean; // novo: controla se mostra o botão Aceitar Proposta
  selectedFreelancerId?: string;
  showSelectedOnly?: boolean;
}

export const ProjectLikesDisplay: React.FC<ProjectLikesDisplayProps> = ({
  projectId,
  isProjectOwner = false,
  onAcceptProposal,
  onContactFreelancer,
  canAcceptProposals = true,
  selectedFreelancerId,
  showSelectedOnly = false
}) => {
  const [likes, setLikes] = useState<ProjectLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLike, setSelectedLike] = useState<ProjectLike | null>(null);
  const [freelancerPlans, setFreelancerPlans] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadProjectLikes();
  }, [projectId]);

  const loadProjectLikes = async () => {
    try {
      const likesData = await ProjectLikesService.getProjectLikes(projectId);
      
      // Filtrar somente a proposta selecionada, se solicitado
      const likesFiltered = showSelectedOnly && selectedFreelancerId
        ? likesData.filter(l => l.freelancerId === selectedFreelancerId)
        : likesData;

      // Buscar planos dos freelancers
      const plansMap: Record<string, string> = {};
      await Promise.all(
        likesFiltered.map(async (like) => {
          try {
            const freelancerProfile = await UserProfileService.getUserProfile(like.freelancerId);
            plansMap[like.freelancerId] = freelancerProfile?.currentPlan || 'free';
          } catch (error) {
            console.error(`Erro ao buscar plano do freelancer ${like.freelancerId}:`, error);
            plansMap[like.freelancerId] = 'free';
          }
        })
      );
      
      setFreelancerPlans(plansMap);
      
      // Ordenar: freelancers pagos primeiro, depois por data
      const sortedLikes = likesFiltered.sort((a, b) => {
        const aIsPaid = plansMap[a.freelancerId] && plansMap[a.freelancerId] !== 'free';
        const bIsPaid = plansMap[b.freelancerId] && plansMap[b.freelancerId] !== 'free';
        
        // Primeiro critério: freelancers pagos primeiro
        if (aIsPaid && !bIsPaid) return -1;
        if (!aIsPaid && bIsPaid) return 1;
        
        // Segundo critério: data (mais recente primeiro)
        return new Date(b.createdAt.toDate()).getTime() - new Date(a.createdAt.toDate()).getTime();
      });
      
      setLikes(sortedLikes);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar propostas do projeto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptProposal = async (like: ProjectLike) => {
    try {
      // Buscar dados do projeto
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (!projectDoc.exists()) {
        throw new Error('Projeto não encontrado');
      }
      
      const project = projectDoc.data();
      
      // Buscar dados do cliente
      const clientDoc = await getDoc(doc(db, 'users', project.clientId));
      if (!clientDoc.exists()) {
        throw new Error('Cliente não encontrado');
      }
      
      const client = clientDoc.data();

      // Verificar se cliente tem dados de pagamento salvos
      const paymentData = client.paymentData;
      
      if (!paymentData || !paymentData.cpf || !paymentData.name) {
        toast({
          title: 'Dados incompletos',
          description: 'Configure seus dados de pagamento antes de aceitar propostas.',
          variant: 'destructive',
        });
        return;
      }

      // Criar checkout do Asaas
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch('https://us-central1-xjobs-a43d2.cloudfunctions.net/createAsaasCheckout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          projectId,
          projectTitle: project.title,
          amount: like.proposedValue, // Valor do freelancer (90%)
          clientData: {
            name: paymentData.name,
            email: paymentData.email,
            cpf: paymentData.cpf,
            phone: paymentData.phone,
          },
          freelancerData: {
            freelancerId: like.freelancerId,
            freelancerName: like.freelancerName,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Erro ao criar checkout');
      }

      const checkoutData = await response.json();
      
      // Aceitar a proposta via ProjectLikesService
      await ProjectLikesService.acceptProjectLike(projectId, like.id);
      
      if (onAcceptProposal) {
        onAcceptProposal(like.id, like.freelancerId);
      }
      
      // Se tem URL de invoice (cartão), abrir em nova aba
      if (checkoutData.invoiceUrl) {
        window.open(checkoutData.invoiceUrl, '_blank');
      }

      toast({
        title: "Checkout criado!",
        description: "Prossiga com o pagamento via PIX ou cartão de crédito",
      });

      toast({
        title: "Sucesso",
        description: "Proposta aceita! Redirecionando para pagamento...",
        variant: "default"
      });

      // Redirecionar para o link de pagamento
      window.location.href = paymentData.paymentUrl;
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Falha ao aceitar proposta',
        variant: "destructive"
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const formatName = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    }
    return fullName;
  };

  const isPaidFreelancer = (like: ProjectLike) => {
    // TODO: Implementar verificação de plano pago
    // Por enquanto, retorna false para todos (plataforma gratuita)
    return false;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Carregando propostas...</p>
        </div>
      </div>
    );
  }

  if (likes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">Nenhuma proposta ainda</p>
          <p className="text-sm">Aguarde os freelancers demonstrarem interesse no seu projeto.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Propostas Recebidas ({likes.length}/80)
        </h3>
        <Badge variant="outline" className="text-xs">
          {likes.filter(isPaidFreelancer).length} Premium • {likes.filter(l => !isPaidFreelancer(l)).length} Gratuito
        </Badge>
      </div>

      <div className="grid gap-4">
        {likes.map((like) => (
          <Card key={like.id} className={`transition-all hover:shadow-md ${isPaidFreelancer(like) ? 'ring-2 ring-yellow-200 bg-yellow-50/30' : ''}`}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Avatar e Info Básica */}
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={like.freelancerImage} alt={like.freelancerName} />
                      <AvatarFallback>
                        {like.freelancerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isPaidFreelancer(like) && (
                      <Crown className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 truncate">
                        {formatName(like.freelancerName)}
                      </h4>
                      {isPaidFreelancer(like) && (
                        <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                          Premium
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 mb-2">
                      {renderStars(Math.round(like.freelancerRating || 0))}
                      <span className="text-xs text-gray-600 ml-1">
                        {like.freelancerRating?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Proposta */}
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Valor Proposto:</p>
                      <p className="text-lg font-bold text-green-600">
                        R$ {like.proposedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {isProjectOwner && (
                        <p className="text-xs text-gray-500">
                          Total: R$ {like.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (inc. comissão)
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Data da Proposta:</p>
                      <p className="text-sm text-gray-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(like.createdAt.toDate()).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Mensagem:</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {like.message}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => window.open(`/portfolio/${like.freelancerId}`, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver Portfólio
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => onContactFreelancer?.(like.freelancerId)}
                    >
                      <MessageCircle className="w-3 h-3" />
                      Conversar
                    </Button>

                    {isProjectOwner && canAcceptProposals && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => setSelectedLike(like)}
                          >
                            <CheckCircle className="w-3 h-3" />
                            Aceitar Proposta
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirmar Aceitação da Proposta</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-gray-600">
                              Tem certeza que deseja aceitar a proposta de <strong>{formatName(like.freelancerName)}</strong>?
                            </p>
                            
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Freelancer:</span>
                                  <p className="font-medium">{formatName(like.freelancerName)}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Avaliação:</span>
                                  <p className="font-medium">{like.freelancerRating?.toFixed(1) || '0.0'} ⭐</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Valor:</span>
                                  <p className="font-medium text-green-600">
                                    R$ {like.proposedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Total + Comissão:</span>
                                  <p className="font-medium">
                                    R$ {like.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <strong>Próximo passo:</strong> Após aceitar, você será redirecionado para realizar o pagamento seguro do projeto.
                              </p>
                            </div>

                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => setSelectedLike(null)}
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={() => {
                                  handleAcceptProposal(like);
                                  setSelectedLike(null);
                                }}
                              >
                                Confirmar e Pagar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {likes.length >= 80 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-800">
              <CheckCircle className="w-5 h-5" />
              <p className="font-medium">Limite de propostas atingido</p>
            </div>
            <p className="text-sm text-orange-700 mt-1">
              Este projeto atingiu o limite máximo de 80 propostas. Novos freelancers não podem mais demonstrar interesse.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};