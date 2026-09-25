export type Role = 'ADMIN' | 'EMPLOYEE' | 'DRIVER';

export type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'IN_MAINTENANCE' | 'RETIRED';
export type DriverStatus = 'AVAILABLE' | 'ON_TRIP' | 'ON_LEAVE' | 'INACTIVE';
export type TripStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TripType = 'ONE_WAY' | 'ROUND_TRIP' | 'PICKUP_DROPOFF';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  employeeId?: string;
  phone?: string;
  driverId?: string;
  driverStatus?: DriverStatus;
  organization?: string;
}

export interface Office {
  id: string;
  name: string;
  type: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Vehicle {
  id: string;
  registrationNo: string;
  make: string;
  model: string;
  year: number;
  type: string;
  capacity: number;
  fuelType: string;
  fuelEfficiency: number;
  status: VehicleStatus;
  odometer: number;
  photo?: string | null;
  _count?: {
    trips: number;
    fuelLogs: number;
    maintenanceLogs: number;
  };
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: DriverStatus;
  currentLat?: number | null;
  currentLng?: number | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    employeeId?: string | null;
  };
  _count?: {
    assignedTrips: number;
    fuelLogs: number;
    leaveRequests: number;
  };
}

export interface TripPassenger {
  id: string;
  userId?: string | null;
  employeeId?: string | null;
  name: string;
  email?: string | null;
  department?: string | null;
  phone?: string | null;
}

export interface Trip {
  id: string;
  requesterId: string;
  requester: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    department?: string | null;
  };
  vehicleId?: string | null;
  vehicle?: Vehicle | null;
  driverId?: string | null;
  driver?: Driver | null;
  fromOfficeId?: string | null;
  fromOffice?: Office | null;
  toOfficeId?: string | null;
  toOffice?: Office | null;
  pickupAddress?: string | null;   // custom free-text pickup
  dropoffAddress?: string | null;  // custom free-text dropoff
  purpose: string;
  tripType: TripType;
  status: TripStatus;
  departureAt: string;
  returnAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  startOdometer?: number | null;
  endOdometer?: number | null;
  distanceCovered?: number | null;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  passengers?: TripPassenger[];
  conversation?: { id: string } | null;
  createdAt: string;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  vehicle: Vehicle;
  driverId: string;
  driver: Driver;
  odometerReading: number;
  fuelAdded: number;
  pricePerLiter: number;
  totalCost: number;
  receiptPhoto: string;
  stationName?: string | null;
  notes?: string | null;
  consumptionRate?: number | null;
  isAnomaly: boolean;
  loggedAt: string;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  vehicle: Vehicle;
  type: string;
  description: string;
  cost?: number | null;
  odometerAt?: number | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  isCompleted: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface LiveVehicleLocation {
  tripId: string;
  vehicleId: string;
  vehicleModel?: string;
  registrationNo?: string;
  driverName?: string;
  driverPhone?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  from?: string;
  to?: string;
  status?: string;
  timestamp?: string;
}

export interface DashboardStats {
  vehicles: {
    total: number;
    available: number;
    inUse: number;
    inMaintenance: number;
  };
  drivers: {
    total: number;
    available: number;
    onTrip: number;
    onLeave: number;
  };
  trips: {
    pending: number;
    active: number;
    completed: number;
    total: number;
  };
  fuel: {
    totalCost: number;
    totalLiters: number;
    anomalyCount: number;
  };
  recentTrips: Trip[];
  recentAnomalies: FuelLog[];
}

export type ConvType = 'TRIP_THREAD' | 'SUPPORT' | 'INCIDENT' | 'GENERAL';
export type MsgType = 'TEXT' | 'IMAGE' | 'LOCATION_SHARE' | 'SYSTEM_EVENT';

export interface ChatParticipant {
  id: string;
  conversationId: string;
  userId: string;
  lastReadAt?: string | null;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    department?: string | null;
    phone?: string | null;
    profilePhoto?: string | null;
  };
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    role: Role;
    department?: string | null;
  };
  body: string;
  attachmentUrl?: string | null;
  messageType: MsgType;
  isSystem: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  tripId?: string | null;
  trip?: Trip | null;
  subject: string;
  type: ConvType;
  isResolved: boolean;
  resolvedAt?: string | null;
  participants: ChatParticipant[];
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

