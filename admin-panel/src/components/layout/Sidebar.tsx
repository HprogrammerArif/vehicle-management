import React from 'react';
import { useStore } from '../../store/useStore';
import { ApexLogo } from '../common/ApexLogo';
import {
  LayoutDashboard,
  MapPin,
  CalendarCheck,
  Truck,
  Users,
  Fuel,
  Wrench,
  UserCheck,
  Compass,
  Building2,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, activeRole, unreadChatCount } = useStore();

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'tracking', label: 'Live Fleet Tracking', icon: MapPin, badge: 'LIVE' },
    { id: 'trips', label: 'Trip Requests & Dispatch', icon: CalendarCheck },
    { id: 'chat', label: 'Fleet Chat', icon: MessageSquare, count: unreadChatCount },
    { id: 'fleet', label: 'Vehicles Management', icon: Truck },
    { id: 'drivers', label: 'Drivers & Availability', icon: Users },
    { id: 'fuel', label: 'Fuel Logs & Anti-Theft', icon: Fuel, badge: 'AUDIT' },
    { id: 'maintenance', label: 'Maintenance Schedule', icon: Wrench },
  ];

  const employeeNavItems = [
    { id: 'employee-portal', label: 'Request Trip', icon: Compass },
    { id: 'trips', label: 'My Trip Requests', icon: CalendarCheck },
    { id: 'chat', label: 'Support & Chat', icon: MessageSquare, count: unreadChatCount },
  ];

  const driverNavItems = [
    { id: 'driver-portal', label: 'My Assigned Trips', icon: Truck },
    { id: 'fuel', label: 'Submit Fuel Receipt', icon: Fuel },
    { id: 'chat', label: 'Trip & Dispatch Chat', icon: MessageSquare, count: unreadChatCount },
  ];

  let currentNavItems = adminNavItems;
  if (activeRole === 'EMPLOYEE') currentNavItems = employeeNavItems;
  if (activeRole === 'DRIVER') currentNavItems = driverNavItems;

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 z-30 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <ApexLogo variant="full" size="md" />
        </div>

        {/* Navigation Section */}
        <div className="px-4 py-6 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {activeRole} Navigation
          </div>
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'bg-rose-500 text-white shadow-sm shadow-rose-500/40'
                    }`}
                  >
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Corporate Badge & Organization Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
          <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">Apex Global Industries</p>
            <p className="text-[11px] text-slate-400">HQ & 4 Regional Plants</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
