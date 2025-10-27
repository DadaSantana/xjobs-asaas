import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { UserProfile } from '@/types/user';
import { UserProfileService } from '@/services/userProfileService';

export interface FeaturedFreelancer {
  uid: string;
  name: string;
  profileImage?: string;
  category: string;
  rating: number;
  ratingCount?: number;
  skills?: string[];
  bio?: string;
  location?: string;
  hourlyRate?: number;
  addedAt: Date;
  addedBy?: string; // UID do gestor que adicionou
}

export class FeaturedFreelancersService {
  private static COLLECTION_NAME = 'featuredFreelancers';
  private static SETTINGS_DOC = 'settings';

  /**
   * Adiciona um freelancer à lista de destaques
   */
  static async addFeaturedFreelancer(
    freelancerUid: string, 
    category: string, 
    addedBy: string
  ): Promise<void> {
    try {
      // Buscar dados completos do freelancer
      const freelancerProfile = await UserProfileService.getUserProfile(freelancerUid);
      
      if (!freelancerProfile || freelancerProfile.role !== 'freelancer') {
        throw new Error('Freelancer não encontrado ou perfil inválido');
      }

      const featuredFreelancer: FeaturedFreelancer = {
        uid: freelancerUid,
        name: freelancerProfile.name || '',
        category,
        rating: freelancerProfile.rating || 0,
        ratingCount: freelancerProfile.ratingCount || 0,
        addedAt: new Date(),
        addedBy,
        ...(freelancerProfile.profileImage && { profileImage: freelancerProfile.profileImage }),
        ...(freelancerProfile.skills && { skills: freelancerProfile.skills }),
        ...(freelancerProfile.bio && { bio: freelancerProfile.bio }),
        ...(freelancerProfile.location && { location: freelancerProfile.location }),
        ...(freelancerProfile.hourlyRate && { hourlyRate: freelancerProfile.hourlyRate })
      };

      await setDoc(
        doc(db, this.COLLECTION_NAME, freelancerUid), 
        featuredFreelancer
      );
    } catch (error) {
      console.error('Erro ao adicionar freelancer em destaque:', error);
      throw new Error('Falha ao adicionar freelancer em destaque');
    }
  }

  /**
   * Remove um freelancer da lista de destaques
   */
  static async removeFeaturedFreelancer(freelancerUid: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, freelancerUid));
    } catch (error) {
      console.error('Erro ao remover freelancer em destaque:', error);
      throw new Error('Falha ao remover freelancer em destaque');
    }
  }

  /**
   * Lista todos os freelancers em destaque
   */
  static async getFeaturedFreelancers(): Promise<FeaturedFreelancer[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('addedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const featuredFreelancers: FeaturedFreelancer[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        featuredFreelancers.push({
          ...data,
          addedAt: data.addedAt?.toDate() || new Date()
        } as FeaturedFreelancer);
      });
      
      return featuredFreelancers;
    } catch (error) {
      console.error('Erro ao buscar freelancers em destaque:', error);
      throw new Error('Falha ao buscar freelancers em destaque');
    }
  }

  /**
   * Lista todos os freelancers em destaque como UserProfile
   */
  static async getAllFeaturedFreelancers(): Promise<UserProfile[]> {
    try {
      const featuredFreelancers = await this.getFeaturedFreelancers();
      
      // Buscar os dados completos dos freelancers
      const userProfiles: UserProfile[] = [];
      for (const featured of featuredFreelancers) {
        try {
          const userProfile = await UserProfileService.getUserProfile(featured.uid);
          if (userProfile) {
            userProfiles.push(userProfile);
          }
        } catch (error) {
          console.error(`Erro ao buscar perfil do freelancer ${featured.uid}:`, error);
        }
      }
      
      return userProfiles;
    } catch (error) {
      console.error('Erro ao buscar todos os freelancers em destaque:', error);
      throw error;
    }
  }

  /**
   * Lista freelancers em destaque por categoria
   */
  static async getFeaturedFreelancersByCategory(category: string): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('category', '==', category),
        orderBy('addedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const featuredFreelancers: FeaturedFreelancer[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        featuredFreelancers.push({
          ...data,
          addedAt: data.addedAt?.toDate() || new Date()
        } as FeaturedFreelancer);
      });
      
      // Buscar os dados completos dos freelancers
      const userProfiles: UserProfile[] = [];
      for (const featured of featuredFreelancers) {
        try {
          const userProfile = await UserProfileService.getUserProfile(featured.uid);
          if (userProfile) {
            userProfiles.push(userProfile);
          }
        } catch (error) {
          console.error(`Erro ao buscar perfil do freelancer ${featured.uid}:`, error);
        }
      }
      
      return userProfiles;
    } catch (error) {
      console.error('Erro ao buscar freelancers em destaque por categoria:', error);
      throw new Error('Falha ao buscar freelancers em destaque por categoria');
    }
  }

  /**
   * Verifica se um freelancer está em destaque
   */
  static async isFeaturedFreelancer(freelancerUid: string): Promise<boolean> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, freelancerUid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Erro ao verificar freelancer em destaque:', error);
      return false;
    }
  }

  /**
   * Atualiza a categoria de um freelancer em destaque
   */
  static async updateFeaturedFreelancerCategory(
    freelancerUid: string, 
    newCategory: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, freelancerUid);
      await updateDoc(docRef, {
        category: newCategory
      });
    } catch (error) {
      console.error('Erro ao atualizar categoria do freelancer em destaque:', error);
      throw new Error('Falha ao atualizar categoria do freelancer em destaque');
    }
  }

  /**
   * Busca freelancers disponíveis para adicionar aos destaques
   */
  static async searchAvailableFreelancers(filters: {
    search?: string;
    category?: string;
    limit?: number;
  } = {}): Promise<UserProfile[]> {
    try {
      // Buscar todos os freelancers
      const allFreelancers = await UserProfileService.searchFreelancers({ 
        limit: filters.limit || 50 
      });
      
      // Buscar freelancers já em destaque
      const featuredFreelancers = await this.getFeaturedFreelancers();
      const featuredUids = new Set(featuredFreelancers.map(f => f.uid));
      
      // Filtrar freelancers que não estão em destaque
      let availableFreelancers = allFreelancers.filter(
        freelancer => !featuredUids.has(freelancer.uid)
      );
      
      // Aplicar filtro de busca por nome
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        availableFreelancers = availableFreelancers.filter(freelancer =>
          freelancer.name.toLowerCase().includes(searchTerm) ||
          freelancer.bio?.toLowerCase().includes(searchTerm) ||
          freelancer.skills?.some(skill => 
            skill.toLowerCase().includes(searchTerm)
          )
        );
      }
      
      // Aplicar filtro de categoria
      if (filters.category && filters.category !== 'Todos') {
        availableFreelancers = availableFreelancers.filter(freelancer => {
          if (!freelancer.skills) return false;
          
          const skills = Array.isArray(freelancer.skills) 
            ? freelancer.skills 
            : [freelancer.skills];
            
          return skills.some(skill =>
            skill.toLowerCase().includes(filters.category!.toLowerCase()) ||
            filters.category!.toLowerCase().includes(skill.toLowerCase()) ||
            (filters.category === "Programação" && (
              skill.toLowerCase().includes("dev") ||
              skill.toLowerCase().includes("javascript") ||
              skill.toLowerCase().includes("react") ||
              skill.toLowerCase().includes("node") ||
              skill.toLowerCase().includes("python") ||
              skill.toLowerCase().includes("php")
            )) ||
            (filters.category === "Design" && (
              skill.toLowerCase().includes("ui") ||
              skill.toLowerCase().includes("ux") ||
              skill.toLowerCase().includes("gráfico") ||
              skill.toLowerCase().includes("visual")
            ))
          );
        });
      }
      
      return availableFreelancers;
    } catch (error) {
      console.error('Erro ao buscar freelancers disponíveis:', error);
      throw new Error('Falha ao buscar freelancers disponíveis');
    }
  }

  /**
   * Obtém estatísticas dos freelancers em destaque
   */
  static async getFeaturedStats(): Promise<{
    total: number;
    byCategory: { [category: string]: number };
  }> {
    try {
      const featuredFreelancers = await this.getFeaturedFreelancers();
      
      const byCategory: { [category: string]: number } = {};
      
      featuredFreelancers.forEach(freelancer => {
        byCategory[freelancer.category] = (byCategory[freelancer.category] || 0) + 1;
      });
      
      return {
        total: featuredFreelancers.length,
        byCategory
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas dos freelancers em destaque:', error);
      throw new Error('Falha ao obter estatísticas dos freelancers em destaque');
    }
  }
}