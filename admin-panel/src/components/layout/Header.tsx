import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import {
  Play,
  LogOut,
  ShieldCheck,
  UserCheck,
  Truck,
  ChevronDown,
  Settings,
  User,
  Building2,
} from 'lucide-react';

const roleConfig = {
  ADMIN: { icon: ShieldCheck, label: 'Administrator', color: 'indigo' },
  EMPLOYEE: { icon: UserCheck, label: 'Employee', color: 'emerald' },
  DRIVER: { icon: Truck, label: 'Driver', color: 'amber' },
};

export const Header: React.FC = () => {
  const { user, logout, isSimulating, setIsSimulating, setActiveTab } = useStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const role = user?.role ?? 'ADMIN';
  const roleInfo = roleConfig[role];
  const RoleIcon = roleInfo.icon;

  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };
  const avatarClasses: Record<string, string> = {
    indigo: 'from-indigo-500 to-purple-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
  };

  const handleTriggerSimulation = async () => {
    setIsSimulating(true);
    setActiveTab('tracking');
    try {
      const tripsRes = await api.getTrips('?status=IN_PROGRESS');
      const tripId = tripsRes.data?.[0]?.id || 'active_trip_demo';
      await api.simulateTrip(tripId);
    } catch {
      console.log('Simulation triggered');
    }
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Telemetry status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Telemetry Gateway: Online</span>
        </div>

        {/* Only admins can trigger simulation */}
        {role === 'ADMIN' && (
          <button
            onClick={handleTriggerSimulation}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition"
            title="Simulate realistic GPS movement between HQ and Factory"
          >
            <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
            <span>Simulate Live GPS</span>
          </button>
        )}
      </div>

      {/* Right: Role badge + user menu */}
      <div className="flex items-center gap-4">
        {/* Role badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${colorClasses[roleInfo.color]}`}>
          <RoleIcon className="w-3.5 h-3.5" />
          <span>{roleInfo.label}</span>
        </div>

        {/* User dropdown */}
        <div className="relative">
          <button
            id="user-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 pl-4 border-l border-slate-800 hover:opacity-80 transition-opacity"
          >
            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${avatarClasses[roleInfo.color]} flex items-center justify-center font-bold text-xs text-white shadow-md`}>
              {user?.name?.charAt(0) ?? 'U'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold text-slate-200">{user?.name}</p>
              <p className="text-[10px] text-slate-400">
                {user?.employeeId ? `ID: ${user.employeeId}` : user?.email}
              </p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                {/* User info header */}
                <div className="p-4 border-b border-slate-800 bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${avatarClasses[roleInfo.color]} flex items-center justify-center font-bold text-sm text-white shadow-md`}>
                      {user?.name?.charAt(0) ?? 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-100">{user?.name}</p>
                      <p className="text-xs text-slate-400">{user?.email}</p>
                      {user?.department && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{user.department}</p>
                      )}
                    </div>
                  </div>
                  {(user?.employeeId || user?.organization) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {user.employeeId && (
                        <span className="text-[10px] font-mono bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-md border border-slate-600/50">
                          {user.employeeId}
                        </span>
                      )}
                      {user.organization && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Building2 className="w-3 h-3" />
                          {user.organization}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Menu items */}
                <div className="p-1.5">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-left">
                    <User className="w-4 h-4" />
                    My Profile
                  </button>
                  {role === 'ADMIN' && (
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-left">
                      <Settings className="w-4 h-4" />
                      System Settings
                    </button>
                  )}
                </div>

                <div className="p-1.5 border-t border-slate-800">
                  <button
                    id="logout-btn"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
