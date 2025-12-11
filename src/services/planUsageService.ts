/**
 * Serviço para gerenciar uso de planos (contadores mensais de curtidas e mensagens)
 */

import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  Timestamp,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

export interface PlanUsage {
  likesUsed: number;
  messagesUsed: number;
  lastResetDate: Timestamp;
  messagesByProject: Record<string, number>; // Para plano gratuito: 1 mensagem por projeto
}

export interface UserPlanLimits {
  planName: string;
  likeLimit: number | null; // null = ilimitado
  messageLimit: number | null; // null = ilimitado, ou número para limite mensal
  isFree: boolean; // Se for plano gratuito, mensagens são por projeto
}

const USAGE_COLLECTION = 'planUsage';

/**
 * Obter ou criar documento de uso do plano do usuário
 */
async function getOrCreateUsage(userId: string): Promise<PlanUsage> {
  const usageRef = doc(db, USAGE_COLLECTION, userId);
  const usageSnap = await getDoc(usageRef);
  
  if (usageSnap.exists()) {
    const data = usageSnap.data();
    let lastResetDate: Date;
    
    // Converter Timestamp para Date
    if (data.lastResetDate?.toDate) {
      lastResetDate = data.lastResetDate.toDate();
    } else if (data.lastResetDate?.seconds) {
      lastResetDate = new Date(data.lastResetDate.seconds * 1000);
    } else {
      lastResetDate = new Date(data.lastResetDate);
    }
    
    const now = new Date();
    
    // Verificar se precisa resetar (novo mês)
    if (
      lastResetDate.getMonth() !== now.getMonth() ||
      lastResetDate.getFullYear() !== now.getFullYear()
    ) {
      // Resetar contadores mensais
      const resetData: PlanUsage = {
        likesUsed: 0,
        messagesUsed: 0,
        lastResetDate: Timestamp.now(),
        messagesByProject: {}
      };
      await setDoc(usageRef, resetData);
      return resetData;
    }
    
    return {
      likesUsed: data.likesUsed || 0,
      messagesUsed: data.messagesUsed || 0,
      lastResetDate: data.lastResetDate || Timestamp.now(),
      messagesByProject: data.messagesByProject || {}
    };
  }
  
  // Criar novo documento
  const newUsage: PlanUsage = {
    likesUsed: 0,
    messagesUsed: 0,
    lastResetDate: Timestamp.now(),
    messagesByProject: {}
  };
  await setDoc(usageRef, newUsage);
  return newUsage;
}

/**
 * Buscar limites do plano do usuário
 */
export async function getUserPlanLimits(userId: string): Promise<UserPlanLimits> {
  try {
    // Primeiro tentar buscar de activeSubscriptions
    const subscriptionRef = doc(db, 'activeSubscriptions', userId);
    const subscriptionSnap = await getDoc(subscriptionRef);
    
    if (subscriptionSnap.exists()) {
      const data = subscriptionSnap.data();
      // Se estiver pendente, ainda não aplicar limites (aguardando pagamento)
      if (data.status === 'pending') {
        // Retornar plano gratuito até pagamento ser confirmado
        return {
          planName: 'Gratuito',
          likeLimit: 12,
          messageLimit: null, // 1 por projeto
          isFree: true
        };
      }
      // Se estiver ativa, aplicar limites do plano
      return {
        planName: data.planName || 'Gratuito',
        likeLimit: data.likeLimit ?? null,
        messageLimit: data.messageLimit ?? null,
        isFree: false
      };
    }
    
    // Se não encontrou, buscar do documento do usuário
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      
      // Verificar se tem currentPlan
      if (data.currentPlan) {
        return {
          planName: data.currentPlan.name || 'Gratuito',
          likeLimit: data.currentPlan.likeLimit ?? null,
          messageLimit: data.currentPlan.messageLimit ?? null,
          isFree: data.currentPlan.name === 'Gratuito' || !data.currentPlan.name
        };
      }
      
      // Fallback para campos antigos
      const planName = data.planName || 'Gratuito';
      return {
        planName,
        likeLimit: data.planLikes ?? (planName === 'Gratuito' ? 12 : null),
        messageLimit: data.planMessages ?? (planName === 'Gratuito' ? null : null), // null = por projeto no gratuito
        isFree: planName === 'Gratuito'
      };
    }
    
    // Plano gratuito padrão
    return {
      planName: 'Gratuito',
      likeLimit: 12,
      messageLimit: null, // null = 1 por projeto
      isFree: true
    };
  } catch (error) {
    console.error('Erro ao buscar limites do plano:', error);
    // Retornar plano gratuito em caso de erro
    return {
      planName: 'Gratuito',
      likeLimit: 12,
      messageLimit: null,
      isFree: true
    };
  }
}

/**
 * Verificar se pode usar uma curtida
 */
export async function canUseLike(userId: string): Promise<{ canUse: boolean; reason?: string }> {
  const limits = await getUserPlanLimits(userId);
  const usage = await getOrCreateUsage(userId);
  
  // Se não tem limite (ilimitado)
  if (limits.likeLimit === null) {
    return { canUse: true };
  }
  
  // Verificar se atingiu o limite
  if (usage.likesUsed >= limits.likeLimit) {
    return {
      canUse: false,
      reason: `Você atingiu o limite de ${limits.likeLimit} curtidas do seu plano ${limits.planName}. O limite será renovado no próximo mês.`
    };
  }
  
  return { canUse: true };
}

/**
 * Usar uma curtida (incrementar contador)
 */
export async function useLike(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const check = await canUseLike(userId);
    if (!check.canUse) {
      return { success: false, error: check.reason };
    }
    
    const usageRef = doc(db, USAGE_COLLECTION, userId);
    const usage = await getOrCreateUsage(userId);
    
    await updateDoc(usageRef, {
      likesUsed: usage.likesUsed + 1,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao usar curtida:', error);
    return { success: false, error: error.message || 'Erro ao registrar curtida' };
  }
}

/**
 * Verificar se pode enviar mensagem em um projeto específico
 */
export async function canSendMessage(
  userId: string, 
  projectId: string
): Promise<{ canUse: boolean; reason?: string }> {
  const limits = await getUserPlanLimits(userId);
  const usage = await getOrCreateUsage(userId);
  
  // Se for plano gratuito, verificar limite por projeto
  if (limits.isFree && limits.messageLimit === null) {
    const messagesInProject = usage.messagesByProject[projectId] || 0;
    if (messagesInProject >= 1) {
      return {
        canUse: false,
        reason: 'Você já enviou uma mensagem neste projeto. No plano gratuito, você pode enviar apenas 1 mensagem por projeto.'
      };
    }
    return { canUse: true };
  }
  
  // Se não tem limite (ilimitado)
  if (limits.messageLimit === null) {
    return { canUse: true };
  }
  
  // Verificar limite mensal
  if (usage.messagesUsed >= limits.messageLimit) {
    return {
      canUse: false,
      reason: `Você atingiu o limite de ${limits.messageLimit} mensagens do seu plano ${limits.planName}. O limite será renovado no próximo mês.`
    };
  }
  
  return { canUse: true };
}

/**
 * Usar uma mensagem (incrementar contador)
 */
export async function useMessage(
  userId: string, 
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const check = await canSendMessage(userId, projectId);
    if (!check.canUse) {
      return { success: false, error: check.reason };
    }
    
    const usageRef = doc(db, USAGE_COLLECTION, userId);
    const usage = await getOrCreateUsage(userId);
    const limits = await getUserPlanLimits(userId);
    
    const updateData: any = {
      updatedAt: serverTimestamp()
    };
    
    // Se for plano gratuito, incrementar por projeto
    if (limits.isFree && limits.messageLimit === null) {
      const messagesByProject = { ...usage.messagesByProject };
      messagesByProject[projectId] = (messagesByProject[projectId] || 0) + 1;
      updateData.messagesByProject = messagesByProject;
      // Também incrementar contador mensal para estatísticas
      updateData.messagesUsed = usage.messagesUsed + 1;
    } else {
      // Incrementar contador mensal
      updateData.messagesUsed = usage.messagesUsed + 1;
    }
    
    await updateDoc(usageRef, updateData);
    
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao usar mensagem:', error);
    return { success: false, error: error.message || 'Erro ao registrar mensagem' };
  }
}

/**
 * Obter estatísticas de uso do plano
 */
export async function getPlanUsage(userId: string): Promise<{
  likesUsed: number;
  messagesUsed: number;
  likeLimit: number | null;
  messageLimit: number | null;
  planName: string;
  canLike: boolean;
  canMessage: boolean;
}> {
  const limits = await getUserPlanLimits(userId);
  const usage = await getOrCreateUsage(userId);
  
  return {
    likesUsed: usage.likesUsed,
    messagesUsed: usage.messagesUsed,
    likeLimit: limits.likeLimit,
    messageLimit: limits.messageLimit,
    planName: limits.planName,
    canLike: limits.likeLimit === null || usage.likesUsed < limits.likeLimit,
    canMessage: limits.messageLimit === null || usage.messagesUsed < limits.messageLimit
  };
}

/**
 * Obter uso de mensagens por projeto (para plano gratuito)
 */
export async function getProjectMessageUsage(
  userId: string, 
  projectId: string
): Promise<number> {
  const usage = await getOrCreateUsage(userId);
  return usage.messagesByProject[projectId] || 0;
}

/**
 * Sincronizar contador de curtidas com as curtidas existentes no Firestore
 * Busca todos os projetos que o usuário curtiu e conta quantas foram feitas no mês atual
 * @param userId - ID do usuário
 * @param force - Se true, força a sincronização mesmo se já houver contadores
 */
export async function syncLikesFromProjects(
  userId: string, 
  force: boolean = false
): Promise<{ 
  success: boolean; 
  likesCounted: number;
  error?: string;
}> {
  try {
    const usage = await getOrCreateUsage(userId);
    
    // Se não for forçado e já houver curtidas contadas, não sincronizar
    // (para evitar processamento desnecessário)
    if (!force && usage.likesUsed > 0) {
      return { 
        success: true, 
        likesCounted: usage.likesUsed 
      };
    }
    
    // Buscar todos os projetos que têm curtidas (otimização: só projetos com likesCount > 0)
    const projectsRef = collection(db, 'projects');
    const projectsQuery = query(
      projectsRef,
      where('likesCount', '>', 0)
    );
    
    const projectsSnapshot = await getDocs(projectsQuery);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let likesCounted = 0;
    
    // Iterar sobre projetos que têm curtidas
    projectsSnapshot.forEach((projectDoc) => {
      const project = projectDoc.data();
      const likes = project.likes || [];
      
      // Encontrar curtidas deste usuário neste projeto
      const userLikes = likes.filter((like: any) => {
        if (like.freelancerId !== userId) return false;
        
        // Verificar se a curtida foi feita no mês atual
        let createdAt: Date;
        if (like.createdAt?.toDate) {
          createdAt = like.createdAt.toDate();
        } else if (like.createdAt?.seconds) {
          createdAt = new Date(like.createdAt.seconds * 1000);
        } else if (like.createdAt) {
          createdAt = new Date(like.createdAt);
        } else {
          return false; // Sem data, não contar
        }
        
        return createdAt.getMonth() === currentMonth && 
               createdAt.getFullYear() === currentYear;
      });
      
      likesCounted += userLikes.length;
    });
    
    // Atualizar o contador de uso
    const usageRef = doc(db, USAGE_COLLECTION, userId);
    
    // Se forçado, usar o valor sincronizado. Caso contrário, usar o maior entre atual e sincronizado
    const newLikesUsed = force ? likesCounted : Math.max(usage.likesUsed, likesCounted);
    
    await updateDoc(usageRef, {
      likesUsed: newLikesUsed,
      updatedAt: serverTimestamp()
    });
    
    return { 
      success: true, 
      likesCounted: newLikesUsed 
    };
  } catch (error: any) {
    console.error('Erro ao sincronizar curtidas:', error);
    return { 
      success: false, 
      likesCounted: 0,
      error: error.message || 'Erro ao sincronizar curtidas'
    };
  }
}
