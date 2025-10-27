import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppSelector } from '@/hooks/redux';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ProjectService } from '@/services/projectService';
import { Project, ProjectStatus } from '@/types/project';
import {
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  User,
  DollarSign,
  Filter,
  RefreshCw,
  Ban,
  MoreVertical,
  Eye
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
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

interface ProjectStats {
  total: number;
  em_aberto: number;
  aguardando_garantia: number;
  executando: number;
  concluido: number;
  cancelado: number;
  projetos_antigos: number; // Projetos em aberto há mais de 90 dias
}

const ManagerProjects = () => {
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats>({
    total: 0,
    em_aberto: 0,
    aguardando_garantia: 0,
    executando: 0,
    concluido: 0,
    cancelado: 0,
    projetos_antigos: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'todos'>('todos');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [projectToCancel, setProjectToCancel] = useState<Project | null>(null);

  useEffect(() => {
    if (!userProfile || (userProfile.role !== 'manager' && userProfile.role !== 'moderator')) {
      navigate('/manager/login');
      return;
    }

    loadProjectsData();
  }, [userProfile, navigate]);

  const loadProjectsData = async () => {
    try {
      setLoading(true);

      // Buscar todos os projetos
      const projectsSnapshot = await ProjectService.getAllProjects();
      console.log('Projetos carregados:', projectsSnapshot.length);

      setProjects(projectsSnapshot);

      // Calcular estatísticas
      const newStats = calculateProjectStats(projectsSnapshot);
      setStats(newStats);

    } catch (error) {
      console.error('Erro ao carregar dados dos projetos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos projetos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProjectStats = (projectsList: Project[]): ProjectStats => {
    const now = new Date();
    let projetos_antigos = 0;

    const stats = projectsList.reduce((acc, project) => {
      // Contar projetos por status
      acc[project.status] = (acc[project.status] || 0) + 1;

      // Verificar se é projeto antigo (em aberto há mais de 90 dias)
      if (project.status === 'recebendo_propostas') {
        const createdDate = project.createdAt instanceof Date
          ? project.createdAt
          : project.createdAt?.toDate?.() || now;

        const daysDiff = differenceInDays(now, createdDate);
        if (daysDiff > 90) {
          projetos_antigos++;
        }
      }

      return acc;
    }, {} as Record<string, number>);

    return {
      total: projectsList.length,
      em_aberto: stats['recebendo_propostas'] || 0,
      aguardando_garantia: stats['aguardando_garantia'] || 0,
      executando: stats['executando'] || 0,
      concluido: stats['concluido'] || 0,
      cancelado: stats['cancelado'] || 0,
      projetos_antigos
    };
  };

  const getFilteredProjects = () => {
    if (selectedStatus === 'todos') {
      return projects;
    }
    return projects.filter(project => project.status === selectedStatus);
  };

  const getStatusLabel = (status: ProjectStatus) => {
    const labels = {
      'recebendo_propostas': 'Em Aberto',
      'aguardando_garantia': 'Aguardando Garantia',
      'executando': 'Executando',
      'concluido': 'Concluído',
      'cancelado': 'Cancelado'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: ProjectStatus) => {
    const colors = {
      'recebendo_propostas': 'bg-blue-100 text-blue-800 border-blue-200',
      'aguardando_garantia': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'executando': 'bg-green-100 text-green-800 border-green-200',
      'concluido': 'bg-purple-100 text-purple-800 border-purple-200',
      'cancelado': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const handleCancelProject = async () => {
    if (!projectToCancel) return;

    try {
      await ProjectService.updateProjectStatus(projectToCancel.id, 'cancelado');
      toast({
        title: "Sucesso",
        description: `Projeto "${projectToCancel.title}" foi cancelado`,
      });
      setShowCancelDialog(false);
      setProjectToCancel(null);
      loadProjectsData(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao cancelar projeto:', error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar projeto",
        variant: "destructive",
      });
    }
  };

  const openCancelDialog = (project: Project) => {
    setProjectToCancel(project);
    setShowCancelDialog(true);
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
          <p className="mt-4 text-gray-600">Carregando projetos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestão de Projetos</h1>
            <p className="text-sm md:text-base text-gray-600">Visão geral e controle dos projetos da plataforma</p>
          </div>
          <Button onClick={loadProjectsData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">📊 Estatísticas dos Projetos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Projetos cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.em_aberto}</div>
              <p className="text-xs text-muted-foreground">
                Recebendo propostas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aguardando Garantia</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.aguardando_garantia}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando pagamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Executando</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.executando}</div>
              <p className="text-xs text-muted-foreground">
                Em execução
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.concluido}</div>
              <p className="text-xs text-muted-foreground">
                Finalizados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cancelado}</div>
              <p className="text-xs text-muted-foreground">
                Cancelados
              </p>
            </CardContent>
          </Card>

          <Card className={stats.projetos_antigos > 0 ? "border-red-500 bg-red-50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Projetos Antigos
                {stats.projetos_antigos > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {stats.projetos_antigos}
                  </Badge>
                )}
              </CardTitle>
              <Ban className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.projetos_antigos}</div>
              <p className="text-xs text-muted-foreground">
                &gt; 90 dias em aberto
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.concluido / stats.total) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Projetos concluídos
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedStatus === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('todos')}
              >
                Todos ({stats.total})
              </Button>
              <Button
                variant={selectedStatus === 'recebendo_propostas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('recebendo_propostas')}
              >
                Em Aberto ({stats.em_aberto})
              </Button>
              <Button
                variant={selectedStatus === 'aguardando_garantia' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('aguardando_garantia')}
              >
                Aguardando Garantia ({stats.aguardando_garantia})
              </Button>
              <Button
                variant={selectedStatus === 'executando' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('executando')}
              >
                Executando ({stats.executando})
              </Button>
              <Button
                variant={selectedStatus === 'concluido' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('concluido')}
              >
                Concluído ({stats.concluido})
              </Button>
              <Button
                variant={selectedStatus === 'cancelado' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('cancelado')}
              >
                Cancelado ({stats.cancelado})
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Projetos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Projetos {selectedStatus === 'todos' ? 'Cadastrados' : getStatusLabel(selectedStatus as ProjectStatus)}
          </CardTitle>
          <CardDescription>
            {getFilteredProjects().length} projeto{getFilteredProjects().length !== 1 ? 's' : ''} encontrado{getFilteredProjects().length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {getFilteredProjects().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Briefcase className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>Nenhum projeto encontrado</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {getFilteredProjects().map((project) => (
                <div
                  key={project.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    isOldProject(project) ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusColor(project.status)}>
                          {getStatusLabel(project.status)}
                        </Badge>
                        {isOldProject(project) && (
                          <Badge variant="destructive">
                            Projeto Antigo (&gt;90 dias)
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {project.category}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{project.title}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {project.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {project.clientName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          R$ {project.budget.min.toLocaleString('pt-BR')} - R$ {project.budget.max.toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
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
                          <DropdownMenuItem onClick={() => openCancelDialog(project)}>
                            <Ban className="h-4 w-4 mr-2" />
                            Cancelar Projeto
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog para confirmação de cancelamento */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o projeto "{projectToCancel?.title}"?
              Esta ação não pode ser desfeita e o projeto será marcado como cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToCancel(null)}>Cancelar</AlertDialogCancel>
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

export default ManagerProjects;
