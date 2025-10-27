import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import { Plan, CreatePlanInput, UpdatePlanInput } from '@/types/plan';
import { getAllPlans, createPlan, updatePlan, deletePlan } from '@/services/planService';
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

const ManagerPlansAsaas: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | undefined>(undefined);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
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
        <Button onClick={handleCreatePlan}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Novo Plano
        </Button>
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
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

