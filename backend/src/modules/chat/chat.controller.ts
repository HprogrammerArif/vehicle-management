import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { Server as SocketIOServer } from 'socket.io';
import { ConvType, MsgType } from '@prisma/client';

let ioInstance: SocketIOServer | null = null;
export const setChatIo = (io: SocketIOServer) => {
  ioInstance = io;
};

export const getChatIo = () => ioInstance;

/**
 * 1. Admin Inbox: Get all conversations
 */
export const getAllConversations = async (req: Request, res: Response) => {
  try {
    const { type, isResolved, search } = req.query;

    const whereClause: any = {};
    if (type && typeof type === 'string') {
      whereClause.type = type as ConvType;
    }
    if (isResolved !== undefined) {
      whereClause.isResolved = isResolved === 'true';
    }
    if (search && typeof search === 'string') {
      whereClause.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        {
          participants: {
            some: {
              user: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        trip: {
          select: {
            id: true,
            status: true,
            purpose: true,
            departureAt: true,
            fromOffice: { select: { id: true, name: true } },
            toOffice: { select: { id: true, name: true } },
            vehicle: { select: { id: true, registrationNo: true, model: true } },
            driver: {
              select: {
                id: true,
                user: { select: { id: true, name: true, phone: true } },
              },
            },
            requester: { select: { id: true, name: true, department: true } },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                profilePhoto: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Error fetching all conversations:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
};

/**
 * 2. Get conversations for current logged-in user
 */
export const getMyConversations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        trip: {
          select: {
            id: true,
            status: true,
            purpose: true,
            departureAt: true,
            fromOffice: { select: { id: true, name: true } },
            toOffice: { select: { id: true, name: true } },
            vehicle: { select: { id: true, registrationNo: true, model: true } },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                profilePhoto: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Error fetching user conversations:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
};

/**
 * 3. Total unread message count for current user
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Find all participant entries for this user
    const userParticipants = await prisma.convParticipant.findMany({
      where: { userId },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });

    if (userParticipants.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    let totalUnread = 0;
    for (const p of userParticipants) {
      const unreadCount = await prisma.chatMessage.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: userId },
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      });
      totalUnread += unreadCount;
    }

    return res.json({ success: true, count: totalUnread });
  } catch (error) {
    console.error('Error calculating unread count:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
};

/**
 * 4. Start a new conversation
 */
export const startConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { subject, type = 'GENERAL', tripId, initialMessage, participantIds = [] } = req.body;

    if (!subject || subject.trim() === '') {
      return res.status(400).json({ success: false, message: 'Subject is required' });
    }

    // Always include current user
    const participantsToSet = new Set<string>([userId]);

    // If extra participant IDs passed, include them
    if (Array.isArray(participantIds)) {
      participantIds.forEach((pId: string) => participantsToSet.add(pId));
    }

    // If initiator is not ADMIN, ensure at least one ADMIN is a participant
    if (req.user?.role !== 'ADMIN') {
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN', isActive: true },
      });
      if (adminUser) {
        participantsToSet.add(adminUser.id);
      }
    }

    // If tripId is provided, also auto-add trip requester and driver
    if (tripId) {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: { driver: true },
      });
      if (trip) {
        if (trip.requesterId) participantsToSet.add(trip.requesterId);
        if (trip.driver?.userId) participantsToSet.add(trip.driver.userId);
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        subject: subject.trim(),
        type: type as ConvType,
        tripId: tripId || null,
        participants: {
          create: Array.from(participantsToSet).map((uId) => ({
            userId: uId,
            lastReadAt: uId === userId ? new Date() : null,
          })),
        },
        messages: initialMessage && initialMessage.trim() !== ''
          ? {
              create: {
                senderId: userId,
                body: initialMessage.trim(),
                messageType: 'TEXT',
              },
            }
          : undefined,
      },
      include: {
        trip: {
          select: {
            id: true,
            status: true,
            fromOffice: true,
            toOffice: true,
          },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, department: true },
            },
          },
        },
        messages: {
          include: {
            sender: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    // Notify admin fleet channel via socket
    if (ioInstance) {
      ioInstance.to('admin_fleet').emit('chat:new_conversation', conversation);
    }

    return res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    console.error('Error starting conversation:', error);
    return res.status(500).json({ success: false, message: 'Failed to start conversation' });
  }
};

/**
 * 5. Get conversation detail by ID
 */
export const getConversationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            fromOffice: true,
            toOffice: true,
            vehicle: true,
            driver: { include: { user: true } },
            requester: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                phone: true,
                profilePhoto: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, role: true, department: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Auto mark as read for current user
    if (userId) {
      await prisma.convParticipant.updateMany({
        where: { conversationId: id, userId },
        data: { lastReadAt: new Date() },
      }).catch(() => {});
    }

    return res.json({ success: true, data: conversation });
  } catch (error) {
    console.error('Error fetching conversation details:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
  }
};

/**
 * 6. Get messages for conversation (with pagination)
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const cursor = req.query.cursor as string | undefined;

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: id },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, role: true, department: true },
        },
      },
    });

    return res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

/**
 * 7. Send message (REST fallback)
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { body, messageType = 'TEXT', attachmentUrl } = req.body;

    if (!body || body.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty' });
    }

    // Save message
    const message = await prisma.chatMessage.create({
      data: {
        conversationId: id,
        senderId: userId,
        body: body.trim(),
        messageType: messageType as MsgType,
        attachmentUrl: attachmentUrl || null,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true, department: true },
        },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Update sender's lastReadAt
    await prisma.convParticipant.updateMany({
      where: { conversationId: id, userId },
      data: { lastReadAt: new Date() },
    });

    // Broadcast through socket if available
    if (ioInstance) {
      ioInstance.to(`chat_${id}`).emit('chat:message', message);
      ioInstance.to('admin_fleet').emit('chat:unread_update', { conversationId: id });
    }

    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

/**
 * 8. Mark conversation as read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await prisma.convParticipant.updateMany({
      where: { conversationId: id, userId },
      data: { lastReadAt: new Date() },
    });

    if (ioInstance) {
      ioInstance.to(`chat_${id}`).emit('chat:read_receipt', {
        conversationId: id,
        userId,
        readAt: new Date().toISOString(),
      });
    }

    return res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error('Error marking conversation read:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

/**
 * 9. Resolve or archive conversation (Admin only)
 */
export const resolveConversation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isResolved = true } = req.body;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        isResolved,
        resolvedAt: isResolved ? new Date() : null,
      },
      include: {
        participants: true,
      },
    });

    if (ioInstance) {
      ioInstance.to(`chat_${id}`).emit('chat:resolved', {
        conversationId: id,
        isResolved,
      });
    }

    return res.json({ success: true, data: conversation });
  } catch (error) {
    console.error('Error resolving conversation:', error);
    return res.status(500).json({ success: false, message: 'Failed to update conversation status' });
  }
};
