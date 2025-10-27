import { useState, useEffect } from 'react';
import { useAppSelector } from '@/hooks/redux';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, Users, DollarSign, Star, TrendingUp } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { ProjectService } from "@/services/projectService";
import { Project, ProjectProposal } from "@/types/project";
import { 
  getProjectStatusColor, 
  getProjectStatusLabel, 
  getProjectStatusIcon 
} from "@/utils/projectHelpers";

const VisaoGeral = () => {
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [allProposals, setAllProposals] = useState<ProjectProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    activeProjects: 0,
    completedProjects: 0,
    totalSpent: 0,
    uniqueFreelancers: 0
  });

  // Função para formatação segura de moeda
  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) {
      return "R$ 0,00";
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  useEffect(() => {
    if (userProfile) {
      loadDashboardData();
    }
  }, [userProfile]);

  const loadDashboardData = async () => {
    if (!userProfile) return;

    try {
      setIsLoading(true);
      
      // Carregar projetos do cliente
      const clientProjects = await ProjectService.getClientProjects(userProfile.uid);
      setProjects(clientProjects);

      // Carregar todas as propostas dos projetos do cliente
      const proposalPromises = clientProjects.map(project => 
        ProjectService.getProjectProposals(project.id)
      );
      const proposalsArrays = await Promise.all(proposalPromises);
      const allClientProposals = proposalsArrays.flat();
      setAllProposals(allClientProposals);

      // Calcular estatísticas
      const activeProjects = clientProjects.filter(p => 
        p.status === 'recebendo_propostas' || 
        p.status === 'aguardando_garantia' || 
        p.status === 'executando'
      ).length;
      
      const completedProjects = clientProjects.filter(p => 
        p.status === 'concluido'
      ).length;

      const acceptedProposals = allClientProposals.filter(p => p.status === 'aceita');
      const totalSpent = acceptedProposals.reduce((sum, proposal) => sum + (proposal.proposedBudget || 0), 0);
      
      const uniqueFreelancers = new Set(acceptedProposals.map(p => p.freelancerId)).size;

      setStats({
        activeProjects,
        completedProjects,
        totalSpent,
        uniqueFreelancers
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
      title: "Freelancers Contratados",
      value: stats.uniqueFreelancers.toString(),
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Gasto Total",
      value: formatCurrency(stats.totalSpent),
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Avaliação Média",
      value: userProfile?.rating?.toFixed(1) || "5.0",
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
  ];

  // Pegar os 3 projetos mais recentes
  const recentProjects = projects
    .sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    })
    .slice(0, 3)
    .map(project => {
      const acceptedProposal = allProposals.find(p => 
        p.projectId === project.id && p.status === 'aceita'
      );
      return {
        id: project.id,
        title: project.title || "Título não informado",
        status: project.status || 'recebendo_propostas',
        freelancer: acceptedProposal?.freelancerName || 'Aguardando propostas',
        budget: acceptedProposal ? 
          formatCurrency(acceptedProposal.proposedBudget) : 
          `${formatCurrency(project.budget?.min)} - ${formatCurrency(project.budget?.max)}`
      };
    });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Olá, {userProfile?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie seus projetos e encontre os melhores freelancers
          </p>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Olá, {userProfile?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie seus projetos e encontre os melhores freelancers
          </p>
        </div>
        <Button 
          onClick={() => navigate('/cliente/publicar-projeto')}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Publicar Projeto
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            variant="outline" 
            className="h-20 flex-col"
            onClick={() => navigate('/cliente/publicar-projeto')}
          >
            <Plus className="h-6 w-6 mb-2" />
            Publicar Novo Projeto
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col"
            onClick={() => navigate('/cliente/freelancers')}
          >
            <Users className="h-6 w-6 mb-2" />
            Buscar Freelancers
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col"
                            onClick={() => navigate('/cliente/mensagens')}
          >
            <TrendingUp className="h-6 w-6 mb-2" />
            Ver Relatórios
          </Button>
        </div>
      </Card>

      {/* Recent Projects */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Projetos Recentes</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/cliente/meus-projetos')}
          >
            Ver Todos
          </Button>
        </div>
        
        {recentProjects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Você ainda não publicou nenhum projeto</p>
            <Button 
              onClick={() => navigate('/cliente/publicar-projeto')}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Publicar Primeiro Projeto
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6">
            {recentProjects.map((project) => (
              <div key={project.id} className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-md transition-all duration-200">
                {/* Header do projeto */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getProjectStatusIcon(project.status)}</span>
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{project.title}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {project.freelancer === 'Aguardando propostas' ? 
                          'Aguardando propostas' : 
                          project.freelancer
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:items-end gap-2">
                    <Badge className={`${getProjectStatusColor(project.status)} border font-medium whitespace-nowrap`}>
                      {getProjectStatusLabel(project.status)}
                    </Badge>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {project.budget}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer com ações */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    Projeto #{project.id?.slice(-8)}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => project.id && navigate(`/cliente/projeto/${project.id}`)}
                    className="text-xs"
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Resumo de Propostas */}
      {allProposals.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumo de Propostas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {allProposals.filter(p => p.status === 'pendente').length}
              </div>
              <div className="text-sm text-yellow-700">Propostas Pendentes</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {allProposals.filter(p => p.status === 'aceita').length}
              </div>
              <div className="text-sm text-green-700">Propostas Aceitas</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {allProposals.length}
              </div>
              <div className="text-sm text-blue-700">Total de Propostas</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default VisaoGeral;
