import { create } from 'zustand';

export interface MobileUser {
  id: string;
  name: string;
  email?: string;
  role: 'EMPLOYEE' | 'DRIVER' | 'ADMIN';
  department?: string;
  phone?: string;
  driverId?: string;
}

interface MobileStore {
  user: MobileUser | null;
  role: 'EMPLOYEE' | 'DRIVER';
  token: string | null;
  unreadChatCount: number;
  setUser: (user: MobileUser | null) => void;
  setRole: (role: 'EMPLOYEE' | 'DRIVER') => void;
  setToken: (token: string | null) => void;
  setUnreadChatCount: (count: number) => void;
}

// Default mock profiles matching demo seeds
export const DEFAULT_EMPLOYEE: MobileUser = {
  id: 'cmuf7ss2c0003f6wpudwaswfg',
  name: 'Johnathan Doe',
  email: 'john.doe@vms.com',
  role: 'EMPLOYEE',
  department: 'Factory Engineering',
  phone: '+880 1812 222333',
};

export const DEFAULT_DRIVER: MobileUser = {
  id: 'cmuf7su0n0007f6wpl5c77ukh',
  name: 'Mohammad Rahim',
  email: 'driver.rahim@vms.com',
  role: 'DRIVER',
  department: 'Heavy Fleet Transport',
  phone: '+880 1614 777888',
  driverId: 'cmuf7sv730009f6wp06cs1lke',
};

export const useMobileStore = create<MobileStore>((set) => ({
  user: DEFAULT_EMPLOYEE,
  role: 'EMPLOYEE',
  token: null,
  unreadChatCount: 0,
  setUser: (user) => set({ user }),
  setRole: (role) => {
    set({
      role,
      user: role === 'EMPLOYEE' ? DEFAULT_EMPLOYEE : DEFAULT_DRIVER,
    });
  },
  setToken: (token) => set({ token }),
  setUnreadChatCount: (unreadChatCount) => set({ unreadChatCount }),
}));
