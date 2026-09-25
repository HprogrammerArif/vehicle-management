import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Users,
  Search,
  Plus,
  X,
  Mail,
  Phone,
  Briefcase,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Shield,
  Calendar,
  Trash2,
} from 'lucide-react';

interface EmployeeItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  employeeId?: string | null;
  department?: string | null;
  createdAt: string;
  _count?: {
    tripRequests: number;
    sentMessages: number;
  };
}

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: 'Operations',
    phone: '',
    password: 'password123',
  });

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers('?role=EMPLOYEE');
      if (res.data) setEmployees(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await api.deleteUser(deleteTarget.id);
      if (res.success) {
        setDeleteTarget(null);
        loadEmployees();
      } else {
        setDeleteError(res.message || 'Failed to delete employee');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Error occurred');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setErrorMsg('Name and Email are required.');
      return;
    }

    setCreating(true);
    setErrorMsg('');
    try {
      const res = await api.createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        employeeId: form.employeeId.trim() || undefined,
        department: form.department.trim() || 'General',
        phone: form.phone.trim() || undefined,
        password: form.password || 'password123',
        role: 'EMPLOYEE',
      });

      if (res.success) {
        setSuccessMsg(`Employee ${form.name} created! (ID: ${res.data?.employeeId})`);
        setForm({
          name: '',
          email: '',
          employeeId: '',
          department: 'Operations',
          phone: '',
          password: 'password123',
        });
        loadEmployees();
        setTimeout(() => {
          setShowAddModal(false);
          setSuccessMsg('');
        }, 1800);
      } else {
        setErrorMsg(res.message || 'Failed to create employee');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred creating employee');
    } finally {
      setCreating(false);
    }
  };

  // Filtered employees
  const filtered = employees.filter((emp) => {
    const q = search.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      (emp.employeeId && emp.employeeId.toLowerCase().includes(q)) ||
      (emp.department && emp.department.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
            Corporate Employee Directory
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage corporate staff profiles, issue requisition IDs, and configure app login credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase">Total Employees</span>
          <p className="text-2xl font-bold text-white mt-1">{employees.length}</p>
          <span className="text-[11px] text-slate-500">Registered with active mobile access</span>
        </div>
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase">Active Requisitioners</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">
            {employees.filter((e) => (e._count?.tripRequests || 0) > 0).length}
          </p>
          <span className="text-[11px] text-slate-500">Have requested corporate fleet trips</span>
        </div>
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase">Departments</span>
          <p className="text-2xl font-bold text-cyan-400 mt-1">
            {new Set(employees.map((e) => e.department).filter(Boolean)).size || 1}
          </p>
          <span className="text-[11px] text-slate-500">Cross-department fleet users</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Employee ID (e.g. EMP-104), Name, Email, or Department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        <span className="text-xs text-slate-400 shrink-0">
          Showing {filtered.length} of {employees.length}
        </span>
      </div>

      {/* Employee Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Employee Name &amp; Contact</th>
                <th className="px-6 py-3.5">Employee ID</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Phone</th>
                <th className="px-6 py-3.5">Trips Requested</th>
                <th className="px-6 py-3.5">Joined Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Loading corporate employee directory…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No employees matching the criteria. Click "+ Add Employee" to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-850/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shadow-sm">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white">{emp.name}</p>
                          <p className="text-slate-400 text-[11px]">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          {emp.employeeId || '—'}
                        </span>
                        {emp.employeeId && (
                          <button
                            onClick={() => handleCopy(emp.id, emp.employeeId!)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition"
                            title="Copy Employee ID"
                          >
                            {copiedId === emp.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/50">
                        {emp.department || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {emp.phone ? (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {emp.phone}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-indigo-400">
                        {emp._count?.tripRequests || 0}
                      </span>{' '}
                      <span className="text-slate-500 text-[11px]">trips</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-[11px]">
                      {new Date(emp.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            handleCopy(
                              emp.id,
                              `VMS Login Credentials:\nIdentifier: ${emp.employeeId || emp.email}\nDefault Password: password123`
                            )
                          }
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition"
                        >
                          {copiedId === emp.id ? 'Copied!' : 'Copy Credentials'}
                        </button>
                        <button
                          onClick={() => { setDeleteError(''); setDeleteTarget(emp); }}
                          title="Delete employee"
                          className="p-1.5 rounded-lg bg-rose-900/20 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border border-rose-800/30 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-900/40 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Delete Employee</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Are you sure you want to permanently delete{' '}
                  <span className="text-white font-semibold">{deleteTarget.name}</span>?
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Employee details */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Employee ID</span>
                <span className="font-mono text-cyan-300 font-bold">{deleteTarget.employeeId || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email</span>
                <span className="text-slate-200">{deleteTarget.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Department</span>
                <span className="text-slate-200">{deleteTarget.department || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Trips</span>
                <span className="text-slate-200">{deleteTarget._count?.tripRequests || 0}</span>
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
                onClick={handleDelete}
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

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-white">Add New Corporate Employee</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generates employee requisition ID and mobile app access
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

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Connor"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Corporate Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="sarah@vms.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Employee ID (Optional, auto-generated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-105"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Operations">Operations</option>
                    <option value="Engineering & IT">Engineering &amp; IT</option>
                    <option value="Finance & Accounts">Finance &amp; Accounts</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Sales & Marketing">Sales &amp; Marketing</option>
                    <option value="Supply Chain / Logistics">Supply Chain / Logistics</option>
                    <option value="Executive Management">Executive Management</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+880 1812-xxxxxx"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
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
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                  {creating ? 'Creating Employee…' : 'Create Employee Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
