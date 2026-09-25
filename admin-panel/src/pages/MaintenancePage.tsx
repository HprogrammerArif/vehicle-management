import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types';
import { api } from '../lib/api';
import { useMaintenanceLogs, useVehicles, useInvalidate, QK } from '../hooks/useVmsQueries';
import { Wrench, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export const MaintenancePage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    vehicleId: '',
    type: 'SCHEDULED',
    description: '',
    cost: '15000',
    scheduledAt: new Date().toISOString().split('T')[0],
  });

  const { data: logs = [] } = useMaintenanceLogs();
  const { data: vehicles = [] } = useVehicles();
  const invalidate = useInvalidate();

  // Set default vehicleId when vehicles load
  useEffect(() => {
    if (vehicles.length > 0 && !form.vehicleId) {
      setForm((prev) => ({ ...prev, vehicleId: vehicles[0].id }));
    }
  }, [vehicles]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.createMaintenance(form);
    if (res.success) {
      setShowModal(false);
      invalidate(QK.maintenance());
    }
  };

  const handleComplete = async (id: string) => {
    await api.completeMaintenance(id, { notes: 'Servicing completed & vehicle certified roadworthy.' });
    invalidate(QK.maintenance());
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white tracking-tight flex items-center gap-3">
            <Wrench className="w-6 h-6 text-amber-400" />
            <span>Vehicle Maintenance & Servicing</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Track routine services, parts replacements, emergency repairs, and garage downtime.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Maintenance</span>
        </button>
      </div>

      {/* Maintenance Cards */}
      <div className="space-y-4">
        {logs.map((log) => (
          <div
            key={log.id}
            className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white text-base">
                  {log.vehicle.make} {log.vehicle.model}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                  {log.vehicle.registrationNo}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    log.isCompleted
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {log.isCompleted ? 'COMPLETED' : 'IN WORKSHOP'}
                </span>
              </div>
              <p className="text-xs text-slate-300">{log.description}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                <span>Type: <strong>{log.type}</strong></span>
                {log.cost && <span>Cost: <strong>৳{log.cost.toLocaleString()}</strong></span>}
                {log.scheduledAt && (
                  <span>Scheduled: {new Date(log.scheduledAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            <div>
              {!log.isCompleted && (
                <button
                  onClick={() => handleComplete(log.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark Completed & Restore</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-white text-lg">Schedule Vehicle Maintenance</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Select Vehicle</label>
                <select
                  value={form.vehicleId}
                  onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.registrationNo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Maintenance Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                >
                  <option value="SCHEDULED">Scheduled Periodic Service</option>
                  <option value="BREAKDOWN">Breakdown / Emergency Repair</option>
                  <option value="TIRE_CHANGE">Tire Replacement & Alignment</option>
                  <option value="OIL_CHANGE">Engine Oil & Filter Change</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Description / Workshop Job Card</label>
                <textarea
                  required
                  placeholder="e.g. Brake booster replacement and radiator flush"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Estimated Cost (৳)</label>
                  <input
                    type="number"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Schedule Date</label>
                  <input
                    type="date"
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold text-white"
                >
                  Dispatch to Workshop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
