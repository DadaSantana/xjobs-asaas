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
    'https://createasaasplan-bo5fg4zxxq-uc.a.run.app',
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
    'https://updateasaasplan-bo5fg4zxxq-uc.a.run.app',
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
    'https://deleteasaasplan-bo5fg4zxxq-uc.a.run.app',
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
export async function createSubscription(planId: string): Promise<{ checkoutUrl: string; subscriptionId: string }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  
  const token = await user.getIdToken();
  const response = await fetch(
    'https://us-central1-xjobs-a43d2.cloudfunctions.net/createAsaasSubscription',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ planId })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar assinatura');
  }
  
  const result = await response.json();
  return {
    checkoutUrl: result.invoiceUrl || result.checkoutUrl,
    subscriptionId: result.subscriptionId
  };
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

