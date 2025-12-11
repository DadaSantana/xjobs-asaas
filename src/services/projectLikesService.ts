import { 
  doc, 
  updateDoc, 
  getDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  arrayUnion,
  arrayRemove,
  runTransaction 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ProjectLike, 
  CreateProjectLikeData, 
  Project 
} from '../types/project';
import { UserProfile } from '../types/user';
import { UserProfileService } from './userProfileService';
import { EmailService } from './emailService';
import { canUseLike, useLike as useLikeService } from './planUsageService';

export class ProjectLikesService {
  
  // Função utilitária para filtrar campos undefined antes de atualizar o Firestore
  private static filterUndefinedFields<T extends Record<string, any>>(data: T): Record<string, any> {
    const filtered: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        continue; // Pular campos undefined
      }
      
      if (Array.isArray(value)) {
        // Filtrar arrays para remover elementos undefined
        filtered[key] = value.filter(item => item !== undefined);
      } else if (typeof value === 'object' && value !== null) {
        // Recursivamente filtrar objetos aninhados
        filtered[key] = this.filterUndefinedFields(value);
      } else {
        filtered[key] = value;
      }
    }
    
    return filtered;
  }

  // Função para validar e limpar um objeto ProjectLike
  private static validateAndCleanProjectLike(like: any): ProjectLike {
    const cleaned: any = {};
    
    // Campos obrigatórios
    cleaned.id = like.id || `like_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    cleaned.projectId = like.projectId;
    cleaned.freelancerId = like.freelancerId;
    cleaned.freelancerName = like.freelancerName || 'Usuário';
    cleaned.freelancerRating = like.freelancerRating || 0;
    cleaned.proposedValue = like.proposedValue;
    cleaned.totalValue = like.totalValue;
    cleaned.message = like.message || '';
    cleaned.createdAt = like.createdAt;
    
    // Campos opcionais - só incluir se não forem undefined
    if (like.freelancerImage !== undefined) {
      cleaned.freelancerImage = like.freelancerImage;
    }
    if (like.freelancerPortfolioUrl !== undefined) {
      cleaned.freelancerPortfolioUrl = like.freelancerPortfolioUrl;
    }
    
    return cleaned as ProjectLike;
  }
  
  // Curtir um projeto (freelancer demonstra interesse)
  static async likeProject(data: CreateProjectLikeData): Promise<ProjectLike> {
    try {
      // Validar dados de entrada
      if (!data.projectId || !data.freelancerId || !data.message) {
        throw new Error('Dados obrigatórios não fornecidos');
      }

      // Validar valor proposto (máximo R$ 10.000)
      if (data.proposedValue > 10000) {
        throw new Error('Valor proposto não pode exceder R$ 10.000');
      }

      // Verificar se freelancer tem curtidas restantes
      const freelancerProfile = await UserProfileService.getUserProfile(data.freelancerId);
      if (!freelancerProfile) {
        throw new Error('Perfil do freelancer não encontrado');
      }

      // Validar campos obrigatórios do perfil
      if (!freelancerProfile.name) {
        throw new Error('Nome do freelancer não encontrado no perfil');
      }

      // Verificar limite de curtidas do plano
      const canLikeCheck = await canUseLike(data.freelancerId);
      if (!canLikeCheck.canUse) {
        throw new Error(canLikeCheck.reason || 'Você não possui curtidas restantes. Atualize seu plano.');
      }

      let clientId: string | undefined;
      let projectTitle: string | undefined;

      const newLike = await runTransaction(db, async (transaction) => {
        // Buscar projeto
        const projectRef = doc(db, 'projects', data.projectId);
        const projectSnap = await transaction.get(projectRef);
        
        if (!projectSnap.exists()) {
          throw new Error('Projeto não encontrado');
        }

        const project = { id: projectSnap.id, ...projectSnap.data() } as Project;
        clientId = (project as any).clientId as string | undefined;
        projectTitle = (project as any).title as string | undefined;

        // Verificar se projeto ainda aceita curtidas
        if (project.status !== 'recebendo_propostas') {
          throw new Error('Este projeto não está mais recebendo propostas');
        }

        // Verificar limite de curtidas no projeto (máximo 80)
        if (project.likesCount >= (project.maxLikes || 80)) {
          throw new Error('Este projeto já atingiu o limite máximo de curtidas');
        }

        // Verificar se freelancer já curtiu este projeto
        const existingLike = project.likes?.find(like => like.freelancerId === data.freelancerId);
        if (existingLike) {
          throw new Error('Você já demonstrou interesse neste projeto');
        }

        // Criar nova curtida
        const newLikeRaw = {
          id: `like_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          projectId: data.projectId,
          freelancerId: data.freelancerId,
          freelancerName: freelancerProfile.name || 'Usuário',
          freelancerRating: freelancerProfile.rating || 0,
          proposedValue: data.proposedValue,
          totalValue: data.proposedValue * 1.1, // Adicionar comissão de 10%
          message: data.message || '',
          createdAt: Timestamp.now(),
          freelancerPortfolioUrl: `/portfolio/${data.freelancerId}`
        };

        // Adicionar campos opcionais apenas se existirem
        if (freelancerProfile.profileImage) {
          (newLikeRaw as any).freelancerImage = freelancerProfile.profileImage;
        }

        const newLike = this.validateAndCleanProjectLike(newLikeRaw);
        console.log('Novo like criado e validado:', newLike);

        // Atualizar projeto com nova curtida
        const existingLikes = project.likes || [];
        const validatedExistingLikes = existingLikes.map(like => this.validateAndCleanProjectLike(like));
        const updatedLikes = [...validatedExistingLikes, newLike];
        
        const updateData: Partial<Project> = {
          likes: updatedLikes,
          likesCount: (project.likesCount || 0) + 1,
          proposalsCount: (project.proposalsCount || 0) + 1
        };

        const filteredData = this.filterUndefinedFields(updateData);
        console.log('Dados filtrados para atualização (likeProject):', filteredData);
        console.log('Array de likes após filtragem:', filteredData.likes);
        
        // Validar se não há valores undefined no array de likes
        if (filteredData.likes) {
          const hasUndefined = filteredData.likes.some(like => 
            like && Object.values(like).some(val => val === undefined)
          );
          if (hasUndefined) {
            throw new Error('Encontrado valor undefined no array de likes');
          }
        }
        
        transaction.update(projectRef, filteredData);

        // Curtidas são gerenciadas pelo planUsageService
        // A contagem já foi feita na verificação inicial

        return newLike;
      });

      // Após sucesso na transação, decrementar curtida do plano
      const useLikeResult = await useLikeService(data.freelancerId);
      if (!useLikeResult.success) {
        // Se falhou ao usar curtida, reverter a curtida do projeto
        // (Por enquanto apenas logamos, pois a transação já foi commitada)
        console.error('Erro ao registrar uso de curtida:', useLikeResult.error);
      }

      // Após sucesso na transação, criar documento em projectProposals para disparar trigger de notificação
      try {
        await addDoc(collection(db, 'projectProposals'), {
          projectId: data.projectId,
          freelancerId: data.freelancerId,
          clientId: clientId,
          proposedValue: data.proposedValue,
          message: data.message || '',
          createdAt: Timestamp.now()
        });
      } catch (proposalErr) {
        console.error('Erro ao criar documento de proposta (projectProposals):', proposalErr);
      }

      // Enviar e-mail para o cliente informando nova proposta
      try {
        if (clientId) {
          const clientProfile = await UserProfileService.getUserProfile(clientId);
          if (clientProfile?.email) {
            const clientEmail = clientProfile.email as string;
            const clientName = (clientProfile.name as string) || 'Cliente';
            const freelancerName = freelancerProfile.name || 'Freelancer';
            const projectName = projectTitle || 'Projeto';
            const proposedBudgetCents = Math.round(data.proposedValue * 100);

            await EmailService.sendProposalReceivedEmail(
              clientEmail,
              clientName,
              projectName,
              freelancerName,
              proposedBudgetCents
            );
          }
        }
      } catch (emailErr) {
        console.error('Erro ao enviar e-mail de proposta recebida:', emailErr);
      }

      return newLike;
    } catch (error) {
      console.error('Erro ao curtir projeto:', error);
      throw error;
    }
  }

  // Remover curtida (freelancer remove interesse)
  static async unlikeProject(projectId: string, freelancerId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        // Buscar projeto
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await transaction.get(projectRef);
        
        if (!projectSnap.exists()) {
          throw new Error('Projeto não encontrado');
        }

        const project = { id: projectSnap.id, ...projectSnap.data() } as Project;

        // Encontrar curtida do freelancer
        const likeIndex = project.likes?.findIndex(like => like.freelancerId === freelancerId);
        if (likeIndex === -1 || likeIndex === undefined) {
          throw new Error('Curtida não encontrada');
        }

        // Remover curtida
        const existingLikes = project.likes || [];
        const validatedExistingLikes = existingLikes.map(like => this.validateAndCleanProjectLike(like));
        const updatedLikes = [...validatedExistingLikes];
        const removedLike = updatedLikes.splice(likeIndex, 1)[0];

        // Atualizar projeto
        const updateData: Partial<Project> = {
          likes: updatedLikes,
          likesCount: Math.max((project.likesCount || 0) - 1, 0),
          proposalsCount: Math.max((project.proposalsCount || 0) - 1, 0)
        };

        const filteredData = this.filterUndefinedFields(updateData);
        console.log('Dados filtrados para atualização (unlikeProject):', filteredData);
        transaction.update(projectRef, filteredData);

        // Curtidas são gerenciadas pelo planUsageService
        // A reversão será feita pelo sistema de contadores se necessário
      });
    } catch (error) {
      console.error('Erro ao remover curtida:', error);
      throw error;
    }
  }

  // Obter curtidas de um projeto
  static async getProjectLikes(projectId: string): Promise<ProjectLike[]> {
    try {
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (!projectSnap.exists()) {
        throw new Error('Projeto não encontrado');
      }

      const project = { id: projectSnap.id, ...projectSnap.data() } as Project;
      return project.likes || [];
    } catch (error) {
      console.error('Erro ao buscar curtidas do projeto:', error);
      throw new Error('Falha ao buscar curtidas do projeto');
    }
  }

  // Verificar se freelancer já curtiu um projeto
  static async hasUserLikedProject(projectId: string, freelancerId: string): Promise<boolean> {
    try {
      const likes = await this.getProjectLikes(projectId);
      return likes.some(like => like.freelancerId === freelancerId);
    } catch (error) {
      console.error('Erro ao verificar curtida:', error);
      return false;
    }
  }

  // Obter projetos curtidos por um freelancer
  static async getFreelancerLikedProjects(freelancerId: string): Promise<Project[]> {
    try {
      const projectsQuery = query(
        collection(db, 'projects'),
        // where('likes', 'array-contains', where('freelancerId', '==', freelancerId)) // Removido: não suportado pelo Firestore
      );

      // Como o Firebase não suporta array-contains com objetos complexos,
      // vamos buscar todos os projetos e filtrar localmente
      const allProjectsQuery = query(
        collection(db, 'projects'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(allProjectsQuery);
      const likedProjects: Project[] = [];
      
      querySnapshot.forEach((doc) => {
        const project = { id: doc.id, ...doc.data() } as Project;
        
        // Verificar se o freelancer curtiu este projeto
        const hasLiked = project.likes?.some(like => like.freelancerId === freelancerId);
        if (hasLiked) {
          likedProjects.push(project);
        }
      });
      
      return likedProjects;
    } catch (error) {
      console.error('Erro ao buscar projetos curtidos:', error);
      throw new Error('Falha ao buscar projetos curtidos');
    }
  }

  // Aceitar uma proposta/curtida (cliente escolhe freelancer)
  static async acceptProjectLike(projectId: string, likeId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        // Buscar projeto
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await transaction.get(projectRef);
        
        if (!projectSnap.exists()) {
          throw new Error('Projeto não encontrado');
        }

        const project = { id: projectSnap.id, ...projectSnap.data() } as Project;

        // Encontrar curtida aceita
        const acceptedLike = project.likes?.find(like => like.id === likeId);
        if (!acceptedLike) {
          throw new Error('Proposta não encontrada');
        }

        // Atualizar projeto
        transaction.update(projectRef, {
          status: 'aguardando_garantia'
        });
        transaction.update(projectRef, {
          selectedFreelancerId: acceptedLike.freelancerId,
          updatedAt: Timestamp.now()
        });

        // TODO: Integrar com sistema de pagamento
        // Por enquanto, apenas mudamos o status
      });
    } catch (error) {
      console.error('Erro ao aceitar proposta:', error);
      throw error;
    }
  }

  // Obter estatísticas de curtidas de um freelancer
  static async getFreelancerLikesStats(freelancerId: string): Promise<{
    totalLikes: number;
    acceptedLikes: number;
    pendingLikes: number;
    likesRemaining: number;
  }> {
    try {
      const likedProjects = await this.getFreelancerLikedProjects(freelancerId);
      const freelancerProfile = await UserProfileService.getUserProfile(freelancerId);
      
      let acceptedLikes = 0;
      let pendingLikes = 0;
      
      likedProjects.forEach(project => {
        const userLike = project.likes?.find(like => like.freelancerId === freelancerId);
        if (userLike) {
          if (project.selectedFreelancerId === freelancerId) {
            acceptedLikes++;
          } else if (project.status === 'recebendo_propostas') {
            pendingLikes++;
          }
        }
      });

      // Buscar limites atuais do plano
      const { getPlanUsage } = await import('./planUsageService');
      const usage = await getPlanUsage(freelancerId);

      return {
        totalLikes: likedProjects.length,
        acceptedLikes,
        pendingLikes,
        likesRemaining: usage.likeLimit === null ? -1 : Math.max(0, (usage.likeLimit || 0) - usage.likesUsed)
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw new Error('Falha ao buscar estatísticas');
    }
  }
}