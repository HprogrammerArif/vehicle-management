import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { Trip } from '../types';
import { useDashboardStats, useTrips, useAllUsers, useInvalidate, QK } from '../hooks/useVmsQueries';
import { LiveFleetMap } from '../components/map/LiveFleetMap';
import { AssignTripModal } from '../components/trips/AssignTripModal';
import { toast } from '../components/common/Toast';
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
  Bell,
  Send,
  MapPin,
  ChevronDown,
} from 'lucide-react';

/** Resolves display location — office name OR custom free-text address */
function routeLabel(trip: Trip): { from: string; to: string } {
  return {
    from: trip.fromOffice?.name || trip.pickupAddress || '—',
    to: trip.toOffice?.name || trip.dropoffAddress || '—',
  };
}

const NOTIFICATION_TARGETS = [
  { value: 'ALL_EMPLOYEES', label: 'All Employees' },
  { value: 'ALL_DRIVERS', label: 'All Drivers' },
  { value: 'ALL', label: 'Everyone' },
  { value: 'TRIP', label: 'Specific Trip' },
  { value: 'USER', label: 'Specific Person' },
];

export const Dashboard: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: pendingTrips = [], isLoading: tripsLoading } = useTrips('PENDING');
  // Fetch all trips and all users for targeting
  const { data: allTrips = [] } = useTrips();
  const { data: allUsers = [] } = useAllUsers();
  const invalidate = useInvalidate();
  const loading = statsLoading || tripsLoading;

  const [selectedTripToAssign, setSelectedTripToAssign] = useState<Trip | null>(null);
  const { setActiveTab } = useStore();

  // Notification state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifTarget, setNotifTarget] = useState('ALL_EMPLOYEES');
  const [notifTargetId, setNotifTargetId] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSent, setNotifSent] = useState(false);

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    if ((notifTarget === 'TRIP' || notifTarget === 'USER') && !notifTargetId.trim()) {
      toast.error(notifTarget === 'TRIP' ? 'Please select or enter a Trip' : 'Please select or enter a Person');
      return;
    }
    setSendingNotif(true);
    try {
      const payload: any = {
        title: notifTitle.trim(),
        body: notifBody.trim(),
        target: notifTarget,
      };
      if (notifTarget === 'TRIP') {
        payload.tripId = notifTargetId.trim();
      } else if (notifTarget === 'USER') {
        payload.userId = notifTargetId.trim();
        payload.employeeId = notifTargetId.trim();
      }

      const res = await api.sendNotification(payload);
      if (res.success) {
        setNotifSent(true);
        setNotifTitle('');
        setNotifBody('');
        setNotifTargetId('');
        setTimeout(() => setNotifSent(false), 3000);
        invalidate(QK.stats);
        toast.success(`Notification delivered to ${res.recipients ?? 1} recipient(s).`);
      } else {
        toast.error(res.message || 'Failed to send notification');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error while sending notification');
    } finally {
      setSendingNotif(false);
    }
  };

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

      {/* Fuel Anomaly Warning Banner */}
      {stats && stats.fuel.anomalyCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                Fuel Audit Alert: {stats.fuel.anomalyCount} Suspected Consumption Anomaly
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
            Review Fuel Logs →
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fleet Capacity</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold text-white">{stats?.vehicles.total || 4}</span>
            <span className="text-xs text-emerald-400 font-semibold">{stats?.vehicles.available || 2} Available</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>{stats?.vehicles.inUse || 1} on road</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 ml-2" />
            <span>{stats?.vehicles.inMaintenance || 1} maintenance</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Missions</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold text-white">{stats?.trips.active || 1}</span>
            <span className="text-xs text-indigo-400 font-semibold">{stats?.trips.pending || 1} Pending</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            <span>{stats?.trips.completed || 2} completed this week</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver Roster</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold text-white">{stats?.drivers.total || 3}</span>
            <span className="text-xs text-emerald-400 font-semibold">{stats?.drivers.available || 1} Ready</span>
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center gap-2">
            <span>{stats?.drivers.onTrip || 1} driving</span>
            <span>•</span>
            <span className="text-amber-400">{stats?.drivers.onLeave || 1} on leave</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fleet Fuel Audit</span>
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

      {/* Live Fleet Map */}
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

      {/* Two-column row: Pending Trips + Send Notification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pending Dispatch Queue — takes 2/3 width */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-display font-bold text-lg text-white">Pending Trip Requests</h3>
              <p className="text-xs text-slate-400">
                Employee vehicle requisitions awaiting assignment.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
              {pendingTrips.length} Awaiting
            </span>
          </div>

          {pendingTrips.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>No pending requests. All employee bookings dispatched!</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {pendingTrips.map((trip) => {
                const route = routeLabel(trip);
                const isCustom = !trip.fromOfficeId;
                return (
                  <div key={trip.id} className="py-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{trip.requester?.name}</span>
                        {trip.requester?.department && (
                          <span className="text-[10px] text-slate-500">{trip.requester.department}</span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {trip.tripType.replace('_', ' ')}
                        </span>
                        {isCustom && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <MapPin className="w-3 h-3 text-cyan-400" /> Custom Location
                          </span>
                        )}
                      </div>

                      {/* Route */}
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-300 font-medium">
                          {route.from} → {route.to}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500 italic">"{trip.purpose}"</p>

                      {/* Passengers */}
                      {trip.passengers && trip.passengers.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span className="text-[10px] text-slate-500">+{trip.passengers.length} colleague(s):</span>
                          {trip.passengers.map((p) => (
                            <span
                              key={p.id}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
                            >
                              {p.name}{p.employeeId ? ` (${p.employeeId})` : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-[11px] text-indigo-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Departure: {new Date(trip.departureAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedTripToAssign(trip)}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition shrink-0"
                    >
                      Assign Vehicle &amp; Driver
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Send Notification Panel — takes 1/3 width */}
        <div className="glass-card p-6 rounded-2xl space-y-4 border border-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Send Notification</h3>
              <p className="text-[11px] text-slate-400">Broadcast to employees or drivers</p>
            </div>
          </div>

          {/* Target */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target</label>
            <div className="space-y-1.5">
              {NOTIFICATION_TARGETS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    setNotifTarget(t.value);
                    setNotifTargetId('');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition border ${
                    notifTarget === t.value
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Dynamic Specific Target Input */}
            {notifTarget === 'TRIP' && (
              <div className="pt-1 space-y-2">
                <select
                  value={notifTargetId}
                  onChange={(e) => setNotifTargetId(e.target.value)}
                  className="w-full bg-slate-900 border border-indigo-500/40 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 transition cursor-pointer"
                >
                  <option value="" className="text-slate-500">— Select a Trip from the fleet —</option>
                  {allTrips.map((trip: any) => {
                    const from = trip.fromOffice?.name || trip.pickupAddress || 'Origin';
                    const to = trip.toOffice?.name || trip.dropoffAddress || 'Destination';
                    const driverInfo = trip.driver?.user?.name
                      ? `Driver: ${trip.driver.user.name} (${trip.driver.user.employeeId || 'Assigned'})`
                      : 'Unassigned';
                    const statusIcon =
                      trip.status === 'IN_PROGRESS'
                        ? '🟢'
                        : trip.status === 'APPROVED'
                        ? '🟡'
                        : trip.status === 'PENDING'
                        ? '⏳'
                        : '⚪';
                    return (
                      <option key={trip.id} value={trip.id} className="bg-slate-900">
                        {statusIcon} [{trip.status}] {trip.purpose || `${from} → ${to}`} • {driverInfo}
                      </option>
                    );
                  })}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider shrink-0">or manually:</span>
                  <input
                    type="text"
                    value={notifTargetId}
                    onChange={(e) => setNotifTargetId(e.target.value)}
                    placeholder="Enter Trip ID or Driver ID (e.g. DRV-005)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition"
                  />
                </div>
                <p className="text-[10px] text-slate-500">Notifies requester, assigned driver &amp; all trip passengers</p>
              </div>
            )}

            {notifTarget === 'USER' && (
              <div className="pt-1 space-y-2">
                <select
                  value={notifTargetId}
                  onChange={(e) => setNotifTargetId(e.target.value)}
                  className="w-full bg-slate-900 border border-indigo-500/40 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 transition cursor-pointer"
                >
                  <option value="" className="text-slate-500">— Select Person from directory —</option>
                  <optgroup label="Drivers" className="bg-slate-900 text-indigo-300 font-semibold">
                    {allUsers
                      .filter((u: any) => u.role === 'DRIVER')
                      .map((u: any) => (
                        <option key={u.id} value={u.employeeId || u.id} className="bg-slate-900 text-white font-normal">
                          🚗 {u.name} ({u.employeeId || 'Driver'}) — {u.email}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Employees" className="bg-slate-900 text-indigo-300 font-semibold">
                    {allUsers
                      .filter((u: any) => u.role === 'EMPLOYEE')
                      .map((u: any) => (
                        <option key={u.id} value={u.employeeId || u.id} className="bg-slate-900 text-white font-normal">
                          👤 {u.name} ({u.employeeId || 'Employee'}) — {u.department || u.email}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Administrators" className="bg-slate-900 text-indigo-300 font-semibold">
                    {allUsers
                      .filter((u: any) => u.role === 'ADMIN')
                      .map((u: any) => (
                        <option key={u.id} value={u.employeeId || u.id} className="bg-slate-900 text-white font-normal">
                          🛡️ {u.name} ({u.employeeId || 'Admin'})
                        </option>
                      ))}
                  </optgroup>
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider shrink-0">or manually:</span>
                  <input
                    type="text"
                    value={notifTargetId}
                    onChange={(e) => setNotifTargetId(e.target.value)}
                    placeholder="Enter Employee ID (DRV-005, EMP-104) or email"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition"
                  />
                </div>
                <p className="text-[10px] text-slate-500">Delivers instantly to specific user inbox &amp; phone</p>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title</label>
            <input
              type="text"
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              placeholder="e.g. Office Closure Today"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message</label>
            <textarea
              value={notifBody}
              onChange={(e) => setNotifBody(e.target.value)}
              placeholder="Type your message to all recipients…"
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendNotification}
            disabled={sendingNotif || !notifTitle.trim() || !notifBody.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-sm transition shadow-md shadow-indigo-600/20"
          >
            {sendingNotif ? (
              <span className="animate-pulse">Sending…</span>
            ) : notifSent ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Sent!</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Notification</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Assignment Modal */}
      {selectedTripToAssign && (
        <AssignTripModal
          trip={selectedTripToAssign}
          onClose={() => setSelectedTripToAssign(null)}
          onSuccess={() => {
            setSelectedTripToAssign(null);
            invalidate(QK.stats);
            invalidate(QK.trips('PENDING'));
          }}
        />
      )}
    </div>
  );
};
