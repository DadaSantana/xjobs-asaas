import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  updateDoc,
  increment,
  arrayUnion,
  addDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from "../lib/firebase";
import { 
  Project, 
  ProjectProposal, 
  CreateProjectData, 
  CreateProposalData, 
  ProjectFilters,
  ProjectStatus,
  ProposalStatus,
  ProjectAttachment
} from '../types/project';
import { UserProfileService } from './userProfileService';
import { NotificationService } from './notificationService';

export class ProjectService {
  // Criar um novo projeto
  static async createProject(data: CreateProjectData): Promise<string> {
    try {
      // Get client profile to get their rating
      const clientProfile = await UserProfileService.getUserProfile(data.clientId);
      const clientRating = clientProfile?.rating || 0;

      const projectData = {
        ...data,
        status: 'recebendo_propostas' as ProjectStatus,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        proposalsCount: 0,
        // Campos do sistema de curtidas
        likes: [],
        likesCount: 0,
        maxLikes: 80,
        clientRating: clientRating
      };

      const docRef = await addDoc(collection(db, 'projects'), projectData);
      // Criar log de sistema para novo projeto
      try {
        await addDoc(collection(db, 'logs'), {
          type: 'project_created',
          level: 'info',
          title: 'Novo projeto criado',
          message: `Projeto "${data.title}" criado pelo cliente (${data.clientId}).`,
          timestamp: Timestamp.now(),
          source: 'projectService.createProject',
          projectId: docRef.id,
          clientId: data.clientId,
          read: false
        });
      } catch (logError) {
        console.error('Erro ao criar log de sistema de novo projeto:', logError);
      }
      
      // Criar notificação para o cliente
      try {
        await NotificationService.createNotification({
          userId: data.clientId,
          type: 'project_created',
          title: 'Projeto criado com sucesso',
          message: `Seu projeto "${data.title}" foi criado e está recebendo propostas de freelancers.`,
          actionUrl: `/projetos/${docRef.id}`,
          actionLabel: 'Ver projeto'
        });
      } catch (notificationError) {
        console.error('Erro ao criar notificação de projeto:', notificationError);
        // Não falhar se a notificação falhar
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      throw error;
    }
  }

  // Buscar projetos com filtros
  static async getProjects(filters?: ProjectFilters): Promise<Project[]> {
    try {
      let q = query(collection(db, 'projects'));

      // Aplicar filtros
      if (filters?.category) {
        q = query(q, where('category', '==', filters.category));
      }

      if (filters?.experienceLevel) {
        q = query(q, where('experienceLevel', '==', filters.experienceLevel));
      }

      // Filtrar apenas projetos recebendo propostas por padrão
      q = query(q, where('status', '==', 'recebendo_propostas'));

      // Ordenação
      switch (filters?.sortBy) {
        case 'budget_asc':
          q = query(q, orderBy('budget.min', 'asc'));
          break;
        case 'budget_desc':
          q = query(q, orderBy('budget.max', 'desc'));
          break;
        case 'deadline':
          q = query(q, orderBy('deadline', 'asc'));
          break;
        default:
          q = query(q, orderBy('createdAt', 'desc'));
      }

      q = query(q, limit(50));

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          // Converter deadline de Timestamp para Date se necessário
          deadline: data.deadline && typeof data.deadline.toDate === 'function' 
            ? data.deadline.toDate() 
            : data.deadline,
        } as Project;
      });
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      throw error;
    }
  }

  // Buscar projetos de um cliente específico
  static async getClientProjects(clientId: string): Promise<Project[]> {
    try {
      const q = query(
        collection(db, 'projects'),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          // Converter deadline de Timestamp para Date se necessário
          deadline: data.deadline && typeof data.deadline.toDate === 'function' 
            ? data.deadline.toDate() 
            : data.deadline,
        } as Project;
      });
    } catch (error) {
      console.error('Erro ao buscar projetos do cliente:', error);
      throw error;
    }
  }

  // Buscar projeto por ID
  static async getProjectById(projectId: string): Promise<Project | null> {
    try {
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        const data = projectDoc.data();
        return {
          ...data,
          id: projectDoc.id,
          // Converter deadline de Timestamp para Date se necessário
          deadline: data.deadline && typeof data.deadline.toDate === 'function' 
            ? data.deadline.toDate() 
            : data.deadline,
        } as Project;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar projeto:', error);
      return null;
    }
  }

  // Buscar projetos em que o freelancer foi selecionado
  static async getProjectsBySelectedFreelancer(freelancerId: string): Promise<Project[]> {
    try {
      const q = query(
        collection(db, 'projects'),
        where('selectedFreelancerId', '==', freelancerId)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          deadline: data.deadline && typeof data.deadline.toDate === 'function'
            ? data.deadline.toDate()
            : data.deadline,
        } as Project;
      });
    } catch (error) {
      console.error('Erro ao buscar projetos do freelancer selecionado:', error);
      throw error;
    }
  }

  // Buscar todos os projetos (para admin/manager)
  static async getAllProjects(): Promise<Project[]> {
    try {
      const q = query(
        collection(db, 'projects'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          deadline: data.deadline && typeof data.deadline.toDate === 'function'
            ? data.deadline.toDate()
            : data.deadline,
        } as Project;
      });
    } catch (error) {
      console.error('Erro ao buscar todos os projetos:', error);
      throw error;
    }
  }

  // Criar proposta para um projeto
  static async createProposal(
    freelancerId: string,
    freelancerName: string,
    freelancerRating: number,
    proposalData: CreateProposalData
  ): Promise<ProjectProposal> {
    try {
      const proposalId = doc(collection(db, 'proposals')).id;
      const now = Timestamp.now();

      const proposal: ProjectProposal = {
        id: proposalId,
        ...proposalData,
        freelancerId,
        freelancerName,
        freelancerRating,
        status: 'pendente',
        createdAt: now,
        updatedAt: now,
        totalValue: proposalData.proposedBudget * 1.1, // Adicionar comissão de 10%
      };

      // Salvar proposta
      await setDoc(doc(db, 'proposals', proposalId), proposal);

      // Incrementar contador de propostas no projeto
      await updateDoc(doc(db, 'projects', proposalData.projectId), {
        proposalsCount: increment(1),
        updatedAt: now
      });

      // Buscar dados do projeto para notificar o cliente
      try {
        const projectDoc = await getDoc(doc(db, 'projects', proposalData.projectId));
        if (projectDoc.exists()) {
          const projectData = projectDoc.data();
          await NotificationService.createNotification({
            userId: projectData.clientId,
            type: 'project_proposal',
            title: 'Nova proposta recebida',
            message: `${freelancerName} enviou uma proposta para seu projeto "${projectData.title}".`,
            actionUrl: `/projetos/${proposalData.projectId}/propostas`,
            actionLabel: 'Ver propostas'
          });
        }
      } catch (notificationError) {
        console.error('Erro ao criar notificação de proposta:', notificationError);
        // Não falhar se a notificação falhar
      }

      // Criar log de sistema para proposta enviada
      try {
        await addDoc(collection(db, 'logs'), {
          type: 'proposal_sent',
          level: 'info',
          title: 'Proposta enviada',
          message: `${freelancerName} enviou uma proposta para o projeto (${proposalData.projectId}).`,
          timestamp: now,
          source: 'projectService.createProposal',
          projectId: proposalData.projectId,
          freelancerId: freelancerId,
          read: false
        });
      } catch (logError) {
        console.error('Erro ao criar log de sistema de proposta enviada:', logError);
      }

      return proposal;
    } catch (error) {
      console.error('Erro ao criar proposta:', error);
      throw error;
    }
  }

  // Buscar propostas de um projeto
  static async getProjectProposals(projectId: string): Promise<ProjectProposal[]> {
    try {
      const q = query(
        collection(db, 'proposals'),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as ProjectProposal));
    } catch (error) {
      console.error('Erro ao buscar propostas:', error);
      throw error;
    }
  }

  // Buscar propostas de um freelancer
  static async getFreelancerProposals(freelancerId: string): Promise<ProjectProposal[]> {
    try {
      const q = query(
        collection(db, 'proposals'),
        where('freelancerId', '==', freelancerId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as ProjectProposal));
    } catch (error) {
      console.error('Erro ao buscar propostas do freelancer:', error);
      throw error;
    }
  }

  // Aceitar uma proposta
  static async acceptProposal(projectId: string, proposalId: string): Promise<{ paymentUrl: string }> {
    try {
      // Buscar dados da proposta
      const proposalDoc = await getDoc(doc(db, 'proposals', proposalId));
      if (!proposalDoc.exists()) {
        throw new Error('Proposta não encontrada');
      }
      
      const proposal = proposalDoc.data() as ProjectProposal;
      
      // Buscar dados do projeto
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (!projectDoc.exists()) {
        throw new Error('Projeto não encontrado');
      }
      
      const project = projectDoc.data() as Project;
      
      // Buscar dados do cliente
      const clientDoc = await getDoc(doc(db, 'users', project.clientId));
      if (!clientDoc.exists()) {
        throw new Error('Cliente não encontrado');
      }
      
      const client = clientDoc.data();
      
      // Gerar link de pagamento via Firebase Functions
      const response = await fetch('https://us-central1-xjobs-a43d2.cloudfunctions.net/generateProjectPaymentLink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          projectTitle: project.title,
          amount: proposal.proposedBudget,
          clientId: project.clientId,
          clientName: client.name,
          freelancerId: proposal.freelancerId,
          freelancerName: proposal.freelancerName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar link de pagamento');
      }

      const paymentData = await response.json();
      
      const batch = writeBatch(db);
      
      // Aceitar a proposta específica
      batch.update(doc(db, 'proposals', proposalId), {
        status: 'aceita' as ProposalStatus,
        acceptedAt: Timestamp.now()
      });

      // Rejeitar todas as outras propostas do projeto
      const proposalsQuery = query(
        collection(db, 'proposals'),
        where('projectId', '==', projectId),
        where('__name__', '!=', proposalId)
      );
      const proposalsSnapshot = await getDocs(proposalsQuery);
      
      proposalsSnapshot.forEach((proposalDoc) => {
        batch.update(proposalDoc.ref, {
          status: 'rejeitada' as ProposalStatus,
          rejectedAt: Timestamp.now()
        });
      });

      // Atualizar status do projeto para 'aguardando_garantia'
      // batch.update(doc(db, 'projects', projectId), {
      //   status: 'aguardando_garantia' as ProjectStatus,
      //   selectedFreelancerId: proposal.freelancerId,
      //   updatedAt: Timestamp.now()
      // });
      await ProjectService.updateProjectStatus(projectId, 'aguardando_garantia');
      await updateDoc(doc(db, 'projects', projectId), {
        selectedFreelancerId: proposal.freelancerId,
        updatedAt: Timestamp.now()
      });

      await batch.commit();
      // Criar log de sistema para aceitação de proposta
      try {
        await addDoc(collection(db, 'logs'), {
          type: 'proposal_accepted',
          level: 'info',
          title: 'Proposta aceita',
          message: `Proposta do freelancer (${proposal.freelancerName}) para o projeto "${project.title}" foi aceita pelo cliente (${client.name}).`,
          timestamp: Timestamp.now(),
          source: 'projectService.acceptProposal',
          projectId: projectId,
          clientId: project.clientId,
          freelancerId: proposal.freelancerId,
          read: false
        });
      } catch (logError) {
        console.error('Erro ao criar log de sistema de aceitação de proposta:', logError);
      }
      // Criar notificação para o freelancer sobre proposta aceita
      try {
        await NotificationService.createNotification({
          userId: proposal.freelancerId,
          type: 'proposal_accepted',
          title: 'Proposta aceita!',
          message: `Sua proposta para o projeto "${project.title}" foi aceita pelo cliente.`,
          actionUrl: `/projetos/${projectId}`,
          actionLabel: 'Ver projeto'
        });
      } catch (notificationError) {
        console.error('Erro ao criar notificação de proposta aceita:', notificationError);
        // Não falhar se a notificação falhar
      }
      
      return { paymentUrl: paymentData.url };
    } catch (error) {
      console.error('Erro ao aceitar proposta:', error);
      throw error;
    }
  }

  // Rejeitar uma proposta
  static async rejectProposal(proposalId: string): Promise<void> {
    try {
      const now = Timestamp.now();

      await updateDoc(doc(db, 'proposals', proposalId), {
        status: 'rejeitada' as ProposalStatus,
        respondedAt: now,
        updatedAt: now
      });
    } catch (error) {
      console.error('Erro ao rejeitar proposta:', error);
      throw error;
    }
  }

  // Marcar projeto como concluído
  static async completeProject(projectId: string): Promise<void> {
    try {
      const now = Timestamp.now();

      // Buscar dados do projeto para notificar o cliente
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (!projectDoc.exists()) {
        throw new Error('Projeto não encontrado');
      }
      
      const projectData = projectDoc.data();

      await updateDoc(doc(db, 'projects', projectId), {
        status: 'concluido' as ProjectStatus,
        completedAt: now,
        updatedAt: now
      });
      // Criar log de sistema para conclusão de projeto
      try {
        await addDoc(collection(db, 'logs'), {
          type: 'project_completed',
          level: 'info',
          title: 'Projeto concluído',
          message: `O projeto "${projectData.title}" foi marcado como concluído pelo freelancer.`,
          timestamp: Timestamp.now(),
          source: 'projectService.completeProject',
          projectId: projectId,
          clientId: projectData.clientId,
          freelancerId: projectData.selectedFreelancerId,
          read: false
        });
      } catch (logError) {
        console.error('Erro ao criar log de sistema de conclusão de projeto:', logError);
      }
    } catch (error) {
      console.error('Erro ao concluir projeto:', error);
      throw error;
    }
  }

  static async updateProjectStatus(projectId: string, status: ProjectStatus): Promise<void> {
    try {
      // Buscar dados do projeto para notificações
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (!projectDoc.exists()) {
        throw new Error('Projeto não encontrado');
      }
      
      const projectData = projectDoc.data();
      
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        status,
        updatedAt: Timestamp.now()
      });
      
      // Criar notificações baseadas no status
      try {
        let notificationData = null;
        
        switch (status) {
          case 'cancelado':
            notificationData = {
              userId: projectData.clientId,
              type: 'project_cancelled',
              title: 'Projeto cancelado',
              message: `O projeto "${projectData.title}" foi cancelado.`,
              actionUrl: `/projetos/${projectId}`,
              actionLabel: 'Ver detalhes'
            };
            // Criar log de sistema para cancelamento de projeto
            try {
              await addDoc(collection(db, 'logs'), {
                type: 'project_cancelled',
                level: 'warning',
                title: 'Projeto cancelado',
                message: `O projeto "${projectData.title}" foi cancelado pelo cliente (${projectData.clientId}).`,
                timestamp: Timestamp.now(),
                source: 'projectService.updateProjectStatus',
                projectId: projectId,
                clientId: projectData.clientId,
                read: false
              });
            } catch (logError) {
              console.error('Erro ao criar log de sistema de cancelamento de projeto:', logError);
            }
            break;
          case 'concluido':
            if (projectData.selectedFreelancerId) {
              notificationData = {
                userId: projectData.selectedFreelancerId,
                type: 'project_approved',
                title: 'Projeto aprovado',
                message: `O projeto "${projectData.title}" foi aprovado pelo cliente.`,
                actionUrl: `/projetos/${projectId}`,
                actionLabel: 'Ver projeto'
              };
              // Criar log de sistema para aprovação de projeto
              try {
                await addDoc(collection(db, 'logs'), {
                  type: 'project_approved',
                  level: 'info',
                  title: 'Projeto aprovado',
                  message: `O projeto "${projectData.title}" foi aprovado pelo cliente (${projectData.clientId}).`,
                  timestamp: Timestamp.now(),
                  source: 'projectService.updateProjectStatus',
                  projectId: projectId,
                  clientId: projectData.clientId,
                  freelancerId: projectData.selectedFreelancerId,
                  read: false
                });
              } catch (logError) {
                console.error('Erro ao criar log de sistema de aprovação de projeto:', logError);
              }
            }
            break;
          case 'executando':
            // Notificar cliente que projeto foi iniciado
            notificationData = {
              userId: projectData.clientId,
              type: 'project_started',
              title: 'Projeto iniciado',
              message: `O projeto "${projectData.title}" foi iniciado pelo freelancer.`,
              actionUrl: `/projetos/${projectId}`,
              actionLabel: 'Acompanhar projeto'
            };
            // Criar log de sistema para início de projeto
            try {
              await addDoc(collection(db, 'logs'), {
                type: 'project_started',
                level: 'info',
                title: 'Projeto iniciado',
                message: `O projeto "${projectData.title}" foi iniciado pelo freelancer (${projectData.selectedFreelancerId}).`,
                timestamp: Timestamp.now(),
                source: 'projectService.updateProjectStatus',
                projectId: projectId,
                clientId: projectData.clientId,
                freelancerId: projectData.selectedFreelancerId,
                read: false
              });
            } catch (logError) {
              console.error('Erro ao criar log de sistema de início de projeto:', logError);
            }
            break;
          case 'aguardando_garantia':
            notificationData = {
              userId: projectData.clientId,
              type: 'project_payment_pending',
              title: 'Pagamento pendente',
              message: `O projeto "${projectData.title}" está aguardando pagamento de garantia.`,
              actionUrl: `/projetos/${projectId}`,
              actionLabel: 'Realizar pagamento'
            };
            // Criar log de sistema para encaminhamento de projeto para pagamento
            try {
              await addDoc(collection(db, 'logs'), {
                type: 'project_payment_pending',
                level: 'info',
                title: 'Projeto aguardando pagamento',
                message: `O projeto "${projectData.title}" foi encaminhado para pagamento pelo cliente (${projectData.clientId}).`,
                timestamp: Timestamp.now(),
                source: 'projectService.updateProjectStatus',
                projectId: projectId,
                clientId: projectData.clientId,
                freelancerId: projectData.selectedFreelancerId || null,
                read: false
              });
            } catch (logError) {
              console.error('Erro ao criar log de sistema de encaminhamento para pagamento:', logError);
            }
            break;
        }
        
        if (notificationData) {
          await NotificationService.createNotification(notificationData);
        }
      } catch (notificationError) {
        console.error('Erro ao criar notificação de status do projeto:', notificationError);
        // Não falhar se a notificação falhar
      }
    } catch (error) {
      console.error('Erro ao atualizar status do projeto:', error);
      throw error;
    }
  }
}