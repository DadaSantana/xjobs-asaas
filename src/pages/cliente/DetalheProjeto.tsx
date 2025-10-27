import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  User, 
  Star, 
  Clock, 
  CheckCircle, 
  XCircle,
  MapPin,
  Briefcase,
  MessageCircle,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/hooks/redux";
import { ProjectService } from "@/services/projectService";
import { Project, ProjectProposal } from "@/types/project";
import { ProjectLikesDisplay } from "@/components/ProjectLikesDisplay";
import { 
  getProjectStatusColor, 
  getProjectStatusLabel, 
  getProjectStatusIcon,
  canAdvanceProjectStatus,
  getNextActionLabel
} from "@/utils/projectHelpers";
import { stripHtml } from "@/lib/utils";
import { FundsService } from '@/services/fundsService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProjectPaymentModal from "@/components/ProjectPaymentModal";
import { Slider } from "@/components/ui/slider";

const DetalheProjeto = () => {
  const handleCancelProject = async () => {
    if (!project) return;
    try {
      await ProjectService.updateProjectStatus(project.id, 'cancelado');
      toast({
        title: 'Projeto cancelado',
        description: 'O projeto foi cancelado com sucesso.',
      });
      await loadProjectDetails();
      navigate('/cliente/meus-projetos');
    } catch (error) {
      console.error('Erro ao cancelar projeto:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao cancelar projeto',
        variant: 'destructive',
      });
    }
  };

  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const userProfile = useAppSelector(state => state.auth.userProfile);
  
  const [project, setProject] = useState<Project | null>(null);
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAcceptingProposal, setIsAcceptingProposal] = useState(false);
  const [isRequestingRelease, setIsRequestingRelease] = useState(false);
  const [partialDialogOpen, setPartialDialogOpen] = useState(false);
  const [partialPercent, setPartialPercent] = useState<number>(10);
  const releasedPctRef = useRef<number>(0);
  const [fundStatus, setFundStatus] = useState<{
    projectValue: number;
    totalReleased: number;
    remainingAmount: number;
    releasedPercentage: number;
    remainingPercentage: number;
    canRelease: boolean;
    suggestedReleaseOptions: number[];
  } | null>(null);
  const [projectPayment, setProjectPayment] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (projectId && userProfile) {
      console.log('[DetalheProjeto] init', { projectId, userId: userProfile.uid });
      loadProjectDetails();
    }
  }, [projectId, userProfile]);

  // Verificar parâmetros de URL para pagamento
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast({
        title: "Pagamento realizado com sucesso!",
        description: "O projeto está agora em execução.",
      });
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "Pagamento cancelado",
        description: "O pagamento foi cancelado. O projeto continua aguardando garantia.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  const loadProjectDetails = async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      
      // Carregar detalhes do projeto
      const projectData = await ProjectService.getProjectById(projectId);
      console.log('[DetalheProjeto] project', projectData);
      
      if (!projectData) {
        toast({
          title: "Erro",
          description: "Projeto não encontrado",
          variant: "destructive",
        });
        navigate('/cliente/meus-projetos');
        return;
      }

      // Verificar se o projeto pertence ao cliente logado
      if (projectData.clientId !== userProfile?.uid) {
        toast({
          title: "Acesso negado",
          description: "Este projeto não pertence a você",
          variant: "destructive",
        });
        navigate('/cliente/meus-projetos');
        return;
      }

      setProject(projectData);

      // Carregar propostas do projeto
      const projectProposals = await ProjectService.getProjectProposals(projectId);
      setProposals(projectProposals);
      console.log('[DetalheProjeto] proposals', projectProposals?.length);
      // Carregar status de fundos
      const fs = await FundsService.getProjectFundStatus(projectId);
      setFundStatus(fs);
      console.log('[DetalheProjeto] fundStatus', fs);
      // Carregar payment do projeto
      const payment = await FundsService.getProjectPayment(projectId);
      setProjectPayment(payment);
      console.log('[DetalheProjeto] projectPayment', payment);
      // Ajustar opção padrão do select com base no status
      if (fs) {
        const base = Math.min(100, Math.max(0, Math.round((fs.releasedPercentage || 0) / 10) * 10));
        releasedPctRef.current = base;
        const next = base < 100 ? base + 10 : 100;
        setPartialPercent(next);
        console.log('[DetalheProjeto] slider:init', { baseReleasedPct: base, next });
      }
    } catch (error) {
      console.error('[DetalheProjeto] loadProjectDetails:error', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do projeto",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('[DetalheProjeto] loadProjectDetails:end');
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    if (!project) return;

    try {
      setIsAcceptingProposal(true);
      const { paymentUrl } = await ProjectService.acceptProposal(project.id, proposalId);
      
      toast({
        title: "Sucesso!",
        description: "Proposta aceita! Redirecionando para pagamento...",
      });

      // Redirecionar para o link de pagamento
      window.location.href = paymentUrl;
    } catch (error) {
      console.error('Erro ao aceitar proposta:', error);
      toast({
        title: "Erro",
        description: "Erro ao aceitar proposta",
        variant: "destructive",
      });
    } finally {
      setIsAcceptingProposal(false);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      await ProjectService.rejectProposal(proposalId);
      
      toast({
        title: "Sucesso",
        description: "Proposta rejeitada",
      });

      // Recarregar dados
      await loadProjectDetails();
    } catch (error) {
      console.error('Erro ao rejeitar proposta:', error);
      toast({
        title: "Erro",
        description: "Erro ao rejeitar proposta",
        variant: "destructive",
      });
    }
  };

  // Função para formatação segura de datas
  const formatSafeDate = (date: any, formatString: string = "dd/MM/yyyy") => {
    try {
      if (!date) return "Data não informada";
      
      // Se é um Timestamp do Firebase
      if (date && typeof date.toDate === 'function') {
        return format(date.toDate(), formatString, { locale: ptBR });
      }
      
      // Se é uma string de data
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) return "Data inválida";
        return format(parsedDate, formatString, { locale: ptBR });
      }
      
      // Se é um objeto Date
      if (date instanceof Date) {
        if (isNaN(date.getTime())) return "Data inválida";
        return format(date, formatString, { locale: ptBR });
      }
      
      return "Data inválida";
    } catch (error) {
      console.error('Erro ao formatar data:', error, date);
      return "Data inválida";
    }
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) {
      return "R$ 0,00";
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCategoryLabel = (category: string | undefined | null) => {
    if (!category) return "Não informado";
    const categories = {
      desenvolvimento: "Desenvolvimento",
      design: "Design",
      marketing: "Marketing",
      redacao: "Redação",
      consultoria: "Consultoria",
      outros: "Outros"
    };
    return categories[category as keyof typeof categories] || category;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/cliente/meus-projetos')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalhes do Projeto</h1>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/cliente/meus-projetos')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projeto não encontrado</h1>
          </div>
        </div>
      </div>
    );
  }

  const acceptedProposal = proposals.find(p => p.status === 'aceita');
  const pendingProposals = proposals.filter(p => p.status === 'pendente');
  const rejectedProposals = proposals.filter(p => p.status === 'rejeitada');
  const canAcceptProposals = project.status !== 'executando' && !project.selectedFreelancerId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Botão Voltar */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/cliente/meus-projetos')}
          className="w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {/* Informações do Projeto */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
          {/* Título e Status */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{getProjectStatusIcon(project.status)}</span>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 line-clamp-2">{project.title}</h1>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <Badge className={`${getProjectStatusColor(project.status)} border font-medium w-fit`}>
                  {getProjectStatusLabel(project.status)}
                </Badge>
                <span className="text-sm text-gray-500">
                  Criado em {formatSafeDate(project.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <div>
                <span className="text-gray-500">Orçamento:</span>
                <div className="font-medium text-gray-900">
                  {formatCurrency(project.budget?.min)} - {formatCurrency(project.budget?.max)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <span className="text-gray-500">Prazo:</span>
                <div className="font-medium text-gray-900">
                  {formatSafeDate(project.deadline, "dd/MM/yyyy")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-gray-400" />
              <div>
                <span className="text-gray-500">Categoria:</span>
                <div className="font-medium text-gray-900">
                  {getCategoryLabel(project.category)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <span className="text-gray-500">Cliente:</span>
                <div className="font-medium text-gray-900">
                  {project.clientName || "Nome não informado"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal - Detalhes do Projeto */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informações do Projeto */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Informações do Projeto</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Descrição</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line break-words overflow-wrap-anywhere">
                  {stripHtml(project.description)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Categoria</h3>
                  <p className="text-gray-700">{getCategoryLabel(project.category)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Nível de Experiência</h3>
                  <p className="text-gray-700 capitalize">{project.experienceLevel}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Habilidades Necessárias</h3>
                <div className="flex flex-wrap gap-2">
                  {project.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Botão de cancelar projeto */}
          {project.status === 'recebendo_propostas' && (
            <Card className="p-6 border-red-200 bg-red-50">
              <h3 className="text-lg font-semibold text-red-700 mb-4">Cancelar Projeto</h3>
              <p className="mb-4 text-gray-700">Você pode cancelar este projeto enquanto ele estiver recebendo propostas. Esta ação é irreversível.</p>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleCancelProject}
              >
                Cancelar Projeto
              </Button>
            </Card>
          )}


          {/* Propostas / Selecionado */}
          {project.selectedFreelancerId ? (
            <Card className="p-6 border-green-200 bg-green-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Proposta Selecionada</h3>
              <ProjectLikesDisplay
                projectId={project.id}
                isProjectOwner={true}
                onAcceptProposal={(likeId, freelancerId) => {}}
                onContactFreelancer={(freelancerId) => {
                  const params = new URLSearchParams({
                    userId: freelancerId,
                    projectId: project.id,
                    projectTitle: project.title
                  });
                  navigate(`/cliente/mensagens?${params.toString()}`);
                }}
                canAcceptProposals={false}
                selectedFreelancerId={project.selectedFreelancerId}
                showSelectedOnly={true}
              />
              {project.status === 'aguardando_garantia' && (
                <div className="mt-4">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    Pagar garantia
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-6">
              <ProjectLikesDisplay
                projectId={project.id}
                isProjectOwner={true}
                onAcceptProposal={(likeId, freelancerId) => {
                  toast({
                    title: "Proposta aceita!",
                    description: "Redirecionando para pagamento...",
                  });
                }}
                onContactFreelancer={(freelancerId) => {
                  const params = new URLSearchParams({
                    userId: freelancerId,
                    projectId: project.id,
                    projectTitle: project.title
                  });
                  navigate(`/cliente/mensagens?${params.toString()}`);
                }}
                canAcceptProposals={canAcceptProposals}
              />
            </Card>
          )}
        </div>

        {/* Sidebar - Informações Resumidas */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Informações Gerais</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Orçamento</p>
                  <p className="font-medium">
                    {formatCurrency(project.budget.min)} - {formatCurrency(project.budget.max)}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {project.budget.type === 'fixo' ? 'Preço fixo' : 'Por hora'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Prazo</p>
                  <p className="font-medium">
                    {formatSafeDate(project.deadline)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Propostas</p>
                  <p className="font-medium">{proposals.length} recebida(s)</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Status de Pagamento */}
          {project.status === 'aguardando_garantia' && acceptedProposal && (
            <Card className="p-6 border-yellow-200 bg-yellow-50">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Aguardando Pagamento
              </h3>
              
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-600 mb-2">Freelancer selecionado:</p>
                  <p className="font-medium text-gray-900">{acceptedProposal.freelancerName}</p>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-600 mb-2">Valor acordado:</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(acceptedProposal.proposedBudget)}
                  </p>
                </div>
                
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Importante:</strong> O projeto só será iniciado após a confirmação do pagamento.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Entregas Parciais Pendentes */}
          {project.partialDeliveries && project.partialDeliveries.filter(d => d.status === 'aguardando_aceite').length > 0 && (
            <Card className="p-6 border-orange-200 bg-orange-50">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Entregas Aguardando sua Revisão
              </h3>
              
              <div className="space-y-3">
                {project.partialDeliveries.filter(d => d.status === 'aguardando_aceite').map((delivery) => (
                  <Card key={delivery.id} className="p-4 bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl font-bold text-orange-600">{delivery.percentage}%</span>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            Aguardando Aceite
                          </Badge>
                        </div>
                        {delivery.description && (
                          <p className="text-sm text-gray-700 mt-2">{delivery.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Entregue em:{' '}
                          {format(
                            delivery.deliveredAt?.toDate
                              ? delivery.deliveredAt.toDate()
                              : new Date(delivery.deliveredAt),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Valor</div>
                        <div className="text-lg font-bold text-green-600">
                          {acceptedProposal && formatCurrency((acceptedProposal.proposedBudget * delivery.percentage) / 100)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          toast({
                            title: 'Em breve',
                            description: 'Funcionalidade de rejeição em desenvolvimento',
                          });
                        }}
                      >
                        Solicitar Ajustes
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={async () => {
                          if (!project || !userProfile || !acceptedProposal) return;
                          
                          try {
                            // Aceitar a entrega
                            await ProjectService.acceptPartialDelivery(project.id, delivery.id);
                            
                            // Liberar o valor proporcional
                            const payment = await FundsService.getProjectPayment(project.id);
                            const fundStatus = await FundsService.getProjectFundStatus(project.id);
                            
                            if (payment && fundStatus) {
                              await FundsService.requestFundRelease(
                                {
                                  projectId: project.id,
                                  chatId: '',
                                  releaseType: 'partial',
                                  percentage: delivery.percentage,
                                  reason: `Aceite de entrega parcial de ${delivery.percentage}%`,
                                },
                                project.clientId,
                                userProfile.name || 'Cliente',
                                payment.freelancerId,
                                acceptedProposal.freelancerName,
                                project.title,
                                fundStatus.projectValue
                              );
                            }

                            toast({
                              title: 'Entrega aceita!',
                              description: `Entrega de ${delivery.percentage}% aceita e valor liberado.`,
                            });

                            // Recarregar dados
                            await loadProjectDetails();
                          } catch (error) {
                            console.error('Erro ao aceitar entrega:', error);
                            toast({
                              title: 'Erro',
                              description: 'Erro ao aceitar entrega',
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aceitar e Liberar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* Histórico de Entregas Aceitas */}
          {project.partialDeliveries && project.partialDeliveries.filter(d => d.status === 'aceita').length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Entregas Aceitas
              </h3>
              
              <div className="space-y-2">
                {project.partialDeliveries.filter(d => d.status === 'aceita').map((delivery) => (
                  <div key={delivery.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-semibold">{delivery.percentage}%</div>
                        {delivery.description && (
                          <p className="text-xs text-gray-600">{delivery.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Aceita em:{' '}
                          {delivery.acceptedAt && format(
                            delivery.acceptedAt?.toDate
                              ? delivery.acceptedAt.toDate()
                              : new Date(delivery.acceptedAt),
                            "dd/MM/yyyy",
                            { locale: ptBR }
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="font-semibold text-green-600">
                      {acceptedProposal && formatCurrency((acceptedProposal.proposedBudget * delivery.percentage) / 100)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Projeto Aguardando Aceite */}
          {project.status === 'aguardando_aceite_cliente' && (
            <Card className="p-6 border-blue-200 bg-blue-50">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                Projeto Finalizado pelo Freelancer
              </h3>
              
              <div className="space-y-3">
                <Alert className="bg-white">
                  <AlertDescription>
                    <strong>O freelancer marcou o projeto como concluído!</strong>
                    <p className="text-sm mt-2">
                      Revise o trabalho entregue e aceite a conclusão para liberar o pagamento final.
                    </p>
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      toast({
                        title: 'Em breve',
                        description: 'Funcionalidade de contestação em desenvolvimento',
                      });
                    }}
                  >
                    Solicitar Revisão
                  </Button>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      if (!project || !userProfile) return;
                      
                      try {
                        // Buscar informações do pagamento
                        const payment = await FundsService.getProjectPayment(project.id);
                        const fundStatus = await FundsService.getProjectFundStatus(project.id);
                        
                        if (!payment || !fundStatus) {
                          toast({
                            title: 'Erro',
                            description: 'Informações de pagamento não encontradas',
                            variant: 'destructive',
                          });
                          return;
                        }

                        // Calcular quanto falta liberar (100% - já liberado)
                        const remainingPercentage = Math.max(0, 100 - fundStatus.releasedPercentage);
                        
                        if (remainingPercentage > 0) {
                          // Liberar o restante (100%)
                          await FundsService.requestFundRelease(
                            {
                              projectId: project.id,
                              chatId: '',
                              releaseType: 'full',
                              percentage: remainingPercentage,
                              reason: 'Aceite de conclusão do projeto',
                            },
                            project.clientId,
                            userProfile.name || 'Cliente',
                            payment.freelancerId,
                            acceptedProposal?.freelancerName || 'Freelancer',
                            project.title,
                            fundStatus.projectValue
                          );
                        }

                        // Atualizar status do projeto para concluído
                        await ProjectService.updateProjectStatus(project.id, 'concluido');

                        toast({
                          title: 'Projeto aceito!',
                          description: 'O pagamento foi liberado para o freelancer.',
                        });

                        // Recarregar dados
                        await loadProjectDetails();
                      } catch (error) {
                        console.error('Erro ao aceitar conclusão:', error);
                        toast({
                          title: 'Erro',
                          description: 'Erro ao aceitar conclusão do projeto',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aceitar e Liberar Pagamento
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Ações */}
          {project.status === 'executando' && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Pagamentos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setPartialDialogOpen(true)}
                >
                  Realizar pagamento
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de Pagamento da Garantia */}
      <ProjectPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        project={project}
        onPaymentSuccess={async () => {
          // Após pagamento, recarregar os dados do projeto
          await loadProjectDetails();
          setShowPaymentModal(false);
        }}
      />

      {/* Dialog de pagamento parcial */}
      <Dialog open={partialDialogOpen} onOpenChange={setPartialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Realizar pagamento</DialogTitle>
            <DialogDescription>Libere uma porcentagem do valor contratado. Deve ser em passos de 10%.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Porcentagem (de 10 em 10)</Label>
            <div className="px-2">
              <Slider
                step={10}
                min={releasedPctRef.current}
                max={100}
                value={[partialPercent]}
                onValueChange={(v) => {
                  setPartialPercent(v[0]);
                  console.log('[DetalheProjeto] slider:change', { value: v[0], base: releasedPctRef.current });
                }}
              />
            </div>
            <div className="text-sm text-gray-700">Selecionado: {partialPercent}%</div>
            {fundStatus && (
              <p className="text-xs text-gray-500">
                Já liberado: {fundStatus.releasedPercentage.toFixed(0)}% • Restante: {fundStatus.remainingPercentage.toFixed(0)}%
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartialDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                // Identificar freelancer e valor do projeto com fallbacks
                const selectedLike = project.selectedFreelancerId
                  ? (project.likes || []).find(l => l.freelancerId === project.selectedFreelancerId)
                  : undefined;
                const freelancerId = projectPayment?.freelancerId || acceptedProposal?.freelancerId || project.selectedFreelancerId || selectedLike?.freelancerId;
                const freelancerName = projectPayment?.freelancerName || acceptedProposal?.freelancerName || (selectedLike as any)?.freelancerName || 'Freelancer';
                // Priorizar sempre o valor líquido da proposta (sem taxa da plataforma)
                const projectValue =
                  acceptedProposal?.proposedBudget ||
                  (selectedLike as any)?.proposedValue ||
                  project.budget?.max ||
                  fundStatus?.projectValue ||
                  projectPayment?.projectValue;
                console.log('[DetalheProjeto] confirm:context', { freelancerId, freelancerName, projectValue, releasedPct: releasedPctRef.current, selectedPct: partialPercent });

                if (!freelancerId || !projectValue) {
                  toast({ title: 'Erro', description: 'Dados do pagamento não encontrados. Verifique a proposta selecionada.', variant: 'destructive' });
                  return;
                }
                try {
                  setIsRequestingRelease(true);
                  // Garantir que exista registro de pagamento/escrow antes de validar
                  let pp = await FundsService.getProjectPayment(project!.id);
                  if (!pp) {
                    console.log('[DetalheProjeto] confirm:createProjectPayment (net project value)');
                    await FundsService.createOrUpdateProjectPayment(
                      project!.id,
                      project!.title,
                      projectValue as number,
                      project!.clientId,
                      freelancerId
                    );
                    // Atualizar status de fundos base após criação
                    const fsSeed = await FundsService.getProjectFundStatus(project!.id);
                    setFundStatus(fsSeed);
                    if (fsSeed) {
                      releasedPctRef.current = Math.min(100, Math.round((fsSeed.releasedPercentage || 0) / 10) * 10);
                      console.log('[DetalheProjeto] confirm:seeded-escrow', { baseReleasedPct: releasedPctRef.current });
                    }
                  }
                  const isFull = partialPercent === 100;
                  // Liberação calculada como delta entre o selecionado e o já liberado
                  const selectedPct = partialPercent;
                  const baseReleased = releasedPctRef.current;
                  const deltaPct = Math.max(0, selectedPct - baseReleased);
                  console.log('[DetalheProjeto] confirm:calc', { isFull, selectedPct, baseReleased, deltaPct });
                  // SEMPRE enviar percentage, mesmo para 100% - usar deltaPct para calcular apenas o restante
                  const request = { 
                    projectId: project!.id, 
                    chatId: '', 
                    releaseType: isFull ? 'full' as const : 'partial' as const, 
                    percentage: deltaPct 
                  };
                  const validation = await FundsService.validateReleaseRequest(request as any);
                  if (!validation.isValid) {
                    toast({ title: 'Não permitido', description: validation.error || 'Liberação inválida', variant: 'destructive' });
                    console.log('[DetalheProjeto] confirm:validation-failed', validation);
                    return;
                  }

                  const releaseId = await FundsService.requestFundRelease(
                    request as any,
                    project!.clientId,
                    userProfile?.name || 'Cliente',
                    freelancerId,
                    freelancerName,
                    project!.title,
                    projectValue as number
                  );
                  console.log('[DetalheProjeto] confirm:release-created', releaseId);
                  // Feedback ao usuário
                  if (isFull) {
                    toast({ title: 'Aguarde liberação total', description: 'O sistema está concluindo a liberação.' });
                  } else {
                    toast({ title: 'Liberação solicitada', description: 'Os fundos serão liberados em instantes.' });
                  }
 
                  // Recarregar status (com polling curto para consistência eventual)
                  let fs2 = await FundsService.getProjectFundStatus(project!.id);
                  let pay2 = await FundsService.getProjectPayment(project!.id);
                  let tries = 0;
                  while (tries < 4 && fs2 && pay2 && fs2.totalReleased === (projectPayment?.totalReleased || 0)) {
                    await new Promise(r => setTimeout(r, 500));
                    fs2 = await FundsService.getProjectFundStatus(project!.id);
                    pay2 = await FundsService.getProjectPayment(project!.id);
                    tries++;
                  }
                  console.log('[DetalheProjeto] confirm:post-refresh', { fs2, pay2 });
                  setFundStatus(fs2);
                  setProjectPayment(pay2);
                  if (!fs2 || fs2.remainingAmount == null) {
                    console.warn('[DetalheProjeto] fund status veio nulo; forçando leitura direta do payment');
                  }
                  if (isFull) {
                    try {
                      await ProjectService.completeProject(project!.id);
                      toast({ title: 'Projeto concluído', description: 'Liberação de 100% registrada e projeto concluído.' });
                      console.log('[DetalheProjeto] confirm:project-completed');
                    } catch (err) {
                      toast({ title: 'Aviso', description: 'Liberação total registrada, mas não foi possível concluir o projeto automaticamente.', variant: 'destructive' });
                      console.error('[DetalheProjeto] completeProject:error', err);
                    }
                  } else {
                    toast({ title: 'Solicitado', description: `Liberação de ${partialPercent}% registrada.` });
                    console.log('[DetalheProjeto] confirm:partial-release-toast');
                  }
                  setPartialDialogOpen(false);
                } catch (e) {
                  console.error('[DetalheProjeto] confirm:error', e);
                  toast({ title: 'Erro', description: 'Falha ao solicitar liberação', variant: 'destructive' });
                } finally {
                  setIsRequestingRelease(false);
                  console.log('[DetalheProjeto] confirm:end');
                }
              }}
              disabled={isRequestingRelease}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente para exibir cada proposta
const ProposalCard = ({ 
  proposal, 
  onAccept, 
  onReject, 
  isAccepting, 
  showActions 
}: {
  proposal: ProjectProposal;
  onAccept: () => void;
  onReject: () => void;
  isAccepting: boolean;
  showActions: boolean;
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatação segura de datas
  const formatSafeDate = (date: any, formatString: string = "dd/MM/yyyy 'às' HH:mm") => {
    try {
      if (!date) return "Data não informada";
      
      // Se é um Timestamp do Firebase
      if (date && typeof date.toDate === 'function') {
        return format(date.toDate(), formatString, { locale: ptBR });
      }
      
      // Se é uma string de data
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) return "Data inválida";
        return format(parsedDate, formatString, { locale: ptBR });
      }
      
      // Se é um objeto Date
      if (date instanceof Date) {
        if (isNaN(date.getTime())) return "Data inválida";
        return format(date, formatString, { locale: ptBR });
      }
      
      return "Data inválida";
    } catch (error) {
      console.error('Erro ao formatar data:', error, date);
      return "Data inválida";
    }
  };

  return (
    <Card className="p-4 border border-gray-200">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-blue-100 text-blue-600">
            {proposal.freelancerName.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>

        {/* Conteúdo Principal */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900">{proposal.freelancerName}</h4>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm text-gray-600">{proposal.freelancerRating.toFixed(1)}</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(proposal.proposedBudget)}
              </div>
              <div className="text-sm text-gray-500">
                {proposal.estimatedDays} dias
              </div>
            </div>
          </div>

          <p className="text-gray-700 mb-3 text-sm leading-relaxed">
            {proposal.coverLetter}
          </p>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Enviada em {formatSafeDate(proposal.createdAt)}
            </div>

            {showActions && proposal.status === 'pendente' && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={onReject}
                  disabled={isAccepting}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Rejeitar
                </Button>
                <Button 
                  size="sm"
                  onClick={onAccept}
                  disabled={isAccepting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {isAccepting ? 'Aceitando...' : 'Aceitar'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DetalheProjeto;