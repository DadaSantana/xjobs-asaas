import { Timestamp } from 'firebase/firestore';

export type ProjectStatus = 
  | 'recebendo_propostas'       // Projeto criado, aguardando propostas
  | 'aguardando_garantia'       // Proposta aceita, aguardando depósito da garantia
  | 'executando'                // Garantia depositada, projeto em execução
  | 'aguardando_aceite_cliente' // Freelancer finalizou, aguardando aceite do cliente
  | 'concluido'                 // Projeto finalizado e aceito
  | 'cancelado';                // Projeto cancelado
export type ProjectCategory = 'desenvolvimento' | 'design' | 'marketing' | 'redacao' | 'consultoria' | 'outros';
export type ProjectExperience = 'iniciante' | 'intermediario' | 'avancado';
export type ProposalStatus = 
  | 'pendente'    // Proposta enviada, aguardando resposta
  | 'aceita'      // Proposta aceita pelo cliente
  | 'rejeitada'   // Proposta rejeitada pelo cliente
  | 'cancelada';  // Proposta cancelada pelo freelancer

export interface ProjectAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: Timestamp;
}

// Interface para curtidas no projeto
export interface ProjectLike {
  id: string;
  projectId: string;
  freelancerId: string;
  freelancerName: string;
  freelancerRating: number;
  freelancerImage?: string;
  proposedValue: number; // Valor proposto pelo freelancer (limite R$ 10.000)
  totalValue: number; // Valor + comissão de 10%
  message: string; // Mensagem de interesse do freelancer
  createdAt: Timestamp;
  freelancerPortfolioUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  newCategory?: string; // Nova categoria estruturada
  newSubcategory?: string; // Nova subcategoria estruturada
  skills: string[];
  budget: {
    min: number;
    max: number;
    type: 'fixo' | 'por_hora';
  };
  deadline: Date;
  experienceLevel: ProjectExperience;
  clientId: string;
  clientName: string;
  clientRating: number;
  status: ProjectStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  proposalsCount: number;
  selectedFreelancerId?: string;
  completedAt?: Timestamp;
  attachments?: ProjectAttachment[];
  
  // Sistema de curtidas
  likes: ProjectLike[]; // Array de curtidas/propostas
  likesCount: number; // Contador de curtidas (máximo 80)
  maxLikes: number; // Limite de curtidas por projeto (padrão 80)
}

export interface ProjectProposal {
  id: string;
  projectId: string;
  freelancerId: string;
  freelancerName: string;
  freelancerRating: number;
  freelancerImage?: string;
  coverLetter: string;
  proposedBudget: number;
  estimatedDays: number;
  status: ProposalStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  respondedAt?: Timestamp;
  
  // Dados derivados da curtida
  likeId?: string; // ID da curtida que gerou esta proposta
  totalValue: number; // Valor + comissão
}

export interface CreateProjectData {
  title: string;
  description: string;
  category: ProjectCategory;
  newCategory?: string; // Nova categoria estruturada
  newSubcategory?: string; // Nova subcategoria estruturada
  skills: string[];
  budget: {
    min: number;
    max: number;
    type: 'fixo' | 'por_hora';
  };
  deadline: Date;
  experienceLevel: ProjectExperience;
  clientId: string;
  clientName: string;
  attachments?: ProjectAttachment[];
}

export interface CreateProposalData {
  projectId: string;
  coverLetter: string;
  proposedBudget: number;
  estimatedDays: number;
}

// Interface para criar uma curtida/proposta
export interface CreateProjectLikeData {
  projectId: string;
  freelancerId: string;
  proposedValue: number; // Máximo R$ 10.000
  message: string;
}

export interface ProjectFilters {
  category?: ProjectCategory;
  experienceLevel?: ProjectExperience;
  budgetMin?: number;
  budgetMax?: number;
  skills?: string[];
  sortBy?: 'recente' | 'budget_asc' | 'budget_desc' | 'deadline';
  status?: ProjectStatus;
} 