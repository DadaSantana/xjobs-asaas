import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Shield, 
  CheckCircle, 
  ArrowLeft, 
  User, 
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle
} from "lucide-react";
import { ProjectService } from '@/services/projectService';
import { Project, ProjectProposal } from '@/types/project';

const Pagamento = () => {
  const { projectId, proposalId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [proposal, setProposal] = useState<ProjectProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId, proposalId]);

  const loadData = async () => {
    if (!projectId || !proposalId) {
      toast({
        title: "Erro",
        description: "Parâmetros inválidos",
        variant: "destructive"
      });
      navigate('/cliente/projetos');
      return;
    }

    try {
      setLoading(true);
      
      // Carregar projeto
      const projectData = await ProjectService.getProjectById(projectId);
      if (!projectData) {
        throw new Error('Projeto não encontrado');
      }
      setProject(projectData);

      // Carregar propostas do projeto
      const proposals = await ProjectService.getProjectProposals(projectId);
      const selectedProposal = proposals.find(p => p.id === proposalId);
      
      if (!selectedProposal) {
        throw new Error('Proposta não encontrada');
      }
      setProposal(selectedProposal);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do pagamento",
        variant: "destructive"
      });
      navigate('/cliente/projetos');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!project || !proposal) return;

    try {
      setProcessing(true);
      
      // Aceitar proposta e gerar link de pagamento
      const result = await ProjectService.acceptProposal(project.id, proposal.id);
      
      toast({
        title: "Redirecionando para pagamento",
        description: "Você será redirecionado para completar o pagamento...",
      });

      // Redirecionar para o link de pagamento
      window.location.href = result.paymentUrl;
      
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: "Erro no pagamento",
        description: "Erro ao processar pagamento. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: any) => {
    if (!date) return "Data não informada";
    
    try {
      if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('pt-BR');
      }
      
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('pt-BR');
      }
      
      if (date instanceof Date) {
        return date.toLocaleDateString('pt-BR');
      }
      
      return "Data inválida";
    } catch (error) {
      return "Data inválida";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados do pagamento...</p>
        </div>
      </div>
    );
  }

  if (!project || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Dados não encontrados</h2>
            <p className="text-gray-600 mb-4">Não foi possível carregar os dados do pagamento.</p>
            <Button onClick={() => navigate('/cliente/projetos')}>
              Voltar aos Projetos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/cliente/projeto/${projectId}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Projeto
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Finalizar Pagamento
          </h1>
          <p className="text-gray-600">
            Confirme os detalhes e finalize o pagamento para iniciar o projeto
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Detalhes do Projeto */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Detalhes do Projeto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {project.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {project.description}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Categoria</p>
                    <Badge variant="outline">{project.category}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Prazo</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(project.deadline)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detalhes do Freelancer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Freelancer Selecionado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-lg">
                      {proposal.freelancerName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{proposal.freelancerName}</h3>
                    <p className="text-gray-600">⭐ {proposal.freelancerRating.toFixed(1)}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-500 mb-2">Proposta</p>
                  <p className="text-gray-700">{proposal.coverLetter}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Prazo Estimado</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {proposal.estimatedDays} dias
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Data da Proposta</p>
                    <p className="font-medium">
                      {formatDate(proposal.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumo do Pagamento */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Resumo do Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor do Projeto</span>
                    <span className="font-medium">{formatCurrency(proposal.proposedBudget)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxa da Plataforma (10%)</span>
                    <span className="font-medium">{formatCurrency(proposal.proposedBudget * 0.1)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-green-600">{formatCurrency(proposal.totalValue)}</span>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Pagamento Seguro</h4>
                      <p className="text-sm text-blue-700">
                        Seu pagamento fica em garantia até a conclusão do projeto.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pagar {formatCurrency(proposal.totalValue)}
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Ao continuar, você concorda com nossos{' '}
                    <a href="#" className="text-blue-600 hover:underline">
                      Termos de Serviço
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Garantias */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Suas Garantias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Dinheiro em garantia até a entrega</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Mediação profissional em disputas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Suporte 24/7 durante o projeto</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Reembolso em caso de não entrega</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pagamento;