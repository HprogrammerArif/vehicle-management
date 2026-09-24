import React, { useState, useEffect } from 'react';
import { Trip, TripStatus } from '../types';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { AssignTripModal } from '../components/trips/AssignTripModal';
import {
  CalendarCheck,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Play,
  CheckSquare,
  Search,
  Filter,
  MessageSquare,
} from 'lucide-react';

export const TripsPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTripToAssign, setSelectedTripToAssign] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const { setActiveTab, setActiveConversationId } = useStore();

  const loadTrips = async () => {
    setLoading(false);
    const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
    const res = await api.getTrips(query);
    if (res.data) setTrips(res.data);
  };

  useEffect(() => {
    loadTrips();
  }, [statusFilter]);

  const handleStartTrip = async (tripId: string) => {
    await api.startTrip(tripId);
    loadTrips();
  };

  const handleCompleteTrip = async (tripId: string, currentOdo: number = 34200) => {
    const endOdo = prompt('Enter final odometer reading (km):', String(currentOdo + 40));
    if (endOdo) {
      await api.completeTrip(tripId, parseFloat(endOdo));
      loadTrips();
    }
  };

  const handleRejectTrip = async (tripId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      await api.rejectTrip(tripId, reason);
      loadTrips();
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
            Trip Requests & Fleet Dispatch
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
        {trips.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-400 rounded-2xl">
            No trips found matching filter.
          </div>
        ) : (
          trips.map((trip) => (
            <div
              key={trip.id}
              className="glass-card p-6 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 font-bold">
                    🚗
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-base">{trip.requester?.name}</h4>
                      <span className="text-xs text-slate-400">({trip.requester?.department || 'Staff'})</span>
                    </div>
                    <p className="text-xs text-slate-400">Booking ID: {trip.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
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

              {/* Transit Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Route */}
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    Travel Corridor
                  </span>
                  <p className="text-slate-200 font-medium text-sm">
                    {trip.fromOffice.name} &rarr; {trip.toOffice.name}
                  </p>
                  <p className="text-slate-500 italic mt-0.5">"{trip.purpose}"</p>
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
                    <p className="text-slate-500">Return: {new Date(trip.returnAt).toLocaleString()}</p>
                  )}
                </div>

                {/* Assigned Assets */}
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    Assigned Assets
                  </span>
                  {trip.vehicle && trip.driver ? (
                    <div className="space-y-0.5">
                      <p className="text-white font-medium">
                        🚘 {trip.vehicle.make} {trip.vehicle.model} ({trip.vehicle.registrationNo})
                      </p>
                      <p className="text-slate-300">
                        👨‍✈️ Driver: {trip.driver.user.name} ({trip.driver.user.phone || 'Available'})
                      </p>
                    </div>
                  ) : (
                    <p className="text-amber-400 italic">Pending Asset Assignment</p>
                  )}
                </div>
              </div>

              {/* Passengers if any */}
              {trip.passengers && trip.passengers.length > 0 && (
                <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/40">
                  <span className="font-semibold text-slate-300">Co-passengers: </span>
                  {trip.passengers.map((p) => p.name).join(', ')}
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
                      Approve & Assign Vehicle
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
                      View Live on Map &rarr;
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
                    <span>Trip Completed • {trip.distanceCovered} km Covered</span>
                  </div>
                )}

                {/* Real-time Dispatch Chat for approved/active/completed trips */}
                {trip.status !== 'PENDING' && (
                  <button
                    onClick={() => {
                      if (trip.conversation?.id) {
                        setActiveConversationId(trip.conversation.id);
                      }
                      setActiveTab('chat');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-semibold transition ml-auto"
                    title="Open live dispatch channel for this trip"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Dispatch Chat</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTripToAssign && (
        <AssignTripModal
          trip={selectedTripToAssign}
          onClose={() => setSelectedTripToAssign(null)}
          onSuccess={() => {
            setSelectedTripToAssign(null);
            loadTrips();
          }}
        />
      )}
    </div>
  );
};
