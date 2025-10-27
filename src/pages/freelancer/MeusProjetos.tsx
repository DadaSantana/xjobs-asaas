import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, DollarSign, Clock, MessageCircle, CheckCircle2, XCircle, AlertCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/hooks/redux";
import { ProjectService } from "@/services/projectService";
import { Project, ProjectProposal, ProposalStatus } from "@/types/project";
import { stripHtml } from "@/lib/utils";

const MeusProjetos = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const userProfile = useAppSelector(state => state.auth.userProfile);
  
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [projects, setProjects] = useState<{ [key: string]: Project }>({});
  const [mySelectedProjects, setMySelectedProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userProfile]);

  const loadData = async () => {
    if (!userProfile) return;

    try {
      setIsLoading(true);
      
      // Carregar propostas do freelancer
      const freelancerProposals = await ProjectService.getFreelancerProposals(userProfile.uid);
      setProposals(freelancerProposals);

      // Carregar detalhes dos projetos das propostas
      const projectIds = [...new Set(freelancerProposals.map(p => p.projectId))];
      const projectPromises = projectIds.map(id => ProjectService.getProjectById(id));
      const projectsData = await Promise.all(projectPromises);
      
      const projectsMap: { [key: string]: Project } = {};
      projectsData.forEach(project => {
        if (project) {
          projectsMap[project.id] = project;
        }
      });
      setProjects(projectsMap);

      // Carregar projetos onde o freelancer foi selecionado
      const selected = await ProjectService.getProjectsBySelectedFreelancer(userProfile.uid);
      setMySelectedProjects(selected);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: ProposalStatus) => {
    switch (status) {
      case 'aceita':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejeitada':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'retirada':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: ProposalStatus) => {
    switch (status) {
      case 'aceita': return 'bg-green-100 text-green-800';
      case 'rejeitada': return 'bg-red-100 text-red-800';
      case 'retirada': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status: ProposalStatus) => {
    switch (status) {
      case 'aceita': return 'Aceita';
      case 'rejeitada': return 'Rejeitada';
      case 'retirada': return 'Retirada';
      default: return 'Pendente';
    }
  };

  const getCategoryLabel = (category: string) => {
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

  const filterProposalsByStatus = (status: ProposalStatus) => {
    return proposals.filter(proposal => proposal.status === status);
  };

  const getAcceptedProjects = () => {
    return proposals
      .filter(proposal => proposal.status === 'aceita')
      .map(proposal => ({
        proposal,
        project: projects[proposal.projectId]
      }))
      .filter(item => item.project);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Projetos</h1>
          <p className="text-gray-600">Gerencie seus projetos em andamento e concluídos</p>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">Carregando projetos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meus Projetos</h1>
        <p className="text-gray-600">Gerencie seus projetos em andamento e propostas enviadas</p>
      </div>

      <Tabs defaultValue="aceitos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="aceitos" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Projetos </span>Aceitos ({getAcceptedProjects().length})
          </TabsTrigger>
          <TabsTrigger value="pendentes" className="text-xs sm:text-sm">
            Pendentes ({filterProposalsByStatus('pendente').length})
          </TabsTrigger>
          <TabsTrigger value="rejeitadas" className="text-xs sm:text-sm">
            Rejeitadas ({filterProposalsByStatus('rejeitada').length})
          </TabsTrigger>
          <TabsTrigger value="todas" className="text-xs sm:text-sm">
            Todas ({proposals.length})
          </TabsTrigger>
        </TabsList>

        {/* Projetos Aceitos */}
        <TabsContent value="aceitos" className="space-y-4">
          {getAcceptedProjects().length === 0 && mySelectedProjects.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">Você ainda não tem projetos aceitos</p>
            </Card>
          ) : (
            <>
              {getAcceptedProjects().map(({ proposal, project }) => (
                <Card key={proposal.id} className="p-3 md:p-6">
                <div className="space-y-3">
                  {/* Header com título e badges */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-base md:text-xl font-semibold text-gray-900 mb-2">{project.title}</h3>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          {project.status === 'em_andamento' ? 'Em Andamento' : 'Concluído'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(project.category)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-lg md:text-2xl font-bold text-green-600 mb-1">
                        R$ {proposal.proposedBudget.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">Valor aceito</div>
                    </div>
                  </div>
                  
                  {/* Descrição */}
                  <p className="text-gray-600 text-sm line-clamp-2">{stripHtml(project.description)}</p>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>

                {/* Footer com metadados e ações */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Prazo: {format(project.deadline, "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{proposal.estimatedDays} dias estimados</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Cliente: {project.clientName}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                      onClick={() => navigate(`/freelancer/projeto/${project.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </Card>
              ))}

              {/* Projetos onde fui selecionado (sem proposta explícita) */}
              {mySelectedProjects.map((project) => {
                const myLike = (project.likes || []).find(l => l.freelancerId === userProfile?.uid);
                const proposedValue = myLike?.proposedValue;
                return (
                  <Card key={`selected_${project.id}`} className="p-3 md:p-6">
                    <div className="space-y-3">
                      {/* Header com título e badges */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="text-base md:text-xl font-semibold text-gray-900 mb-2">{project.title}</h3>
                          <div className="flex flex-wrap gap-1 mb-2">
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              {project.status === 'executando' ? 'Em Andamento' : project.status === 'concluido' ? 'Concluído' : 'Selecionado'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(project.category)}
                            </Badge>
                          </div>
                        </div>
                        {proposedValue !== undefined && (
                          <div className="text-left sm:text-right">
                            <div className="text-lg md:text-2xl font-bold text-green-600 mb-1">
                              R$ {proposedValue.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">Valor proposto</div>
                          </div>
                        )}
                      </div>
                      
                      {/* Descrição */}
                      <p className="text-gray-600 text-sm line-clamp-2">{stripHtml(project.description)}</p>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    {/* Footer com metadados e ações */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Prazo: {format(project.deadline, "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>Cliente: {project.clientName}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => navigate(`/freelancer/projeto/${project.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>

        {/* Propostas Pendentes */}
        <TabsContent value="pendentes" className="space-y-4">
          {filterProposalsByStatus('pendente').map((proposal) => {
            const project = projects[proposal.projectId];
            if (!project) return null;

            return (
              <ProposalCard 
                key={proposal.id}
                proposal={proposal}
                project={project}
                getCategoryLabel={getCategoryLabel}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
              />
            );
          })}
        </TabsContent>

        {/* Propostas Rejeitadas */}
        <TabsContent value="rejeitadas" className="space-y-4">
          {filterProposalsByStatus('rejeitada').map((proposal) => {
            const project = projects[proposal.projectId];
            if (!project) return null;

            return (
              <ProposalCard 
                key={proposal.id}
                proposal={proposal}
                project={project}
                getCategoryLabel={getCategoryLabel}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
              />
            );
          })}
        </TabsContent>

        {/* Todas as Propostas */}
        <TabsContent value="todas" className="space-y-4">
          {proposals.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">Você ainda não enviou nenhuma proposta</p>
            </Card>
          ) : (
            proposals.map((proposal) => {
              const project = projects[proposal.projectId];
              if (!project) return null;

              return (
                <ProposalCard 
                  key={proposal.id}
                  proposal={proposal}
                  project={project}
                  getCategoryLabel={getCategoryLabel}
                  getStatusIcon={getStatusIcon}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                />
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Componente auxiliar para cartão de proposta
const ProposalCard = ({
  proposal,
  project,
  getCategoryLabel,
  getStatusIcon,
  getStatusColor,
  getStatusLabel
}: {
  proposal: ProjectProposal;
  project: Project;
  getCategoryLabel: (category: string) => string;
  getStatusIcon: (status: ProposalStatus) => JSX.Element;
  getStatusColor: (status: ProposalStatus) => string;
  getStatusLabel: (status: ProposalStatus) => string;
}) => (
  <Card className="p-3 md:p-6">
    <div className="space-y-3">
      {/* Header com título e badges */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex-1">
          <h3 className="text-base md:text-xl font-semibold text-gray-900 mb-2">{project.title}</h3>
          <div className="flex flex-wrap gap-1 mb-2">
            <div className="flex items-center gap-1">
              {getStatusIcon(proposal.status)}
              <Badge className={`${getStatusColor(proposal.status)} text-xs`}>
                {getStatusLabel(proposal.status)}
              </Badge>
            </div>
            <Badge variant="outline" className="text-xs">
              {getCategoryLabel(project.category)}
            </Badge>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-lg md:text-2xl font-bold text-blue-600 mb-1">
            R$ {proposal.proposedBudget.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Valor proposto</div>
        </div>
      </div>
      
      {/* Descrição */}
      <p className="text-gray-600 text-sm line-clamp-2">{stripHtml(project.description)}</p>
      
      {/* Carta de apresentação */}
      {proposal.coverLetter && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-700 italic">"Minha proposta: {proposal.coverLetter}"</p>
        </div>
      )}
    </div>

    {/* Skills */}
    <div className="flex flex-wrap gap-1 mb-3">
      {project.skills.map((skill) => (
        <Badge key={skill} variant="secondary" className="text-xs">
          {skill}
        </Badge>
      ))}
    </div>

    {/* Footer com metadados */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          <span>Enviada: {format(proposal.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR })}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{proposal.estimatedDays} dias</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Cliente: {project.clientName}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>{project.proposalsCount} propostas no total</span>
        </div>
      </div>

      {proposal.respondedAt && (
        <div className="text-xs sm:text-sm text-gray-500">
          Respondida em: {format(proposal.respondedAt.toDate(), "dd/MM/yyyy", { locale: ptBR })}
        </div>
      )}
    </div>
  </Card>
);

export default MeusProjetos;
