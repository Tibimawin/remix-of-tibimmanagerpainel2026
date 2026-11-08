
import { Timestamp } from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'admin';
  timestamp: Timestamp;
  conversationId: string;
}

export interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageTime: Timestamp;
  unreadCount: number;
  status: 'active' | 'closed';
  lastSenderType?: 'user' | 'admin';
}

export interface ChatUser {
  userId: string;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}
