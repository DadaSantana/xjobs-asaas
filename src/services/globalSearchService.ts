import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SearchResult {
  id: string;
  type: 'project' | 'freelancer' | 'client';
  title: string;
  description: string;
  image?: string;
  url: string;
  metadata?: {
    price?: number;
    skills?: string[];
    location?: string;
    rating?: number;
    status?: string;
  };
}

export class GlobalSearchService {
  /**
   * Busca específica para clientes: freelancers e projetos próprios
   */
  static async searchForClient(searchTerm: string, clientId: string): Promise<SearchResult[]> {
    if (!searchTerm.trim()) return [];

    const results: SearchResult[] = [];
    const searchLower = searchTerm.toLowerCase().trim();

    try {
      // Buscar freelancers disponíveis
      const freelancersQuery = query(
        collection(db, 'users'),
        where('userType', '==', 'freelancer'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(15)
      );

      const freelancersSnapshot = await getDocs(freelancersQuery);
      freelancersSnapshot.forEach((doc) => {
        const data = doc.data();
        const freelancerName = data.name?.toLowerCase() || '';
        const freelancerBio = data.bio?.toLowerCase() || '';
        const skills = data.skills?.map((skill: string) => skill.toLowerCase()) || [];

        if (
          freelancerName.includes(searchLower) ||
          freelancerBio.includes(searchLower) ||
          skills.some((skill: string) => skill.includes(searchLower))
        ) {
          results.push({
            id: doc.id,
            type: 'freelancer',
            title: data.name || 'Freelancer',
            description: data.bio || 'Freelancer disponível',
            image: data.profileImage,
            url: `/cliente/freelancer/${doc.id}`,
            metadata: {
              skills: data.skills || [],
              location: data.location,
              rating: data.rating || 0
            }
          });
        }
      });

      // Buscar projetos próprios do cliente
      const clientProjectsQuery = query(
        collection(db, 'projects'),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const clientProjectsSnapshot = await getDocs(clientProjectsQuery);
      clientProjectsSnapshot.forEach((doc) => {
        const data = doc.data();
        const projectTitle = data.title?.toLowerCase() || '';
        const projectDescription = data.description?.toLowerCase() || '';
        const skills = data.skills?.map((skill: string) => skill.toLowerCase()) || [];

        if (
          projectTitle.includes(searchLower) ||
          projectDescription.includes(searchLower) ||
          skills.some((skill: string) => skill.includes(searchLower))
        ) {
          results.push({
            id: doc.id,
            type: 'project',
            title: data.title || 'Projeto sem título',
            description: this.stripHtml(data.description || ''),
            url: `/cliente/projeto/${doc.id}`,
            metadata: {
              price: data.budget,
              skills: data.skills || [],
              location: data.location,
              status: data.status
            }
          });
        }
      });

      return this.sortByRelevance(results, searchLower);

    } catch (error) {
      console.error('Erro na busca para cliente:', error);
      return [];
    }
  }

  /**
   * Busca específica para freelancers: projetos abertos e clientes
   */
  static async searchForFreelancer(searchTerm: string): Promise<SearchResult[]> {
    if (!searchTerm.trim()) return [];

    const results: SearchResult[] = [];
    const searchLower = searchTerm.toLowerCase().trim();

    try {
      // Buscar projetos recebendo propostas
      const openProjectsQuery = query(
        collection(db, 'projects'),
        where('status', '==', 'recebendo_propostas'),
        orderBy('createdAt', 'desc'),
        limit(15)
      );

      const openProjectsSnapshot = await getDocs(openProjectsQuery);
      openProjectsSnapshot.forEach((doc) => {
        const data = doc.data();
        const projectTitle = data.title?.toLowerCase() || '';
        const projectDescription = data.description?.toLowerCase() || '';
        const clientName = data.clientName?.toLowerCase() || '';
        const skills = data.skills?.map((skill: string) => skill.toLowerCase()) || [];

        if (
          projectTitle.includes(searchLower) ||
          projectDescription.includes(searchLower) ||
          clientName.includes(searchLower) ||
          skills.some((skill: string) => skill.includes(searchLower))
        ) {
          results.push({
            id: doc.id,
            type: 'project',
            title: data.title || 'Projeto sem título',
            description: this.stripHtml(data.description || ''),
            url: `/freelancer/encontre-trabalho?project=${doc.id}`,
            metadata: {
              price: data.budget,
              skills: data.skills || [],
              location: data.location,
              status: data.status,
              clientName: data.clientName
            }
          });
        }
      });

      // Buscar clientes ativos
      const clientsQuery = query(
        collection(db, 'users'),
        where('userType', '==', 'client'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const clientsSnapshot = await getDocs(clientsQuery);
      clientsSnapshot.forEach((doc) => {
        const data = doc.data();
        const clientName = data.name?.toLowerCase() || '';
        const clientBio = data.bio?.toLowerCase() || '';

        if (
          clientName.includes(searchLower) ||
          clientBio.includes(searchLower)
        ) {
          results.push({
            id: doc.id,
            type: 'client',
            title: data.name || 'Cliente',
            description: data.bio || 'Cliente ativo',
            image: data.profileImage,
            url: `/freelancer/cliente/${doc.id}`,
            metadata: {
              location: data.location
            }
          });
        }
      });

      return this.sortByRelevance(results, searchLower);

    } catch (error) {
      console.error('Erro na busca para freelancer:', error);
      return [];
    }
  }

  /**
   * Busca global por projetos, freelancers e clientes (método legado)
   */
  static async searchAll(searchTerm: string, userType: 'freelancer' | 'client'): Promise<SearchResult[]> {
    // Redirecionar para os métodos específicos
    if (userType === 'client') {
      // Para clientes, precisamos do clientId, mas vamos usar um método genérico
      return this.searchForClient(searchTerm, '');
    } else {
      return this.searchForFreelancer(searchTerm);
    }
  }

  /**
   * Busca rápida para sugestões específicas por tipo de usuário
   */
  static async getSuggestions(searchTerm: string, userType: 'freelancer' | 'client', clientId?: string): Promise<string[]> {
    if (!searchTerm.trim() || searchTerm.length < 2) return [];

    const suggestions: string[] = [];
    const searchLower = searchTerm.toLowerCase().trim();

    try {
      if (userType === 'client') {
        // Para clientes: sugestões de freelancers e projetos próprios
        const freelancersQuery = query(
          collection(db, 'users'),
          where('userType', '==', 'freelancer'),
          where('isActive', '==', true),
          limit(5)
        );

        const freelancersSnapshot = await getDocs(freelancersQuery);
        freelancersSnapshot.forEach((doc) => {
          const data = doc.data();
          const name = data.name || '';
          if (name.toLowerCase().includes(searchLower)) {
            suggestions.push(name);
          }
        });

        // Projetos próprios do cliente
        if (clientId) {
          const clientProjectsQuery = query(
            collection(db, 'projects'),
            where('clientId', '==', clientId),
            limit(5)
          );

          const clientProjectsSnapshot = await getDocs(clientProjectsQuery);
          clientProjectsSnapshot.forEach((doc) => {
            const data = doc.data();
            const title = data.title || '';
            if (title.toLowerCase().includes(searchLower)) {
              suggestions.push(title);
            }
          });
        }

      } else {
        // Para freelancers: sugestões de projetos recebendo propostas e clientes
        const openProjectsQuery = query(
          collection(db, 'projects'),
          where('status', '==', 'recebendo_propostas'),
          limit(5)
        );

        const openProjectsSnapshot = await getDocs(openProjectsQuery);
        openProjectsSnapshot.forEach((doc) => {
          const data = doc.data();
          const title = data.title || '';
          if (title.toLowerCase().includes(searchLower)) {
            suggestions.push(title);
          }
        });

        // Clientes ativos
        const clientsQuery = query(
          collection(db, 'users'),
          where('userType', '==', 'client'),
          where('isActive', '==', true),
          limit(5)
        );

        const clientsSnapshot = await getDocs(clientsQuery);
        clientsSnapshot.forEach((doc) => {
          const data = doc.data();
          const name = data.name || '';
          if (name.toLowerCase().includes(searchLower)) {
            suggestions.push(name);
          }
        });
      }

      // Buscar habilidades (para ambos os tipos)
      const skillsQuery = query(
        collection(db, 'skills'),
        limit(5)
      );

      const skillsSnapshot = await getDocs(skillsQuery);
      skillsSnapshot.forEach((doc) => {
        const data = doc.data();
        const skill = data.name || '';
        if (skill.toLowerCase().includes(searchLower)) {
          suggestions.push(skill);
        }
      });

      return [...new Set(suggestions)].slice(0, 8);

    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
      return [];
    }
  }

  /**
   * Remove tags HTML de uma string
   */
  private static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Ordena resultados por relevância
   */
  private static sortByRelevance(results: SearchResult[], searchTerm: string): SearchResult[] {
    return results.sort((a, b) => {
      const aTitleMatch = a.title.toLowerCase().includes(searchTerm);
      const bTitleMatch = b.title.toLowerCase().includes(searchTerm);
      
      // Priorizar matches no título
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      
      // Depois por tipo (projetos primeiro)
      const typeOrder = { project: 0, freelancer: 1, client: 2 };
      const aTypeOrder = typeOrder[a.type];
      const bTypeOrder = typeOrder[b.type];
      
      if (aTypeOrder !== bTypeOrder) {
        return aTypeOrder - bTypeOrder;
      }
      
      // Por último, por ordem alfabética
      return a.title.localeCompare(b.title);
    });
  }
}
