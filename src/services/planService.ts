/**
 * Serviço para gerenciamento de planos Asaas
 */

import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { Plan, CreatePlanInput, UpdatePlanInput } from '@/types/plan';

const PLANS_COLLECTION = 'plans';

/**
 * Buscar todos os planos ativos
 */
export async function getActivePlans(): Promise<Plan[]> {
  const plansRef = collection(db, PLANS_COLLECTION);
  const q = query(
    plansRef, 
    where('status', '==', 'active'),
    where('gateway', '==', 'asaas'),
    orderBy('category', 'asc'),
    orderBy('price', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Plan[];
}

/**
 * Buscar todos os planos (incluindo inativos) - Admin
 */
export async function getAllPlans(): Promise<Plan[]> {
  const plansRef = collection(db, PLANS_COLLECTION);
  const q = query(
    plansRef,
    where('gateway', '==', 'asaas'),
    orderBy('category', 'asc'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Plan[];
}

/**
 * Buscar plano por ID
 */
export async function getPlanById(planId: string): Promise<Plan | null> {
  const planRef = doc(db, PLANS_COLLECTION, planId);
  const planSnap = await getDoc(planRef);
  
  if (!planSnap.exists()) {
    return null;
  }
  
  return {
    id: planSnap.id,
    ...planSnap.data()
  } as Plan;
}

/**
 * Criar novo plano via Cloud Function
 */
export async function createPlan(planData: CreatePlanInput): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  
  const token = await user.getIdToken();
  const response = await fetch(
    'https://us-central1-xjobs-a43d2.cloudfunctions.net/createAsaasPlan',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(planData)
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar plano');
  }
  
  const result = await response.json();
  return result.planId;
}

/**
 * Atualizar plano existente
 */
export async function updatePlan(planData: UpdatePlanInput): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  
  const token = await user.getIdToken();
  const response = await fetch(
    'https://us-central1-xjobs-a43d2.cloudfunctions.net/updateAsaasPlan',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(planData)
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao atualizar plano');
  }
}

/**
 * Deletar plano
 */
export async function deletePlan(planId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  
  const token = await user.getIdToken();
  const response = await fetch(
    'https://us-central1-xjobs-a43d2.cloudfunctions.net/deleteAsaasPlan',
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ planId })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao deletar plano');
  }
}

/**
 * Criar assinatura de plano
 */
export async function createSubscription(planId: string, category?: 1 | 3 | 6 | 12): Promise<{ checkoutUrl: string; subscriptionId: string }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  
  // Buscar dados do plano
  const plan = await getPlanById(planId);
  if (!plan) {
    throw new Error('Plano não encontrado');
  }
  
  // Usar a categoria fornecida ou a padrão do plano
  const planCategory = category || plan.category || 1;
  
  // Calcular preço baseado na categoria (se o plano tiver preços diferentes por categoria)
  // Por enquanto, usar o preço do plano diretamente
  const price = plan.price / 100; // Converter de centavos para reais
  
  const token = await user.getIdToken();
  const response = await fetch(
    'https://us-central1-xjobs-a43d2.cloudfunctions.net/createAsaasSubscription',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        planId: plan.id,
        planName: plan.name,
        price: price,
        category: planCategory,
        likeLimit: plan.likeLimit,
        messageLimit: plan.messageLimit
      })
    }
  );
  
  if (!response.ok) {
    let errorMessage = 'Erro ao criar assinatura';
    try {
      const error = await response.json();
      errorMessage = error.error || error.message || error.details || errorMessage;
      console.error('Erro na resposta:', error);
    } catch (e) {
      // Se não conseguir parsear JSON, usar o status
      errorMessage = `Erro ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  
  const result = await response.json();
  console.log('Resposta da função createAsaasSubscription:', result);
  
  return {
    checkoutUrl: result.invoiceUrl || result.checkoutUrl || null,
    subscriptionId: result.subscriptionId || result.subscriptionId
  };
}

/**
 * Buscar URL de pagamento de uma assinatura
 */
export async function getSubscriptionPaymentUrl(subscriptionId: string): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  
  try {
    // Buscar assinatura no Firestore
    const subscriptionRef = doc(db, 'activeSubscriptions', user.uid);
    const subscriptionSnap = await getDoc(subscriptionRef);
    
    if (subscriptionSnap.exists()) {
      const data = subscriptionSnap.data();
      if (data.asaasSubscriptionId === subscriptionId && data.invoiceUrl) {
        return data.invoiceUrl;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar URL de pagamento:', error);
    return null;
  }
}

/**
 * Buscar planos por categoria
 */
export async function getPlansByCategory(category: 1 | 3 | 6 | 12): Promise<Plan[]> {
  const plansRef = collection(db, PLANS_COLLECTION);
  const q = query(
    plansRef,
    where('status', '==', 'active'),
    where('gateway', '==', 'asaas'),
    where('category', '==', category),
    orderBy('price', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Plan[];
}

/**
 * Mapear categoria para ciclo de cobrança
 */
export function getCycleFromCategory(category: 1 | 3 | 6 | 12): string {
  const cycleMap = {
    1: 'MONTHLY',
    3: 'QUARTERLY',
    6: 'SEMIANNUALLY',
    12: 'YEARLY'
  };
  return cycleMap[category];
}

/**
 * Mapear categoria para label
 */
export function getCategoryLabel(category: 1 | 3 | 6 | 12): string {
  const labelMap = {
    1: 'Mensal',
    3: 'Trimestral',
    6: 'Semestral',
    12: 'Anual'
  };
  return labelMap[category];
}

