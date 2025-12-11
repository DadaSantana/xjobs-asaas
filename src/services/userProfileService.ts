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
  arrayRemove 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { 
  UserProfile, 
  UpdateProfileData, 
  PortfolioItem, 
  PortfolioDocument,
  Certification, 
  UserReview 
} from '../types/user';
import { NotificationService } from './notificationService';

export class UserProfileService {
  
  // Atualizar perfil do usuário
  static async updateProfile(userId: string, data: UpdateProfileData): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData = {
        ...data,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(userRef, updateData);
      // Criar notificação de atualização de perfil
      try {
        await NotificationService.createNotification({
          userId,
          type: 'profile_updated',
          title: 'Perfil atualizado',
          message: 'Suas informações de perfil foram atualizadas com sucesso.',
          actionUrl: '/minha-conta',
          actionLabel: 'Ver perfil'
        });
      } catch (notificationError) {
        console.error('Erro ao criar notificação de atualização de perfil:', notificationError);
        // Não falhar a atualização se a notificação falhar
      }
      // Criar log para o gestor
      try {
        await addDoc(collection(db, 'logs'), {
          userId,
          type: 'profile_updated',
          name: data.name || '',
          updatedFields: Object.keys(data),
          title: 'Perfil atualizado',
          message: `O usuário ${data.name || ''} atualizou seu perfil.`,
          timestamp: Timestamp.now(),
          createdAt: Timestamp.now()
        });
      } catch (logError) {
        console.error('Erro ao registrar log de atualização de perfil:', logError);
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw new Error('Falha ao atualizar perfil');
    }
  }

  // Upload de foto de perfil
  static async uploadProfileImage(userId: string, file: File): Promise<string> {
    try {
      // Criar referência única para o arquivo
      const timestamp = Date.now();
      const fileName = `profile_${userId}_${timestamp}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, `profile-images/${fileName}`);
      
      // Upload do arquivo
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Atualizar perfil com nova URL
      await this.updateProfile(userId, { profileImage: downloadURL });
      
      return downloadURL;
    } catch (error) {
      console.error('Erro no upload da imagem:', error);
      throw new Error('Falha no upload da imagem');
    }
  }

  // Upload de documento do portfólio
  static async uploadPortfolioDocument(userId: string, file: File): Promise<PortfolioDocument> {
    try {
      // Validar tipos de arquivo permitidos
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de arquivo não permitido. Use apenas PDF, Word ou TXT.');
      }

      // Validar tamanho (máximo 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Arquivo muito grande. Tamanho máximo: 10MB.');
      }

      // Criar referência única para o arquivo
      const timestamp = Date.now();
      const fileId = `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `${fileId}_${file.name}`;
      const filePath = `portfolio-documents/${userId}/${fileName}`;
      
      // Criar referência no Storage
      const storageRef = ref(storage, filePath);
      
      // Upload do arquivo
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Retornar dados do documento
      const document: PortfolioDocument = {
        id: fileId,
        name: file.name,
        url: downloadURL,
        size: file.size,
        type: file.type,
        uploadedAt: new Date()
      };

      return document;
    } catch (error) {
      console.error('Erro no upload do documento:', error);
      throw new Error(error instanceof Error ? error.message : 'Falha no upload do documento');
    }
  }

  // Adicionar item ao portfólio
  static async addPortfolioItem(userId: string, portfolioItem: Omit<PortfolioItem, 'id'>): Promise<void> {
    try {
      const portfolioItemWithId: PortfolioItem = {
        ...portfolioItem,
        id: `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        portfolio: arrayUnion(portfolioItemWithId),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erro ao adicionar item ao portfólio:', error);
      throw new Error('Falha ao adicionar item ao portfólio');
    }
  }

  // Remover item do portfólio
  static async removePortfolioItem(userId: string, portfolioItem: PortfolioItem): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        portfolio: arrayRemove(portfolioItem),
        updatedAt: Timestamp.now()
      });

      // Remover imagens do storage se existirem
      if (portfolioItem.images && portfolioItem.images.length > 0) {
        const deletePromises = portfolioItem.images.map(imageUrl => {
          const imageRef = ref(storage, imageUrl);
          return deleteObject(imageRef).catch(console.error); // Não falhar se imagem não existir
        });
        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.error('Erro ao remover item do portfólio:', error);
      throw new Error('Falha ao remover item do portfólio');
    }
  }

  // Upload de imagens para portfólio
  static async uploadPortfolioImages(userId: string, files: File[]): Promise<string[]> {
    try {
      const uploadPromises = files.map(async (file, index) => {
        const timestamp = Date.now();
        const fileName = `portfolio_${userId}_${timestamp}_${index}.${file.name.split('.').pop()}`;
        const storageRef = ref(storage, `portfolio-images/${fileName}`);
        
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Erro no upload das imagens do portfólio:', error);
      throw new Error('Falha no upload das imagens');
    }
  }

  // Upload de múltiplos vídeos para portfólio
  static async uploadPortfolioVideos(userId: string, files: File[]): Promise<string[]> {
    try {
      const uploadPromises = files.map(async (file, index) => {
        const timestamp = Date.now();
        const fileName = `portfolio_video_${userId}_${timestamp}_${index}.${file.name.split('.').pop()}`;
        const storageRef = ref(storage, `portfolio-videos/${fileName}`);
        
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Erro no upload dos vídeos do portfólio:', error);
      throw new Error('Falha no upload dos vídeos');
    }
  }

  // Upload de imagem para certificação
  static async uploadCertificationImage(userId: string, file: File): Promise<string> {
    try {
      const timestamp = Date.now();
      const fileName = `cert_${userId}_${timestamp}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, `certification-images/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Erro no upload da imagem de certificação:', error);
      throw new Error('Falha no upload da imagem');
    }
  }

  // Adicionar certificação
  static async addCertification(userId: string, certification: Omit<Certification, 'id'>): Promise<void> {
    try {
      const certificationWithId: Certification = {
        ...certification,
        id: `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        certifications: arrayUnion(certificationWithId),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erro ao adicionar certificação:', error);
      throw new Error('Falha ao adicionar certificação');
    }
  }

  // Remover certificação
  static async removeCertification(userId: string, certification: Certification): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        certifications: arrayRemove(certification),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erro ao remover certificação:', error);
      throw new Error('Falha ao remover certificação');
    }
  }

  // Obter perfil completo do usuário
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { uid: userSnap.id, ...userSnap.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      throw new Error('Falha ao buscar perfil');
    }
  }

  // Buscar freelancers com filtros
  static async searchFreelancers(filters: {
    skills?: string[];
    experience?: string;
    rating?: number;
    availability?: string;
    limit?: number;
  } = {}) {
    try {
      let q = query(
        collection(db, 'users'), 
        where('role', '==', 'freelancer'),
        orderBy('rating', 'desc')
      );

      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const querySnapshot = await getDocs(q);
      const freelancers: UserProfile[] = [];
      
      querySnapshot.forEach((doc) => {
        const userData = { uid: doc.id, ...doc.data() } as UserProfile;
        
        // Aplicar filtros localmente (Firebase tem limitações em queries complexas)
        let includeUser = true;
        
        if (filters.skills && filters.skills.length > 0 && userData.skills) {
          const hasSkills = filters.skills.some(skill => 
            userData.skills?.some(userSkill => 
              userSkill.toLowerCase().includes(skill.toLowerCase())
            )
          );
          if (!hasSkills) includeUser = false;
        }
        
        if (filters.experience && userData.experience !== filters.experience) {
          includeUser = false;
        }
        
        if (filters.rating && userData.rating < filters.rating) {
          includeUser = false;
        }
        
        if (filters.availability && userData.availability !== filters.availability) {
          includeUser = false;
        }
        
        if (includeUser) {
          freelancers.push(userData);
        }
      });
      
      return freelancers;
    } catch (error) {
      console.error('Erro ao buscar freelancers:', error);
      throw new Error('Falha ao buscar freelancers');
    }
  }

  // Buscar clientes
  static async searchClients(filters: {
    industry?: string;
    companySize?: string;
    rating?: number;
    limit?: number;
  } = {}) {
    try {
      let q = query(
        collection(db, 'users'), 
        where('role', '==', 'client'),
        orderBy('rating', 'desc')
      );

      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const querySnapshot = await getDocs(q);
      const clients: UserProfile[] = [];
      
      querySnapshot.forEach((doc) => {
        const userData = { uid: doc.id, ...doc.data() } as UserProfile;
        
        let includeUser = true;
        
        if (filters.industry && userData.industry !== filters.industry) {
          includeUser = false;
        }
        
        if (filters.companySize && userData.companySize !== filters.companySize) {
          includeUser = false;
        }
        
        if (filters.rating && userData.rating < filters.rating) {
          includeUser = false;
        }
        
        if (includeUser) {
          clients.push(userData);
        }
      });
      
      return clients;
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      throw new Error('Falha ao buscar clientes');
    }
  }

  // Sistema de avaliações
  static async addReview(reviewData: Omit<UserReview, 'id' | 'createdAt'>): Promise<void> {
    try {
      const reviewRef = collection(db, 'reviews');
      const review: Omit<UserReview, 'id'> = {
        ...reviewData,
        createdAt: Timestamp.now()
      };

      await addDoc(reviewRef, review);

      // Atualizar rating do usuário avaliado
      await this.updateUserRating(reviewData.targetUserId, reviewData.rating);
    } catch (error) {
      console.error('Erro ao adicionar avaliação:', error);
      throw new Error('Falha ao adicionar avaliação');
    }
  }

  // Obter avaliações de um usuário
  static async getUserReviews(userId: string): Promise<UserReview[]> {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('targetUserId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const reviews: UserReview[] = [];
      
      querySnapshot.forEach((doc) => {
        reviews.push({ id: doc.id, ...doc.data() } as UserReview);
      });
      
      // Ordenar localmente por createdAt
      return reviews.sort((a, b) => {
        const aTime = a.createdAt.toDate().getTime();
        const bTime = b.createdAt.toDate().getTime();
        return bTime - aTime; // desc
      });
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      throw new Error('Falha ao buscar avaliações');
    }
  }

  // Atualizar rating do usuário
  private static async updateUserRating(userId: string, newRating: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        const currentTotal = userData.totalRating || 0;
        const currentCount = userData.ratingCount || 0;
        
        const newTotal = currentTotal + newRating;
        const newCount = currentCount + 1;
        const newAverage = newTotal / newCount;
        
        await updateDoc(userRef, {
          rating: parseFloat(newAverage.toFixed(1)),
          ratingCount: newCount,
          totalRating: newTotal,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar rating:', error);
      throw new Error('Falha ao atualizar rating');
    }
  }

  // Atualizar curtidas restantes do freelancer
  static async updateLikesRemaining(userId: string, newCount: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      // Curtidas agora são gerenciadas pelo planUsageService
      // Esta função não é mais necessária
      console.warn('updateLikesRemaining está deprecated - use planUsageService');
    } catch (error) {
      console.error('Erro ao atualizar curtidas restantes:', error);
      throw new Error('Falha ao atualizar curtidas restantes');
    }
  }
}