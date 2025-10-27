import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types/user';

export class FavoriteFreelancersService {
  /**
   * Adiciona um freelancer aos favoritos do cliente
   */
  static async addToFavorites(clientId: string, freelancerId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', clientId);
      await updateDoc(userRef, {
        favoriteFreelancers: arrayUnion(freelancerId)
      });
    } catch (error) {
      console.error('Erro ao adicionar freelancer aos favoritos:', error);
      throw new Error('Falha ao adicionar aos favoritos');
    }
  }

  /**
   * Remove um freelancer dos favoritos do cliente
   */
  static async removeFromFavorites(clientId: string, freelancerId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', clientId);
      await updateDoc(userRef, {
        favoriteFreelancers: arrayRemove(freelancerId)
      });
    } catch (error) {
      console.error('Erro ao remover freelancer dos favoritos:', error);
      throw new Error('Falha ao remover dos favoritos');
    }
  }

  /**
   * Verifica se um freelancer está nos favoritos do cliente
   */
  static async isFavorite(clientId: string, freelancerId: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', clientId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return false;
      }
      
      const userData = userDoc.data() as UserProfile;
      const favoriteFreelancers = userData.favoriteFreelancers || [];
      
      return favoriteFreelancers.includes(freelancerId);
    } catch (error) {
      console.error('Erro ao verificar se freelancer está nos favoritos:', error);
      return false;
    }
  }

  /**
   * Obtém a lista de freelancers favoritos do cliente
   */
  static async getFavoriteFreelancers(clientId: string): Promise<string[]> {
    try {
      const userRef = doc(db, 'users', clientId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return [];
      }
      
      const userData = userDoc.data() as UserProfile;
      return userData.favoriteFreelancers || [];
    } catch (error) {
      console.error('Erro ao obter freelancers favoritos:', error);
      return [];
    }
  }

  /**
   * Alterna o status de favorito de um freelancer (adiciona se não estiver, remove se estiver)
   */
  static async toggleFavorite(clientId: string, freelancerId: string): Promise<boolean> {
    try {
      const isFav = await this.isFavorite(clientId, freelancerId);
      
      if (isFav) {
        await this.removeFromFavorites(clientId, freelancerId);
        return false;
      } else {
        await this.addToFavorites(clientId, freelancerId);
        return true;
      }
    } catch (error) {
      console.error('Erro ao alternar status de favorito:', error);
      throw error;
    }
  }
}