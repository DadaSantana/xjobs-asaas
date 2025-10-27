import { Timestamp } from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderType: 'client' | 'freelancer' | 'moderator';
  content: string;
  timestamp: Timestamp;
  readBy: string[];
  isEdited?: boolean;
  editedAt?: Timestamp;
  type?: 'text' | 'file' | 'image';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

export interface Chat {
  id: string;
  projectId: string | null;
  projectTitle: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  isActive: boolean;
  unreadCount: {
    client: number;
    freelancer: number;
  };
  blockedUsers: string[];
  moderatorId?: string;
  isDisputed: boolean;
  disputeReason?: string;
  disputeStartedAt?: Timestamp;
  fundsReleased: boolean;
  fundsReleasedAt?: Timestamp;
}

export interface CreateChatData {
  projectId: string;
  projectTitle: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
}

export interface SendMessageData {
  chatId: string;
  content: string;
  type?: 'text' | 'file' | 'image';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

export interface ChatContact {
  userId: string;
  name: string;
  role: 'client' | 'freelancer';
  isOnline: boolean;
  lastSeen: Timestamp;
  avatar?: string;
}
