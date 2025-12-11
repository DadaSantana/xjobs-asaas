import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle, Grid3x3, List } from 'lucide-react';
import { Plan, CreatePlanInput, UpdatePlanInput } from '@/types/plan';
import { getAllPlans, createPlan, updatePlan, deletePlan, getCategoryLabel } from '@/services/planService';
import { PlanCard } from '@/components/manager/PlanCard';
import { PlanFormDialog } from '@/components/manager/PlanFormDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';

type ViewMode = 'grid' | 'table';

const ManagerPlansAsaas: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | undefined>(undefined);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { toast } = useToast();

  // Carregar planos
  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllPlans();
      setPlans(data);
    } catch (err: any) {
      console.error('Erro ao carregar planos:', err);
      setError(err.message || 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = () => {
    setEditingPlan(undefined);
    setShowFormDialog(true);
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setShowFormDialog(true);
  };

  const handleDeleteClick = (plan: Plan) => {
    setDeletingPlan(plan);
  };

  const handleFormSubmit = async (data: CreatePlanInput | UpdatePlanInput) => {
    setFormLoading(true);
    try {
      if ('id' in data) {
        // Atualizar plano existente
        await updatePlan(data as UpdatePlanInput);
        toast({
          title: 'Plano atualizado',
          description: 'O plano foi atualizado com sucesso!',
        });
      } else {
        // Criar novo plano
        await createPlan(data as CreatePlanInput);
        toast({
          title: 'Plano criado',
          description: 'O plano foi criado com sucesso!',
        });
      }
      await loadPlans();
      setShowFormDialog(false);
      setEditingPlan(undefined);
    } catch (err: any) {
      console.error('Erro ao salvar plano:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao salvar plano',
        variant: 'destructive',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPlan) return;

    setDeleteLoading(true);
    try {
      await deletePlan(deletingPlan.id);
      toast({
        title: 'Plano excluído',
        description: 'O plano foi excluído com sucesso!',
      });
      await loadPlans();
      setDeletingPlan(null);
    } catch (err: any) {
      console.error('Erro ao excluir plano:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao excluir plano',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Agrupar planos por categoria
  const plansByCategory = {
    1: plans.filter(p => p.category === 1),
    3: plans.filter(p => p.category === 3),
    6: plans.filter(p => p.category === 6),
    12: plans.filter(p => p.category === 12),
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Planos Asaas</h1>
          <p className="text-gray-600 text-sm mt-1">
            Crie e gerencie planos de assinatura com personalização completa
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-gray-300 rounded-md p-1 bg-white">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-3"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleCreatePlan}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Novo Plano
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-gray-50 p-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600">Carregando planos...</div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="1" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="1">
                Mensal ({plansByCategory[1].length})
              </TabsTrigger>
              <TabsTrigger value="3">
                Trimestral ({plansByCategory[3].length})
              </TabsTrigger>
              <TabsTrigger value="6">
                Semestral ({plansByCategory[6].length})
              </TabsTrigger>
              <TabsTrigger value="12">
                Anual ({plansByCategory[12].length})
              </TabsTrigger>
            </TabsList>

            {[1, 3, 6, 12].map((category) => (
              <TabsContent key={category} value={category.toString()}>
                {plansByCategory[category as 1 | 3 | 6 | 12].length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum plano encontrado nesta categoria</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={handleCreatePlan}
                    >
                      Criar primeiro plano
                    </Button>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                    {plansByCategory[category as 1 | 3 | 6 | 12].map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        onEdit={handleEditPlan}
                        onDelete={handleDeleteClick}
                        isAdmin
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Preço</TableHead>
                          <TableHead>Mensagens</TableHead>
                          <TableHead>Curtidas</TableHead>
                          <TableHead>Recursos</TableHead>
                          <TableHead>Assinantes</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plansByCategory[category as 1 | 3 | 6 | 12].map((plan) => (
                          <TableRow key={plan.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {plan.name}
                                {plan.cardStyle?.highlighted && (
                                  <Badge
                                    className="text-xs"
                                    style={{
                                      backgroundColor: plan.cardStyle.badge?.bgColor,
                                      color: plan.cardStyle.badge?.textColor
                                    }}
                                  >
                                    {plan.cardStyle.badge?.text}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate" title={plan.description || undefined}>
                                {plan.description || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className="font-semibold">
                                R$ {(plan.price / 100).toFixed(2)}
                              </span>
                              <span className="text-gray-500 text-sm">/mês</span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {plan.messageLimit === null ? (
                                <span className="text-green-600 font-medium">Ilimitadas</span>
                              ) : (
                                `${plan.messageLimit} mensagens/projeto`
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {plan.likeLimit === null ? (
                                <span className="text-green-600 font-medium">Ilimitadas</span>
                              ) : (
                                `${plan.likeLimit} curtidas/mês`
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {plan.features?.filter(f => f.enabled).slice(0, 2).map((feature) => (
                                  <Badge key={feature.id} variant="outline" className="text-xs">
                                    {feature.label}
                                  </Badge>
                                ))}
                                {plan.features && plan.features.filter(f => f.enabled).length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{plan.features.filter(f => f.enabled).length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {plan.subscribers || 0}
                            </TableCell>
                            <TableCell>
                              <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                                {plan.status === 'active' ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditPlan(plan)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteClick(plan)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* Dialog de formulário */}
      <PlanFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        onSubmit={handleFormSubmit}
        plan={editingPlan}
        loading={formLoading}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano <strong>{deletingPlan?.name}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita e pode afetar assinantes ativos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManagerPlansAsaas;

