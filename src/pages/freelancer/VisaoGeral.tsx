import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, DollarSign, TrendingUp, Eye, Heart, Briefcase, Send, Star, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/hooks/redux";
import { ProjectService } from "@/services/projectService";
import { Project, ProjectProposal } from "@/types/project";
import { 
  getProjectStatusColor, 
  getProjectStatusLabel, 
  getProjectStatusIcon 
} from "@/utils/projectHelpers";
import { stripHtml } from "@/lib/utils";

const VisaoGeral = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userProfile = useAppSelector(state => state.auth.userProfile);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [myProposals, setMyProposals] = useState<ProjectProposal[]>([]);
  const [mySelectedProjects, setMySelectedProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    activeProjects: 0,
    completedProjects: 0,
    totalEarnings: 0,
    successRate: 0,
    acceptedProposals: 0,
    totalProposals: 0
  });

  useEffect(() => {
    if (userProfile) {
      loadDashboardData();
    }
  }, [userProfile]);

  const loadDashboardData = async () => {
    if (!userProfile) return;

    try {
      setIsLoading(true);
      
      // Carregar projetos disponíveis
      const availableProjects = await ProjectService.getProjects();
      setProjects(availableProjects.slice(0, 3)); // Últimos 3 projetos

      // Carregar propostas do freelancer
      const freelancerProposals = await ProjectService.getFreelancerProposals(userProfile.uid);
      setMyProposals(freelancerProposals);

      // Carregar projetos onde o freelancer foi selecionado
      const selectedProjects = await ProjectService.getProjectsBySelectedFreelancer(userProfile.uid);
      setMySelectedProjects(selectedProjects);

      // Calcular estatísticas
      const acceptedProposals = freelancerProposals.filter(p => p.status === 'aceita');
      const activeProjects = mySelectedProjects.filter(p => p.status === 'executando').length;

      const completedProjects = mySelectedProjects.filter(p => p.status === 'concluido').length;

      const totalEarnings = acceptedProposals.reduce((sum, proposal) => sum + proposal.proposedBudget, 0);
      
      const successRate = freelancerProposals.length > 0 ? 
        (acceptedProposals.length / freelancerProposals.length) * 100 : 0;

      setStats({
        activeProjects,
        completedProjects,
        totalEarnings,
        successRate,
        acceptedProposals: acceptedProposals.length,
        totalProposals: freelancerProposals.length
      });

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do dashboard",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Projetos Ativos",
      value: stats.activeProjects.toString(),
      icon: Briefcase,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Ganhos Totais",
      value: `R$ ${stats.totalEarnings.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Projetos Concluídos",
      value: stats.completedProjects.toString(),
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Taxa de Sucesso",
      value: `${stats.successRate.toFixed(1)}%`,
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'desenvolvimento': 'bg-blue-100 text-blue-800',
      'design': 'bg-purple-100 text-purple-800',
      'marketing': 'bg-green-100 text-green-800',
      'redacao': 'bg-yellow-100 text-yellow-800',
      'traducao': 'bg-red-100 text-red-800',
      'consultoria': 'bg-indigo-100 text-indigo-800',
      'outros': 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.outros;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 pb-8">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <Skeleton className="h-8 sm:h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
          <Skeleton className="h-9 w-full sm:w-40" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2">
                <div className="text-center sm:text-left w-full">
                  <Skeleton className="h-4 w-24 mx-auto sm:mx-0 mb-2" />
                  <Skeleton className="h-6 w-20 mx-auto sm:mx-0" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Actions Skeleton */}
        <Card className="p-3 sm:p-4">
          <Skeleton className="h-6 w-32 mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 sm:h-14" />
            ))}
          </div>
        </Card>

        {/* Projetos Recomendados Skeleton */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Meus Projetos Selecionados Skeleton */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Olá, {userProfile?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Encontre projetos incríveis e faça sua carreira decolar
          </p>
        </div>
        <Button 
          onClick={() => navigate('/freelancer/encontre-trabalho')}
          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          size="sm"
        >
          <Briefcase className="h-4 w-4 mr-2" />
          Buscar Projetos
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index} className="p-3 sm:p-4 hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-2 sm:p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Resumo de Propostas */}
      {myProposals.length > 0 && (
        <Card className="p-3 sm:p-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Resumo de Propostas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-yellow-50 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-base sm:text-lg font-bold text-yellow-600">
                {myProposals.filter(p => p.status === 'pendente').length}
              </div>
              <div className="text-xs text-yellow-700">Pendentes</div>
            </div>
            <div className="bg-green-50 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-base sm:text-lg font-bold text-green-600">
                {stats.acceptedProposals}
              </div>
              <div className="text-xs text-green-700">Aceitas</div>
            </div>
            <div className="bg-red-50 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-base sm:text-lg font-bold text-red-600">
                {myProposals.filter(p => p.status === 'rejeitada').length}
              </div>
              <div className="text-xs text-red-700">Rejeitadas</div>
            </div>
            <div className="bg-blue-50 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-base sm:text-lg font-bold text-blue-600">
                {stats.totalProposals}
              </div>
              <div className="text-xs text-blue-700">Total</div>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-3 sm:p-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            className="h-12 sm:h-14 flex-col"
            onClick={() => navigate('/freelancer/encontre-trabalho')}
          >
            <Briefcase className="h-4 w-4 mb-1" />
            <span className="text-xs">Buscar Projetos</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-12 sm:h-14 flex-col"
            onClick={() => navigate('/freelancer/meus-projetos')}
          >
            <Eye className="h-4 w-4 mb-1" />
            <span className="text-xs">Minhas Propostas</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-12 sm:h-14 flex-col"
            onClick={() => navigate('/freelancer/meu-perfil')}
          >
            <User className="h-4 w-4 mb-1" />
            <span className="text-xs">Meu Perfil</span>
          </Button>
        </div>
      </Card>

      {/* Projetos Recomendados */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Projetos Recomendados</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/freelancer/encontre-trabalho')}
          >
            Ver Todos
          </Button>
        </div>
        
        {projects.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 mb-3 text-sm">Nenhum projeto disponível no momento</p>
            <Button 
              onClick={() => navigate('/freelancer/encontre-trabalho')}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Explorar Projetos
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.slice(0, 2).map((project) => (
              <div key={project.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm truncate">{project.title}</h3>
                  </div>
                  <Badge className={`${getProjectStatusColor(project.status)} border font-medium text-xs whitespace-nowrap`}>
                    {getProjectStatusLabel(project.status)}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2 break-words">
                  {stripHtml(project.description)}
                </p>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">
                    {formatCurrency(project.budget.min)} - {formatCurrency(project.budget.max)}
                  </span>
                  <Button 
                    size="sm" 
                    onClick={() => navigate(`/freelancer/projeto/${project.id}`)}
                    className="bg-green-600 hover:bg-green-700 text-xs px-3 py-1 w-full sm:w-auto"
                    disabled={project.status !== 'recebendo_propostas'}
                  >
                    {project.status === 'recebendo_propostas' ? 'Ver' : 'Indisponível'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Meus Projetos Selecionados */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Meus Projetos Selecionados</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/freelancer/meus-projetos')}
          >
            Ver Detalhes
          </Button>
        </div>
        {mySelectedProjects.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm">Nenhum projeto selecionado para você ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mySelectedProjects.slice(0, 3).map((project) => (
              <div key={project.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm break-words leading-relaxed">{project.title}</h3>
                  </div>
                  <Badge className={`${getProjectStatusColor(project.status)} border font-medium text-xs whitespace-nowrap`}>
                    {getProjectStatusLabel(project.status)}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2 break-words">
                  {stripHtml(project.description)}
                </p>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">
                    {formatCurrency(project.budget.min)} - {formatCurrency(project.budget.max)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Performance */}
      {stats.totalProposals > 0 && (
        <Card className="p-3 sm:p-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Performance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center">
            <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
              <div className="text-base sm:text-lg font-bold text-gray-900">{stats.successRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">Taxa de Sucesso</div>
            </div>
            <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
              <div className="text-base sm:text-lg font-bold text-gray-900">{stats.activeProjects}</div>
              <div className="text-xs text-gray-600">Ativos</div>
            </div>
            <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
              <div className="text-base sm:text-lg font-bold text-gray-900">{stats.completedProjects}</div>
              <div className="text-xs text-gray-600">Concluídos</div>
            </div>
            <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
              <div className="text-base sm:text-lg font-bold text-gray-900">{stats.acceptedProposals}</div>
              <div className="text-xs text-gray-600">Aceitas</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default VisaoGeral;
