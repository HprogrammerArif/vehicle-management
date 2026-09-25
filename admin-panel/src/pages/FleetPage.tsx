import React, { useState } from 'react';
import { Vehicle, VehicleStatus } from '../types';
import { api } from '../lib/api';
import { useVehicles, useInvalidate, QK } from '../hooks/useVmsQueries';
import { Truck, Plus, Gauge, Fuel, Users, Wrench, CheckCircle } from 'lucide-react';

export const FleetPage: React.FC = () => {
  const [filter, setFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New vehicle form state
  const [form, setForm] = useState({
    registrationNo: '',
    make: 'Toyota',
    model: '',
    year: '2023',
    type: 'Sedan',
    capacity: '4',
    fuelType: 'PETROL',
    fuelEfficiency: '14.0',
    odometer: '10000',
  });

  const { data: vehicles = [], isLoading } = useVehicles(filter !== 'ALL' ? filter : undefined);
  const invalidate = useInvalidate();

  const refetch = () => invalidate(QK.vehicles(filter !== 'ALL' ? filter : undefined));

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.createVehicle(form);
    if (res.success) {
      setShowAddModal(false);
      refetch();
    } else {
      alert(res.message || 'Error creating vehicle');
    }
  };

  const handleUpdateStatus = async (id: string, status: VehicleStatus) => {
    await api.updateVehicle(id, { status });
    refetch();
  };

  const statusColors: Record<VehicleStatus, string> = {
    AVAILABLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    IN_USE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    IN_MAINTENANCE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    RETIRED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
            Enterprise Fleet Vehicles
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage organization automobiles, maintenance status, and rated fuel specifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status filters */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {['ALL', 'AVAILABLE', 'IN_USE', 'IN_MAINTENANCE'].map((s) => (
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

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Vehicle Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="glass-card rounded-2xl overflow-hidden border border-slate-800 flex flex-col justify-between"
          >
            <div>
              {/* Photo Header */}
              <div className="h-44 w-full bg-slate-800 relative overflow-hidden">
                <img
                  src={
                    v.photo ||
                    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'
                  }
                  alt={v.model}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <span
                  className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-md ${
                    statusColors[v.status]
                  }`}
                >
                  {v.status.replace('_', ' ')}
                </span>
                <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-slate-950/80 backdrop-blur-sm text-white font-mono text-xs font-bold border border-white/10">
                  {v.registrationNo}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    {v.make} {v.model}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Year: {v.year} • Type: {v.type}
                  </p>
                </div>

                {/* Specs Pill Grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <Users className="w-4 h-4 mx-auto text-indigo-400" />
                    <span className="block text-xs font-bold text-white mt-1">{v.capacity} Seats</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <Fuel className="w-4 h-4 mx-auto text-cyan-400" />
                    <span className="block text-xs font-bold text-white mt-1">{v.fuelEfficiency} km/L</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <Gauge className="w-4 h-4 mx-auto text-emerald-400" />
                    <span className="block text-xs font-bold text-white mt-1">
                      {Math.round(v.odometer).toLocaleString()} km
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
              {v.status === 'AVAILABLE' && (
                <button
                  onClick={() => handleUpdateStatus(v.id, 'IN_MAINTENANCE')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Send to Maintenance</span>
                </button>
              )}
              {v.status === 'IN_MAINTENANCE' && (
                <button
                  onClick={() => handleUpdateStatus(v.id, 'AVAILABLE')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark Maintenance Done</span>
                </button>
              )}
              {v.status === 'IN_USE' && (
                <span className="text-xs text-blue-400 italic">Currently on Mission</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-white text-lg">Add New Fleet Vehicle</h3>
            <form onSubmit={handleCreateVehicle} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">License Plate / Registration No</label>
                <input
                  required
                  placeholder="e.g. DHK-METRO-GA-9988"
                  value={form.registrationNo}
                  onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Make</label>
                  <input
                    required
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Model</label>
                  <input
                    required
                    placeholder="e.g. HiAce / Prado"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Capacity</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Fuel Type</label>
                  <select
                    value={form.fuelType}
                    onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  >
                    <option value="PETROL">Petrol</option>
                    <option value="DIESEL">Diesel</option>
                    <option value="OCTANE">Octane</option>
                    <option value="CNG">CNG</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Rated km/L</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.fuelEfficiency}
                    onChange={(e) => setForm({ ...form, fuelEfficiency: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold text-white"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
