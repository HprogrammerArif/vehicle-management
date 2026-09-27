import React, { useEffect, useRef, memo } from 'react';
import { ChatMessage } from '../../types';
import { useStore } from '../../store/useStore';
import { TypingIndicator } from './TypingIndicator';
import {
  Shield,
  User as UserIcon,
  Truck,
  MapPin,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Sparkles,
  FileText,
  Lock,
  Zap,
} from 'lucide-react';

interface MessageThreadProps {
  messages: ChatMessage[];
  isTyping: boolean;
  typingUser: string;
}

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDateSeparator = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return { label: 'Dispatch', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' };
    case 'DRIVER':
      return { label: 'Driver', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    default:
      return { label: 'Passenger', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
  }
};

const getAvatarGradient = (name: string = 'User') => {
  const gradients = [
    'from-indigo-600 to-blue-600',
    'from-emerald-600 to-teal-700',
    'from-amber-600 to-orange-600',
    'from-purple-600 to-violet-700',
    'from-pink-600 to-rose-600',
    'from-cyan-600 to-blue-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

const playMessageChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Silent fail if audio context blocked by browser autoplay policy
  }
};

export const MessageThread: React.FC<MessageThreadProps> = ({ messages, isTyping, typingUser }) => {
  const { user } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);

  // Play audio chime and handle browser tab notification on incoming messages
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const last = messages[messages.length - 1];
      if (last && last.senderId !== user?.id && !last.isSystem) {
        playMessageChime();
        if (document.hidden) {
          document.title = `(1) ${last.sender?.name || 'New message'} - Apex VMS`;
        }
      }
    }
    prevCountRef.current = messages.length;
  }, [messages, user?.id]);

  // Restore title on window focus
  useEffect(() => {
    const handleFocus = () => {
      document.title = 'Apex VMS - Fleet Management';
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Auto-scroll to bottom only when message count changes — not on every isTyping flicker
  const msgCount = messages.length;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgCount, isTyping]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center bg-slate-950/20">
        <div className="max-w-md space-y-3 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-wide">Ready for conversation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            This channel connects you directly with the driver and passengers. Messages, telemetry alerts, and location updates are synced in real-time.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-1.5 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
              <Lock className="w-3 h-3 text-slate-400" />
              End-to-end logged
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
              <Zap className="w-3 h-3 text-amber-400" />
              Live GPS synced
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Group messages by date
  let lastDateLabel = '';

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
      {messages.map((msg, idx) => {
        const isSelf = msg.senderId === user?.id;
        // Optimistic temp messages get a subtle sending state
        const isSending = msg.id.startsWith('temp_');
        const currentDateLabel = formatDateSeparator(msg.createdAt);
        const showDateSep = currentDateLabel !== lastDateLabel;
        lastDateLabel = currentDateLabel;

        const isFirstInSequence =
          idx === 0 ||
          messages[idx - 1]?.senderId !== msg.senderId ||
          messages[idx - 1]?.isSystem ||
          showDateSep;

        const isLastInSequence =
          idx === messages.length - 1 ||
          messages[idx + 1]?.senderId !== msg.senderId ||
          messages[idx + 1]?.isSystem;

        const senderInitials = (msg.sender?.name || 'User')
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();

        const roleBadge = getRoleBadge(msg.sender?.role || 'EMPLOYEE');

        // System message (centered, clean alert box)
        if (msg.isSystem || msg.messageType === 'SYSTEM_EVENT') {
          return (
            <React.Fragment key={msg.id}>
              {showDateSep && (
                <div className="flex items-center justify-center py-3">
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-800 shadow-sm">
                    {currentDateLabel}
                  </span>
                </div>
              )}
              <div className="flex justify-center py-1.5">
                <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl px-4 py-2 max-w-lg text-center shadow-sm">
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">{msg.body}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{formatTime(msg.createdAt)}</p>
                </div>
              </div>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={msg.id}>
            {showDateSep && (
              <div className="flex items-center justify-center py-3">
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-800 shadow-sm">
                  {currentDateLabel}
                </span>
              </div>
            )}

            <div className={`flex gap-2.5 ${isSelf ? 'justify-end' : 'justify-start'} group items-end`}>
              {/* Other's avatar (only shown on the last message in a clump) */}
              {!isSelf && (
                <div className="w-7 h-7 shrink-0 mb-1">
                  {isLastInSequence ? (
                    <div
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                        msg.sender?.name
                      )} flex items-center justify-center text-white text-[10px] font-bold shadow-md shadow-slate-950/40`}
                      title={`${msg.sender?.name} (${msg.sender?.role})`}
                    >
                      {senderInitials}
                    </div>
                  ) : (
                    <div className="w-7" />
                  )}
                </div>
              )}

              <div className={`max-w-[72%] flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                {/* Sender Name & Role Header (first message in sequence) */}
                {!isSelf && isFirstInSequence && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1">
                    <span className="text-xs font-semibold text-slate-200">{msg.sender?.name}</span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${roleBadge.color}`}
                    >
                      {roleBadge.label}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${
                    isSelf
                      ? `bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-xs${isSending ? ' opacity-60' : ''}`
                      : 'bg-slate-800/95 text-slate-100 border border-slate-700/60 rounded-bl-xs'
                  }`}
                >
                  {/* Attachment preview */}
                  {msg.attachmentUrl && (
                    <div className="mb-2">
                      {msg.messageType === 'IMAGE' || msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ? (
                        <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={msg.attachmentUrl}
                            alt="Attachment"
                            className="rounded-xl max-h-56 object-cover border border-white/10 hover:opacity-95 transition-opacity"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </a>
                      ) : msg.messageType === 'LOCATION_SHARE' ? (
                        <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-950/40 rounded-lg px-3 py-2 border border-emerald-800/40">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span>Driver shared location</span>
                        </div>
                      ) : (
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs p-2 rounded-lg bg-black/20 hover:bg-black/30 underline transition-colors"
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="truncate">View attached file</span>
                        </a>
                      )}
                    </div>
                  )}

                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>

                  {/* Inline micro timestamp & delivery checks */}
                  <div
                    className={`flex items-center gap-1 mt-1 text-[10px] ${
                      isSelf ? 'justify-end text-indigo-200' : 'justify-start text-slate-400'
                    }`}
                  >
                    <span>{isSending ? 'Sending…' : formatTime(msg.createdAt)}</span>
                    {isSelf && !isSending && (
                      <span title="Delivered">
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                      </span>
                    )}
                    {isSelf && isSending && (
                      <span title="Sending">
                        <Check className="w-3.5 h-3.5 opacity-40" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Self avatar (only shown on the last message in a clump) */}
              {isSelf && (
                <div className="w-7 h-7 shrink-0 mb-1">
                  {isLastInSequence ? (
                    <div
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                        user?.name || 'Tanvir Hossain'
                      )} flex items-center justify-center text-white text-[10px] font-bold shadow-md shadow-slate-950/40`}
                      title="You (Dispatch Admin)"
                    >
                      {(user?.name || 'Tanvir Hossain')
                        .split(' ')
                        .map((w: string) => w[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-7" />
                  )}
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}

      {/* Typing indicator */}
      {isTyping && typingUser && (
        <div className="flex justify-start pl-8 pt-1">
          <TypingIndicator userName={typingUser} />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
