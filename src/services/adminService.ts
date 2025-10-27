import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  startAfter,
  endBefore,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types/user';
import { Notification } from '@/types/notification';

// Tipo para logs do sistema
export interface SystemLog {
  id: string;
  type: 'payment' | 'project' | 'user' | 'dispute' | 'plan' | 'system' | 'error';
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  projectId?: string;
  timestamp: Date;
  source: string;
  read?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AdminService {
  
  // Buscar usuário por ID
  static async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return null;
      }
      
      return { uid: userDoc.id, ...userDoc.data() } as UserProfile;
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      throw new Error('Falha ao buscar usuário');
    }
  }

  // Buscar todos os usuários (clientes e freelancers)
  static async getAllUsers(): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', 'in', ['client', 'freelancer']),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const users: UserProfile[] = [];
      
      querySnapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      
      return users;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw new Error('Falha ao buscar usuários');
    }
  }

  // Buscar usuários recentes (últimos 10)
  static async getRecentUsers(limitCount: number = 10): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', 'in', ['client', 'freelancer']),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const users: UserProfile[] = [];
      
      querySnapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      
      return users;
    } catch (error) {
      console.error('Erro ao buscar usuários recentes:', error);
      throw new Error('Falha ao buscar usuários recentes');
    }
  }

  // Buscar membros da equipe (gestores e moderadores)
  static async getTeamMembers(): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', 'in', ['manager', 'moderator']),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const teamMembers: UserProfile[] = [];
      
      querySnapshot.forEach((doc) => {
        teamMembers.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      
      return teamMembers;
    } catch (error) {
      console.error('Erro ao buscar equipe:', error);
      throw new Error('Falha ao buscar membros da equipe');
    }
  }

  // Buscar estatísticas gerais expandidas
  static async getStats() {
    try {
      const [users, teamMembers, monthlyData, projectsData, financialData] = await Promise.all([
        this.getAllUsers(),
        this.getTeamMembers(),
        this.getMonthlyUserStats(),
        this.getProjectStats(),
        this.getFinancialStats()
      ]);

      const stats = {
        // Dados existentes
        totalUsers: users.length,
        totalClients: users.filter(u => u.role === 'client').length,
        totalFreelancers: users.filter(u => u.role === 'freelancer').length,
        totalManagers: teamMembers.filter(u => u.role === 'manager').length,
        totalModerators: teamMembers.filter(u => u.role === 'moderator').length,
        activeChats: 0, // TODO: Implementar quando o sistema de chat estiver finalizado
        disputedChats: 0, // TODO: Implementar quando o sistema de chat estiver finalizado
        
        // Novos dados mensais
        monthlyFreelancers: monthlyData.freelancers,
        monthlyClients: monthlyData.clients,
        
        // Dados de projetos
        monthlyProjectsCreated: projectsData.monthlyCreated,
        monthlyProjectsCompleted: projectsData.monthlyCompleted,
        monthlyDisputes: projectsData.monthlyDisputes,
        
        // Dados financeiros
        totalFreelancerEarnings: financialData.totalFreelancerEarnings,
        monthlyFreelancerEarnings: financialData.monthlyFreelancerEarnings,
        totalClientSpending: financialData.totalClientSpending,
        platformRevenue: financialData.platformRevenue
      };

      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw new Error('Falha ao buscar estatísticas');
    }
  }

  // Buscar usuários por role específico
  static async getUsersByRole(role: 'client' | 'freelancer' | 'manager' | 'moderator'): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', role),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const users: UserProfile[] = [];
      
      querySnapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      
      return users;
    } catch (error) {
      console.error(`Erro ao buscar usuários do tipo ${role}:`, error);
      throw new Error(`Falha ao buscar usuários do tipo ${role}`);
    }
  }

  // Buscar estatísticas mensais de usuários
  static async getMonthlyUserStats() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startTimestamp = Timestamp.fromDate(startOfMonth);

      const [freelancersQuery, clientsQuery] = await Promise.all([
        getDocs(query(
          collection(db, 'users'),
          where('role', '==', 'freelancer'),
          where('createdAt', '>=', startTimestamp)
        )),
        getDocs(query(
          collection(db, 'users'),
          where('role', '==', 'client'),
          where('createdAt', '>=', startTimestamp)
        ))
      ]);

      return {
        freelancers: freelancersQuery.size,
        clients: clientsQuery.size
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas mensais de usuários:', error);
      return { freelancers: 0, clients: 0 };
    }
  }

  // Buscar estatísticas de projetos
  static async getProjectStats() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startTimestamp = Timestamp.fromDate(startOfMonth);

      const [createdQuery, completedQuery, disputesQuery] = await Promise.all([
        getDocs(query(
          collection(db, 'projects'),
          where('createdAt', '>=', startTimestamp)
        )),
        getDocs(query(
          collection(db, 'projects'),
          where('status', '==', 'concluido'),
          where('updatedAt', '>=', startTimestamp)
        )),
        getDocs(query(
          collection(db, 'disputes'),
          where('createdAt', '>=', startTimestamp)
        ))
      ]);

      // Calcular valor total das disputas
      let disputesValue = 0;
      disputesQuery.forEach((doc) => {
        const dispute = doc.data();
        if (dispute.amount) {
          disputesValue += dispute.amount;
        }
      });

      return {
        monthlyCreated: createdQuery.size,
        monthlyCompleted: completedQuery.size,
        monthlyDisputes: {
          count: disputesQuery.size,
          totalValue: disputesValue
        }
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de projetos:', error);
      return {
        monthlyCreated: 0,
        monthlyCompleted: 0,
        monthlyDisputes: { count: 0, totalValue: 0 }
      };
    }
  }

  // Buscar estatísticas financeiras
  static async getFinancialStats() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startTimestamp = Timestamp.fromDate(startOfMonth);

      const [paymentsQuery, monthlyPaymentsQuery, subscriptionsQuery] = await Promise.all([
        getDocs(collection(db, 'payments')),
        getDocs(query(
          collection(db, 'payments'),
          where('createdAt', '>=', startTimestamp)
        )),
        getDocs(collection(db, 'subscriptions'))
      ]);

      let totalFreelancerEarnings = 0;
      let monthlyFreelancerEarnings = 0;
      let totalClientSpending = 0;
      let platformRevenue = 0;

      // Calcular ganhos totais dos freelancers
      paymentsQuery.forEach((doc) => {
        const payment = doc.data();
        if (payment.type === 'project_payment' && payment.status === 'completed') {
          const freelancerAmount = payment.amount * 0.9; // 90% para o freelancer
          const platformFee = payment.amount * 0.1; // 10% para a plataforma
          
          totalFreelancerEarnings += freelancerAmount;
          totalClientSpending += payment.amount;
          platformRevenue += platformFee;
        }
      });

      // Calcular ganhos mensais dos freelancers
      monthlyPaymentsQuery.forEach((doc) => {
        const payment = doc.data();
        if (payment.type === 'project_payment' && payment.status === 'completed') {
          monthlyFreelancerEarnings += payment.amount * 0.9;
        }
      });

      // Adicionar receita de assinaturas
      subscriptionsQuery.forEach((doc) => {
        const subscription = doc.data();
        if (subscription.status === 'active') {
          platformRevenue += subscription.amount || 0;
        }
      });

      return {
        totalFreelancerEarnings,
        monthlyFreelancerEarnings,
        totalClientSpending,
        platformRevenue
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas financeiras:', error);
      return {
        totalFreelancerEarnings: 0,
        monthlyFreelancerEarnings: 0,
        totalClientSpending: 0,
        platformRevenue: 0
      };
    }
  }

  // Buscar comprovantes recentes
  static async getRecentProofs(limitCount: number = 10) {
    try {
      const [paymentProofs, subscriptionProofs, earningsProofs] = await Promise.all([
        getDocs(query(
          collection(db, 'payment_proofs'),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        )),
        getDocs(query(
          collection(db, 'subscription_proofs'),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        )),
        getDocs(query(
          collection(db, 'earnings_proofs'),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        ))
      ]);

      const proofs = {
        payments: paymentProofs.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        subscriptions: subscriptionProofs.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        earnings: earningsProofs.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      };

      return proofs;
    } catch (error) {
      console.error('Erro ao buscar comprovantes:', error);
      return {
        payments: [],
        subscriptions: [],
        earnings: []
      };
    }
  }

  // Buscar logs do sistema da nova coleção 'logs'
  static async getSystemLogs(limitCount: number = 50, unreadOnly: boolean = false): Promise<SystemLog[]> {
    try {
      // Buscar logs do sistema da coleção 'logs'
      let q = query(
        collection(db, 'logs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      if (unreadOnly) {
        q = query(
          collection(db, 'logs'),
          where('read', '==', false),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        createdAt: doc.data().timestamp?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        read: doc.data().read || false
      })) as SystemLog[];

      return logs;
    } catch (error) {
      console.error('Erro ao buscar logs do sistema:', error);
      throw new Error('Falha ao buscar logs do sistema');
    }
  }

  // Marcar log como lido
  static async markLogAsRead(logId: string): Promise<void> {
    try {
      const logRef = doc(db, 'logs', logId);
      await updateDoc(logRef, {
        read: true,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erro ao marcar log como lido:', error);
      throw new Error('Falha ao marcar log como lido');
    }
  }

  // Marcar todos os logs como lidos
  static async markAllLogsAsRead(): Promise<void> {
    try {
      const q = query(
        collection(db, 'logs'),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const batch = [];
      
      for (const docSnapshot of snapshot.docs) {
        batch.push(
          updateDoc(doc(db, 'logs', docSnapshot.id), {
            read: true,
            updatedAt: Timestamp.now()
          })
        );
      }
      
      await Promise.all(batch);
    } catch (error) {
      console.error('Erro ao marcar todos os logs como lidos:', error);
      throw new Error('Falha ao marcar todos os logs como lidos');
    }
  }

  // Buscar estatísticas dos logs
  static async getLogStats(): Promise<{ total: number; unread: number }> {
    try {
      const [totalSnapshot, unreadSnapshot] = await Promise.all([
        getDocs(collection(db, 'logs')),
        getDocs(query(collection(db, 'logs'), where('read', '==', false)))
      ]);
      
      return {
        total: totalSnapshot.size,
        unread: unreadSnapshot.size
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas dos logs:', error);
      return { total: 0, unread: 0 };
    }
  }

  // Buscar status do plano (settings/plans)
  static async getPlanStatus(): Promise<boolean> {
    try {
      const docRef = doc(db, 'settings', 'plans');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return !!data.status;
      }
      return false;
    } catch (error) {
      console.error('Erro ao buscar status do plano:', error);
      return false;
    }
  }

  // Atualizar status do plano (settings/plans)
  static async setPlanStatus(status: boolean): Promise<void> {
    try {
      const docRef = doc(db, 'settings', 'plans');
      // Usa setDoc com merge para criar ou atualizar
      const { setDoc } = await import('firebase/firestore');
      await setDoc(docRef, { status }, { merge: true });
    } catch (error) {
      console.error('Erro ao atualizar status do plano:', error);
      throw error;
    }
  }

  // Atualizar status de solicitação de suporte
  static async updateSupportRequestStatus(logId: string, updates: {
    status?: string;
    response?: string;
    respondedAt?: Date;
    respondedBy?: string;
  }): Promise<void> {
    try {
      const logDoc = doc(db, 'logs', logId);
      
      // Primeiro, buscar o documento atual para preservar os metadados existentes
      const currentDoc = await getDoc(logDoc);
      if (!currentDoc.exists()) {
        throw new Error('Documento não encontrado');
      }
      
      const currentData = currentDoc.data();
      const currentMetadata = currentData.metadata || {};
      
      // Atualizar os metadados com as novas informações
      const updatedMetadata = {
        ...currentMetadata,
        ...updates,
        updatedAt: new Date()
      };
      
      await updateDoc(logDoc, {
        metadata: updatedMetadata,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao atualizar status da solicitação de suporte:', error);
      throw new Error('Falha ao atualizar status da solicitação de suporte');
    }
  }
}