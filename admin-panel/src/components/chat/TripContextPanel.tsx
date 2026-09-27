import React, { useState, useEffect } from 'react';
import { Conversation } from '../../types';
import {
  MapPin,
  Truck,
  User as UserIcon,
  Phone,
  Navigation,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Fuel,
  Radio,
  LifeBuoy,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getSocket } from '../../lib/socket';

interface TripContextPanelProps {
  conversation: Conversation | null;
}

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

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-900/30 text-amber-400 border-amber-800/50',
    APPROVED: 'bg-blue-900/30 text-blue-400 border-blue-800/50',
    IN_PROGRESS: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50',
    COMPLETED: 'bg-slate-700 text-slate-300 border-slate-600',
    REJECTED: 'bg-red-900/30 text-red-400 border-red-800/50',
    CANCELLED: 'bg-slate-800 text-slate-500 border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
        colors[status] || colors.PENDING
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {status.replace('_', ' ')}
    </span>
  );
};

export const TripContextPanel: React.FC<TripContextPanelProps> = ({ conversation }) => {
  const { setActiveTab } = useStore();
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    const socket = getSocket();
    const handlePresence = (data: { onlineUserIds: string[] }) => {
      if (Array.isArray(data?.onlineUserIds)) {
        setOnlineUserIds(data.onlineUserIds);
      }
    };

    socket.on('presence:sync', handlePresence);
    socket.emit('presence:get');

    return () => {
      socket.off('presence:sync', handlePresence);
    };
  }, []);

  if (!conversation) {
    return (
      <div className="w-72 border-l border-slate-800 bg-slate-900/30 flex items-center justify-center text-slate-600 text-xs shrink-0">
        Select a conversation
      </div>
    );
  }

  const trip = conversation.trip as any;
  const participants = conversation.participants || [];

  return (
    <div className="w-72 border-l border-slate-800 bg-slate-900/30 flex flex-col h-full shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
          Thread Context
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
          {conversation.type === 'TRIP_THREAD' ? (
            <>
              <Truck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Active Trip Dispatch</span>
            </>
          ) : conversation.type === 'INCIDENT' ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Incident Response Channel</span>
            </>
          ) : conversation.type === 'SUPPORT' ? (
            <>
              <LifeBuoy className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Support Ticket</span>
            </>
          ) : (
            <span>General conversation</span>
          )}
        </div>
      </div>

      {/* Participants with Live Presence */}
      <div className="p-4 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Participants ({participants.length})
          </h4>
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            Live Sync
          </span>
        </div>

        {participants.map((p) => {
          if (!p) return null;
          const user = p.user;
          const userName = user?.name || 'Former Member';
          const userRole = user?.role || 'UNKNOWN';
          const isOnline = user ? onlineUserIds.includes(p.userId) : false;
          const initials = userName
            .split(' ')
            .filter(Boolean)
            .map((w: string) => w[0])
            .join('')
            .substring(0, 2)
            .toUpperCase() || 'U';

          return (
            <div
              key={p.id}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/70 hover:border-slate-700 transition-colors"
            >
              {/* Gradient avatar with presence dot */}
              <div className="relative shrink-0">
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                    userName
                  )} flex items-center justify-center text-white text-xs font-bold shadow-md shadow-slate-950/40`}
                >
                  {initials}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                    isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                  title={isOnline ? 'Online now' : 'Offline'}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">{userName}</p>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                      userRole === 'ADMIN'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        : userRole === 'DRIVER'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                    }`}
                  >
                    {userRole}
                  </span>
                  <span className={`text-[10px] ${isOnline ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {isOnline ? 'Active now' : 'Offline'}
                  </span>
                </div>
              </div>

              {p.lastReadAt && (
                <span title="Read conversation">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Trip Details (only if trip-linked) */}
      {trip && (
        <div className="p-4 border-b border-slate-800 space-y-3">
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Linked Trip
          </h4>

          {/* Route */}
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center gap-0.5 pt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <div className="w-px h-6 bg-slate-700"></div>
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">From</p>
                  <p className="text-xs font-medium text-slate-200">
                    {trip.fromOffice?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">To</p>
                  <p className="text-xs font-medium text-slate-200">
                    {trip.toOffice?.name || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trip status */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Status</span>
            <StatusBadge status={trip.status} />
          </div>

          {/* Vehicle */}
          {trip.vehicle && (
            <div className="flex items-center gap-2 p-2 bg-slate-950/40 rounded-lg border border-slate-800/60">
              <Truck className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{trip.vehicle.model}</p>
                <p className="text-[10px] text-slate-500">{trip.vehicle.registrationNo}</p>
              </div>
            </div>
          )}

          {/* Driver */}
          {trip.driver && (
            <div className="flex items-center gap-2 p-2 bg-slate-950/40 rounded-lg border border-slate-800/60">
              <UserIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">
                  {trip.driver.user?.name || 'Unknown'}
                </p>
                {trip.driver.user?.phone && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-0.5">
                    <Phone className="w-3 h-3" />
                    {trip.driver.user.phone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Departure */}
          {trip.departureAt && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {new Date(trip.departureAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          {/* Requester */}
          {trip.requester && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{trip.requester.name}</span>
              {trip.requester.department && (
                <span className="text-[10px] text-slate-600">({trip.requester.department})</span>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-1.5 pt-1">
            {trip.status === 'IN_PROGRESS' && (
              <button
                onClick={() => setActiveTab('tracking')}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-800/40 text-xs font-medium transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                Track on Live Map
              </button>
            )}
            <button
              onClick={() => setActiveTab('trips')}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Full Trip Details
            </button>
          </div>
        </div>
      )}

      {/* Conversation Meta */}
      <div className="p-4 space-y-2 mt-auto">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500">Created</span>
          <span className="text-slate-400">
            {new Date(conversation.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500">Last Updated</span>
          <span className="text-slate-400">
            {new Date(conversation.updatedAt).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500">Total Messages</span>
          <span className="text-slate-400">{conversation._count?.messages || conversation.messages.length}</span>
        </div>
        {conversation.isResolved && (
          <div className="flex items-center gap-1 text-emerald-400 text-xs pt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Resolved</span>
          </div>
        )}
      </div>
    </div>
  );
};
