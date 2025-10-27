import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertTriangle,
  Users,
  TrendingUp,
  Ban,
  MoreVertical,
  Eye,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/hooks/redux";
import { ProjectService } from "@/services/projectService";
import { Project, ProjectProposal } from "@/types/project";
import { stripHtml } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ManagerProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const userProfile = useAppSelector(state => state.auth.userProfile);

  const [project, setProject] = useState<Project | null>(null);
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    if (!userProfile || (userProfile.role !== 'manager' && userProfile.role !== 'moderator')) {
      navigate('/manager/login');
      return;
    }

    if (id) {
      loadProjectData();
    }
  }, [id, userProfile, navigate]);

  const loadProjectData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const [projectData, proposalsData] = await Promise.all([
        ProjectService.getProjectById(id),
        ProjectService.getProjectProposals(id)
      ]);

      if (projectData) {
        setProject(projectData);
        setProposals(proposalsData);
      } else {
        toast({
          title: "Erro",
          description: "Projeto não encontrado",
          variant: "destructive",
        });
        navigate('/manager/projects');
      }
    } catch (error) {
      console.error('Erro ao carregar dados do projeto:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do projeto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelProject = async () => {
    if (!project) return;

    try {
      await ProjectService.updateProjectStatus(project.id, 'cancelado');
      toast({
        title: "Sucesso",
        description: `Projeto "${project.title}" foi cancelado`,
      });
      setShowCancelDialog(false);
      loadProjectData(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao cancelar projeto:', error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar projeto",
        variant: "destructive",
      });
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'recebendo_propostas': 'Em Aberto',
      'aguardando_garantia': 'Aguardando Garantia',
      'executando': 'Executando',
      'concluido': 'Concluído',
      'cancelado': 'Cancelado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'recebendo_propostas': 'bg-blue-100 text-blue-800 border-blue-200',
      'aguardando_garantia': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'executando': 'bg-green-100 text-green-800 border-green-200',
      'concluido': 'bg-purple-100 text-purple-800 border-purple-200',
      'cancelado': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const isOldProject = (project: Project) => {
    if (project.status !== 'recebendo_propostas') return false;

    const createdDate = project.createdAt instanceof Date
      ? project.createdAt
      : project.createdAt?.toDate?.() || new Date();

    return differenceInDays(new Date(), createdDate) > 90;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-300" />
          <p className="text-gray-600">Projeto não encontrado</p>
          <Button className="mt-4" onClick={() => navigate('/manager/projects')}>
            Voltar para Projetos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/manager/projects')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{project.title}</h1>
              <p className="text-sm text-gray-600">Detalhes do projeto</p>
            </div>
          </div>

          {/* Menu de ações */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/manager/projects/${project.id}`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCancelDialog(true)}>
                  <Ban className="h-4 w-4 mr-2" />
                  Cancelar Projeto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status e informações básicas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Informações do Projeto</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(project.status)}>
                    {getStatusLabel(project.status)}
                  </Badge>
                  {isOldProject(project) && (
                    <Badge variant="destructive">
                      Projeto Antigo (&gt;90 dias)
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Descrição</h3>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: project.description }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>Cliente:</strong> {project.clientName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>Criado em:</strong> {format(
                      project.createdAt instanceof Date ? project.createdAt : project.createdAt?.toDate?.() || new Date(),
                      "dd 'de' MMMM 'de' yyyy",
                      { locale: ptBR }
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>Prazo:</strong> {format(project.deadline, "dd/MM/yyyy")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>Orçamento:</strong> R$ {project.budget.min.toLocaleString('pt-BR')} - R$ {project.budget.max.toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>Categoria:</strong> {project.category}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>Nível:</strong> {project.experienceLevel}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Propostas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Propostas Recebidas ({proposals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proposals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma proposta recebida ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {proposals.map((proposal) => (
                    <div key={proposal.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={proposal.freelancerImage} />
                              <AvatarFallback>
                                {proposal.freelancerName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{proposal.freelancerName}</p>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs text-gray-500">{proposal.freelancerRating}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{proposal.coverLetter}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>
                              <strong>Valor:</strong> R$ {proposal.proposedBudget.toLocaleString('pt-BR')}
                            </span>
                            <span>
                              <strong>Prazo:</strong> {proposal.estimatedDays} dias
                            </span>
                            <Badge variant={proposal.status === 'aceita' ? 'default' : 'secondary'}>
                              {proposal.status === 'aceita' ? 'Aceita' :
                               proposal.status === 'rejeitada' ? 'Rejeitada' : 'Pendente'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar com estatísticas */}
        <div className="space-y-6">
          {/* Estatísticas rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Propostas</span>
                <Badge variant="outline">{proposals.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Valor Médio</span>
                <span className="font-medium">
                  {proposals.length > 0
                    ? `R$ ${(proposals.reduce((sum, p) => sum + p.proposedBudget, 0) / proposals.length).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Dias em Aberto</span>
                <span className="font-medium">
                  {differenceInDays(new Date(), project.createdAt instanceof Date ? project.createdAt : project.createdAt?.toDate?.() || new Date())}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Freelancer selecionado (se houver) */}
          {project.selectedFreelancerId && (
            <Card>
              <CardHeader>
                <CardTitle>Freelancer Selecionado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-2">
                    <AvatarFallback>
                      {proposals.find(p => p.freelancerId === project.selectedFreelancerId)?.freelancerName.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium">
                    {proposals.find(p => p.freelancerId === project.selectedFreelancerId)?.freelancerName || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {proposals.find(p => p.freelancerId === project.selectedFreelancerId)?.proposedBudget ?
                      `R$ ${proposals.find(p => p.freelancerId === project.selectedFreelancerId)?.proposedBudget.toLocaleString('pt-BR')}` :
                      'Valor não definido'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Ban className="h-4 w-4 mr-2" />
                    Cancelar Projeto
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar Projeto</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja cancelar o projeto "{project.title}"?
                      Esta ação não pode ser desfeita e o projeto será marcado como cancelado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelProject}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Sim, Cancelar Projeto
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AlertDialog para confirmação de cancelamento */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o projeto "{project.title}"?
              Esta ação não pode ser desfeita e o projeto será marcado como cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelProject}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, Cancelar Projeto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManagerProjectDetail;
