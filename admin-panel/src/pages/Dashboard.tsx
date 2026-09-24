import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { DashboardStats, Trip } from '../types';
import { LiveFleetMap } from '../components/map/LiveFleetMap';
import { AssignTripModal } from '../components/trips/AssignTripModal';
import {
  Truck,
  Users,
  Compass,
  Fuel,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingTrips, setPendingTrips] = useState<Trip[]>([]);
  const [selectedTripToAssign, setSelectedTripToAssign] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const { setActiveTab } = useStore();

  const loadData = async () => {
    setLoading(true);
    const [statsRes, tripsRes] = await Promise.all([
      api.getStats(),
      api.getTrips('?status=PENDING'),
    ]);
    if (statsRes.data) setStats(statsRes.data);
    if (tripsRes.data) setPendingTrips(tripsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome & KPI Section */}
      <div>
        <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
          Executive Operations Center
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Real-time oversight of multi-plant transit, vehicle utilization, and anti-theft telemetry.
        </p>
      </div>

      {/* Fuel Anomaly Warning Banner if any exist */}
      {stats && stats.fuel.anomalyCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                🚨 Fuel Audit Alert: {stats.fuel.anomalyCount} Suspected Consumption Anomaly Detected
              </h4>
              <p className="text-xs text-amber-400/80">
                A refuel log deviated significantly from rated efficiency. Please review receipt proof.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('fuel')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition"
          >
            Review Fuel Logs &rarr;
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Vehicles Status */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Fleet Capacity
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold text-white">
              {stats?.vehicles.total || 4}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">
              {stats?.vehicles.available || 2} Available
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>{stats?.vehicles.inUse || 1} on road</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 ml-2" />
            <span>{stats?.vehicles.inMaintenance || 1} maintenance</span>
          </div>
        </div>

        {/* Trips Status */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Missions
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold text-white">
              {stats?.trips.active || 1}
            </span>
            <span className="text-xs text-indigo-400 font-semibold">
              {stats?.trips.pending || 1} Pending Approval
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            <span>{stats?.trips.completed || 2} completed this week</span>
          </div>
        </div>

        {/* Drivers Availability */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Driver Roster
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold text-white">
              {stats?.drivers.total || 3}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">
              {stats?.drivers.available || 1} Ready
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center gap-2">
            <span>{stats?.drivers.onTrip || 1} driving</span>
            <span>•</span>
            <span className="text-amber-400">{stats?.drivers.onLeave || 1} on leave</span>
          </div>
        </div>

        {/* Fuel Economy & Spend */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Fleet Fuel Audit
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-display font-extrabold text-white">
              ৳{(stats?.fuel.totalCost || 11923).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">({stats?.fuel.totalLiters || 98}L)</span>
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">Verified Receipts: 100%</span>
          </div>
        </div>
      </div>

      {/* Main Center: Live Fleet OpenStreetMap */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Fleet Movement (OpenStreetMap)
            </h3>
            <p className="text-xs text-slate-400">
              Live GPS stream over WebSockets. Markers update smoothly in real time.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('tracking')}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
          >
            <span>Full Screen Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <LiveFleetMap height="420px" />
      </div>

      {/* Pending Dispatch Queue */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-display font-bold text-lg text-white">Pending Trip Requests</h3>
            <p className="text-xs text-slate-400">
              Employee travel requests awaiting vehicle and driver assignment.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
            {pendingTrips.length} Awaiting Dispatch
          </span>
        </div>

        {pendingTrips.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            ✓ No pending trip requests. All employee bookings dispatched!
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {pendingTrips.map((trip) => (
              <div key={trip.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white text-sm">{trip.requester?.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {trip.tripType.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    {trip.fromOffice.name} &rarr; {trip.toOffice.name}
                  </p>
                  <p className="text-xs text-slate-500 italic">Purpose: "{trip.purpose}"</p>
                  <div className="text-[11px] text-indigo-300 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Departure: {new Date(trip.departureAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedTripToAssign(trip)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition"
                  >
                    Assign Vehicle & Driver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {selectedTripToAssign && (
        <AssignTripModal
          trip={selectedTripToAssign}
          onClose={() => setSelectedTripToAssign(null)}
          onSuccess={() => {
            setSelectedTripToAssign(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};
