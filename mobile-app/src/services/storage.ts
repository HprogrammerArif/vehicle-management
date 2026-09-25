// Safe Storage Service with expo-secure-store and memory fallback

let SecureStore: any = null;
try {
  SecureStore = require('expo-secure-store');
} catch (e) {
  console.warn('expo-secure-store not available, using in-memory storage');
}

const memoryStorage = new Map<string, string>();

export const appStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (SecureStore?.getItemAsync) {
        return await SecureStore.getItemAsync(key);
      }
    } catch (e) {
      // Fallback if native module is not yet compiled into debug APK
    }
    return memoryStorage.get(key) || null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (SecureStore?.setItemAsync) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
    } catch (e) {
      // Fallback
    }
    memoryStorage.set(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (SecureStore?.deleteItemAsync) {
        await SecureStore.deleteItemAsync(key);
        return;
      }
    } catch (e) {
      // Fallback
    }
    memoryStorage.delete(key);
  },
};

const TOKEN_KEY = 'vms_auth_token';
const USER_KEY = 'vms_auth_user';

export const authStorage = {
  saveSession: async (token: string, user: any) => {
    await appStorage.setItem(TOKEN_KEY, token);
    await appStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  loadSession: async (): Promise<{ token: string | null; user: any | null }> => {
    const token = await appStorage.getItem(TOKEN_KEY);
    const userStr = await appStorage.getItem(USER_KEY);
    let user = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (e) {}
    }
    return { token, user };
  },

  clearSession: async () => {
    await appStorage.removeItem(TOKEN_KEY);
    await appStorage.removeItem(USER_KEY);
  },
};
