import React, { useState, useEffect } from 'react';
import { Conversation, ConvType } from '../../types';
import { api } from '../../lib/api';
import { useStore } from '../../store/useStore';
import { getSocket } from '../../lib/socket';
import {
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  Navigation,
  Search,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
} from 'lucide-react';

interface ConversationListProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
}

const getTypeIcon = (type: ConvType) => {
  switch (type) {
    case 'TRIP_THREAD':
      return <Navigation className="w-4 h-4 text-cyan-400" />;
    case 'INCIDENT':
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    case 'SUPPORT':
      return <HelpCircle className="w-4 h-4 text-amber-400" />;
    default:
      return <MessageSquare className="w-4 h-4 text-slate-400" />;
  }
};

const getTypeBadge = (type: ConvType) => {
  const styles: Record<ConvType, string> = {
    TRIP_THREAD: 'bg-cyan-900/30 text-cyan-400 border-cyan-800/40',
    INCIDENT: 'bg-red-900/30 text-red-400 border-red-800/40',
    SUPPORT: 'bg-amber-900/30 text-amber-400 border-amber-800/40',
    GENERAL: 'bg-slate-800 text-slate-400 border-slate-700',
  };
  return styles[type] || styles.GENERAL;
};

const timeAgo = (dateStr: string) => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export const ConversationList: React.FC<ConversationListProps> = ({
  activeId,
  onSelect,
  onNewConversation,
}) => {
  const { user } = useStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterResolved, setFilterResolved] = useState<string>('active');
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  // Debounce search keystrokes by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'ALL') params.set('type', filterType);
      if (filterResolved === 'resolved') params.set('isResolved', 'true');
      if (filterResolved === 'active') params.set('isResolved', 'false');
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const queryStr = params.toString();
      const res = await api.getConversations(queryStr ? `?${queryStr}` : '');
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [filterType, filterResolved, debouncedSearch]);

  // Listen for new conversations, unread updates, and online presence
  useEffect(() => {
    const socket = getSocket();

    // Identify current user to socket for presence tracking
    if (user?.id) {
      socket.emit('user:online', {
        userId: user.id,
        name: user.name,
        role: user.role,
      });
    }

    const handleNewConv = () => loadConversations();
    const handleUnreadUpdate = () => loadConversations();
    const handlePresence = (data: { onlineUserIds: string[] }) => {
      if (Array.isArray(data?.onlineUserIds)) {
        setOnlineUserIds(data.onlineUserIds);
      }
    };

    socket.on('chat:new_conversation', handleNewConv);
    socket.on('chat:unread_update', handleUnreadUpdate);
    socket.on('presence:sync', handlePresence);

    // Request presence update on mount
    socket.emit('presence:get');

    return () => {
      socket.off('chat:new_conversation', handleNewConv);
      socket.off('chat:unread_update', handleUnreadUpdate);
      socket.off('presence:sync', handlePresence);
    };
  }, [user]);

  const getUnreadCount = (conv: Conversation): number => {
    if (!user?.id) return 0;
    const participant = conv.participants.find((p) => p.userId === user.id);
    if (!participant) return 0;
    if (!participant.lastReadAt) return conv._count?.messages || 0;

    const lastRead = new Date(participant.lastReadAt).getTime();
    return conv.messages.filter(
      (m) => new Date(m.createdAt).getTime() > lastRead && m.senderId !== user.id
    ).length;
  };

  const hasOnlineParticipant = (conv: Conversation): boolean => {
    return conv.participants.some(
      (p) => p.userId !== user?.id && onlineUserIds.includes(p.userId)
    );
  };

  const filteredConversations = conversations;

  return (
    <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/50 h-full shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Inbox</h2>
          <button
            onClick={onNewConversation}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-md shadow-indigo-600/20"
            title="New Conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'TRIP_THREAD', 'INCIDENT', 'SUPPORT', 'GENERAL'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide shrink-0 transition-colors ${
                filterType === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {t === 'ALL' ? 'All' : t === 'TRIP_THREAD' ? 'Trips' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Resolved toggle */}
        <div className="flex items-center gap-2">
          {['active', 'resolved', 'all'].map((v) => (
            <button
              key={v}
              onClick={() => setFilterResolved(v)}
              className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                filterResolved === v
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {v === 'active' ? '● Active' : v === 'resolved' ? '✓ Resolved' : '◉ All'}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-xs animate-pulse">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-700" />
            <p className="font-semibold text-slate-400">
              {search ? 'No matching conversations' : 'Inbox is empty'}
            </p>
            <p className="text-[11px] text-slate-600">
              {search
                ? 'Try searching with a different name or keyword'
                : 'Incoming driver and employee threads will arrive here in real time.'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeId;
            const unread = getUnreadCount(conv);
            const isOnline = hasOnlineParticipant(conv);
            const lastMessage = conv.messages[0]; // last message (desc from API)
            const otherParticipants = conv.participants
              .filter((p) => p.userId !== user?.id)
              .map((p) => p.user.name)
              .join(', ');

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-800/60 transition-all ${
                  isActive
                    ? 'bg-indigo-600/10 border-l-2 border-l-indigo-500'
                    : 'hover:bg-slate-800/40 border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Type icon with presence ring */}
                  <div className="relative pt-0.5 shrink-0">
                    {getTypeIcon(conv.type)}
                    {isOnline && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900"
                        title="User is active now"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Subject + unread badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3
                          className={`text-xs font-semibold truncate ${
                            unread > 0 ? 'text-white font-bold' : 'text-slate-200'
                          }`}
                        >
                          {conv.subject}
                        </h3>
                      </div>
                      {unread > 0 && (
                        <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center shadow-sm">
                          {unread}
                        </span>
                      )}
                    </div>

                    {/* Type badge + resolved flag + online indicator */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${getTypeBadge(conv.type)}`}
                      >
                        {conv.type === 'TRIP_THREAD' ? 'TRIP' : conv.type}
                      </span>
                      {conv.isResolved ? (
                        <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Resolved
                        </span>
                      ) : isOnline ? (
                        <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Online
                        </span>
                      ) : null}
                    </div>

                    {/* Participant names */}
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {otherParticipants || 'No other participants'}
                    </p>

                    {/* Last message preview + time */}
                    {lastMessage && (
                      <div className="flex items-center justify-between mt-1.5 gap-2">
                        <p className="text-[11px] text-slate-400 truncate">
                          <span className="font-medium text-slate-300">
                            {lastMessage.sender?.name?.split(' ')[0] || 'User'}:
                          </span>{' '}
                          {lastMessage.body.substring(0, 48)}
                          {lastMessage.body.length > 48 ? '...' : ''}
                        </p>
                        <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {timeAgo(lastMessage.createdAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
