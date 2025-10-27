import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  FundRelease, 
  FundHold, 
  FundTransaction, 
  ProjectPayment, 
  FundReleaseRequest 
} from '@/types/funds';

export class FundsService {
  
  // Obter informações de pagamento do projeto
  static async getProjectPayment(projectId: string): Promise<ProjectPayment | null> {
    try {
      const q = query(
        collection(db, 'projectPayments'),
        where('projectId', '==', projectId),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as ProjectPayment;
      }

      return null;
    } catch (error) {
      console.error('Erro ao obter pagamento do projeto:', error);
      return null;
    }
  }

  // Criar ou atualizar informações de pagamento do projeto
  static async createOrUpdateProjectPayment(
    projectId: string,
    projectTitle: string,
    projectValue: number,
    clientId: string,
    freelancerId: string
  ): Promise<string> {
    try {
      const existingPayment = await this.getProjectPayment(projectId);
      
      if (existingPayment) {
        return existingPayment.id;
      }

      const paymentData: Omit<ProjectPayment, 'id'> = {
        projectId,
        projectTitle,
        projectValue,
        clientId,
        freelancerId,
        paymentStatus: 'in_escrow',
        escrowStatus: 'held',
        totalPaid: projectValue,
        totalHeld: projectValue,
        totalReleased: 0,
        totalRefunded: 0,
        autoReleaseEnabled: false,
        transactions: [],
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };

      const docRef = await addDoc(collection(db, 'projectPayments'), paymentData);
      
      // Criar registro de hold de fundos
      await this.createFundHold(projectId, projectValue);
      
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar pagamento do projeto:', error);
      throw error;
    }
  }

  // Criar registro de hold de fundos
  static async createFundHold(projectId: string, projectValue: number): Promise<string> {
    try {
      const holdData: Omit<FundHold, 'id'> = {
        projectId,
        projectValue,
        totalHeld: projectValue,
        totalReleased: 0,
        totalRefunded: 0,
        availableForRelease: projectValue,
        isActive: true,
        releases: [],
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };

      const docRef = await addDoc(collection(db, 'fundHolds'), holdData);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar hold de fundos:', error);
      throw error;
    }
  }

  // Solicitar liberação de fundos
  static async requestFundRelease(
    request: FundReleaseRequest,
    clientId: string,
    clientName: string,
    freelancerId: string,
    freelancerName: string,
    projectTitle: string,
    projectValue: number
  ): Promise<string> {
    try {
      // Buscar (ou criar) payment do projeto para obter total já liberado
      let projectPayment = await this.getProjectPayment(request.projectId);
      if (!projectPayment) {
        try {
          const paymentId = await this.createOrUpdateProjectPayment(
            request.projectId,
            projectTitle,
            projectValue,
            clientId,
            freelancerId
          );
          projectPayment = await this.getProjectPayment(request.projectId);
        } catch (seedErr) {
          console.error('Falha ao criar registro de pagamento do projeto:', seedErr);
        }
      }
      const totalReleasedSoFar = projectPayment?.totalReleased || 0;

      // Calcular valores para liberação com base no total já liberado
      const { amount, percentage } = this.calculateReleaseAmount(
        request,
        projectValue,
        totalReleasedSoFar
      );

      // Criar registro de liberação (evitar enviar undefined para o Firestore)
      const releaseData = {
        projectId: request.projectId,
        projectTitle,
        projectValue,
        chatId: request.chatId,
        clientId,
        clientName,
        freelancerId,
        freelancerName,
        releaseType: request.releaseType,
        amount,
        percentage,
        cumulativeAmount: amount,
        cumulativePercentage: percentage,
        remainingAmount: projectValue - amount,
        remainingPercentage: 100 - percentage,
        ...(request.reason !== undefined ? { reason: request.reason } : {}),
        ...(request.description !== undefined ? { description: request.description } : {}),
        ...(request.milestone !== undefined ? { milestone: request.milestone } : {}),
        status: 'approved',
        approvedBy: clientId,
        approvedByName: clientName,
        approvedAt: serverTimestamp() as Timestamp,
        isAutomated: false,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      } as Omit<FundRelease, 'id'>;

      const docRef = await addDoc(collection(db, 'fundReleases'), releaseData);
      const releaseId = docRef.id;
      console.log('Liberação criada:', releaseId, '- Aguardando processamento automático...');
      return releaseId;
    } catch (error) {
      console.error('Erro ao solicitar liberação de fundos:', error);
      throw error;
    }
  }

  // Listar transações do freelancer
  static async getFreelancerTransactions(freelancerId: string): Promise<FundTransaction[]> {
    try {
      const q = query(
        collection(db, 'fundTransactions'),
        where('toUserId', '==', freelancerId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const txs: FundTransaction[] = [];
      
      // Processar cada transação e enriquecer com dados do projeto se necessário
      for (const doc of snap.docs) {
        const tx = { id: doc.id, ...doc.data() } as FundTransaction;
        
        // Se não tem projectTitle, buscar do projeto
        if (!tx.projectTitle && tx.projectId) {
          try {
            const projectDoc = await getDoc(doc(db, 'projects', tx.projectId));
            if (projectDoc.exists()) {
              const projectData = projectDoc.data();
              tx.projectTitle = projectData.title || 'Projeto';
            }
          } catch (projectError) {
            console.warn('Erro ao buscar dados do projeto:', projectError);
            tx.projectTitle = 'Projeto';
          }
        }
        
        // Se não tem clientName, buscar do usuário
        if (!tx.clientName && tx.fromUserId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', tx.fromUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              tx.clientName = userData.name || userData.displayName || 'Cliente';
            }
          } catch (userError) {
            console.warn('Erro ao buscar dados do cliente:', userError);
            tx.clientName = 'Cliente';
          }
        }
        
        txs.push(tx);
      }
      
      return txs;
    } catch (e) {
      console.error('Erro ao buscar transações do freelancer:', e);
      return [];
    }
  }

  // Listar liberações (histórico) do freelancer
  static async getFreelancerReleases(freelancerId: string): Promise<FundRelease[]> {
    try {
      const q = query(
        collection(db, 'fundReleases'),
        where('freelancerId', '==', freelancerId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const list: FundRelease[] = [];
      
      // Processar cada liberação e enriquecer com dados do projeto se necessário
      for (const doc of snap.docs) {
        const release = { id: doc.id, ...doc.data() } as FundRelease;
        
        // Se não tem projectTitle, buscar do projeto
        if (!release.projectTitle && release.projectId) {
          try {
            const projectDoc = await getDoc(doc(db, 'projects', release.projectId));
            if (projectDoc.exists()) {
              const projectData = projectDoc.data();
              release.projectTitle = projectData.title || 'Projeto';
            }
          } catch (projectError) {
            console.warn('Erro ao buscar dados do projeto:', projectError);
            release.projectTitle = 'Projeto';
          }
        }
        
        // Se não tem clientName, buscar do usuário
        if (!release.clientName && release.clientId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', release.clientId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              release.clientName = userData.name || userData.displayName || 'Cliente';
            }
          } catch (userError) {
            console.warn('Erro ao buscar dados do cliente:', userError);
            release.clientName = 'Cliente';
          }
        }
        
        list.push(release);
      }
      
      return list;
    } catch (e) {
      console.error('Erro ao buscar histórico de liberações do freelancer:', e);
      return [];
    }
  }

  // Listar liberações (histórico) do cliente
  static async getClientReleases(clientId: string): Promise<FundRelease[]> {
    try {
      const q = query(
        collection(db, 'fundReleases'),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const list: FundRelease[] = [];
      
      // Processar cada liberação e enriquecer com dados do projeto se necessário
      for (const doc of snap.docs) {
        const release = { id: doc.id, ...doc.data() } as FundRelease;
        
        // Se não tem projectTitle, buscar do projeto
        if (!release.projectTitle && release.projectId) {
          try {
            const projectDoc = await getDoc(doc(db, 'projects', release.projectId));
            if (projectDoc.exists()) {
              const projectData = projectDoc.data();
              release.projectTitle = projectData.title || 'Projeto';
            }
          } catch (projectError) {
            console.warn('Erro ao buscar dados do projeto:', projectError);
            release.projectTitle = 'Projeto';
          }
        }
        
        // Se não tem freelancerName, buscar do usuário
        if (!release.freelancerName && release.freelancerId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', release.freelancerId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              release.freelancerName = userData.name || userData.displayName || 'Freelancer';
            }
          } catch (userError) {
            console.warn('Erro ao buscar dados do freelancer:', userError);
            release.freelancerName = 'Freelancer';
          }
        }
        
        list.push(release);
      }
      
      return list;
    } catch (e) {
      console.error('Erro ao buscar histórico de liberações do cliente:', e);
      return [];
    }
  }

  // Solicitar saque (withdraw)
  static async requestWithdrawal(params: { freelancerId: string; freelancerName: string; amount: number }): Promise<string> {
    try {
      const data = {
        freelancerId: params.freelancerId,
        freelancerName: params.freelancerName,
        amount: params.amount,
        status: 'pending',
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      } as const;
      const ref = await addDoc(collection(db, 'withdrawRequests'), data as any);
      return ref.id;
    } catch (e) {
      console.error('Erro ao solicitar saque:', e);
      throw e;
    }
  }

  // Calcular valor da liberação
  static calculateReleaseAmount(
    request: FundReleaseRequest,
    projectValue: number,
    totalReleased: number
  ): { amount: number; percentage: number } {
    if (request.releaseType === 'full') {
      const remainingAmount = projectValue - totalReleased;
      return {
        amount: remainingAmount,
        percentage: (remainingAmount / projectValue) * 100
      };
    }

    if (request.percentage) {
      const amount = (projectValue * request.percentage) / 100;
      return {
        amount,
        percentage: request.percentage
      };
    }

    if (request.amount) {
      const percentage = (request.amount / projectValue) * 100;
      return {
        amount: request.amount,
        percentage
      };
    }

    throw new Error('Valores de liberação inválidos');
  }

  // Processar liberação de fundos
  static async processFundRelease(releaseId: string): Promise<void> {
    try {
      const releaseDoc = await getDoc(doc(db, 'fundReleases', releaseId));
      if (!releaseDoc.exists()) {
        throw new Error('Liberação não encontrada');
      }

      const release = { id: releaseDoc.id, ...releaseDoc.data() } as FundRelease;

      // Atualizar status para liberado
      await updateDoc(doc(db, 'fundReleases', releaseId), {
        status: 'released',
        releasedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Atualizar projeto payment
      await this.updateProjectPaymentAfterRelease(release);

      // Criar transação
      await this.createFundTransaction(release);

      // Atualizar chat se aplicável
      if (release.chatId) {
        await this.updateChatAfterRelease(release);
      }

    } catch (error) {
      console.error('Erro ao processar liberação:', error);
      throw error;
    }
  }

  // Atualizar projeto payment após liberação
  static async updateProjectPaymentAfterRelease(release: FundRelease): Promise<void> {
    try {
      const projectPayment = await this.getProjectPayment(release.projectId);
      if (!projectPayment) return;

      const newTotalReleased = projectPayment.totalReleased + release.amount;
      const newEscrowStatus = newTotalReleased >= projectPayment.projectValue ? 'fully_released' : 'partially_released';
      const newPaymentStatus = newTotalReleased >= projectPayment.projectValue ? 'released' : 'partially_paid';

      await updateDoc(doc(db, 'projectPayments', projectPayment.id), {
        totalReleased: newTotalReleased,
        escrowStatus: newEscrowStatus,
        paymentStatus: newPaymentStatus,
        lastActivity: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Atualizar fund hold
      await this.updateFundHoldAfterRelease(release);

    } catch (error) {
      console.error('Erro ao atualizar projeto payment:', error);
    }
  }

  // Atualizar fund hold após liberação
  static async updateFundHoldAfterRelease(release: FundRelease): Promise<void> {
    try {
      const q = query(
        collection(db, 'fundHolds'),
        where('projectId', '==', release.projectId),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const holdDoc = querySnapshot.docs[0];
        const hold = { id: holdDoc.id, ...holdDoc.data() } as FundHold;

        const newTotalReleased = hold.totalReleased + release.amount;
        const newAvailableForRelease = hold.projectValue - newTotalReleased;

        await updateDoc(doc(db, 'fundHolds', hold.id), {
          totalReleased: newTotalReleased,
          availableForRelease: newAvailableForRelease,
          isActive: newAvailableForRelease > 0,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar fund hold:', error);
    }
  }

  // Criar transação de fundos
  static async createFundTransaction(release: FundRelease): Promise<void> {
    try {
      const transactionData: Omit<FundTransaction, 'id'> = {
        projectId: release.projectId,
        releaseId: release.id,
        type: 'release',
        amount: release.amount,
        description: `Liberação de fundos - ${release.releaseType === 'partial' ? release.percentage + '%' : '100%'}`,
        fromUserId: release.clientId,
        toUserId: release.freelancerId,
        status: 'completed',
        netAmount: release.amount,
        processedAt: serverTimestamp() as Timestamp,
        createdAt: serverTimestamp() as Timestamp
      };

      await addDoc(collection(db, 'fundTransactions'), transactionData);
    } catch (error) {
      console.error('Erro ao criar transação:', error);
    }
  }

  // Atualizar chat após liberação
  static async updateChatAfterRelease(release: FundRelease): Promise<void> {
    try {
      const chatDoc = await getDoc(doc(db, 'chats', release.chatId));
      if (!chatDoc.exists()) return;

      const updateData: any = {
        lastFundRelease: {
          amount: release.amount,
          percentage: release.percentage,
          releasedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      };

      // Se liberação total, marcar como fundos totalmente liberados
      if (release.remainingAmount <= 0) {
        updateData.fundsReleased = true;
        updateData.fundsReleasedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'chats', release.chatId), updateData);
    } catch (error) {
      console.error('Erro ao atualizar chat:', error);
    }
  }

  // Obter histórico de liberações
  static async getProjectReleases(projectId: string): Promise<FundRelease[]> {
    try {
      const q = query(
        collection(db, 'fundReleases'),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const releases: FundRelease[] = [];
      
      querySnapshot.forEach((doc) => {
        releases.push({
          id: doc.id,
          ...doc.data()
        } as FundRelease);
      });

      return releases;
    } catch (error) {
      console.error('Erro ao obter liberações:', error);
      return [];
    }
  }

  // Obter status atual de fundos de um projeto
  static async getProjectFundStatus(projectId: string): Promise<{
    projectValue: number;
    totalReleased: number;
    remainingAmount: number;
    releasedPercentage: number;
    remainingPercentage: number;
    canRelease: boolean;
    suggestedReleaseOptions: number[];
  } | null> {
    try {
      const projectPayment = await this.getProjectPayment(projectId);
      if (!projectPayment) return null;

      const projectValue: number = Number(
        (projectPayment as any).projectValue ??
        (projectPayment as any).amount ??
        (projectPayment as any).totalHeld ??
        (projectPayment as any).totalPaid ??
        0
      );

      const totalReleasedFromPayment: number = Number((projectPayment as any).totalReleased || 0);

      // Fallback/garantia: somar releases efetivados para evitar atraso de consistência
      let totalReleasedFromReleases = 0;
      try {
        const relQ = query(
          collection(db, 'fundReleases'),
          where('projectId', '==', projectId),
          where('status', '==', 'released')
        );
        const relSnap = await getDocs(relQ);
        relSnap.forEach((d) => {
          const r = d.data() as any;
          totalReleasedFromReleases += Number(r.amount || 0);
        });
      } catch (e) {
        // ignora fallback se falhar
      }

      const totalReleased: number = Math.max(totalReleasedFromPayment, totalReleasedFromReleases);
      const remainingAmount: number = Math.max(projectValue - totalReleased, 0);
      const releasedPercentage: number = projectValue > 0 ? (totalReleased / projectValue) * 100 : 0;
      const remainingPercentage: number = projectValue > 0 ? (remainingAmount / projectValue) * 100 : 0;

      // Opções sugeridas de liberação (de 10% em 10%)
      const suggestedReleaseOptions: number[] = [];
      for (let i = 10; i <= 100; i += 10) {
        const releaseAmount = (projectValue * i) / 100;
        if (releaseAmount <= remainingAmount) {
          suggestedReleaseOptions.push(i);
        }
      }

      return {
        projectValue,
        totalReleased,
        remainingAmount,
        releasedPercentage,
        remainingPercentage,
        canRelease: remainingAmount > 0,
        suggestedReleaseOptions
      };
    } catch (error) {
      console.error('Erro ao obter status de fundos:', error);
      return null;
    }
  }

  // Validar solicitação de liberação
  static async validateReleaseRequest(request: FundReleaseRequest): Promise<{
    isValid: boolean;
    error?: string;
    calculatedAmount?: number;
    calculatedPercentage?: number;
  }> {
    try {
      const projectPayment = await this.getProjectPayment(request.projectId);
      if (!projectPayment) {
        return {
          isValid: false,
          error: 'Projeto não encontrado ou sem informações de pagamento'
        };
      }

      const projectValue: number = Number(
        (projectPayment as any).projectValue ??
        (projectPayment as any).amount ??
        (projectPayment as any).totalHeld ??
        (projectPayment as any).totalPaid ??
        0
      );
      const availableAmount = projectValue - Number((projectPayment as any).totalReleased || 0);
      
      if (availableAmount <= 0) {
        return {
          isValid: false,
          error: 'Todos os fundos já foram liberados'
        };
      }

      const { amount, percentage } = this.calculateReleaseAmount(
        request,
        projectValue,
        Number((projectPayment as any).totalReleased || 0)
      );

      if (amount > availableAmount) {
        return {
          isValid: false,
          error: `Valor solicitado (R$ ${amount.toFixed(2)}) excede os fundos disponíveis (R$ ${availableAmount.toFixed(2)})`
        };
      }

      if (percentage > 100) {
        return {
          isValid: false,
          error: 'Porcentagem não pode exceder 100%'
        };
      }

      return {
        isValid: true,
        calculatedAmount: amount,
        calculatedPercentage: percentage
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Erro ao validar solicitação: ' + (error as Error).message
      };
    }
  }

  // Subscrever a liberações de um projeto
  static subscribeToProjectReleases(projectId: string, callback: (releases: FundRelease[]) => void): () => void {
    const q = query(
      collection(db, 'fundReleases'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const releases: FundRelease[] = [];
      querySnapshot.forEach((doc) => {
        releases.push({
          id: doc.id,
          ...doc.data()
        } as FundRelease);
      });
      callback(releases);
    });
  }

  // Obter saldo atual do freelancer
  static async getFreelancerBalance(freelancerId: string): Promise<{
    totalEarnings: number;
    totalReleased: number;
    pendingAmount: number;
    availableBalance: number;
    pendingWithdrawals?: number;
  }> {
    try {
      console.log('getFreelancerBalance: Iniciando cálculo para freelancerId:', freelancerId);
      
      // Buscar todas as transações de liberação para o freelancer
      const q = query(
        collection(db, 'fundTransactions'),
        where('toUserId', '==', freelancerId),
        where('type', '==', 'release'),
        where('status', '==', 'completed')
      );

      const querySnapshot = await getDocs(q);
      console.log('getFreelancerBalance: Encontradas', querySnapshot.size, 'transações de liberação');
      
      let totalReleasedTx = 0;
      querySnapshot.forEach(doc => {
        const transaction = doc.data();
        const amount = Number(transaction.amount || 0);
        totalReleasedTx += amount;
        console.log('getFreelancerBalance: Transação', doc.id, 'amount:', amount, 'totalReleasedTx acumulado:', totalReleasedTx);
      });

      // Fallback: somar releases efetivados (caso a transação ainda não tenha sido gravada)
      let totalReleasedRel = 0;
      try {
        const relQ = query(
          collection(db, 'fundReleases'),
          where('freelancerId', '==', freelancerId),
          where('status', '==', 'released')
        );
        const relSnap = await getDocs(relQ);
        relSnap.forEach(d => {
          const r: any = d.data();
          totalReleasedRel += Number(r.amount || 0);
        });
        console.log('getFreelancerBalance: totalReleasedRel (de releases):', totalReleasedRel);
      } catch (e) {
        console.warn('getFreelancerBalance: falha ao somar fundReleases', e);
      }

      const totalReleased = Math.max(totalReleasedTx, totalReleasedRel);

      // Buscar saques concluídos do freelancer
      const withdrawTxQuery = query(
        collection(db, 'fundTransactions'),
        where('fromUserId', '==', freelancerId),
        where('type', '==', 'withdraw'),
        where('status', '==', 'completed')
      );
      const withdrawSnapshot = await getDocs(withdrawTxQuery);
      let totalWithdrawn = 0;
      withdrawSnapshot.forEach(doc => {
        const tx = doc.data();
        totalWithdrawn += Number(tx.amount || 0);
      });

      // Buscar propostas aceitas para calcular ganhos totais
      const proposalsQuery = query(
        collection(db, 'projectProposals'),
        where('freelancerId', '==', freelancerId),
        where('status', '==', 'aceita')
      );

      const proposalsSnapshot = await getDocs(proposalsQuery);
      let totalEarnings = 0;
      proposalsSnapshot.forEach(doc => {
        const proposal = doc.data();
        totalEarnings += proposal.proposedBudget || 0;
      });

      // Calcular valores pendentes (ganhos totais - liberado)
      const pendingAmount = totalEarnings - totalReleased;
      const availableBalance = Math.max(totalReleased - totalWithdrawn, 0);

      console.log('getFreelancerBalance: Resumo final:', {
        totalEarnings,
        totalReleased,
        totalWithdrawn,
        pendingAmount,
        availableBalance
      });

      // Saques pendentes (se existirem)
      let pendingWithdrawals = 0;
      try {
        const pendingWithdrawQuery = query(
          collection(db, 'withdrawRequests'),
          where('freelancerId', '==', freelancerId),
          where('status', '==', 'pending')
        );
        const pendingSnap = await getDocs(pendingWithdrawQuery);
        pendingSnap.forEach(doc => {
          const wr = doc.data() as any;
          pendingWithdrawals += Number(wr.amount || 0);
        });
      } catch {}

      const result = {
        totalEarnings,
        totalReleased,
        pendingAmount,
        availableBalance,
        pendingWithdrawals
      };
      
      console.log('getFreelancerBalance: Retornando resultado:', result);
      return result;
    } catch (error) {
      console.error('Erro ao calcular saldo do freelancer:', error);
      return {
        totalEarnings: 0,
        totalReleased: 0,
        pendingAmount: 0,
        availableBalance: 0,
        pendingWithdrawals: 0
      };
    }
  }

  // Subscrever ao saldo do freelancer em tempo real
  static subscribeFreelancerBalance(
    freelancerId: string, 
    callback: (balance: {
      totalEarnings: number;
      totalReleased: number;
      pendingAmount: number;
      availableBalance: number;
      pendingWithdrawals?: number;
    }) => void
  ): () => void {
    let totalReleasedTx = 0;
    let totalReleasedRel = 0;

    const recalcAndNotify = async () => {
      const totalReleased = Math.max(totalReleasedTx, totalReleasedRel);
      // Buscar saques concluídos para subtrair do saldo disponível
      let totalWithdrawn = 0;
      try {
        const withdrawTxQuery = query(
          collection(db, 'fundTransactions'),
          where('fromUserId', '==', freelancerId),
          where('type', '==', 'withdraw'),
          where('status', '==', 'completed')
        );
        const withdrawSnapshot = await getDocs(withdrawTxQuery);
        withdrawSnapshot.forEach(doc => {
          const tx = doc.data();
          totalWithdrawn += Number(tx.amount || 0);
        });
      } catch {}

      // Buscar propostas aceitas para calcular ganhos totais
      const proposalsQuery = query(
        collection(db, 'projectProposals'),
        where('freelancerId', '==', freelancerId),
        where('status', '==', 'aceita')
      );

      try {
        const proposalsSnapshot = await getDocs(proposalsQuery);
        let totalEarnings = 0;
        proposalsSnapshot.forEach(doc => {
          const proposal = doc.data();
          totalEarnings += proposal.proposedBudget || 0;
        });

        // Calcular valores pendentes (ganhos totais - liberado)
        const pendingAmount = totalEarnings - totalReleased;
        const availableBalance = Math.max(totalReleased - totalWithdrawn, 0);
        let pendingWithdrawals = 0;
        try {
          const pendingWithdrawQuery = query(
            collection(db, 'withdrawRequests'),
            where('freelancerId', '==', freelancerId),
            where('status', '==', 'pending')
          );
          const pendingSnap = await getDocs(pendingWithdrawQuery);
          pendingSnap.forEach(doc => {
            const wr = doc.data() as any;
            pendingWithdrawals += Number(wr.amount || 0);
          });
        } catch {}

        callback({
          totalEarnings,
          totalReleased,
          pendingAmount,
          availableBalance,
          pendingWithdrawals
        });
      } catch (error) {
        console.error('Erro ao calcular saldo do freelancer:', error);
        callback({
          totalEarnings: 0,
          totalReleased: 0,
          pendingAmount: 0,
          availableBalance: 0,
          pendingWithdrawals: 0
        });
      }
    };

    // Listener para transações de liberação
    const transactionsQuery = query(
      collection(db, 'fundTransactions'),
      where('toUserId', '==', freelancerId),
      where('type', '==', 'release'),
      where('status', '==', 'completed')
    );
    const unsubscribeTransactions = onSnapshot(transactionsQuery, async (transactionsSnapshot) => {
      totalReleasedTx = 0;
      transactionsSnapshot.forEach(doc => {
        const transaction = doc.data();
        totalReleasedTx += Number(transaction.amount || 0);
      });
      await recalcAndNotify();
    });

    // Listener para releases efetivados (fallback)
    const releasesQuery = query(
      collection(db, 'fundReleases'),
      where('freelancerId', '==', freelancerId),
      where('status', '==', 'released')
    );
    const unsubscribeReleases = onSnapshot(releasesQuery, async (releasesSnapshot) => {
      totalReleasedRel = 0;
      releasesSnapshot.forEach(doc => {
        const rel = doc.data() as any;
        totalReleasedRel += Number(rel.amount || 0);
      });
      await recalcAndNotify();
    });

    // Retornar função para cancelar a inscrição
    return () => {
      unsubscribeTransactions();
      unsubscribeReleases();
    };
  }
} 