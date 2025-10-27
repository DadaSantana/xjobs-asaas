import { useState, useEffect } from 'react';
import { useAuthListener } from "./useAuth";
import { auth, db, functions } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

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
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setCurrentUserPlan({
          name: data.planName || "Gratuito",
          likes: typeof data.planLikes === "number" ? data.planLikes : 12,
          messages: typeof data.planMessages === "number" ? data.planMessages : "1 por projeto",
          likesUsed: typeof data.likesUsed === "number" ? data.likesUsed : 0,
          messagesUsed: typeof data.messagesUsed === "number" ? data.messagesUsed : 0,
          renewalDate: typeof data.planRenewalDate === "string" ? data.planRenewalDate : undefined,
          isActive: !!data.planActive,
        });
      } else {
        setCurrentUserPlan(null);
      }
    } catch (error) {
      setCurrentUserPlan(null);
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

  // Função para usar uma curtida
  const useLike = async (): Promise<boolean> => {
    if (!currentUserPlan || currentUserPlan.likesUsed >= currentUserPlan.likes) return false;
    try {
      const user = auth.currentUser;
      if (!user) return false;
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { likesUsed: currentUserPlan.likesUsed + 1 }, { merge: true });
      await fetchUserPlan();
      return true;
    } catch (error) {
      return false;
    }
  };

  // Função para usar uma mensagem
  const useMessage = async (): Promise<boolean> => {
    if (!currentUserPlan || typeof currentUserPlan.messages !== "number" || currentUserPlan.messagesUsed >= currentUserPlan.messages) return false;
    try {
      const user = auth.currentUser;
      if (!user) return false;
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { messagesUsed: currentUserPlan.messagesUsed + 1 }, { merge: true });
      await fetchUserPlan();
      return true;
    } catch (error) {
      return false;
    }
  };

  const likesProgress = currentUserPlan ? (currentUserPlan.likesUsed / currentUserPlan.likes) * 100 : 0;
  const messagesProgress = currentUserPlan && typeof currentUserPlan.messages === "number"
    ? (currentUserPlan.messagesUsed / currentUserPlan.messages) * 100
    : 0;

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
    canLike: currentUserPlan ? currentUserPlan.likesUsed < currentUserPlan.likes : false,
    canMessage: currentUserPlan && typeof currentUserPlan.messages === "number"
      ? currentUserPlan.messagesUsed < currentUserPlan.messages
      : true,
  };
};