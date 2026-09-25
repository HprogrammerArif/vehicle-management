const API_BASE_URL = 'http://localhost:5000/api';

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; token?: string; user?: any; count?: number; [key: string]: any }> {
  const token = localStorage.getItem('vms_token');

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

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error(`API Error [${endpoint}]:`, error);
    return {
      success: false,
      message: error.message || 'Network error connecting to VMS Backend',
    };
  }
}

export const api = {
  // Auth
  login: (identifier: string, password: string) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  getMe: () => apiRequest('/auth/me'),

  // Dashboard
  getStats: () => apiRequest('/dashboard/stats'),

  // Offices
  getOffices: () => apiRequest('/offices'),
  createOffice: (payload: any) =>
    apiRequest('/offices', { method: 'POST', body: JSON.stringify(payload) }),

  // Vehicles
  getVehicles: (params: string = '') => apiRequest(`/vehicles${params}`),
  getAvailableVehicles: () => apiRequest('/vehicles/available'),
  getVehicleById: (id: string) => apiRequest(`/vehicles/${id}`),
  createVehicle: (payload: any) =>
    apiRequest('/vehicles', { method: 'POST', body: JSON.stringify(payload) }),
  updateVehicle: (id: string, payload: any) =>
    apiRequest(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteVehicle: (id: string) => apiRequest(`/vehicles/${id}`, { method: 'DELETE' }),

  // Drivers
  getDrivers: (params: string = '') => apiRequest(`/drivers${params}`),
  getAvailableDrivers: () => apiRequest('/drivers/available'),
  getDriverById: (id: string) => apiRequest(`/drivers/${id}`),
  updateDriverStatus: (id: string, status: string) =>
    apiRequest(`/drivers/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  requestDriverLeave: (payload: any) =>
    apiRequest('/drivers/leave', { method: 'POST', body: JSON.stringify(payload) }),
  approveDriverLeave: (leaveId: string, isApproved: boolean) =>
    apiRequest(`/drivers/leave/${leaveId}`, {
      method: 'PUT',
      body: JSON.stringify({ isApproved }),
    }),

  // Trips
  getTrips: (params: string = '') => apiRequest(`/trips${params}`),
  getTripById: (id: string) => apiRequest(`/trips/${id}`),
  createTrip: (payload: any) =>
    apiRequest('/trips', { method: 'POST', body: JSON.stringify(payload) }),
  approveTrip: (id: string, payload: { vehicleId: string; driverId: string; adminNotes?: string }) =>
    apiRequest(`/trips/${id}/approve`, { method: 'PUT', body: JSON.stringify(payload) }),
  rejectTrip: (id: string, rejectionReason: string) =>
    apiRequest(`/trips/${id}/reject`, { method: 'PUT', body: JSON.stringify({ rejectionReason }) }),
  startTrip: (id: string, startOdometer?: number) =>
    apiRequest(`/trips/${id}/start`, { method: 'PUT', body: JSON.stringify({ startOdometer }) }),
  completeTrip: (id: string, endOdometer: number) =>
    apiRequest(`/trips/${id}/complete`, { method: 'PUT', body: JSON.stringify({ endOdometer }) }),
  cancelTrip: (id: string) => apiRequest(`/trips/${id}/cancel`, { method: 'PUT' }),

  // Tracking
  getFleetLocations: () => apiRequest('/tracking/fleet'),
  getTripRoute: (tripId: string) => apiRequest(`/tracking/route/${tripId}`),
  simulateTrip: (tripId: string) =>
    apiRequest(`/tracking/simulate/${tripId}`, { method: 'POST' }),

  // Fuel
  getFuelLogs: (params: string = '') => apiRequest(`/fuel${params}`),
  getFuelAnalytics: () => apiRequest('/fuel/analytics'),
  logFuel: (payload: any) =>
    apiRequest('/fuel', { method: 'POST', body: JSON.stringify(payload) }),

  // Maintenance
  getMaintenanceLogs: (params: string = '') => apiRequest(`/maintenance${params}`),
  createMaintenance: (payload: any) =>
    apiRequest('/maintenance', { method: 'POST', body: JSON.stringify(payload) }),
  completeMaintenance: (id: string, payload: any) =>
    apiRequest(`/maintenance/${id}/complete`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Chat
  getConversations: (params: string = '') => apiRequest(`/chat${params}`),
  getMyConversations: () => apiRequest('/chat/mine'),
  getConversationById: (id: string) => apiRequest(`/chat/${id}`),
  getChatMessages: (id: string, params: string = '') => apiRequest(`/chat/${id}/messages${params}`),
  startConversation: (payload: any) =>
    apiRequest('/chat', { method: 'POST', body: JSON.stringify(payload) }),
  sendChatMessage: (id: string, payload: any) =>
    apiRequest(`/chat/${id}/messages`, { method: 'POST', body: JSON.stringify(payload) }),
  markChatRead: (id: string) =>
    apiRequest(`/chat/${id}/read`, { method: 'PUT' }),
  resolveConversation: (id: string, isResolved: boolean = true) =>
    apiRequest(`/chat/${id}/resolve`, { method: 'PUT', body: JSON.stringify({ isResolved }) }),
  getUnreadChatCount: () => apiRequest('/chat/unread-count'),
  uploadChatAttachment: async (file: File) => {
    const token = localStorage.getItem('vms_token');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('http://localhost:5000/api/chat/upload', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      return await response.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'File upload failed' };
    }
  },

  // Notifications
  sendNotification: (payload: { title: string; body: string; target: string; tripId?: string; userId?: string; employeeId?: string }) =>
    apiRequest('/notifications/send', { method: 'POST', body: JSON.stringify(payload) }),

  // User Management (Employees & Drivers)
  getUsers: (params: string = '') => apiRequest(`/auth/users${params}`),
  createUser: (payload: {
    name: string;
    email: string;
    password?: string;
    role: 'EMPLOYEE' | 'DRIVER';
    department?: string;
    employeeId?: string;
    phone?: string;
    licenseNumber?: string;
    licenseExpiry?: string;
  }) => apiRequest('/auth/users', { method: 'POST', body: JSON.stringify(payload) }),
  deleteUser: (id: string) => apiRequest(`/auth/users/${id}`, { method: 'DELETE' }),
};

