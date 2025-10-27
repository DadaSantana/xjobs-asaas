import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import CurrencyInput from 'react-currency-input-field';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface Plan {
  id: string;
  name: string;
  description?: string;
  status: string;
  pricing_scheme?: { price?: number };
  messageLimit?: number;
  likeLimit?: number;
  subscribers?: number;
  category?: number;
}

const LIST_PLANS_URL = 'https://us-central1-xjobs-a43d2.cloudfunctions.net/listPlans';
const CREATE_PLAN_URL = 'https://us-central1-xjobs-a43d2.cloudfunctions.net/createPlan';
const SAVE_PLAN_LIMITS_URL = 'https://us-central1-xjobs-a43d2.cloudfunctions.net/savePlanLimits';

const frequencies = [
  { value: '1', label: 'Mensal' },
  { value: '3', label: 'Trimestral' },
  { value: '6', label: 'Semestral' },
  { value: '12', label: 'Anual' },
];

const ManagerPlans: React.FC = () => {
  const PAGARME_API = 'https://api.pagar.me/core/v5/plans';
  const PAGARME_SECRET = 'sk_d6c3531584364d8598899c2f470ae421';
  const PAGARME_AUTH = 'Basic ' + btoa(PAGARME_SECRET + ':');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    frequency: '1',
    likeLimit: '',
    messageLimit: '',
    price: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Listener para autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Buscar planos via Firebase Functions e limites do Firestore
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchPlans = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await user.getIdToken();
        // Buscar planos do Pagar.me via Firebase Functions
        const res = await fetch(LIST_PLANS_URL, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        const text = await res.text();
        if (!res.ok) {
          let errMsg = 'Erro ao buscar planos';
          try {
            const errData = JSON.parse(text);
            errMsg = errData.error || errMsg;
          } catch {}
          throw new Error(errMsg);
        }
        if (!text) {
          setPlans([]);
          return;
        }
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('Resposta inesperada da função:', text);
          throw new Error('Resposta inesperada da função.');
        }
        const pagarmePlans = data.data || data;
        // Buscar limites do Firestore
        const plansSnap = await getDocs(collection(db, 'plans'));
        const limitsMap: Record<string, any> = {};
        plansSnap.forEach(doc => {
          limitsMap[doc.id] = doc.data();
        });
        // Merge dos dados
        const mergedPlans = pagarmePlans.map((plan: any) => {
          const limits = limitsMap[plan.id] || {};
          return {
            ...plan,
            likeLimit: limits.likeLimit,
            messageLimit: limits.messageLimit,
            price: limits.price || (plan.pricing_scheme && plan.pricing_scheme.price),
            subscribers: limits.subscribers || 0,
            category: limits.category || 1,
          };
        });
        setPlans(mergedPlans);
      } catch (err: any) {
        setError(err.message || 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [user]);

  // Handlers do dialog
  const handleOpenDialog = () => {
    setForm({ name: '', description: '', frequency: '1', likeLimit: '', messageLimit: '', price: '' });
    setFormError(null);
    setShowDialog(true);
  };
  const handleCloseDialog = () => {
    setShowDialog(false);
    setFormError(null);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handlePriceChange = (value: string | undefined) => {
    setForm({ ...form, price: value || '' });
  };
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCreating(true);
    try {
      if (!form.name.trim()) {
        setFormError('Nome do plano é obrigatório.');
        setCreating(false);
        return;
      }
      if (!form.likeLimit || isNaN(Number(form.likeLimit)) || Number(form.likeLimit) < 0) {
        setFormError('Limite de curtidas deve ser um número válido.');
        setCreating(false);
        return;
      }
      if (!form.messageLimit || isNaN(Number(form.messageLimit)) || Number(form.messageLimit) < 0) {
        setFormError('Limite de mensagens deve ser um número válido.');
        setCreating(false);
        return;
      }
      if (!form.price || isNaN(Number(form.price.replace(/\D/g, ''))) || Number(form.price.replace(/\D/g, '')) <= 0) {
        setFormError('Valor do plano é obrigatório e deve ser maior que zero.');
        setCreating(false);
        return;
      }
      if (!user) {
        setFormError('Usuário não autenticado.');
        setCreating(false);
        return;
      }
      const token = await user.getIdToken();
      const priceInCents = Number(form.price.replace(/\D/g, ''));
      const body = {
        interval: 'month',
        interval_count: Number(form.frequency),
        pricing_scheme: { scheme_type: 'Unit', price: priceInCents },
        quantity: 1, // Corrigido: não pode ser null
        name: form.name,
        description: form.description,
        shippable: false,
        payment_methods: ['credit_card'],
        billing_type: 'prepaid',
      };
      console.log('Payload enviado para createPlan:', body);
      const res = await fetch(CREATE_PLAN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let planId = '';
      if (!res.ok) {
        let errMsg = 'Erro ao criar plano';
        try {
          const errData = JSON.parse(text);
          errMsg = errData.error || errMsg;
          planId = errData.id || errData.plan_id || '';
        } catch {}
        throw new Error(errMsg);
      } else {
        try {
          const data = JSON.parse(text);
          planId = data.id || data.plan_id || '';
        } catch {}
      }
      // Salvar limites no Firestore
      if (planId) {
        await fetch(SAVE_PLAN_LIMITS_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planId,
            likeLimit: Number(form.likeLimit),
            messageLimit: Number(form.messageLimit),
            name: form.name,
            description: form.description,
            price: priceInCents,
            category: Number(form.frequency), // Adicionar categoria
          }),
        });
      }
      setShowDialog(false);
      setForm({ name: '', description: '', frequency: '1', likeLimit: '', messageLimit: '', price: '' });
      setLoading(false);
    } catch (err: any) {
      setFormError(err.message || 'Erro desconhecido');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (plan: Plan) => {
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || '',
      frequency: plan.category?.toString() || '1',
      likeLimit: plan.likeLimit?.toString() || '',
      messageLimit: plan.messageLimit?.toString() || '',
      price: plan.pricing_scheme?.price ? (plan.pricing_scheme.price / 100).toFixed(2) : '',
    });
    setShowEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditingPlan(null);
    setFormError(null);
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan || !user) return;
    
    setFormError(null);
    setCreating(true);
    try {
      if (!form.name.trim()) {
        setFormError('Nome do plano é obrigatório.');
        setCreating(false);
        return;
      }
      if (!form.likeLimit || isNaN(Number(form.likeLimit)) || Number(form.likeLimit) < 0) {
        setFormError('Limite de curtidas deve ser um número válido.');
        setCreating(false);
        return;
      }
      if (!form.messageLimit || isNaN(Number(form.messageLimit)) || Number(form.messageLimit) < 0) {
        setFormError('Limite de mensagens deve ser um número válido.');
        setCreating(false);
        return;
      }
      if (!form.price || isNaN(Number(form.price.replace(/\D/g, ''))) || Number(form.price.replace(/\D/g, '')) <= 0) {
        setFormError('Valor do plano é obrigatório e deve ser maior que zero.');
        setCreating(false);
        return;
      }

      const token = await user.getIdToken();
      const priceInCents = Number(form.price.replace(/\D/g, ''));
      
      // Atualizar limites no Firestore
      await fetch(SAVE_PLAN_LIMITS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: editingPlan.id,
          likeLimit: Number(form.likeLimit),
          messageLimit: Number(form.messageLimit),
          name: form.name,
          description: form.description,
          price: priceInCents,
          category: Number(form.frequency),
        }),
      });

      toast({
        title: "Sucesso",
        description: "Plano atualizado com sucesso!",
      });

      setShowEditDialog(false);
      setEditingPlan(null);
      setForm({ name: '', description: '', frequency: '1', likeLimit: '', messageLimit: '', price: '' });
      
      // Recarregar planos
      window.location.reload();
    } catch (err: any) {
      setFormError(err.message || 'Erro desconhecido');
    } finally {
      setCreating(false);
    }
  };
  const handleConfirmDelete = async () => {
    if (!planToDelete || !user) return;
    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('https://us-central1-xjobs-a43d2.cloudfunctions.net/deletePlan', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId: planToDelete.id }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao excluir plano');
      }
      // Remover do Firestore
      await import('firebase/firestore').then(async ({ doc, deleteDoc }) => {
        await deleteDoc(doc(db, 'plans', planToDelete.id));
      });
      setPlans(plans.filter(p => p.id !== planToDelete.id));
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Erro desconhecido ao excluir plano');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-bold">Gerenciar Planos</h1>
        <Button onClick={handleOpenDialog}>+ Criar novo plano</Button>
      </div>
      
      <div className="flex-1 bg-gray-50 p-6 overflow-hidden min-h-0">
        <div className="bg-white shadow rounded-lg h-full flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div>Carregando planos...</div>
            </div>
          ) : !user ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-red-600">Usuário não autenticado.</div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-red-600">{error}</div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead className="sticky top-0 bg-white z-10">
              <tr>
                <th className="py-3 px-4 bg-white border-b border-gray-200">Nome</th>
                <th className="py-3 px-4 bg-white border-b border-gray-200">Descrição</th>
                <th className="py-3 px-4 bg-white border-b border-gray-200">Categoria</th>
                <th className="py-3 px-4 bg-white border-b border-gray-200">Valor</th>
                <th className="py-3 px-4 bg-white border-b border-gray-200">Mensagens/mês</th>
                <th className="py-3 px-4 bg-white border-b border-gray-200">Curtidas/mês</th>
                <th className="py-3 px-4 bg-white border-b border-gray-200">Inscritos</th>
                <th className="py-3 px-4 bg-white border-b border-gray-200">Status</th>
                <th className="py-3 px-4 bg-white border-b border-gray-200">Ações</th>
              </tr>
            </thead>
                <tbody>
                  {plans.map(plan => (
                    <tr key={plan.id} className="border-t hover:bg-gray-50 transition">
                      <td className="py-2 px-4 font-medium whitespace-nowrap">{plan.name}</td>
                      <td className="py-2 px-4 max-w-xs truncate">{plan.description || '-'}</td>
                      <td className="py-2 px-4 whitespace-nowrap">
                        {plan.category === 1 ? 'Mensal' : 
                         plan.category === 3 ? 'Trimestral' : 
                         plan.category === 6 ? 'Semestral' : 
                         plan.category === 12 ? 'Anual' : 'Mensal'}
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap">{plan.pricing_scheme && plan.pricing_scheme.price ? `R$ ${(plan.pricing_scheme.price / 100).toFixed(2)}` : '-'}</td>
                      <td className="py-2 px-4 whitespace-nowrap">{plan.messageLimit ?? '—'}</td>
                      <td className="py-2 px-4 whitespace-nowrap">{plan.likeLimit ?? '—'}</td>
                      <td className="py-2 px-4 whitespace-nowrap">{plan.subscribers ?? 0}</td>
                      <td className="py-2 px-4 whitespace-nowrap">{plan.status === 'active' ? 'Ativo' : 'Inativo'}</td>
                      <td className="py-2 px-4 whitespace-nowrap space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditClick(plan)}
                        >
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(plan)}>Excluir</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de criação de plano */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Criar novo plano</h2>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome do plano</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Frequência de cobrança</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  name="frequency"
                  value={form.frequency}
                  onChange={handleChange}
                >
                  {frequencies.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Limite de curtidas/mês</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  name="likeLimit"
                  type="number"
                  min="0"
                  value={form.likeLimit}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Limite de mensagens/mês</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  name="messageLimit"
                  type="number"
                  min="0"
                  value={form.messageLimit}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor do plano (R$)</label>
                <CurrencyInput
                  className="w-full border rounded px-3 py-2"
                  name="price"
                  decimalsLimit={2}
                  decimalSeparator="," 
                  groupSeparator="."
                  prefix="R$ "
                  value={form.price}
                  onValueChange={handlePriceChange}
                  required
                />
              </div>
              {formError && <div className="text-red-600 text-sm">{formError}</div>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={creating}>Cancelar</Button>
                <Button type="submit" disabled={creating}>{creating ? 'Criando...' : 'Criar plano'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog de edição de plano */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Editar plano</h2>
            <form onSubmit={handleUpdatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome do plano</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Frequência de cobrança</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  name="frequency"
                  value={form.frequency}
                  onChange={handleChange}
                >
                  {frequencies.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Limite de curtidas/mês</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  name="likeLimit"
                  type="number"
                  min="0"
                  value={form.likeLimit}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Limite de mensagens/mês</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  name="messageLimit"
                  type="number"
                  min="0"
                  value={form.messageLimit}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor do plano (R$)</label>
                <CurrencyInput
                  className="w-full border rounded px-3 py-2"
                  name="price"
                  decimalsLimit={2}
                  decimalSeparator="," 
                  groupSeparator="."
                  prefix="R$ "
                  value={form.price}
                  onValueChange={handlePriceChange}
                  required
                />
              </div>
              {formError && <div className="text-red-600 text-sm">{formError}</div>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseEditDialog} disabled={creating}>Cancelar</Button>
                <Button type="submit" disabled={creating}>{creating ? 'Atualizando...' : 'Atualizar plano'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <div>Tem certeza que deseja excluir o plano <b>{planToDelete?.name}</b>? Esta ação não pode ser desfeita.</div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>{deleting ? 'Excluindo...' : 'Excluir'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerPlans; 