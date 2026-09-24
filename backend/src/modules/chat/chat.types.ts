import { ConvType, MsgType } from '@prisma/client';

export interface CreateConversationDto {
  subject: string;
  type?: ConvType;
  tripId?: string;
  initialMessage?: string;
  participantIds?: string[];
}

export interface SendMessageDto {
  body: string;
  messageType?: MsgType;
  attachmentUrl?: string;
}

export interface ChatParticipantInfo {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
  lastReadAt?: Date | null;
}

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string;
  attachmentUrl?: string | null;
  messageType: MsgType;
  isSystem: boolean;
  createdAt: Date;
}
