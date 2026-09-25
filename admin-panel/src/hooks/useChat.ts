import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { api } from '../lib/api';
import { Conversation, ChatMessage } from '../types';
import { useStore } from '../store/useStore';

// Module-level timer so debounce is stable across renders
let _unreadDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useChat = (conversationId: string | null) => {
  const { user, setUnreadChatCount } = useStore();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  // Map<id, ChatMessage> for O(1) dedup instead of O(n) array.some()
  const [messagesMap, setMessagesMap] = useState<Map<string, ChatMessage>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable ref so socket callbacks always see current conversationId without re-subscribing
  const conversationIdRef = useRef<string | null>(null);
  const lastTypingState = useRef<boolean | null>(null);

  // Derived sorted array — recomputed only when Map reference changes
  const messages: ChatMessage[] = Array.from(messagesMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Debounced unread refresh — coalesces bursts of socket events into a single API call
  const refreshUnreadCount = useCallback(() => {
    if (_unreadDebounceTimer) clearTimeout(_unreadDebounceTimer);
    _unreadDebounceTimer = setTimeout(async () => {
      try {
        const res = await api.getUnreadChatCount();
        if (res.success && typeof res.count === 'number') {
          setUnreadChatCount(res.count);
        }
      } catch {
        // silently handle
      }
    }, 1000);
  }, [setUnreadChatCount]);

  // Load conversation + messages
  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const res = await api.getConversationById(id);
      if (res.success && res.data) {
        setConversation(res.data);
        const map = new Map<string, ChatMessage>();
        (res.data.messages || []).forEach((m: ChatMessage) => map.set(m.id, m));
        setMessagesMap(map);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    conversationIdRef.current = conversationId;

    if (conversationId) {
      loadConversation(conversationId);
      socket.emit('chat:join', { conversationId });
      if (user?.id) {
        socket.emit('chat:read', { conversationId, userId: user.id });
      }

      // Incoming message — O(1) dedup via Map, no full re-render of old messages
      const handleMessage = (msg: ChatMessage) => {
        if (msg.conversationId !== conversationIdRef.current) return;
        setMessagesMap((prev) => {
          if (prev.has(msg.id)) return prev;
          const next = new Map(prev);
          next.set(msg.id, msg);
          return next;
        });
        if (user?.id && msg.senderId !== user.id) {
          socket.emit('chat:read', { conversationId, userId: user.id });
        }
        refreshUnreadCount();
      };

      const handleTyping = (data: { conversationId: string; userName: string; isTyping: boolean }) => {
        if (data.conversationId !== conversationIdRef.current) return;
        if (data.isTyping) {
          setTypingUser(data.userName);
          setIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            setTypingUser('');
          }, 3000);
        } else {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          setIsTyping(false);
          setTypingUser('');
        }
      };

      const handleReadReceipt = (data: { conversationId: string; userId: string; readAt: string }) => {
        if (data.conversationId !== conversationIdRef.current) return;
        setConversation((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.userId === data.userId ? { ...p, lastReadAt: data.readAt } : p
            ),
          };
        });
      };

      const handleResolved = (data: { conversationId: string; isResolved: boolean }) => {
        if (data.conversationId !== conversationIdRef.current) return;
        setConversation((prev) => (prev ? { ...prev, isResolved: data.isResolved } : null));
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
      setMessagesMap(new Map());
    }
  }, [conversationId, loadConversation, user?.id, refreshUnreadCount]);

  // Global unread badge listener (independent of active conversation)
  useEffect(() => {
    const socket = getSocket();
    refreshUnreadCount();
    const handleUnread = () => refreshUnreadCount();
    socket.on('chat:unread_update', handleUnread);
    socket.on('chat:new_conversation', handleUnread);
    return () => {
      socket.off('chat:unread_update', handleUnread);
      socket.off('chat:new_conversation', handleUnread);
    };
  }, [refreshUnreadCount]);

  // Send message with OPTIMISTIC UPDATE — UI updates instantly before server confirms
  const sendMessage = useCallback(
    async (body: string, messageType: string = 'TEXT', attachmentUrl?: string) => {
      if (!conversationId || !user?.id || !body.trim()) return;

      const socket = getSocket();
      socket.emit('chat:typing', { conversationId, userName: user.name, isTyping: false });
      lastTypingState.current = false;

      // 1. Instantly show in UI with temp ID
      const tempId = `temp_${Date.now()}`;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: user.id,
        body: body.trim(),
        messageType: messageType as any,
        attachmentUrl: attachmentUrl || null,
        isSystem: false,
        createdAt: new Date().toISOString(),
        sender: { id: user.id, name: user.name, role: user.role as any },
      };
      setMessagesMap((prev) => {
        const next = new Map(prev);
        next.set(tempId, optimisticMsg);
        return next;
      });

      try {
        const res = await api.sendChatMessage(conversationId, {
          body: body.trim(),
          messageType,
          attachmentUrl,
        });
        if (res.success && res.data) {
          // Swap temp for real persisted message (socket may have already added it)
          setMessagesMap((prev) => {
            const next = new Map(prev);
            next.delete(tempId);
            if (!next.has(res.data.id)) next.set(res.data.id, res.data);
            return next;
          });
        } else {
          setMessagesMap((prev) => { const next = new Map(prev); next.delete(tempId); return next; });
        }
      } catch {
        setMessagesMap((prev) => { const next = new Map(prev); next.delete(tempId); return next; });
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

  // Throttled typing — skip redundant socket events when state has not changed
  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!conversationId || !user?.name) return;
      if (lastTypingState.current === typing) return;
      lastTypingState.current = typing;
      const socket = getSocket();
      socket.emit('chat:typing', { conversationId, userName: user.name, isTyping: typing });
    },
    [conversationId, user]
  );

  // Toggle resolved with optimistic update + rollback on error
  const toggleResolved = useCallback(
    async (isResolved: boolean) => {
      if (!conversationId) return;
      setConversation((prev) => (prev ? { ...prev, isResolved } : null));
      try {
        const res = await api.resolveConversation(conversationId, isResolved);
        if (res.success && res.data) setConversation(res.data);
      } catch {
        setConversation((prev) => (prev ? { ...prev, isResolved: !isResolved } : null));
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
