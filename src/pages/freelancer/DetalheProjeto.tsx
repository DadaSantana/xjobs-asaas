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
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/hooks/redux";
import { ProjectService } from "@/services/projectService";
import { Project } from "@/types/project";
import { stripHtml } from "@/lib/utils";
import { getProjectStatusColor, getProjectStatusLabel } from "@/utils/projectHelpers";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const [deliveryPercentage, setDeliveryPercentage] = useState(10);
  const [deliveryDescription, setDeliveryDescription] = useState("");

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
      // Criar entrega parcial
      const newDelivery = {
        id: `delivery_${Date.now()}`,
        percentage: deliveryPercentage,
        description: deliveryDescription.trim() || undefined,
        deliveredAt: new Date(),
        status: 'aguardando_aceite' as const,
      };

      const currentDeliveries = project.partialDeliveries || [];
      const updatedDeliveries = [...currentDeliveries, newDelivery];

      // Atualizar projeto com nova entrega
      await ProjectService.addPartialDelivery(project.id, newDelivery);

      // Se for entrega de 100% (total ou somando entregas anteriores), mudar status
      const totalDelivered = currentDeliveries
        .filter(d => d.status === 'aceita')
        .reduce((sum, d) => sum + d.percentage, 0);
      
      if (totalDelivered + deliveryPercentage >= 100) {
        await ProjectService.updateProjectStatus(project.id, 'aguardando_aceite_cliente');
      }

      toast({
        title: "Entrega enviada!",
        description: `Entrega de ${deliveryPercentage}% enviada. O cliente será notificado.`,
      });

      setShowFinishDialog(false);
      setDeliveryDescription("");
      
      // Recarregar projeto
      await loadProject();
    } catch (error) {
      console.error("Erro ao enviar entrega:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar entrega. Tente novamente.",
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

  // Calcular porcentagem já entregue e aceita
  const deliveredPercentage = (project.partialDeliveries || [])
    .filter(d => d.status === 'aceita')
    .reduce((sum, d) => sum + d.percentage, 0);

  // Calcular porcentagem pendente de aceite
  const pendingPercentage = (project.partialDeliveries || [])
    .filter(d => d.status === 'aguardando_aceite')
    .reduce((sum, d) => sum + d.percentage, 0);

  // Porcentagem restante para entregar
  const remainingPercentage = 100 - deliveredPercentage - pendingPercentage;

  // Porcentagem mínima para próxima entrega (deve ser pelo menos 10% maior que já entregue)
  const minNextPercentage = Math.min(deliveredPercentage + 10, 100);

  // Ao abrir o dialog, definir porcentagem inicial
  const handleOpenDialog = () => {
    setDeliveryPercentage(minNextPercentage);
    setShowFinishDialog(true);
  };

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

      {/* Histórico de Entregas Parciais */}
      {isSelectedFreelancer && project.partialDeliveries && project.partialDeliveries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Histórico de Entregas
            </CardTitle>
            <CardDescription>Acompanhe suas entregas parciais e o status de cada uma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.partialDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className={`p-4 rounded-lg border ${
                    delivery.status === 'aceita'
                      ? 'bg-green-50 border-green-200'
                      : delivery.status === 'aguardando_aceite'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">{delivery.percentage}%</span>
                        <Badge
                          variant={
                            delivery.status === 'aceita'
                              ? 'default'
                              : delivery.status === 'aguardando_aceite'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className={
                            delivery.status === 'aceita'
                              ? 'bg-green-600'
                              : delivery.status === 'aguardando_aceite'
                              ? 'bg-yellow-600'
                              : ''
                          }
                        >
                          {delivery.status === 'aceita'
                            ? 'Aceita'
                            : delivery.status === 'aguardando_aceite'
                            ? 'Aguardando Aceite'
                            : 'Rejeitada'}
                        </Badge>
                      </div>
                      {delivery.description && (
                        <p className="text-sm text-gray-700 mb-2">{delivery.description}</p>
                      )}
                      <div className="text-xs text-gray-600">
                        Entregue em:{' '}
                        {format(
                          delivery.deliveredAt?.toDate
                            ? delivery.deliveredAt.toDate()
                            : new Date(delivery.deliveredAt),
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR }
                        )}
                      </div>
                      {delivery.acceptedAt && (
                        <div className="text-xs text-gray-600">
                          Aceita em:{' '}
                          {format(
                            delivery.acceptedAt?.toDate
                              ? delivery.acceptedAt.toDate()
                              : new Date(delivery.acceptedAt),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </div>
                      )}
                      {delivery.rejectionReason && (
                        <div className="text-xs text-red-600 mt-1">
                          Motivo: {delivery.rejectionReason}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm text-gray-600">Valor</div>
                      <div className="font-bold text-lg">
                        {formatCurrency((proposedValue * delivery.percentage) / 100)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo */}
            <Separator className="my-4" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-600">Entregue</div>
                <div className="text-xl font-bold text-green-600">{deliveredPercentage}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Pendente</div>
                <div className="text-xl font-bold text-yellow-600">{pendingPercentage}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Restante</div>
                <div className="text-xl font-bold text-gray-600">{remainingPercentage}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

              {project.status === 'executando' && remainingPercentage > 0 && (
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleOpenDialog}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Enviar Entrega
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Entrega Parcial */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar Entrega Parcial</AlertDialogTitle>
            <AlertDialogDescription>
              Configure a porcentagem de entrega e adicione uma descrição (opcional). O cliente será
              notificado e poderá aceitar, liberando o valor proporcional.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Progresso Atual */}
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Já entregue e aceito:</span>
                <span className="font-semibold text-green-600">{deliveredPercentage}%</span>
              </div>
              {pendingPercentage > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Aguardando aceite:</span>
                  <span className="font-semibold text-yellow-600">{pendingPercentage}%</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Restante para entregar:</span>
                <span className="font-semibold text-gray-900">{remainingPercentage}%</span>
              </div>
            </div>

            {/* Seletor de Porcentagem */}
            <div className="space-y-2">
              <Label>Porcentagem desta entrega: {deliveryPercentage}%</Label>
              <Slider
                value={[deliveryPercentage]}
                onValueChange={([value]) => setDeliveryPercentage(value)}
                min={minNextPercentage}
                max={Math.min(remainingPercentage + deliveredPercentage, 100)}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Mínimo: {minNextPercentage}%</span>
                <span>Máximo: {Math.min(remainingPercentage + deliveredPercentage, 100)}%</span>
              </div>
            </div>

            {/* Valor da Entrega */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Valor desta entrega:</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency((proposedValue * deliveryPercentage) / 100)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {deliveryPercentage}% de {formatCurrency(proposedValue)}
              </div>
            </div>

            {/* Descrição da Entrega */}
            <div className="space-y-2">
              <Label htmlFor="delivery-description">Descrição da entrega (opcional)</Label>
              <Textarea
                id="delivery-description"
                placeholder="Ex: Implementação das telas de login e cadastro..."
                value={deliveryDescription}
                onChange={(e) => setDeliveryDescription(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-gray-500 text-right">
                {deliveryDescription.length}/500 caracteres
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFinishing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinishProject}
              disabled={isFinishing || deliveryPercentage < minNextPercentage}
              className="bg-green-600 hover:bg-green-700"
            >
              {isFinishing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Enviando...
                </>
              ) : (
                `Enviar Entrega de ${deliveryPercentage}%`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DetalheProjetoFreelancer;
