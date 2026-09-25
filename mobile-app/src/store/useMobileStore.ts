import { create } from 'zustand';
import { authStorage } from '../services/storage';

export interface MobileUser {
  id: string;
  name: string;
  email?: string;
  employeeId?: string;
  role: 'EMPLOYEE' | 'DRIVER' | 'ADMIN';
  department?: string;
  phone?: string;
  driverId?: string;
  organization?: string;
}

interface MobileStore {
  user: MobileUser | null;
  token: string | null;
  isInitialized: boolean;
  unreadChatCount: number;
  unreadNotifCount: number;
  initAuth: () => Promise<void>;
  setUser: (user: MobileUser | null) => void;
  setToken: (token: string | null) => void;
  setSession: (token: string, user: MobileUser) => Promise<void>;
  setUnreadChatCount: (count: number) => void;
  setUnreadNotifCount: (count: number) => void;
  logout: () => Promise<void>;
  // Derived helper
  role: 'EMPLOYEE' | 'DRIVER' | null;
}

export const useMobileStore = create<MobileStore>((set, get) => ({
  user: null,
  token: null,
  isInitialized: false,
  unreadChatCount: 0,
  unreadNotifCount: 0,

  get role() {
    const u = get().user;
    if (!u) return null;
    return u.role === 'DRIVER' ? 'DRIVER' : 'EMPLOYEE';
  },

  initAuth: async () => {
    try {
      const { token, user } = await authStorage.loadSession();
      if (token && user) {
        set({ token, user, isInitialized: true });
        return;
      }
    } catch (e) {
      console.warn('Failed to restore session:', e);
    }
    set({ isInitialized: true });
  },

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),

  setSession: async (token: string, user: MobileUser) => {
    set({ token, user });
    await authStorage.saveSession(token, user);
  },

  setUnreadChatCount: (unreadChatCount) => set({ unreadChatCount }),
  setUnreadNotifCount: (unreadNotifCount) => set({ unreadNotifCount }),

  logout: async () => {
    await authStorage.clearSession();
    set({
      user: null,
      token: null,
      unreadChatCount: 0,
      unreadNotifCount: 0,
    });
  },
}));
