import { Timestamp } from 'firebase/firestore';

export type UserRole = 'client' | 'freelancer' | 'manager' | 'moderator';
export type PresenceStatus = 'online' | 'offline' | 'away';

// Interface para certificações do freelancer
export interface Certification {
  id: string;
  name: string;
  issuer: string;
  dateIssued: Date;
  credentialUrl?: string;
  imageUrl?: string;
}

// Interface para documentos do portfólio
export interface PortfolioDocument {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

// Interface para itens do portfólio
export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  images: string[];
  coverImage?: string; // URL da imagem de capa
  projectUrl?: string;
  technologies?: string[];
  completedAt: Date;
  clientFeedback?: string;
  value?: number;
  // Novos campos para suporte a documentos e vídeo
  documents?: PortfolioDocument[]; // Documentos do projeto (PDF, Word, TXT)
  videos?: string[]; // URLs dos vídeos do projeto
  coverVideo?: string; // URL do vídeo de capa
}

// Interface para avaliações
export interface UserReview {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerType: UserRole;
  targetUserId: string;
  projectId?: string;
  rating: number; // 1-5 estrelas
  comment: string;
  createdAt: Timestamp;
}

// Interface expandida para perfil de usuário
export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Timestamp;
  lastLogin: Timestamp;
  rating: number;
  ratingCount: number;
  totalRating: number;
  isOnline: boolean;
  lastSeen: Timestamp;
  updatedAt: Timestamp;
  
  // Informações básicas
  profileImage?: string;
  bio?: string;
  location?: string;
  phone?: string;
  linkedInUrl?: string;
  cnpj?: string; // Para verificação
  
  // Específico para freelancers
  skills?: string[];
  hourlyRate?: number;
  availability?: 'disponivel' | 'ocupado' | 'indisponivel';
  specialization?: string;
  experience?: 'iniciante' | 'intermediario' | 'avancado';
  category?: string; // Nova categoria principal
  subcategory?: string; // Nova subcategoria
  portfolio?: PortfolioItem[];
  certifications?: Certification[];
  
  // Específico para clientes
  companyName?: string;
  companySize?: 'startup' | 'pequena' | 'media' | 'grande';
  industry?: string;
  favoriteFreelancers?: string[]; // Lista de UIDs dos freelancers favoritos
  
  // Campos de endereço para checkout PIX
  cep?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  
  // Sistema de curtidas (para freelancers)
  likesRemaining?: number;
  currentPlan?: string;
  planExpiresAt?: Timestamp;
  
  // Contadores
  completedProjects?: number;
  totalEarnings?: number; // Para freelancers
  totalSpent?: number; // Para clientes
  
  // Flag para indicar se o usuário precisa selecionar seu role (usado no login do Google)
  needsRoleSelection?: boolean;
}

// Versão serializada para o Redux (usando strings ISO em vez de Timestamp/Date)
export interface SerializedUserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string; // ISO string
  lastLogin: string; // ISO string
  rating: number;
  ratingCount: number;
  totalRating: number;
  isOnline: boolean;
  lastSeen: string; // ISO string
  updatedAt: string; // ISO string
  
  // Flag de verificação geral no documento do usuário
  verified?: boolean;
  
  profileImage?: string;
  bio?: string;
  location?: string;
  phone?: string;
  linkedInUrl?: string;
  cnpj?: string;
  
  skills?: string[];
  hourlyRate?: number;
  availability?: 'disponivel' | 'ocupado' | 'indisponivel';
  specialization?: string;
  experience?: 'iniciante' | 'intermediario' | 'avancado';
  portfolio?: PortfolioItem[];
  certifications?: Certification[];
  
  companyName?: string;
  companySize?: 'startup' | 'pequena' | 'media' | 'grande';
  industry?: string;
  favoriteFreelancers?: string[]; // Lista de UIDs dos freelancers favoritos

  likesRemaining?: number;
  currentPlan?: string;
  planExpiresAt?: string; // ISO string
  
  completedProjects?: number;
  totalEarnings?: number;
  totalSpent?: number;
  
  // Recipient serializado
  recipient?: {
    id: string;
    name: string;
    email: string;
    code: string;
    document: string;
    type: string;
    payment_mode: string;
    status: string;
    verified?: boolean;
    created_at: string; // ISO string
    updated_at: string; // ISO string
    transfer_settings: any;
    default_bank_account: any;
    gateway_recipients: any[];
    automatic_anticipation_settings: any;
    metadata: any;
    register_information: any;
  };
}

export interface UserPresence {
  uid: string;
  isOnline: boolean;
  lastSeen: Timestamp;
  status: PresenceStatus;
  connectionId: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  skills?: string[];
  linkedInUrl?: string;
  cnpj?: string;
}

// Interface para dados de atualização de perfil
export interface UpdateProfileData {
  name?: string;
  bio?: string;
  location?: string;
  phone?: string;
  linkedInUrl?: string;
  cnpj?: string;
  skills?: string[];
  hourlyRate?: number;
  availability?: 'disponivel' | 'ocupado' | 'indisponivel';
  specialization?: string;
  experience?: 'iniciante' | 'intermediario' | 'avancado';
  category?: string; // Nova categoria principal
  subcategory?: string; // Nova subcategoria
  companyName?: string;
  companySize?: 'startup' | 'pequena' | 'media' | 'grande';
  industry?: string;
  
  // Campos de endereço para checkout PIX
  cep?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  
  profileImage?: string;
}
