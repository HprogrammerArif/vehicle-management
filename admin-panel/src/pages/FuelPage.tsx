import React, { useState, useEffect } from 'react';
import { FuelLog } from '../types';
import { api } from '../lib/api';
import { Fuel, AlertTriangle, ShieldCheck, Plus, Image, Eye, DollarSign } from 'lucide-react';

export const FuelPage: React.FC = () => {
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [filterAnomaly, setFilterAnomaly] = useState<boolean | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // New fuel log form state
  const [form, setForm] = useState({
    vehicleId: '',
    odometerReading: '34250',
    fuelAdded: '35',
    pricePerLiter: '110',
    stationName: 'Jamuna Oil Co.',
    receiptPhoto: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
    notes: '',
  });

  const [vehicles, setVehicles] = useState<any[]>([]);

  const loadData = async () => {
    let query = '';
    if (filterAnomaly !== null) query = `?isAnomaly=${filterAnomaly}`;
    const [fuelRes, vehRes] = await Promise.all([api.getFuelLogs(query), api.getVehicles()]);
    if (fuelRes.data) setLogs(fuelRes.data);
    if (vehRes.data && vehRes.data.length > 0) {
      setVehicles(vehRes.data);
      setForm((prev) => ({ ...prev, vehicleId: vehRes.data[0].id }));
    }
  };

  useEffect(() => {
    loadData();
  }, [filterAnomaly]);

  const handleSubmitFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.logFuel(form);
    if (res.success) {
      setShowSubmitModal(false);
      loadData();
    } else {
      alert(res.message || 'Error logging fuel');
    }
  };

  const totalSpend = logs.reduce((sum, l) => sum + l.totalCost, 0);
  const totalLiters = logs.reduce((sum, l) => sum + l.fuelAdded, 0);
  const anomalyCount = logs.filter((l) => l.isAnomaly).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white tracking-tight flex items-center gap-3">
            <Fuel className="w-6 h-6 text-rose-400" />
            <span>Fuel Audit & Anti-Theft Management</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Automated consumption audit, station receipt verification, and siphon anomaly detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setFilterAnomaly(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterAnomaly === null ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Logs ({logs.length})
            </button>
            <button
              onClick={() => setFilterAnomaly(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                filterAnomaly === true ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Anomalies Only ({anomalyCount})</span>
            </button>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Fuel Receipt</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase">Total Fuel Expenditure</span>
          <p className="text-2xl font-display font-extrabold text-white mt-2">
            ৳{Math.round(totalSpend).toLocaleString()}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Calculated across all fleet trips</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase">Total Fuel Volume</span>
          <p className="text-2xl font-display font-extrabold text-cyan-400 mt-2">
            {Math.round(totalLiters * 10) / 10} Liters
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Odometer verified delta</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase">Anti-Theft Anomalies</span>
          <p className="text-2xl font-display font-extrabold text-rose-400 mt-2">
            {anomalyCount} Flagged
          </p>
          <span className="text-xs text-rose-300/80 mt-1 block">
            {anomalyCount > 0 ? 'Requires manager review' : 'All logs within normal tolerance'}
          </span>
        </div>
      </div>

      {/* Fuel Logs Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Vehicle & Driver</th>
                <th className="px-6 py-4">Odometer Reading</th>
                <th className="px-6 py-4">Fuel & Price</th>
                <th className="px-6 py-4">Total Cost</th>
                <th className="px-6 py-4">Calculated Rate</th>
                <th className="px-6 py-4">Receipt Proof</th>
                <th className="px-6 py-4">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-4 space-y-0.5">
                    <span className="font-bold text-white text-sm block">
                      {log.vehicle.make} {log.vehicle.model}
                    </span>
                    <span className="text-indigo-400 font-mono text-[11px] block">
                      {log.vehicle.registrationNo}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Driver: {log.driver?.user?.name || 'Assigned Driver'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-slate-300 font-mono font-medium">
                    {Math.round(log.odometerReading).toLocaleString()} km
                  </td>

                  <td className="px-6 py-4 space-y-0.5">
                    <span className="text-white font-semibold">{log.fuelAdded} L</span>
                    <span className="text-slate-400 block text-[11px]">
                      @ ৳{log.pricePerLiter}/L
                    </span>
                    <span className="text-slate-500 block text-[10px]">{log.stationName}</span>
                  </td>

                  <td className="px-6 py-4 font-bold text-white text-sm">
                    ৳{Math.round(log.totalCost).toLocaleString()}
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-200">
                      {log.consumptionRate ? `${log.consumptionRate} km/L` : 'Baseline'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Rated: {log.vehicle.fuelEfficiency} km/L
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedReceipt(log.receiptPhoto)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/20 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Receipt</span>
                    </button>
                  </td>

                  <td className="px-6 py-4">
                    {log.isAnomaly ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold text-[11px]">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Anomaly Flag</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[11px]">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified Normal</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Station Fuel Receipt Proof</h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="rounded-xl overflow-hidden max-h-[480px]">
              <img
                src={selectedReceipt}
                alt="Fuel receipt"
                className="w-full h-full object-contain bg-black"
              />
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              Timestamp and pump meter verified against system odometer.
            </p>
          </div>
        </div>
      )}

      {/* Submit Fuel Receipt Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-white text-lg">Log Fuel & Upload Receipt</h3>
            <form onSubmit={handleSubmitFuel} className="space-y-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Current Odometer (km)</label>
                  <input
                    type="number"
                    value={form.odometerReading}
                    onChange={(e) => setForm({ ...form, odometerReading: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Fuel Added (Liters)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.fuelAdded}
                    onChange={(e) => setForm({ ...form, fuelAdded: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Price per Liter (৳)</label>
                  <input
                    type="number"
                    value={form.pricePerLiter}
                    onChange={(e) => setForm({ ...form, pricePerLiter: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Station Name</label>
                  <input
                    value={form.stationName}
                    onChange={(e) => setForm({ ...form, stationName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Receipt Photo Image URL</label>
                <input
                  value={form.receiptPhoto}
                  onChange={(e) => setForm({ ...form, receiptPhoto: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold text-white"
                >
                  Log & Run Anti-Theft Check
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
