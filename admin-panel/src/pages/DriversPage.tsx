import React, { useState } from 'react';
import { Driver, DriverStatus } from '../types';
import { api } from '../lib/api';
import { useDrivers, useInvalidate, QK } from '../hooks/useVmsQueries';
import { Users, Phone, Shield, Calendar, CheckCircle2, Clock, Plus, X, KeyRound, AlertCircle, Copy, Check, Trash2 } from 'lucide-react';

export const DriversPage: React.FC = () => {
  const [filter, setFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filterParam = filter !== 'ALL' ? `?status=${filter}` : '';
  const { data: drivers = [] } = useDrivers(filterParam);
  const invalidate = useInvalidate();

  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteDriver = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await api.deleteUser(deleteTarget.userId);
      if (res.success) {
        setDeleteTarget(null);
        invalidate(QK.drivers(filterParam));
        invalidate(QK.stats);
      } else {
        setDeleteError(res.message || 'Failed to delete driver');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Error occurred');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Add Driver form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    licenseNumber: '',
    licenseExpiry: '',
    phone: '',
    password: 'password123',
  });

  const handleStatusChange = async (id: string, status: DriverStatus) => {
    await api.updateDriverStatus(id, status);
    invalidate(QK.drivers(filterParam));
    invalidate(QK.stats);
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setErrorMsg('Name and Email are required.');
      return;
    }

    setCreating(true);
    setErrorMsg('');
    try {
      const res = await api.createUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        employeeId: formData.employeeId.trim() || undefined,
        licenseNumber: formData.licenseNumber.trim() || undefined,
        licenseExpiry: formData.licenseExpiry || undefined,
        phone: formData.phone.trim() || undefined,
        password: formData.password || 'password123',
        role: 'DRIVER',
        department: 'Fleet / Logistics',
      });

      if (res.success) {
        setSuccessMsg(`Driver ${formData.name} created! (ID: ${res.data?.employeeId})`);
        setFormData({
          name: '',
          email: '',
          employeeId: '',
          licenseNumber: '',
          licenseExpiry: '',
          phone: '',
          password: 'password123',
        });
        invalidate(QK.drivers(filterParam));
        invalidate(QK.stats);
        setTimeout(() => {
          setShowAddModal(false);
          setSuccessMsg('');
        }, 1800);
      } else {
        setErrorMsg(res.message || 'Failed to create driver');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred creating driver');
    } finally {
      setCreating(false);
    }
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
            Driver Personnel &amp; Duty Status
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Maintain driver credentials, duty readiness, login credentials, and vehicle assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

          {/* Add Driver Button */}
          <button
            onClick={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Driver</span>
          </button>
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
                  {(d.user?.name || 'D').charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-white text-base">{d.user?.name || 'Driver'}</h3>
                    {d.user?.employeeId && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold border border-indigo-500/30">
                        {d.user.employeeId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{d.user?.email}</p>
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
                <span className="text-slate-400">Driver Login ID:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-cyan-300 font-bold">
                    {d.user.employeeId || '—'}
                  </span>
                  {d.user.employeeId && (
                    <button
                      onClick={() => handleCopy(d.id, d.user.employeeId!)}
                      title="Copy Driver Login ID"
                      className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition"
                    >
                      {copiedId === d.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
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

            {/* Change Status + Delete Actions */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400 font-semibold shrink-0">Status:</span>
              <select
                value={d.status}
                onChange={(e) => handleStatusChange(d.id, e.target.value as DriverStatus)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
              >
                <option value="AVAILABLE">Available</option>
                <option value="ON_TRIP">On Trip</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <button
                onClick={() => { setDeleteError(''); setDeleteTarget(d); }}
                title="Delete driver"
                className="p-1.5 rounded-lg bg-rose-900/20 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border border-rose-800/30 transition shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Driver Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-900/40 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Delete Driver</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Are you sure you want to permanently delete driver{' '}
                  <span className="text-white font-semibold">{deleteTarget.user?.name || 'this driver'}</span>?
                  All their records will be removed. This cannot be undone.
                </p>
              </div>
            </div>

            {/* Driver details */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Driver Login ID</span>
                <span className="font-mono text-cyan-300 font-bold">{deleteTarget.user?.employeeId || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email</span>
                <span className="text-slate-200">{deleteTarget.user?.email || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">License No</span>
                <span className="font-mono text-slate-200">{deleteTarget.licenseNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Trips</span>
                <span className="text-slate-200">{deleteTarget._count?.assignedTrips || 0}</span>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDriver}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-4 h-4" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deleteLoading ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-white">Add New Fleet Driver</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Creates driver profile and mobile app credentials
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateDriver} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kamal Uddin"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="kamal@vms.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Driver ID (Leave blank to auto-generate)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DRV-204"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+880 1711-xxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Driving License No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DL-8849201"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    License Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mobile Login Password
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0">Default: password123</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20"
                >
                  {creating ? 'Creating Driver…' : 'Create Driver Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
