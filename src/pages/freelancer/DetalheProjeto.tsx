import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  DollarSign,
  ArrowLeft,
  CheckCircle,
  MessageCircle,
  Clock,
  User,
  FileText,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/hooks/redux";
import { ProjectService } from "@/services/projectService";
import { Project } from "@/types/project";
import { stripHtml } from "@/lib/utils";
import { getProjectStatusColor, getProjectStatusLabel } from "@/utils/projectHelpers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DetalheProjetoFreelancer = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const userProfile = useAppSelector((s) => s.auth.userProfile);

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      const p = await ProjectService.getProjectById(projectId);
      if (!p) {
        toast({ title: "Projeto não encontrado", variant: "destructive" });
        navigate("/freelancer/meus-projetos");
        return;
      }
      setProject(p);
    } catch (e) {
      console.error("Erro ao carregar projeto:", e);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o projeto",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishProject = async () => {
    if (!project || !userProfile) return;

    setIsFinishing(true);
    try {
      // Atualizar status do projeto para aguardando_aceite_cliente
      await ProjectService.updateProjectStatus(project.id, 'aguardando_aceite_cliente');

      toast({
        title: "Projeto finalizado!",
        description: "O cliente será notificado para aceitar a conclusão do projeto.",
      });

      setShowFinishDialog(false);
      
      // Recarregar projeto
      await loadProject();
    } catch (error) {
      console.error("Erro ao finalizar projeto:", error);
      toast({
        title: "Erro",
        description: "Erro ao finalizar projeto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsFinishing(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
        <Card className="p-8 text-center">
          <p className="text-gray-600">Carregando projeto...</p>
        </Card>
      </div>
    );
  }

  if (!project) return null;

  // Encontrar minha proposta/like no projeto
  const myLike = (project.likes || []).find((l) => l.freelancerId === userProfile?.uid);
  const proposedValue = myLike?.proposedValue || 0;

  // Verificar se sou o freelancer selecionado
  const isSelectedFreelancer = project.selectedFreelancerId === userProfile?.uid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate("/freelancer/meus-projetos")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Meus Projetos
        </Button>
      </div>

      {/* Informações do Projeto */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{project.title}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className={getProjectStatusColor(project.status)}>
                  {getProjectStatusLabel(project.status)}
                </Badge>
                <Badge variant="outline">{project.category}</Badge>
                {isSelectedFreelancer && (
                  <Badge className="bg-blue-100 text-blue-800">
                    Você foi selecionado
                  </Badge>
                )}
              </div>
            </div>
            {proposedValue > 0 && (
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(proposedValue)}
                </div>
                <div className="text-sm text-gray-500">Valor acordado</div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Descrição */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Descrição do Projeto</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {stripHtml(project.description)}
            </p>
          </div>

          <Separator />

          {/* Informações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Prazo de Entrega</div>
                <div className="font-semibold">
                  {format(project.deadline, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Orçamento</div>
                <div className="font-semibold">
                  {formatCurrency(project.budget.min)} - {formatCurrency(project.budget.max)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Cliente</div>
                <div className="font-semibold">{project.clientName}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Publicado em</div>
                <div className="font-semibold">
                  {format(
                    project.createdAt?.toDate ? project.createdAt.toDate() : new Date(),
                    "dd/MM/yyyy",
                    { locale: ptBR }
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Skills Necessárias */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Habilidades Necessárias</h3>
            <div className="flex flex-wrap gap-2">
              {project.skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Minha Proposta */}
          {myLike && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Minha Proposta</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Valor Proposto:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(myLike.proposedValue)}
                    </span>
                  </div>
                  {myLike.message && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Mensagem:</div>
                      <p className="text-gray-700 italic">"{myLike.message}"</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Ações do Projeto */}
      {isSelectedFreelancer && (
        <Card>
          <CardHeader>
            <CardTitle>Ações do Projeto</CardTitle>
            <CardDescription>Gerencie o status e comunicação do projeto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status atual */}
            {project.status === 'executando' && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Projeto em Andamento</strong>
                  <p className="text-sm mt-1">
                    Quando concluir o trabalho, finalize o projeto para que o cliente possa revisar e aceitar.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {project.status === 'aguardando_aceite_cliente' && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <strong className="text-yellow-900">Aguardando Aceite do Cliente</strong>
                  <p className="text-sm mt-1 text-yellow-800">
                    O projeto foi marcado como concluído. Aguarde o cliente aceitar a conclusão para receber o pagamento.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {project.status === 'concluido' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong className="text-green-900">Projeto Concluído!</strong>
                  <p className="text-sm mt-1 text-green-800">
                    O cliente aceitou a conclusão. O pagamento foi liberado para sua carteira.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1">
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat com Cliente
              </Button>

              {project.status === 'executando' && (
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => setShowFinishDialog(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalizar Projeto
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Confirmação */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao finalizar, o projeto será marcado como concluído e o cliente será notificado para
              aceitar a conclusão. Após o aceite, o pagamento será liberado para sua carteira.
              <br /><br />
              <strong>Confirma que o projeto está completo e pronto para entrega?</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFinishing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinishProject}
              disabled={isFinishing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isFinishing ? "Finalizando..." : "Sim, Finalizar Projeto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DetalheProjetoFreelancer;
