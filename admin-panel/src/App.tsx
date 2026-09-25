import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { LiveTrackingPage } from './pages/LiveTrackingPage';
import { TripsPage } from './pages/TripsPage';
import { FleetPage } from './pages/FleetPage';
import { DriversPage } from './pages/DriversPage';
import { FuelPage } from './pages/FuelPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { EmployeesPage } from './pages/EmployeesPage';
import { EmployeePortal } from './pages/EmployeePortal';
import { DriverPortal } from './pages/DriverPortal';
import { ChatPage } from './pages/ChatPage';
import { LoginPage } from './pages/LoginPage';
import { getSocket } from './lib/socket';
import { api } from './lib/api';

export const App: React.FC = () => {
  const { activeTab, setUnreadChatCount, setUser, setIsAuthenticated, isAuthenticated, user } = useStore();
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('vms_token');
      if (!token) {
        setBootstrapping(false);
        return;
      }

      try {
        const meRes = await api.getMe?.();
        if (meRes?.success && meRes.user) {
          setUser(meRes.user);
          setIsAuthenticated(true);
        } else {
          // Token invalid/expired — clear it
          localStorage.removeItem('vms_token');
        }
      } catch {
        localStorage.removeItem('vms_token');
      } finally {
        setBootstrapping(false);
      }
    };

    bootstrap();
  }, [setUser, setIsAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    api.getUnreadChatCount()
      .then((res: any) => {
        if (res?.success && typeof res.count === 'number') {
          setUnreadChatCount(res.count);
        }
      })
      .catch(() => {});

    const handleUnreadUpdate = (data: { count?: number }) => {
      if (data && typeof data.count === 'number') {
        setUnreadChatCount(data.count);
      }
    };

    socket.on('chat:unread_update', handleUnreadUpdate);
    return () => {
      socket.off('chat:unread_update', handleUnreadUpdate);
    };
  }, [isAuthenticated, setUnreadChatCount]);

  // ─────────────────────────────────────────
  // Bootstrapping spinner
  // ─────────────────────────────────────────
  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading VMS Platform…</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // Not authenticated → Login page
  // ─────────────────────────────────────────
  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  // ─────────────────────────────────────────
  // Role-based content renderer
  // ─────────────────────────────────────────
  const renderContent = () => {
    const role = user.role;

    // ── ADMIN has access to everything
    if (role === 'ADMIN') {
      switch (activeTab) {
        case 'dashboard':      return <Dashboard />;
        case 'tracking':       return <LiveTrackingPage />;
        case 'trips':          return <TripsPage />;
        case 'chat':           return <ChatPage />;
        case 'fleet':          return <FleetPage />;
        case 'drivers':        return <DriversPage />;
        case 'employees':      return <EmployeesPage />;
        case 'fuel':           return <FuelPage />;
        case 'maintenance':    return <MaintenancePage />;
        case 'employee-portal': return <EmployeePortal />;
        case 'driver-portal':  return <DriverPortal />;
        default:               return <Dashboard />;
      }
    }

    // ── EMPLOYEE can only access employee-facing pages
    if (role === 'EMPLOYEE') {
      switch (activeTab) {
        case 'employee-portal': return <EmployeePortal />;
        case 'trips':           return <TripsPage />;
        case 'chat':            return <ChatPage />;
        default:                return <EmployeePortal />;
      }
    }

    // ── DRIVER can only access driver-facing pages
    if (role === 'DRIVER') {
      switch (activeTab) {
        case 'driver-portal': return <DriverPortal />;
        case 'fuel':          return <FuelPage />;
        case 'chat':          return <ChatPage />;
        default:              return <DriverPortal />;
      }
    }

    return <Dashboard />;
  };

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
