import { create } from 'zustand';
import { User, Role, LiveVehicleLocation, DashboardStats } from '../types';

interface VMSStore {
  user: User | null;
  activeRole: Role;
  liveFleet: Record<string, LiveVehicleLocation>;
  stats: DashboardStats | null;
  activeTab: string;
  isSimulating: boolean;
  unreadChatCount: number;
  activeConversationId: string | null;
  setUser: (user: User | null) => void;
  setActiveRole: (role: Role) => void;
  updateVehicleLocation: (location: LiveVehicleLocation) => void;
  setLiveFleet: (fleet: LiveVehicleLocation[]) => void;
  setStats: (stats: DashboardStats | null) => void;
  setActiveTab: (tab: string) => void;
  setIsSimulating: (isSimulating: boolean) => void;
  setUnreadChatCount: (count: number) => void;
  setActiveConversationId: (id: string | null) => void;
}

export const useStore = create<VMSStore>((set) => ({
  user: {
    id: 'user_admin_01',
    name: 'Tanvir Hossain',
    email: 'admin@vms.com',
    role: 'ADMIN',
    department: 'Logistics Fleet Operations',
    organization: 'Apex Global Industries',
  },
  activeRole: 'ADMIN',
  liveFleet: {},
  stats: null,
  activeTab: 'dashboard',
  isSimulating: false,
  unreadChatCount: 0,
  activeConversationId: null,

  setUser: (user) => set({ user }),
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
}));
