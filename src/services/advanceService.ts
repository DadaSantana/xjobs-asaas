/**
 * Serviço para gerenciamento de adiantamentos de valores
 */

import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  AdvanceRequest, 
  AdvanceEligibility, 
  AdvanceSettings, 
  FreelancerAdvanceStats,
  AdvanceFormData,
  AdvanceHistoryFilters
} from '@/types/advance';

const ADVANCES_COLLECTION = 'advanceRequests';
const ADVANCE_SETTINGS_DOC = 'settings/advances';
const ADVANCE_STATS_COLLECTION = 'freelancerAdvanceStats';

/**
 * Configurações padrão do sistema de adiantamento
 */
const DEFAULT_SETTINGS: AdvanceSettings = {
  enabled: true,
  feePercentage: 5, // 5% de taxa
  minAmount: 50, // R$ 50 mínimo
  maxAmount: 5000, // R$ 5.000 máximo
  automaticApproval: true,
  automaticApprovalLimit: 1000, // Até R$ 1.000 aprovação automática
  maxAdvancesPerMonth: 3, // Máximo 3 adiantamentos por mês
  cooldownDays: 7, // 7 dias entre adiantamentos
  updatedAt: Timestamp.now(),
  updatedBy: 'system'
};

/**
 * Buscar configurações do sistema de adiantamento
 */
export async function getAdvanceSettings(): Promise<AdvanceSettings> {
  try {
    const settingsDoc = await getDoc(doc(db, ADVANCE_SETTINGS_DOC));
    
    if (settingsDoc.exists()) {
      return { ...DEFAULT_SETTINGS, ...settingsDoc.data() } as AdvanceSettings;
    }
    
    // Criar configurações padrão se não existir
    await setDoc(doc(db, ADVANCE_SETTINGS_DOC), DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Erro ao buscar configurações de adiantamento:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Atualizar configurações do sistema de adiantamento (Admin)
 */
export async function updateAdvanceSettings(settings: Partial<AdvanceSettings>): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const updatedSettings = {
    ...settings,
    updatedAt: Timestamp.now(),
    updatedBy: user.uid
  };

  await updateDoc(doc(db, ADVANCE_SETTINGS_DOC), updatedSettings);
}

/**
 * Verificar elegibilidade para adiantamento
 */
export async function checkAdvanceEligibility(
  freelancerId: string, 
  projectId: string
): Promise<AdvanceEligibility> {
  try {
    const settings = await getAdvanceSettings();
    
    if (!settings.enabled) {
      return {
        eligible: false,
        reason: 'Sistema de adiantamento desabilitado',
        availableAmount: 0,
        maxAdvanceAmount: 0,
        currentMonthCount: 0,
        maxMonthlyCount: settings.maxAdvancesPerMonth
      };
    }

    // Buscar saldo disponível do freelancer para o projeto
    const availableAmount = await getProjectAvailableAmount(freelancerId, projectId);
    
    if (availableAmount < settings.minAmount) {
      return {
        eligible: false,
        reason: `Valor mínimo para adiantamento é R$ ${settings.minAmount.toFixed(2)}`,
        availableAmount,
        maxAdvanceAmount: 0,
        currentMonthCount: 0,
        maxMonthlyCount: settings.maxAdvancesPerMonth
      };
    }

    // Verificar estatísticas do freelancer
    const stats = await getFreelancerAdvanceStats(freelancerId);
    
    // Verificar limite mensal
    if (stats.monthlyAdvancesCount >= settings.maxAdvancesPerMonth) {
      return {
        eligible: false,
        reason: `Limite mensal de ${settings.maxAdvancesPerMonth} adiantamentos atingido`,
        availableAmount,
        maxAdvanceAmount: 0,
        currentMonthCount: stats.monthlyAdvancesCount,
        maxMonthlyCount: settings.maxAdvancesPerMonth
      };
    }

    // Verificar cooldown
    if (stats.lastAdvanceDate) {
      const daysSinceLastAdvance = Math.floor(
        (Date.now() - stats.lastAdvanceDate.toMillis()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastAdvance < settings.cooldownDays) {
        const remainingDays = settings.cooldownDays - daysSinceLastAdvance;
        const nextAvailableDate = new Date();
        nextAvailableDate.setDate(nextAvailableDate.getDate() + remainingDays);
        
        return {
          eligible: false,
          reason: `Aguarde ${remainingDays} dias para solicitar novo adiantamento`,
          availableAmount,
          maxAdvanceAmount: 0,
          currentMonthCount: stats.monthlyAdvancesCount,
          maxMonthlyCount: settings.maxAdvancesPerMonth,
          nextAvailableDate,
          cooldownRemaining: remainingDays
        };
      }
    }

    // Verificar se há adiantamento ativo
    if (stats.hasActiveAdvance) {
      return {
        eligible: false,
        reason: 'Você já possui um adiantamento em processamento',
        availableAmount,
        maxAdvanceAmount: 0,
        currentMonthCount: stats.monthlyAdvancesCount,
        maxMonthlyCount: settings.maxAdvancesPerMonth
      };
    }

    const maxAdvanceAmount = Math.min(availableAmount, settings.maxAmount);

    return {
      eligible: true,
      availableAmount,
      maxAdvanceAmount,
      currentMonthCount: stats.monthlyAdvancesCount,
      maxMonthlyCount: settings.maxAdvancesPerMonth
    };
    
  } catch (error) {
    console.error('Erro ao verificar elegibilidade:', error);
    return {
      eligible: false,
      reason: 'Erro ao verificar elegibilidade',
      availableAmount: 0,
      maxAdvanceAmount: 0,
      currentMonthCount: 0,
      maxMonthlyCount: 0
    };
  }
}

/**
 * Buscar valor disponível para adiantamento em um projeto
 */
async function getProjectAvailableAmount(freelancerId: string, projectId: string): Promise<number> {
  try {
    // Buscar pagamento do projeto
    const paymentQuery = query(
      collection(db, 'projectPayments'),
      where('projectId', '==', projectId),
      where('freelancerId', '==', freelancerId),
      where('paymentStatus', '==', 'paid'),
      limit(1)
    );
    
    const paymentSnap = await getDocs(paymentQuery);
    
    if (paymentSnap.empty) {
      return 0;
    }
    
    const payment = paymentSnap.docs[0].data();
    
    // Valor disponível = valor pago - valor já liberado
    const totalPaid = Number(payment.totalHeld || 0);
    const totalReleased = Number(payment.totalReleased || 0);
    
    return Math.max(0, totalPaid - totalReleased);
    
  } catch (error) {
    console.error('Erro ao buscar valor disponível:', error);
    return 0;
  }
}

/**
 * Buscar estatísticas de adiantamento do freelancer
 */
export async function getFreelancerAdvanceStats(freelancerId: string): Promise<FreelancerAdvanceStats> {
  try {
    const statsDoc = await getDoc(doc(db, ADVANCE_STATS_COLLECTION, freelancerId));
    
    if (statsDoc.exists()) {
      return statsDoc.data() as FreelancerAdvanceStats;
    }
    
    // Criar estatísticas iniciais
    const initialStats: FreelancerAdvanceStats = {
      freelancerId,
      totalAdvancesRequested: 0,
      totalAdvancesApproved: 0,
      totalAdvancesRejected: 0,
      totalAmountAdvanced: 0,
      totalFeesCharged: 0,
      monthlyAdvancesCount: 0,
      monthlyAmountAdvanced: 0,
      hasActiveAdvance: false,
      canRequestAdvance: true,
      updatedAt: Timestamp.now()
    };
    
    await setDoc(doc(db, ADVANCE_STATS_COLLECTION, freelancerId), initialStats);
    return initialStats;
    
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw error;
  }
}

/**
 * Solicitar adiantamento
 */
export async function requestAdvance(
  projectId: string,
  formData: AdvanceFormData
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const freelancerId = user.uid;
  const requestedAmount = parseFloat(formData.amount);

  // Verificar elegibilidade
  const eligibility = await checkAdvanceEligibility(freelancerId, projectId);
  
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason || 'Não elegível para adiantamento');
  }

  if (requestedAmount > eligibility.maxAdvanceAmount) {
    throw new Error(`Valor máximo para adiantamento é R$ ${eligibility.maxAdvanceAmount.toFixed(2)}`);
  }

  const settings = await getAdvanceSettings();
  
  // Calcular taxa e valor líquido
  const feeAmount = (requestedAmount * settings.feePercentage) / 100;
  const netAmount = requestedAmount - feeAmount;

  // Buscar dados do projeto
  const projectDoc = await getDoc(doc(db, 'projects', projectId));
  if (!projectDoc.exists()) {
    throw new Error('Projeto não encontrado');
  }
  
  const project = projectDoc.data();

  // Criar solicitação de adiantamento
  const advanceRequest: Omit<AdvanceRequest, 'id'> = {
    freelancerId,
    freelancerName: user.displayName || user.email || 'Freelancer',
    projectId,
    projectTitle: project.title,
    clientId: project.clientId,
    clientName: project.clientName,
    originalAmount: eligibility.availableAmount,
    requestedAmount,
    feePercentage: settings.feePercentage,
    feeAmount,
    netAmount,
    status: settings.automaticApproval && requestedAmount <= settings.automaticApprovalLimit 
      ? 'approved' 
      : 'pending',
    requestedAt: Timestamp.now(),
    gateway: 'asaas', // Usar Asaas como padrão
    automaticApproval: settings.automaticApproval && requestedAmount <= settings.automaticApprovalLimit,
    notes: formData.notes,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  // Salvar no Firestore
  const advanceRef = doc(collection(db, ADVANCES_COLLECTION));
  await setDoc(advanceRef, advanceRequest);

  // Atualizar estatísticas do freelancer
  await updateFreelancerStats(freelancerId, 'requested', requestedAmount);

  // Se aprovação automática, processar imediatamente
  if (advanceRequest.status === 'approved') {
    await processAdvanceRequest(advanceRef.id);
  }

  return advanceRef.id;
}

/**
 * Processar solicitação de adiantamento aprovada
 */
export async function processAdvanceRequest(advanceId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  try {
    // Chamar cloud function para processar
    const token = await user.getIdToken();
  const response = await fetch(
    'https://us-central1-xjobs-a43d2.cloudfunctions.net/processAdvanceRequest',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ advanceId })
    }
  );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao processar adiantamento');
    }

  } catch (error) {
    console.error('Erro ao processar adiantamento:', error);
    throw error;
  }
}

/**
 * Buscar histórico de adiantamentos
 */
export async function getAdvanceHistory(
  freelancerId?: string,
  filters?: AdvanceHistoryFilters
): Promise<AdvanceRequest[]> {
  try {
    let q = query(collection(db, ADVANCES_COLLECTION));

    if (freelancerId) {
      q = query(q, where('freelancerId', '==', freelancerId));
    }

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters?.projectId) {
      q = query(q, where('projectId', '==', filters.projectId));
    }

    q = query(q, orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AdvanceRequest[];

  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return [];
  }
}

/**
 * Aprovar adiantamento (Admin)
 */
export async function approveAdvance(advanceId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const batch = writeBatch(db);
  const advanceRef = doc(db, ADVANCES_COLLECTION, advanceId);

  batch.update(advanceRef, {
    status: 'approved',
    approvedBy: user.uid,
    approvedByName: user.displayName || user.email,
    processedAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });

  await batch.commit();

  // Processar o adiantamento
  await processAdvanceRequest(advanceId);
}

/**
 * Rejeitar adiantamento (Admin)
 */
export async function rejectAdvance(advanceId: string, reason: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  await updateDoc(doc(db, ADVANCES_COLLECTION, advanceId), {
    status: 'rejected',
    rejectionReason: reason,
    approvedBy: user.uid,
    approvedByName: user.displayName || user.email,
    processedAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
}

/**
 * Cancelar adiantamento (Freelancer)
 */
export async function cancelAdvance(advanceId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const advanceDoc = await getDoc(doc(db, ADVANCES_COLLECTION, advanceId));
  if (!advanceDoc.exists()) {
    throw new Error('Adiantamento não encontrado');
  }

  const advance = advanceDoc.data() as AdvanceRequest;
  
  if (advance.freelancerId !== user.uid) {
    throw new Error('Não autorizado');
  }

  if (advance.status !== 'pending') {
    throw new Error('Apenas adiantamentos pendentes podem ser cancelados');
  }

  await updateDoc(doc(db, ADVANCES_COLLECTION, advanceId), {
    status: 'cancelled',
    updatedAt: Timestamp.now()
  });
}

/**
 * Atualizar estatísticas do freelancer
 */
async function updateFreelancerStats(
  freelancerId: string, 
  action: 'requested' | 'approved' | 'rejected',
  amount?: number
): Promise<void> {
  const statsRef = doc(db, ADVANCE_STATS_COLLECTION, freelancerId);
  const statsDoc = await getDoc(statsRef);
  
  let stats: FreelancerAdvanceStats;
  
  if (statsDoc.exists()) {
    stats = statsDoc.data() as FreelancerAdvanceStats;
  } else {
    stats = await getFreelancerAdvanceStats(freelancerId);
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Verificar se precisa resetar estatísticas mensais
  const lastUpdate = stats.updatedAt.toDate();
  if (lastUpdate.getMonth() !== currentMonth || lastUpdate.getFullYear() !== currentYear) {
    stats.monthlyAdvancesCount = 0;
    stats.monthlyAmountAdvanced = 0;
  }

  switch (action) {
    case 'requested':
      stats.totalAdvancesRequested++;
      stats.monthlyAdvancesCount++;
      stats.hasActiveAdvance = true;
      if (amount) {
        stats.monthlyAmountAdvanced += amount;
      }
      break;
      
    case 'approved':
      stats.totalAdvancesApproved++;
      if (amount) {
        stats.totalAmountAdvanced += amount;
      }
      break;
      
    case 'rejected':
      stats.totalAdvancesRejected++;
      stats.hasActiveAdvance = false;
      break;
  }

  stats.lastAdvanceDate = Timestamp.now();
  stats.updatedAt = Timestamp.now();

  await setDoc(statsRef, stats);
}
