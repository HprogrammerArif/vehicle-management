import React, { useState } from 'react';
import { Trip, TripStatus } from '../types';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { useTrips, useInvalidate, QK } from '../hooks/useVmsQueries';
import { AssignTripModal } from '../components/trips/AssignTripModal';
import {
  Clock,
  MapPin,
  CheckCircle,
  Play,
  CheckSquare,
  MessageSquare,
  Users,
  Car,
  User,
} from 'lucide-react';

/** Resolves the displayed route label for a trip — handles both office-based and custom-location trips */
function routeLabel(trip: Trip): { from: string; to: string } {
  return {
    from: trip.fromOffice?.name || trip.pickupAddress || '—',
    to: trip.toOffice?.name || trip.dropoffAddress || '—',
  };
}

export const TripsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTripToAssign, setSelectedTripToAssign] = useState<Trip | null>(null);
  const { setActiveTab, setActiveConversationId } = useStore();

  const filterParam = statusFilter !== 'ALL' ? statusFilter : undefined;
  const { data: trips = [], isLoading: loading } = useTrips(filterParam);
  const invalidate = useInvalidate();

  const refetch = () => {
    invalidate(QK.trips(filterParam));
    invalidate(QK.trips('PENDING')); // keep Dashboard in sync
    invalidate(QK.stats);
  };

  const handleStartTrip = async (tripId: string) => {
    await api.startTrip(tripId);
    refetch();
  };

  const handleCompleteTrip = async (tripId: string, currentOdo: number = 34200) => {
    const endOdo = prompt('Enter final odometer reading (km):', String(currentOdo + 40));
    if (endOdo) {
      await api.completeTrip(tripId, parseFloat(endOdo));
      refetch();
    }
  };

  const handleRejectTrip = async (tripId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      await api.rejectTrip(tripId, reason);
      refetch();
    }
  };


  const statusColors: Record<TripStatus, string> = {
    PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    APPROVED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    IN_PROGRESS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    COMPLETED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    CANCELLED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
            Trip Requests &amp; Fleet Dispatch
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Review employee transit bookings, dispatch vehicles, and track journey completion.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          {['ALL', 'PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Trips List */}
      <div className="space-y-4">
        {loading ? (
          <div className="glass-card p-12 text-center text-slate-400 rounded-2xl">Loading trips…</div>
        ) : trips.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-400 rounded-2xl">
            No trips found matching filter.
          </div>
        ) : (
          trips.map((trip) => {
            const route = routeLabel(trip);
            const isCustomLocation = !trip.fromOfficeId;
            return (
              <div
                key={trip.id}
                className="glass-card p-6 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 font-bold">
                      <Car className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base">{trip.requester?.name}</h4>
                        <span className="text-xs text-slate-400">
                          ({trip.requester?.department || 'Staff'})
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Booking ID: <span className="font-mono">{trip.id.slice(-8)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isCustomLocation && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <MapPin className="w-3 h-3 text-cyan-400" /> Custom Location
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        statusColors[trip.status]
                      }`}
                    >
                      {trip.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-medium">
                      {trip.tripType.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Route */}
                  <div className="space-y-1">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      {isCustomLocation ? 'Custom Route' : 'Office Route'}
                    </span>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-slate-200 font-medium">{route.from}</p>
                        <p className="text-slate-500 text-[11px]">→ {route.to}</p>
                      </div>
                    </div>
                    <p className="text-slate-500 italic mt-1">"{trip.purpose}"</p>
                  </div>

                  {/* Schedule */}
                  <div className="space-y-1">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      Scheduled Departure
                    </span>
                    <div className="flex items-center gap-2 text-indigo-300 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(trip.departureAt).toLocaleString()}</span>
                    </div>
                    {trip.returnAt && (
                      <p className="text-slate-500">
                        Return: {new Date(trip.returnAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Assigned Assets */}
                  <div className="space-y-1">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      Assigned Assets
                    </span>
                    {trip.vehicle && trip.driver ? (
                      <div className="space-y-0.5">
                        <p className="text-white font-medium flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {trip.vehicle.make} {trip.vehicle.model} ({trip.vehicle.registrationNo})
                        </p>
                        <p className="text-slate-300 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {trip.driver.user?.name || 'Driver'}{' '}
                          <span className="text-slate-500">
                            ({trip.driver.user?.phone || 'No phone'})
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-amber-400 italic">Pending Asset Assignment</p>
                    )}
                  </div>
                </div>

                {/* Passengers */}
                {trip.passengers && trip.passengers.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Accompanying Colleagues ({trip.passengers.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {trip.passengers.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50"
                        >
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-[11px] font-bold">
                            {p.name[0]}
                          </div>
                          <div>
                            <p className="text-xs text-white font-semibold leading-none">{p.name}</p>
                            {(p.employeeId || p.department) && (
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {p.employeeId}{p.employeeId && p.department ? ' · ' : ''}{p.department}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/60">
                  {trip.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleRejectTrip(trip.id)}
                        className="px-3.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition"
                      >
                        Reject Request
                      </button>
                      <button
                        onClick={() => setSelectedTripToAssign(trip)}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition"
                      >
                        Approve &amp; Assign Vehicle
                      </button>
                    </>
                  )}

                  {trip.status === 'APPROVED' && (
                    <button
                      onClick={() => handleStartTrip(trip.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Start Journey</span>
                    </button>
                  )}

                  {trip.status === 'IN_PROGRESS' && (
                    <>
                      <button
                        onClick={() => setActiveTab('tracking')}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-xs font-semibold transition"
                      >
                        View Live on Map →
                      </button>
                      <button
                        onClick={() => handleCompleteTrip(trip.id, trip.vehicle?.odometer)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Complete Journey</span>
                      </button>
                    </>
                  )}

                  {trip.status === 'COMPLETED' && trip.distanceCovered !== undefined && (
                    <div className="text-xs text-purple-300 font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-400" />
                      <span>Completed · {trip.distanceCovered} km covered</span>
                    </div>
                  )}

                  {trip.status !== 'PENDING' && (
                    <button
                      onClick={() => {
                        if (trip.conversation?.id) setActiveConversationId(trip.conversation.id);
                        setActiveTab('chat');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-semibold transition ml-auto"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Dispatch Chat</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedTripToAssign && (
        <AssignTripModal
          trip={selectedTripToAssign}
          onClose={() => setSelectedTripToAssign(null)}
          onSuccess={() => {
            setSelectedTripToAssign(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};
