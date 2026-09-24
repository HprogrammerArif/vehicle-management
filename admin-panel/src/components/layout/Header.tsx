import React from 'react';
import { useStore } from '../../store/useStore';
import { Role } from '../../types';
import { api } from '../../lib/api';
import { Shield, User, Play, Radio, Bell } from 'lucide-react';

export const Header: React.FC = () => {
  const { activeRole, setActiveRole, user, setUser, isSimulating, setIsSimulating, setActiveTab } =
    useStore();

  const handleRoleChange = (role: Role) => {
    setActiveRole(role);
    if (role === 'ADMIN') {
      setUser({
        id: 'user_admin_01',
        name: 'Tanvir Hossain',
        email: 'admin@vms.com',
        role: 'ADMIN',
        department: 'Logistics Fleet Operations',
      });
      setActiveTab('dashboard');
    } else if (role === 'EMPLOYEE') {
      setUser({
        id: 'user_emp_01',
        name: 'Johnathan Doe',
        email: 'john.doe@vms.com',
        role: 'EMPLOYEE',
        department: 'Engineering Lead',
      });
      setActiveTab('employee-portal');
    } else if (role === 'DRIVER') {
      setUser({
        id: 'user_driver_01',
        name: 'Abdul Karim',
        email: 'driver.karim@vms.com',
        role: 'DRIVER',
        driverId: 'driver_02',
      });
      setActiveTab('driver-portal');
    }
  };

  const handleTriggerSimulation = async () => {
    setIsSimulating(true);
    setActiveTab('tracking');
    try {
      // Fetch active trips or fallback
      const tripsRes = await api.getTrips('?status=IN_PROGRESS');
      const tripId = tripsRes.data?.[0]?.id || 'active_trip_demo';
      await api.simulateTrip(tripId);
    } catch (e) {
      console.log('Simulation triggered');
    }
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Telemetry Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Telemetry Gateway: Online</span>
        </div>

        {/* Live Simulation Quick Trigger */}
        <button
          onClick={handleTriggerSimulation}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition"
          title="Simulate realistic GPS movement between HQ and Factory"
        >
          <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
          <span>Simulate Live GPS Stream</span>
        </button>
      </div>

      {/* Right: Role Switcher & User Profile */}
      <div className="flex items-center gap-6">
        {/* Prototype Persona Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <span className="text-[11px] font-semibold text-slate-400 px-2">Role:</span>
          {(['ADMIN', 'EMPLOYEE', 'DRIVER'] as Role[]).map((role) => (
            <button
              key={role}
              onClick={() => handleRoleChange(role)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                activeRole === role
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white shadow-md">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-xs font-bold text-slate-200">{user?.name}</p>
            <p className="text-[10px] text-slate-400">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
