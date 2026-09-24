import React, { useEffect } from 'react';
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
import { EmployeePortal } from './pages/EmployeePortal';
import { DriverPortal } from './pages/DriverPortal';
import { ChatPage } from './pages/ChatPage';
import { getSocket } from './lib/socket';
import { api } from './lib/api';

export const App: React.FC = () => {
  const { activeTab, setUnreadChatCount, setUser } = useStore();

  useEffect(() => {
    // Auto-login admin for demo purposes — gets the real DB user ID
    const autoLogin = async () => {
      try {
        // Check if already have a token
        const existingToken = localStorage.getItem('vms_token');
        if (existingToken) {
          // Verify token is still valid by fetching profile
          const meRes = await api.getMe?.();
          if (meRes?.success && meRes.user) {
            setUser(meRes.user);
            return;
          }
        }

        // Login with demo admin credentials
        const res = await api.login?.('admin@vms.com', 'admin123');
        if (res?.success && res.token && res.user) {
          localStorage.setItem('vms_token', res.token);
          setUser(res.user);
          console.log('✅ Auto-logged in as:', res.user.name, '(ID:', res.user.id, ')');
        }
      } catch (e) {
        console.warn('Auto-login failed, using fallback user:', e);
      }
    };

    autoLogin();

    // Initialize Socket.io connection
    const socket = getSocket();

    // Fetch initial unread count
    api.getUnreadChatCount()
      .then((res: any) => {
        if (res && res.success && typeof res.count === 'number') {
          setUnreadChatCount(res.count);
        }
      })
      .catch(() => {});

    // Listen for global unread updates
    const handleUnreadUpdate = (data: { count?: number }) => {
      if (data && typeof data.count === 'number') {
        setUnreadChatCount(data.count);
      }
    };

    socket.on('chat:unread_update', handleUnreadUpdate);

    return () => {
      socket.off('chat:unread_update', handleUnreadUpdate);
    };
  }, [setUnreadChatCount, setUser]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'tracking':
        return <LiveTrackingPage />;
      case 'trips':
        return <TripsPage />;
      case 'chat':
        return <ChatPage />;
      case 'fleet':
        return <FleetPage />;
      case 'drivers':
        return <DriversPage />;
      case 'fuel':
        return <FuelPage />;
      case 'maintenance':
        return <MaintenancePage />;
      case 'employee-portal':
        return <EmployeePortal />;
      case 'driver-portal':
        return <DriverPortal />;
      default:
        return <Dashboard />;
    }
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
