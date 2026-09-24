import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { api } from '../lib/api';
import { Conversation, ChatMessage } from '../types';
import { useStore } from '../store/useStore';

export const useChat = (conversationId: string | null) => {
  const { user, setUnreadChatCount } = useStore();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refresh global unread count
  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await api.getUnreadChatCount();
      if (res.success && typeof res.count === 'number') {
        setUnreadChatCount(res.count);
      }
    } catch (e) {
      // silently handle
    }
  }, [setUnreadChatCount]);

  // Load conversation details and messages
  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const res = await api.getConversationById(id);
      if (res.success && res.data) {
        setConversation(res.data);
        setMessages(res.data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen to Socket.io events
  useEffect(() => {
    const socket = getSocket();

    if (conversationId) {
      loadConversation(conversationId);
      socket.emit('chat:join', { conversationId });

      if (user?.id) {
        socket.emit('chat:read', { conversationId, userId: user.id });
      }

      // Incoming message listener
      const handleMessage = (msg: ChatMessage) => {
        if (msg.conversationId === conversationId) {
          setMessages((prev) => {
            // Avoid duplicate messages
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // If message is not from me, mark as read
          if (user?.id && msg.senderId !== user.id) {
            socket.emit('chat:read', { conversationId, userId: user.id });
          }
        }
        refreshUnreadCount();
      };

      // Typing indicator listener
      const handleTyping = (data: {
        conversationId: string;
        userName: string;
        isTyping: boolean;
      }) => {
        if (data.conversationId === conversationId) {
          if (data.isTyping) {
            setTypingUser(data.userName);
            setIsTyping(true);

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setIsTyping(false);
              setTypingUser('');
            }, 3000);
          } else {
            setIsTyping(false);
            setTypingUser('');
          }
        }
      };

      // Read receipt listener
      const handleReadReceipt = (data: {
        conversationId: string;
        userId: string;
        readAt: string;
      }) => {
        if (data.conversationId === conversationId) {
          setConversation((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              participants: prev.participants.map((p) =>
                p.userId === data.userId ? { ...p, lastReadAt: data.readAt } : p
              ),
            };
          });
        }
      };

      // Conversation resolved listener
      const handleResolved = (data: { conversationId: string; isResolved: boolean }) => {
        if (data.conversationId === conversationId) {
          setConversation((prev) => (prev ? { ...prev, isResolved: data.isResolved } : null));
        }
      };

      socket.on('chat:message', handleMessage);
      socket.on('chat:typing_indicator', handleTyping);
      socket.on('chat:read_receipt', handleReadReceipt);
      socket.on('chat:resolved', handleResolved);

      return () => {
        socket.emit('chat:leave', { conversationId });
        socket.off('chat:message', handleMessage);
        socket.off('chat:typing_indicator', handleTyping);
        socket.off('chat:read_receipt', handleReadReceipt);
        socket.off('chat:resolved', handleResolved);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      };
    } else {
      setConversation(null);
      setMessages([]);
    }
  }, [conversationId, loadConversation, user?.id, refreshUnreadCount]);

  // General unread badge listener across the entire app
  useEffect(() => {
    const socket = getSocket();
    refreshUnreadCount();

    const handleUnreadUpdate = () => {
      refreshUnreadCount();
    };

    socket.on('chat:unread_update', handleUnreadUpdate);
    socket.on('chat:new_conversation', handleUnreadUpdate);

    return () => {
      socket.off('chat:unread_update', handleUnreadUpdate);
      socket.off('chat:new_conversation', handleUnreadUpdate);
    };
  }, [refreshUnreadCount]);

  // Send message
  const sendMessage = useCallback(
    async (body: string, messageType: string = 'TEXT', attachmentUrl?: string) => {
      if (!conversationId || !user?.id || !body.trim()) return;

      const socket = getSocket();

      // Stop typing status immediately
      socket.emit('chat:typing', {
        conversationId,
        userName: user.name,
        isTyping: false,
      });

      // Send via REST — backend persists to DB AND broadcasts via socket automatically
      try {
        const res = await api.sendChatMessage(conversationId, {
          body: body.trim(),
          messageType,
          attachmentUrl,
        });

        if (res.success && res.data) {
          // Add optimistically if socket broadcast hasn't arrived yet
          setMessages((prev) => {
            if (prev.some((m) => m.id === res.data.id)) return prev;
            return [...prev, res.data];
          });
        }
      } catch (e) {
        // Fallback: try socket delivery if REST failed
        socket.emit('chat:send', {
          conversationId,
          senderId: user.id,
          body: body.trim(),
          messageType,
          attachmentUrl,
        });
      }
    },
    [conversationId, user]
  );

  // Send typing state
  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!conversationId || !user?.name) return;
      const socket = getSocket();
      socket.emit('chat:typing', {
        conversationId,
        userName: user.name,
        isTyping: typing,
      });
    },
    [conversationId, user]
  );

  // Toggle or set resolved
  const toggleResolved = useCallback(
    async (isResolved: boolean) => {
      if (!conversationId) return;
      try {
        const res = await api.resolveConversation(conversationId, isResolved);
        if (res.success && res.data) {
          setConversation(res.data);
        }
      } catch (e) {
        console.error('Failed to resolve conversation:', e);
      }
    },
    [conversationId]
  );

  return {
    conversation,
    messages,
    isLoading,
    isTyping,
    typingUser,
    sendMessage,
    sendTyping,
    toggleResolved,
    refreshConversation: () => conversationId && loadConversation(conversationId),
  };
};
