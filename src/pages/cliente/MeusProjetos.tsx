import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Calendar, DollarSign, Users, Star, MessageCircle, CheckCircle, XCircle, Eye, ArrowRight, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/hooks/redux";
import { ProjectService } from "@/services/projectService";
import { ProjectLikesService } from "@/services/projectLikesService";
import { Project, ProjectProposal, ProjectStatus, ProjectLike } from "@/types/project";
import { 
  getProjectStatusColor, 
  getProjectStatusLabel, 
  getProjectStatusIcon,
  canAdvanceProjectStatus,
  getNextActionLabel
} from "@/utils/projectHelpers";
import { stripHtml } from "@/lib/utils";
import ProjectPaymentModal from "@/components/ProjectPaymentModal";
import { FundsService } from "@/services/fundsService";
import { NotificationService } from "@/services/notificationService";

const MeusProjetos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userProfile = useAppSelector(state => state.auth.userProfile);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [proposals, setProposals] = useState<{ [projectId: string]: ProjectProposal[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancingStatus, setIsAdvancingStatus] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProposalsDialog, setShowProposalsDialog] = useState(false);
  const [projectForProposals, setProjectForProposals] = useState<Project | null>(null);
  const [isAcceptingProposal, setIsAcceptingProposal] = useState(false);

  useEffect(() => {
    if (userProfile) {
      loadProjects();
    }
  }, [userProfile]);

  const loadProjects = async () => {
    if (!userProfile?.uid) return;

    try {
      setIsLoading(true);
      const clientProjects = await ProjectService.getClientProjects(userProfile.uid);
      
      // Carregar likes para cada projeto
      const projectsWithLikes = await Promise.all(
        clientProjects.map(async (project) => {
          if (project.id) {
            try {
              const likes = await ProjectLikesService.getProjectLikes(project.id);
              return { ...project, likes };
            } catch (error) {
              console.error(`Erro ao carregar likes do projeto ${project.id}:`, error);
              return { ...project, likes: [] };
            }
          }
          return project;
        })
      );
      
      setProjects(projectsWithLikes);

      // Carregar propostas para cada projeto
      const proposalsData: { [projectId: string]: ProjectProposal[] } = {};
      for (const project of projectsWithLikes) {
        if (project.id) {
          const projectProposals = await ProjectService.getProjectProposals(project.id);
          proposalsData[project.id] = projectProposals;
        }
      }
      setProposals(proposalsData);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar projetos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadProposals = async (projectId: string) => {
    try {
      const projectProposals = await ProjectService.getProjectProposals(projectId);
      setProposals(prevProposals => ({ ...prevProposals, [projectId]: projectProposals }));
    } catch (error) {
      console.error('Erro ao carregar propostas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar propostas",
        variant: "destructive",
      });
    }
  };

  const handleOpenProposalsDialog = (project: Project) => {
    setProjectForProposals(project);
    setShowProposalsDialog(true);
  };

  const handleAcceptProposal = async (projectId: string, proposalId: string) => {
    try {
      setIsAcceptingProposal(true);
      await ProjectService.acceptProposal(projectId, proposalId);
      
      toast({
        title: "Sucesso",
        description: "Proposta aceita com sucesso!",
      });

      // Fechar o dialog
      setShowProposalsDialog(false);
      setProjectForProposals(null);

      // Recarregar dados
      await loadProjects();
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

  const handleAcceptLike = async (projectId: string, like: ProjectLike) => {
    try {
      setIsAcceptingProposal(true);
      
      // Aceitar a curtida/proposta do freelancer
      await ProjectLikesService.acceptProjectLike(projectId, like.id);
      
      toast({
        title: "Sucesso",
        description: "Proposta aceita com sucesso!",
      });

      // Fechar o dialog
      setShowProposalsDialog(false);
      setProjectForProposals(null);

      // Recarregar dados
      await loadProjects();
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

  const handleRejectProposal = async (proposalId: string, projectId: string) => {
    try {
      await ProjectService.rejectProposal(proposalId);
      
      toast({
        title: "Sucesso",
        description: "Proposta rejeitada",
      });

      // Recarregar dados
      await loadProjects();
    } catch (error) {
      console.error('Erro ao rejeitar proposta:', error);
      toast({
        title: "Erro",
        description: "Erro ao rejeitar proposta",
        variant: "destructive",
      });
    }
  };

  const handleAdvanceStatus = async (projectId: string, currentStatus: string) => {
    const nextStatus = canAdvanceProjectStatus(currentStatus as ProjectStatus);
    if (!nextStatus) return;

    try {
      setIsAdvancingStatus(true);
      // Se projeto está executando e a próxima etapa seria concluir, primeiro libere 100% dos fundos remanescentes
      if (currentStatus === 'executando' && nextStatus === 'concluido') {
        // Obter contexto do projeto e valores
        const project = projects.find(p => p.id === projectId);
        if (!project) throw new Error('Projeto não encontrado');

        // Identificar freelancer e valor
        // Buscar status de fundos e pagamento; se não houver escrow, não é possível finalizar
        const projectFundStatus = await FundsService.getProjectFundStatus(projectId);
        const projectPayment = await FundsService.getProjectPayment(projectId);
        if (!projectFundStatus || !projectPayment) {
          toast({ title: 'Não permitido', description: 'Nenhum valor em garantia para liberar. Use o fluxo de pagamento parcial/total na página do projeto.', variant: 'destructive' });
          return;
        }
        const projectProposals = proposals[projectId] || [];
        const acceptedProposal = projectProposals.find(p => p.status === 'aceita');
        const selectedLike = project.selectedFreelancerId
          ? (project.likes || []).find(l => l.freelancerId === project.selectedFreelancerId)
          : null;
        const freelancerId = projectPayment?.freelancerId || acceptedProposal?.freelancerId || project.selectedFreelancerId || selectedLike?.freelancerId || undefined;
        const freelancerName = acceptedProposal?.freelancerName || selectedLike?.freelancerName || 'Freelancer';
        const projectValue = projectFundStatus?.projectValue || projectPayment?.projectValue || acceptedProposal?.proposedBudget || selectedLike?.proposedValue;

        // Se ainda há saldo, solicitar liberação total
        const remainingAmount = projectFundStatus.remainingAmount;
        if (remainingAmount <= 0) {
          toast({ title: 'Nada a liberar', description: 'Todos os fundos já foram liberados.', variant: 'destructive' });
          return;
        }
        if (freelancerId && (projectValue || projectPayment.projectValue)) {
          const request = {
            projectId: projectId,
            chatId: '',
            releaseType: 'full' as const
          };
          const validation = await FundsService.validateReleaseRequest(request);
          if (!validation.isValid) {
            throw new Error(validation.error || 'Liberação inválida');
          }
          await FundsService.requestFundRelease(
            request,
            project.clientId,
            userProfile?.name || 'Cliente',
            freelancerId,
            freelancerName,
            project.title,
            (projectPayment.projectValue || projectValue || 0) as number
          );

          // Aguardar processamento da liberação (polling curto)
          let attempts = 0;
          const maxAttempts = 6; // ~6 segundos
          while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1000));
            const fs = await FundsService.getProjectFundStatus(projectId);
            if (fs && fs.remainingAmount <= 0) break;
            attempts++;
          }
        } else {
          toast({ title: 'Dados insuficientes', description: 'Não foi possível identificar freelancer/valor do projeto.', variant: 'destructive' });
          return;
        }

        // Confirmar se tudo foi liberado e então marcar como concluído
        const fsAfter = await FundsService.getProjectFundStatus(projectId);
        if (fsAfter && fsAfter.remainingAmount <= 0) {
          await ProjectService.updateProjectStatus(projectId, 'concluido');
        } else {
          toast({ title: 'Liberação pendente', description: 'Aguarde a liberação total antes de concluir.', variant: 'destructive' });
          return;
        }

        // Enviar notificações para avaliação (cliente e freelancer)
        try {
          // Cliente avalia Freelancer
          await NotificationService.createNotification({
            userId: project.clientId,
            type: 'rating_request',
            title: 'Avalie o Freelancer',
            message: `O projeto "${project.title}" foi concluído. Deixe sua avaliação para o freelancer.`,
            actionUrl: `/cliente/avaliar?projectId=${projectId}&targetUserId=${freelancerId}&targetRole=freelancer`,
            actionLabel: 'Avaliar Freelancer',
            data: { projectId, targetUserId: freelancerId, targetRole: 'freelancer' }
          });

          // Freelancer avalia Cliente
          await NotificationService.createNotification({
            userId: String(freelancerId),
            type: 'rating_request',
            title: 'Avalie o Cliente',
            message: `O projeto "${project.title}" foi concluído. Deixe sua avaliação para o cliente.`,
            actionUrl: `/freelancer/avaliar?projectId=${projectId}&targetUserId=${project.clientId}&targetRole=client`,
            actionLabel: 'Avaliar Cliente',
            data: { projectId, targetUserId: project.clientId, targetRole: 'client' }
          });
        } catch (notifyErr) {
          console.error('Falha ao enviar notificações de avaliação:', notifyErr);
        }
      } else {
        // Fluxo padrão para outros avanços de status
        await ProjectService.updateProjectStatus(projectId, nextStatus);
      }
      
      toast({
        title: "Sucesso",
        description: currentStatus === 'executando' && nextStatus === 'concluido'
          ? 'Projeto finalizado e fundos liberados (se havia saldo).'
          : `Status atualizado para ${getProjectStatusLabel(nextStatus)}`,
      });

      // Recarregar dados
      await loadProjects();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar status do projeto",
        variant: "destructive",
      });
    } finally {
      setIsAdvancingStatus(false);
    }
  };

  const handlePaymentClick = (project: Project) => {
    setSelectedProject(project);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    if (selectedProject && selectedProject.id) {
      try {
        // Atualizar o status do projeto para "executando"
        await ProjectService.updateProjectStatus(selectedProject.id, 'executando');
        
        toast({
          title: "Pagamento Confirmado!",
          description: "O projeto foi iniciado com sucesso.",
        });

        // Recarregar dados
        await loadProjects();
      } catch (error) {
        console.error('Erro ao atualizar status após pagamento:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar status do projeto",
          variant: "destructive",
        });
      }
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "recebendo_propostas": return "bg-green-100 text-green-800";
      case "aguardando_garantia": return "bg-yellow-100 text-yellow-800";
      case "executando": return "bg-blue-100 text-blue-800";
      case "aguardando_aceite_cliente": return "bg-purple-100 text-purple-800";
      case "concluido": return "bg-gray-100 text-gray-800";
      case "cancelado": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: ProjectStatus) => {
    switch (status) {
      case "recebendo_propostas": return "Recebendo Propostas";
      case "aguardando_garantia": return "Aguardando Garantia";
      case "executando": return "Executando";
      case "aguardando_aceite_cliente": return "Aguardando Aceite";
      case "concluido": return "Concluído";
      case "cancelado": return "Cancelado";
      default: return status;
    }
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

  const filterProjectsByStatus = (status: string) => {
    if (!projects || projects.length === 0) return [];
    if (status === 'todos') return projects;
    return projects.filter(project => project.status === status);
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

  const ProjectCard = ({ project }: { project: Project }) => {
    const projectProposals = project.id ? proposals[project.id] || [] : [];
    const acceptedProposal = projectProposals.find(p => p.status === 'aceita');
    const pendingProposals = projectProposals.filter(p => p.status === 'pendente');
    
    // Buscar dados dos likes se não houver propostas tradicionais
    const projectLikes = project.likes || [];
    const selectedLike = project.selectedFreelancerId
      ? projectLikes.find(l => l.freelancerId === project.selectedFreelancerId) || null
      : null;
    
    const nextStatus = canAdvanceProjectStatus(project.status || 'recebendo_propostas');

    return (
      <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow w-full max-w-full overflow-hidden">
        {/* Header com título e status */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{getProjectStatusIcon(project.status || 'recebendo_propostas')}</span>
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 break-words overflow-hidden">{project.title || "Título não informado"}</h3>
            </div>
            <p className="text-gray-600 mb-3 line-clamp-2 break-words overflow-hidden">{stripHtml(project.description || "Descrição não disponível")}</p>
          </div>
          
          <Badge className={`${getProjectStatusColor(project.status || 'recebendo_propostas')} border font-medium whitespace-nowrap`}>
            {getProjectStatusLabel(project.status || 'recebendo_propostas')}
          </Badge>
        </div>

        {/* Informações do projeto - melhoradas para mobile */}
        <div className="space-y-3 mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Criado em {formatSafeDate(project.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium text-green-600">
                {formatCurrency(project.budget?.min)} - {formatCurrency(project.budget?.max)}
              </span>
            </div>
          </div>

          {/* Status do freelancer/propostas */}
          <div className="p-3 bg-gray-50 rounded-lg">
            {acceptedProposal ? (
              <div className="text-sm">
                <div className="text-gray-600 mb-1">Freelancer Contratado:</div>
                <div className="font-medium text-green-600 break-words overflow-hidden">
                  {acceptedProposal.freelancerName || "Nome não informado"}
                </div>
                <div className="text-sm text-gray-500">
                  Valor acordado: {formatCurrency(acceptedProposal.proposedBudget)}
                </div>
              </div>
            ) : selectedLike ? (
              <div className="text-sm">
                <div className="text-gray-600 mb-1">Freelancer Selecionado:</div>
                <div className="font-medium text-green-600 break-words overflow-hidden">
                  {selectedLike.freelancerName || "Nome não informado"}
                </div>
                <div className="text-sm text-gray-500">
                  Valor proposto: {formatCurrency(selectedLike.proposedValue)}
                </div>
                <div className="text-xs text-gray-400 mt-1 break-words overflow-hidden">
                  <div className="line-clamp-2">
                    {selectedLike.message || "Mensagem não disponível"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm">
                <div className="flex items-center justify-between">
                  <div className="text-gray-600 mb-1">Propostas Recebidas:</div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {projectProposals.length > 0 ? projectProposals.length : projectLikes.length}
                  </Badge>
                </div>
                {(projectProposals.length > 0 || projectLikes.length > 0) && (
                  <div className="text-xs text-gray-500 mt-1">
                    Clique em "Aceitar Proposta" para visualizar
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Botões de ação - layout responsivo */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-3">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => project.id && navigate(`/cliente/projeto/${project.id}`)}
            className="flex-1 md:flex-none"
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>

          {/* Botão de Pagamento para projetos aguardando garantia */}
          {(project.status || 'recebendo_propostas') === 'aguardando_garantia' && (
            <Button
              size="sm"
              onClick={() => handlePaymentClick(project)}
              className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pagar Garantia
            </Button>
          )}

          {/* Botão de aceitar proposta para projetos recebendo propostas */}
          {(project.status || 'recebendo_propostas') === 'recebendo_propostas' && (
            <Button
              size="sm"
              onClick={() => {
                const totalProposals = projectProposals.length > 0 ? projectProposals.length : projectLikes.length;
                if (totalProposals === 0) {
                  toast({
                    title: "Sem propostas",
                    description: "Nenhuma proposta foi recebida ainda.",
                    variant: "destructive",
                  });
                } else {
                  handleOpenProposalsDialog(project);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 flex-1 md:flex-none"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aceitar Proposta
            </Button>
          )}

          {/* Botão de avançar status para outros casos (ocultar para executando e recebendo_propostas) */}
          {nextStatus && 
           (project.status || 'recebendo_propostas') !== 'aguardando_garantia' && 
           (project.status || 'recebendo_propostas') !== 'executando' && 
           (project.status || 'recebendo_propostas') !== 'recebendo_propostas' && (
            <Button
              size="sm"
              onClick={() => project.id && handleAdvanceStatus(project.id, project.status || 'recebendo_propostas')}
              disabled={isAdvancingStatus}
              className="bg-blue-600 hover:bg-blue-700 flex-1 md:flex-none"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              {isAdvancingStatus ? 'Atualizando...' : getNextActionLabel(project.status || 'recebendo_propostas')}
            </Button>
          )}
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Projetos</h1>
          <p className="text-gray-600">Gerencie todos os seus projetos publicados</p>
        </div>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500">Carregando projetos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Projetos</h1>
          <p className="text-gray-600">Gerencie todos os seus projetos publicados</p>
        </div>
        <Button 
          onClick={() => navigate('/cliente/publicar-projeto')}
          className="bg-green-600 hover:bg-green-700 w-full md:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      <Tabs defaultValue="todos" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto">
          <TabsTrigger value="todos" className="text-xs md:text-sm p-2 md:p-3">
            <span className="hidden md:inline">Todos</span>
            <span className="md:hidden">Todos</span>
            <span className="ml-1">({projects.length})</span>
          </TabsTrigger>
          <TabsTrigger value="recebendo_propostas" className="text-xs md:text-sm p-2 md:p-3">
            <span className="hidden md:inline">Recebendo Propostas</span>
            <span className="md:hidden">Propostas</span>
            <span className="ml-1">({filterProjectsByStatus('recebendo_propostas').length})</span>
          </TabsTrigger>
          <TabsTrigger value="aguardando_garantia" className="text-xs md:text-sm p-2 md:p-3">
            <span className="hidden md:inline">Aguardando Garantia</span>
            <span className="md:hidden">Garantia</span>
            <span className="ml-1">({filterProjectsByStatus('aguardando_garantia').length})</span>
          </TabsTrigger>
          <TabsTrigger value="executando" className="text-xs md:text-sm p-2 md:p-3">
            <span className="hidden md:inline">Executando</span>
            <span className="md:hidden">Ativo</span>
            <span className="ml-1">({filterProjectsByStatus('executando').length})</span>
          </TabsTrigger>
          <TabsTrigger value="aguardando_aceite_cliente" className="text-xs md:text-sm p-2 md:p-3">
            <span className="hidden md:inline">Aguardando Aceite</span>
            <span className="md:hidden">Aceite</span>
            <span className="ml-1">({filterProjectsByStatus('aguardando_aceite_cliente').length})</span>
          </TabsTrigger>
          <TabsTrigger value="concluido" className="text-xs md:text-sm p-2 md:p-3">
            <span className="hidden md:inline">Concluído</span>
            <span className="md:hidden">Feito</span>
            <span className="ml-1">({filterProjectsByStatus('concluido').length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-4">
          {projects.length === 0 ? (
            <Card className="p-6 md:p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum projeto ainda
                </h3>
                <p className="text-gray-500 mb-6 text-sm md:text-base">
                  Comece publicando seu primeiro projeto e encontre freelancers talentosos para trabalhar com você
                </p>
                <Button 
                  onClick={() => navigate('/cliente/publicar-projeto')}
                  className="w-full md:w-auto bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Publicar Primeiro Projeto
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:gap-6">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recebendo_propostas" className="space-y-4">
          {filterProjectsByStatus('recebendo_propostas').length === 0 ? (
            <Card className="p-6 md:p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">⏳</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum projeto recebendo propostas
                </h3>
                <p className="text-gray-500 mb-6 text-sm md:text-base">
                  Publique novos projetos para começar a receber propostas de freelancers
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:gap-6">
              {filterProjectsByStatus('recebendo_propostas').map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="aguardando_garantia" className="space-y-4">
          {filterProjectsByStatus('aguardando_garantia').length === 0 ? (
            <Card className="p-6 md:p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">💳</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum projeto aguardando garantia
                </h3>
                <p className="text-gray-500 text-sm md:text-base">
                  Projetos aparecerão aqui quando você aceitar uma proposta
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:gap-6">
              {filterProjectsByStatus('aguardando_garantia').map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="executando" className="space-y-4">
          {filterProjectsByStatus('executando').length === 0 ? (
            <Card className="p-6 md:p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">⚡</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum projeto em execução
                </h3>
                <p className="text-gray-500 text-sm md:text-base">
                  Projetos em andamento aparecerão aqui
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:gap-6">
              {filterProjectsByStatus('executando').map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="aguardando_aceite_cliente" className="space-y-4">
          {filterProjectsByStatus('aguardando_aceite_cliente').length === 0 ? (
            <Card className="p-6 md:p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">⏳</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum projeto aguardando aceite
                </h3>
                <p className="text-gray-500 text-sm md:text-base">
                  Quando o freelancer finalizar um projeto, ele aparecerá aqui para você aceitar
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:gap-6">
              {filterProjectsByStatus('aguardando_aceite_cliente').map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="concluido" className="space-y-4">
          {filterProjectsByStatus('concluido').length === 0 ? (
            <Card className="p-6 md:p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum projeto concluído
                </h3>
                <p className="text-gray-500 text-sm md:text-base">
                  Projetos finalizados aparecerão aqui
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:gap-6">
              {filterProjectsByStatus('concluido').map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Pagamento */}
      <ProjectPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        project={selectedProject}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Dialog de Seleção de Propostas */}
      <Dialog open={showProposalsDialog} onOpenChange={setShowProposalsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Proposta</DialogTitle>
            <DialogDescription>
              Escolha uma proposta para aceitar e iniciar o projeto
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {projectForProposals && (() => {
              const projectProposals = projectForProposals.id ? proposals[projectForProposals.id] || [] : [];
              const projectLikes = projectForProposals.likes || [];
              const pendingProposals = projectProposals.filter(p => p.status === 'pendente');

              // Priorizar propostas tradicionais, se não houver, usar likes
              if (pendingProposals.length > 0) {
                return pendingProposals.map((proposal) => (
                  <Card key={proposal.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {proposal.freelancerName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{proposal.freelancerName}</h4>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{proposal.freelancerRating.toFixed(1)}</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">{proposal.coverLetter}</p>
                          
                          <div className="flex flex-wrap gap-3 text-sm">
                            <div className="flex items-center gap-1 text-green-600 font-semibold">
                              <DollarSign className="h-4 w-4" />
                              <span>{formatCurrency(proposal.proposedBudget)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Calendar className="h-4 w-4" />
                              <span>{proposal.estimatedDays} dias</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => projectForProposals.id && handleAcceptProposal(projectForProposals.id, proposal.id)}
                          disabled={isAcceptingProposal}
                          className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {isAcceptingProposal ? 'Aceitando...' : 'Aceitar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => projectForProposals.id && handleRejectProposal(proposal.id, projectForProposals.id)}
                          className="flex-1 md:flex-none"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ));
              } else if (projectLikes.length > 0) {
                return projectLikes.map((like) => (
                  <Card key={like.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {like.freelancerName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{like.freelancerName}</h4>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{like.freelancerRating.toFixed(1)}</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">{like.message}</p>
                          
                          <div className="flex flex-wrap gap-3 text-sm">
                            <div className="flex items-center gap-1 text-green-600 font-semibold">
                              <DollarSign className="h-4 w-4" />
                              <span>{formatCurrency(like.proposedValue)}</span>
                            </div>
                            <div className="text-xs text-gray-400">
                              Total com comissão: {formatCurrency(like.totalValue)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => projectForProposals.id && handleAcceptLike(projectForProposals.id, like)}
                          disabled={isAcceptingProposal}
                          className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {isAcceptingProposal ? 'Aceitando...' : 'Aceitar'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ));
              } else {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhuma proposta disponível</p>
                  </div>
                );
              }
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeusProjetos;
