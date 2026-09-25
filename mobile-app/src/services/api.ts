import { useMobileStore } from '../store/useMobileStore';

// Mobile API Client
// Note: For local development on physical Android device or emulator, replace localhost with your LAN IP (e.g. 192.168.x.x)
const API_BASE_URL = 'http://10.10.29.137:5000/api';

export async function mobileApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; token?: string; user?: any; count?: number; [key: string]: any }> {
  const token = useMobileStore.getState().token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Network connection failed',
    };
  }
}

// Auth API methods
export const authApi = {
  // identifier can be employeeId (EMP-001) or email
  login: (identifier: string, password: string) => {
    return mobileApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },
  getMe: () => mobileApi('/auth/me'),
  updateFcmToken: (fcmToken: string) =>
    mobileApi('/auth/fcm-token', {
      method: 'PATCH',
      body: JSON.stringify({ fcmToken }),
    }),
  // Look up an employee by their employeeId (e.g. EMP-104)
  lookupEmployee: (employeeId: string) =>
    mobileApi(`/auth/lookup-employee?employeeId=${encodeURIComponent(employeeId)}`),
};

// Trips API
export const tripsApi = {
  getMyTrips: () => mobileApi('/trips/my'),
  getOffices: () => mobileApi('/offices'),
  createTrip: (data: object) =>
    mobileApi('/trips', { method: 'POST', body: JSON.stringify(data) }),
  startTrip: (id: string, startOdometer?: number) =>
    mobileApi(`/trips/${id}/start`, { method: 'PUT', body: JSON.stringify({ startOdometer }) }),
  completeTrip: (id: string, endOdometer: number) =>
    mobileApi(`/trips/${id}/complete`, { method: 'PUT', body: JSON.stringify({ endOdometer }) }),
};


// Notifications API
export const notificationsApi = {
  getMyNotifications: () => mobileApi('/notifications/my'),
  markRead: (id: string) => mobileApi(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => mobileApi('/notifications/read-all', { method: 'PATCH' }),
};

// Chat API methods
export const mobileChatApi = {
  // Get conversations for the logged in mobile user
  getMyConversations: (isResolved?: boolean) => {
    const query = isResolved !== undefined ? `?isResolved=${isResolved}` : '';
    return mobileApi(`/chat/mine${query}`);
  },

  // Get specific conversation with full details
  getConversationById: (id: string) => {
    return mobileApi(`/chat/${id}`);
  },

  // Get messages for conversation
  getMessages: (conversationId: string) => {
    return mobileApi(`/chat/${conversationId}/messages`);
  },

  // Send message REST
  sendMessage: (conversationId: string, body: string, messageType = 'TEXT', attachmentUrl?: string) => {
    return mobileApi(`/chat/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body, messageType, attachmentUrl }),
    });
  },

  // Upload image/photo attachment
  uploadAttachment: async (uri: string, filename = 'photo.jpg') => {
    const token = useMobileStore.getState().token;
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type: 'image/jpeg',
    } as any);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      return await response.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Image upload failed' };
    }
  },

  // Start new support/incident conversation
  startConversation: (data: {
    type: 'SUPPORT' | 'INCIDENT' | 'GENERAL';
    subject: string;
    tripId?: string;
    initialMessage?: string;
  }) => {
    return mobileApi('/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Mark conversation as read
  markAsRead: (conversationId: string) => {
    return mobileApi(`/chat/${conversationId}/read`, {
      method: 'PUT',
    });
  },

  // Unread badge count
  getUnreadCount: () => {
    return mobileApi('/chat/unread-count');
  },
};
