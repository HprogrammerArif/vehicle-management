import React, { useState, useEffect } from 'react';
import { Trip, FuelLog } from '../types';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { Truck, Play, CheckCircle2, Fuel, Radio, MapPin, Clock, Calendar } from 'lucide-react';

export const DriverPortal: React.FC = () => {
  const { user, setActiveTab, setIsSimulating } = useStore();
  const [assignedTrips, setAssignedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);

  const loadTrips = async () => {
    setLoading(true);
    // Fetch trips assigned to driver or all in progress
    const res = await api.getTrips();
    if (res.data) {
      // Find trips assigned to this driver or in progress
      setAssignedTrips(res.data.filter((t: Trip) => t.status === 'IN_PROGRESS' || t.status === 'APPROVED'));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const handleStartTrip = async (tripId: string) => {
    await api.startTrip(tripId);
    loadTrips();
  };

  const handleStartGPSStream = async (tripId: string) => {
    setStreaming(true);
    setIsSimulating(true);
    await api.simulateTrip(tripId);
    setActiveTab('tracking');
  };

  const handleCompleteTrip = async (tripId: string, vehicleOdo: number = 34200) => {
    const endOdo = prompt('Enter final odometer reading (km):', String(vehicleOdo + 35));
    if (endOdo) {
      await api.completeTrip(tripId, parseFloat(endOdo));
      loadTrips();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Driver Header */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xl">
            🚗
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-white">Driver Dispatch Console</h2>
            <p className="text-xs text-slate-400">
              Welcome, {user?.name || 'Abdul Karim'} • License: BRTA-DHK-2019-44552
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          ● Ready on Duty
        </span>
      </div>

      {/* Active Missions */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-white">My Assigned Missions</h3>

        {assignedTrips.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-400 rounded-3xl">
            No active trips currently assigned. Check back when dispatch approves requests.
          </div>
        ) : (
          assignedTrips.map((trip) => (
            <div
              key={trip.id}
              className="glass-card p-6 rounded-3xl border border-slate-800 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    {trip.tripType.replace('_', ' ')}
                  </span>
                  <h4 className="font-bold text-white text-base mt-1">
                    {trip.fromOffice.name} &rarr; {trip.toOffice.name}
                  </h4>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    trip.status === 'IN_PROGRESS'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}
                >
                  {trip.status.replace('_', ' ')}
                </span>
              </div>

              {/* Trip Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Passenger / Lead:</span>
                  <span className="font-bold text-white text-sm">{trip.requester?.name}</span>
                  <span className="text-slate-400 block text-[11px]">{trip.requester?.phone || '+880 1812-222333'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Assigned Vehicle:</span>
                  <span className="font-bold text-white text-sm">
                    {trip.vehicle?.make} {trip.vehicle?.model}
                  </span>
                  <span className="font-mono text-indigo-400 block text-[11px]">
                    Plate: {trip.vehicle?.registrationNo}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3">
                {trip.status === 'APPROVED' && (
                  <button
                    onClick={() => handleStartTrip(trip.id)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Start Journey</span>
                  </button>
                )}

                {trip.status === 'IN_PROGRESS' && (
                  <>
                    <button
                      onClick={() => handleStartGPSStream(trip.id)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition"
                    >
                      <Radio className="w-4 h-4 animate-pulse" />
                      <span>Stream Live GPS Location</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('fuel')}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-bold text-xs transition"
                    >
                      <Fuel className="w-4 h-4" />
                      <span>Log Fuel Refuel</span>
                    </button>

                    <button
                      onClick={() => handleCompleteTrip(trip.id, trip.vehicle?.odometer)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Journey</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
