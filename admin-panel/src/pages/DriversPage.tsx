import React, { useState, useEffect } from 'react';
import { Driver, DriverStatus } from '../types';
import { api } from '../lib/api';
import { Users, Phone, Shield, Calendar, CheckCircle2, Clock } from 'lucide-react';

export const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filter, setFilter] = useState('ALL');

  const loadDrivers = async () => {
    const query = filter !== 'ALL' ? `?status=${filter}` : '';
    const res = await api.getDrivers(query);
    if (res.data) setDrivers(res.data);
  };

  useEffect(() => {
    loadDrivers();
  }, [filter]);

  const handleStatusChange = async (id: string, status: DriverStatus) => {
    await api.updateDriverStatus(id, status);
    loadDrivers();
  };

  const statusColors: Record<DriverStatus, string> = {
    AVAILABLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    ON_TRIP: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ON_LEAVE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    INACTIVE: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
            Driver Personnel & Duty Status
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Maintain driver credentials, duty readiness, leave approvals, and trip histories.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {['ALL', 'AVAILABLE', 'ON_TRIP', 'ON_LEAVE'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Driver Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((d) => (
          <div
            key={d.id}
            className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-white text-base shadow-md">
                  {d.user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base">{d.user.name}</h3>
                  <p className="text-xs text-slate-400">{d.user.email}</p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  statusColors[d.status]
                }`}
              >
                {d.status.replace('_', ' ')}
              </span>
            </div>

            {/* Details */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">License No:</span>
                <span className="font-mono text-slate-200 font-semibold">{d.licenseNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Expiry Date:</span>
                <span className="text-slate-300">
                  {new Date(d.licenseExpiry).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Contact:</span>
                <span className="text-indigo-400 flex items-center gap-1 font-medium">
                  <Phone className="w-3 h-3" />
                  {d.user.phone || '+880 1711-000000'}
                </span>
              </div>
            </div>

            {/* Change Status Action */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Change Status:</span>
              <select
                value={d.status}
                onChange={(e) => handleStatusChange(d.id, e.target.value as DriverStatus)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
              >
                <option value="AVAILABLE">Available</option>
                <option value="ON_TRIP">On Trip</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
