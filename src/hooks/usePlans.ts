import { useState, useEffect } from 'react';
import { useAuthListener } from "./useAuth";
import { auth, db, functions } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getPlanUsage, getUserPlanLimits, syncLikesFromProjects } from "@/services/planUsageService";

export interface Plan {
  id: string;
  name: string;
  likes: number;
  messages: number | string;
  pricing: Array<{
    duration: string;
    price: string;
    totalPrice?: string;
    popular?: boolean;
  }>;
  isPopular?: boolean;
  isFree?: boolean;
}

export interface UserPlan {
  name: string;
  likes: number;
  messages: number | string;
  likesUsed: number;
  messagesUsed: number;
  renewalDate?: string;
  isActive: boolean;
}

// Dados mockados dos planos
const AVAILABLE_PLANS: Plan[] = [
  {
    id: 'free',
    name: "Gratuito",
    likes: 12,
    messages: "1 por projeto",
    pricing: [{ duration: "Para sempre", price: "R$ 0,00" }],
    isFree: true,
  },
  {
    id: 'plan50',
    name: "Plano 50",
    likes: 50,
    messages: 50,
    pricing: [
      { duration: "1 mês", price: "R$ 9,90" },
      { duration: "3 meses", price: "R$ 9,30/mês", totalPrice: "R$ 27,90 total" },
      { duration: "6 meses", price: "R$ 5,81/mês", totalPrice: "R$ 34,90 total", popular: true },
      { duration: "1 ano", price: "R$ 3,74/mês", totalPrice: "R$ 44,90 total" },
    ],
  },
  {
    id: 'plan150',
    name: "Plano 150",
    likes: 150,
    messages: 150,
    pricing: [
      { duration: "1 mês", price: "R$ 12,90" },
      { duration: "3 meses", price: "R$ 12,30/mês", totalPrice: "R$ 36,90 total" },
      { duration: "6 meses", price: "R$ 6,65/mês", totalPrice: "R$ 39,90 total", popular: true },
      { duration: "1 ano", price: "R$ 4,57/mês", totalPrice: "R$ 54,90 total" },
    ],
    isPopular: true,
  },
  {
    id: 'plan250',
    name: "Plano 250",
    likes: 250,
    messages: 250,
    pricing: [
      { duration: "1 mês", price: "R$ 14,90" },
      { duration: "3 meses", price: "R$ 13,30/mês", totalPrice: "R$ 39,90 total" },
      { duration: "6 meses", price: "R$ 7,48/mês", totalPrice: "R$ 44,90 total", popular: true },
      { duration: "1 ano", price: "R$ 5,82/mês", totalPrice: "R$ 69,90 total" },
    ],
  },
];

export const usePlans = () => {
  const [availablePlans] = useState<Plan[]>(AVAILABLE_PLANS);
  const [currentUserPlan, setCurrentUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(false);

  // Função reutilizável para buscar o plano do usuário autenticado
  const fetchUserPlan = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setCurrentUserPlan(null);
        return;
      }
      
      // Buscar limites e uso do plano usando o novo serviço
      const [limits, usage] = await Promise.all([
        getUserPlanLimits(user.uid),
        getPlanUsage(user.uid)
      ]);
      
      // Sincronizar curtidas existentes no Firestore (apenas se o contador estiver zerado)
      // Isso garante que curtidas antigas sejam contabilizadas na primeira vez
      if (usage.likesUsed === 0) {
        // Sincronizar em background (não bloquear a UI)
        syncLikesFromProjects(user.uid, false).then(result => {
          if (result.success && result.likesCounted > 0) {
            // Se encontrou curtidas, atualizar o plano novamente
            fetchUserPlan();
          }
        }).catch(err => {
          console.error('Erro ao sincronizar curtidas:', err);
        });
      }
      
      // Buscar data de renovação e status do documento do usuário ou subscription
      let renewalDate: string | undefined;
      let isActive = true;
      try {
        const subscriptionRef = doc(db, 'activeSubscriptions', user.uid);
        const subscriptionSnap = await getDoc(subscriptionRef);
        if (subscriptionSnap.exists()) {
          const subData = subscriptionSnap.data();
          if (subData.nextDueDate) {
            renewalDate = subData.nextDueDate.toDate ? subData.nextDueDate.toDate().toISOString() : subData.nextDueDate;
          }
          // Verificar se está pendente (aguardando pagamento)
          if (subData.status === 'pending') {
            isActive = false; // Não está ativo até pagamento ser confirmado
          }
        }
      } catch (err) {
        console.error('Erro ao buscar data de renovação:', err);
      }
      
      setCurrentUserPlan({
        name: limits.planName,
        likes: limits.likeLimit ?? 12,
        messages: limits.isFree && limits.messageLimit === null 
          ? "1 por projeto" 
          : (limits.messageLimit ?? "Ilimitadas"),
        likesUsed: usage.likesUsed,
        messagesUsed: usage.messagesUsed,
        renewalDate,
        isActive: isActive,
      });
    } catch (error) {
      console.error('Erro ao buscar plano do usuário:', error);
      // Fallback para plano gratuito
      setCurrentUserPlan({
        name: "Gratuito",
        likes: 12,
        messages: "1 por projeto",
        likesUsed: 0,
        messagesUsed: 0,
        isActive: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Função para selecionar/alterar plano via Firebase Function
  const selectPlan = async (planName: string, duration: string): Promise<{ success: boolean; error?: any }> => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado");
      const subscribePlan = httpsCallable(functions, "subscribePlan");
      const result: any = await subscribePlan({ planName, duration });
      if (result?.data?.success) {
        await fetchUserPlan();
        return { success: true };
      }
      return { success: false, error: result?.data?.error || "Erro desconhecido" };
    } catch (error: any) {
      return { success: false, error: error?.message || error };
    } finally {
      setLoading(false);
    }
  };

  // Função para cancelar plano via Firebase Function
  const cancelPlan = async (): Promise<{ success: boolean; error?: any }> => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado");
      const cancelPlanFn = httpsCallable(functions, "cancelPlan");
      const result: any = await cancelPlanFn({});
      if (result?.data?.success) {
        await fetchUserPlan();
        return { success: true };
      }
      return { success: false, error: result?.data?.error || "Erro desconhecido" };
    } catch (error: any) {
      return { success: false, error: error?.message || error };
    } finally {
      setLoading(false);
    }
  };

  // Função para usar uma curtida (mantida para compatibilidade, mas agora usa o serviço)
  const useLike = async (): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      if (!user) return false;
      
      const { useLike: useLikeService } = await import('@/services/planUsageService');
      const result = await useLikeService(user.uid);
      
      if (result.success) {
        await fetchUserPlan();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao usar curtida:', error);
      return false;
    }
  };

  // Função para usar uma mensagem (mantida para compatibilidade, mas agora usa o serviço)
  const useMessage = async (projectId?: string): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      if (!user) return false;
      
      const { useMessage: useMessageService } = await import('@/services/planUsageService');
      // Se não tiver projectId, tentar buscar do contexto atual (não ideal, mas mantém compatibilidade)
      const result = await useMessageService(user.uid, projectId || 'unknown');
      
      if (result.success) {
        await fetchUserPlan();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao usar mensagem:', error);
      return false;
    }
  };

  const likesProgress = currentUserPlan && typeof currentUserPlan.likes === "number"
    ? Math.min((currentUserPlan.likesUsed / currentUserPlan.likes) * 100, 100)
    : 0;
  
  // Para mensagens, calcular progresso baseado no tipo
  let messagesProgress = 0;
  if (currentUserPlan) {
    if (typeof currentUserPlan.messages === "number") {
      messagesProgress = Math.min((currentUserPlan.messagesUsed / currentUserPlan.messages) * 100, 100);
    } else if (currentUserPlan.messages === "1 por projeto") {
      // Para plano gratuito, não mostrar progresso (é por projeto)
      messagesProgress = 0;
    }
  }

  return {
    availablePlans,
    currentUserPlan,
    loading,
    selectPlan,
    cancelPlan,
    useLike,
    useMessage,
    likesProgress,
    messagesProgress,
    canLike: currentUserPlan 
      ? (typeof currentUserPlan.likes === "number" ? currentUserPlan.likesUsed < currentUserPlan.likes : true)
      : false,
    canMessage: currentUserPlan 
      ? (typeof currentUserPlan.messages === "number" 
          ? currentUserPlan.messagesUsed < currentUserPlan.messages 
          : true)
      : true,
  };
};