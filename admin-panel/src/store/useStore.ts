import { create } from 'zustand';
import { User, Role, LiveVehicleLocation, DashboardStats } from '../types';

interface VMSStore {
  user: User | null;
  isAuthenticated: boolean;
  activeRole: Role;
  liveFleet: Record<string, LiveVehicleLocation>;
  stats: DashboardStats | null;
  activeTab: string;
  isSimulating: boolean;
  unreadChatCount: number;
  activeConversationId: string | null;

  setUser: (user: User | null) => void;
  setIsAuthenticated: (val: boolean) => void;
  setActiveRole: (role: Role) => void;
  updateVehicleLocation: (location: LiveVehicleLocation) => void;
  setLiveFleet: (fleet: LiveVehicleLocation[]) => void;
  setStats: (stats: DashboardStats | null) => void;
  setActiveTab: (tab: string) => void;
  setIsSimulating: (isSimulating: boolean) => void;
  setUnreadChatCount: (count: number) => void;
  setActiveConversationId: (id: string | null) => void;
  logout: () => void;
}

/** Default tab per role after login */
function defaultTabForRole(role: Role): string {
  if (role === 'EMPLOYEE') return 'employee-portal';
  if (role === 'DRIVER') return 'driver-portal';
  return 'dashboard';
}

export const useStore = create<VMSStore>((set) => ({
  user: null,
  isAuthenticated: false,
  activeRole: 'ADMIN',
  liveFleet: {},
  stats: null,
  activeTab: 'dashboard',
  isSimulating: false,
  unreadChatCount: 0,
  activeConversationId: null,

  setUser: (user) =>
    set({
      user,
      activeRole: user?.role ?? 'ADMIN',
      activeTab: user ? defaultTabForRole(user.role) : 'dashboard',
    }),

  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  setActiveRole: (activeRole) => set({ activeRole }),

  updateVehicleLocation: (location) =>
    set((state) => ({
      liveFleet: {
        ...state.liveFleet,
        [location.vehicleId || location.tripId]: location,
      },
    })),

  setLiveFleet: (fleet) => {
    const fleetMap: Record<string, LiveVehicleLocation> = {};
    fleet.forEach((item) => {
      fleetMap[item.vehicleId || item.tripId] = item;
    });
    set({ liveFleet: fleetMap });
  },

  setStats: (stats) => set({ stats }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsSimulating: (isSimulating) => set({ isSimulating }),
  setUnreadChatCount: (unreadChatCount) => set({ unreadChatCount }),
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),

  logout: () => {
    localStorage.removeItem('vms_token');
    set({
      user: null,
      isAuthenticated: false,
      activeRole: 'ADMIN',
      activeTab: 'dashboard',
      stats: null,
      liveFleet: {},
      unreadChatCount: 0,
      activeConversationId: null,
    });
  },
}));
