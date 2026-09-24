# 🚗 Vehicle Management System (VMS) — Master Plan

> **Hiring Task** | AppTriangle Limited | Deadline: 4 Days Remaining

---

## 📋 Table of Contents
1. [System Overview](#1-system-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [System Flow (SDLC)](#3-system-flow-sdlc)
4. [Tech Stack](#4-tech-stack)
5. [Project Folder Structure](#5-project-folder-structure)
6. [Database Schema](#6-database-schema)
7. [API Endpoints](#7-api-endpoints)
8. [Key Features](#8-key-features)
9. [4-Day Execution Plan](#9-4-day-execution-plan)
10. [Interview Highlights](#10-interview-highlights)

---

## 1. System Overview

A full-stack **Vehicle Management System** for a large organization with multiple offices (HQ, Regional Offices, Factories). The system enables employees to request vehicles, admins to manage fleets, and drivers to execute and track trips — all with real-time GPS tracking, fuel management, and transparent reporting.

### Modules
| Module | Description |
|--------|-------------|
| **User Management** | Employees, Drivers, Admins with role-based access |
| **Trip Request & Assignment** | Employees request trips; admins assign vehicles & drivers |
| **Real-time Vehicle Tracking** | Live GPS tracking on OpenStreetMap |
| **Fuel Management** | Fuel logs, consumption calculation, theft prevention via photo uploads |
| **Maintenance Management** | Vehicle maintenance schedules and records |
| **Notification System** | Push notifications (mobile) + in-app alerts |
| **Reporting & Analytics** | Trip history, fuel reports, driver performance |

---

## 2. User Roles & Permissions

### 👤 Employee
- Register/Login
- Submit trip requests (solo or group, one-way/round/pickup-dropoff)
- Add co-travellers
- View request status (Pending / Approved / Rejected / Completed)
- Receive push notifications
- View trip history

### 🚗 Driver
- Login
- View assigned trips
- Update trip status (Start / En Route / Completed)
- Upload fuel receipts (image + km + amount + price)
- Real-time GPS broadcast
- Mark availability / leave

### 👑 Admin
- Full dashboard with analytics
- Manage Users (employees, drivers)
- Manage Vehicles (CRUD, maintenance status)
- View & manage trip requests (approve/reject/assign vehicle+driver)
- Real-time map view of all active vehicles
- Fuel management (logs, anomaly detection)
- Maintenance scheduling
- Push notifications to employees/drivers
- Reports & exports

---

## 3. System Flow (SDLC)

### 3.1 Trip Request Lifecycle

```
Employee submits request
    ↓
Admin reviews request
    ↓
[Approved]                    [Rejected]
    ↓                             ↓
Admin assigns Vehicle         Notification sent to Employee
& Driver
    ↓
Notifications sent to Employee & Driver
    ↓
Driver starts journey (GPS tracking begins)
    ↓
Real-time location broadcast → Admin map view
    ↓
Driver completes journey
    ↓
Driver uploads fuel receipt (if refueled)
    ↓
Admin marks trip as Completed
    ↓
Reports updated
```

### 3.2 Fuel Management Flow
```
Driver refuels vehicle
    ↓
Driver uploads: current km, fuel amount (L), price, receipt photo
    ↓
System calculates: consumption = fuel / (current_km - last_km)
    ↓
Compares with vehicle's rated efficiency
    ↓
Anomaly flag if consumption deviates significantly
    ↓
Admin reviews fuel logs
```

### 3.3 Availability Management
```
Driver marks leave (sick/vacation/personal)
    ↓
System marks driver as UNAVAILABLE
    ↓
Admin sees available drivers only when assigning trips
    ↓
Vehicle goes to maintenance
    ↓
Admin marks vehicle as IN_MAINTENANCE
    ↓
Vehicle hidden from available list during assignment
```

---

## 4. Tech Stack

### Backend (API Server)
| Technology | Purpose |
|-----------|---------|
| **Node.js + Express.js** | HTTP server & routing |
| **TypeScript** | Type safety |
| **Prisma ORM** | Database access layer |
| **PostgreSQL (Neon)** | Cloud database |
| **Socket.io** | Real-time GPS tracking & notifications |
| **JWT** | Authentication (access + refresh tokens) |
| **Multer + Cloudinary** | File/image uploads (fuel receipts) |
| **Zod** | Request validation |
| **Winston** | Logging |
| **node-cron** | Scheduled maintenance reminders |
| **Firebase Admin SDK** | Push notifications |

### Admin Web Panel
| Technology | Purpose |
|-----------|---------|
| **React 18 + Vite** | SPA framework |
| **TypeScript** | Type safety |
| **Tailwind CSS v3** | Styling |
| **shadcn/ui** | Component library |
| **React Router v6** | Navigation |
| **TanStack Query** | Data fetching & caching |
| **Zustand** | Global state management |
| **Socket.io Client** | Real-time updates |
| **Leaflet.js + React-Leaflet** | OpenStreetMap integration |
| **Recharts** | Analytics charts |
| **React Hook Form + Zod** | Form validation |
| **Axios** | HTTP client |

### Mobile App (Employee & Driver)
| Technology | Purpose |
|-----------|---------|
| **React Native + Expo SDK 51** | Cross-platform mobile |
| **NativeWind** | Tailwind-style mobile styling |
| **Zustand** | State management |
| **Expo Router** | File-based navigation |
| **Expo Location** | GPS tracking |
| **Expo Notifications** | Push notifications |
| **Expo Camera / Image Picker** | Fuel receipt photo upload |
| **Socket.io Client** | Real-time connection |
| **React Native Maps / Leaflet WebView** | Map display |
| **TanStack Query** | Data fetching |
| **Axios** | HTTP client |

---

## 5. Project Folder Structure

```
VM/
├── docs/
│   └── concept.txt
├── backend/                          # Express + TypeScript + Prisma
│   ├── prisma/
│   │   ├── schema.prisma             # Full DB schema
│   │   └── migrations/
│   ├── src/
│   │   ├── config/                   # DB, JWT, Firebase, Cloudinary configs
│   │   ├── middleware/               # Auth, error handler, file upload
│   │   ├── modules/
│   │   │   ├── auth/                 # Login, register, refresh token
│   │   │   ├── users/                # Employee & Driver CRUD
│   │   │   ├── vehicles/             # Vehicle CRUD, availability
│   │   │   ├── trips/                # Trip request, assign, status
│   │   │   ├── tracking/             # Socket.io GPS handlers
│   │   │   ├── fuel/                 # Fuel logs, consumption calc
│   │   │   ├── maintenance/          # Maintenance records
│   │   │   ├── notifications/        # Push & in-app notifications
│   │   │   └── reports/              # Analytics & export
│   │   ├── utils/                    # Helpers, validators, logger
│   │   └── server.ts                 # Entry point
│   ├── package.json
│   └── tsconfig.json
│
├── admin-panel/                      # React + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn components
│   │   │   ├── layout/               # Sidebar, topbar, layout wrapper
│   │   │   ├── map/                  # Leaflet map components
│   │   │   └── charts/               # Recharts wrappers
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx         # Analytics overview
│   │   │   ├── Trips.tsx             # Trip requests management
│   │   │   ├── Vehicles.tsx          # Fleet management
│   │   │   ├── Drivers.tsx           # Driver management
│   │   │   ├── Employees.tsx         # Employee management
│   │   │   ├── Tracking.tsx          # Live map view
│   │   │   ├── Fuel.tsx              # Fuel logs
│   │   │   ├── Maintenance.tsx       # Maintenance records
│   │   │   └── Reports.tsx           # Reports & export
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── lib/                      # API client, socket, utils
│   │   ├── store/                    # Zustand stores
│   │   └── types/                    # TypeScript types
│   ├── package.json
│   └── vite.config.ts
│
└── mobile-app/                       # React Native Expo
    ├── app/
    │   ├── (auth)/                   # Login screen
    │   ├── (employee)/               # Employee screens
    │   │   ├── dashboard.tsx
    │   │   ├── request-trip.tsx
    │   │   ├── my-trips.tsx
    │   │   └── trip-detail.tsx
    │   └── (driver)/                 # Driver screens
    │       ├── dashboard.tsx
    │       ├── assigned-trips.tsx
    │       ├── active-trip.tsx       # Live GPS + fuel upload
    │       └── fuel-log.tsx
    ├── components/
    ├── lib/
    ├── store/
    └── package.json
```

---

## 6. Database Schema

### Core Entities

```prisma
// ==================== ENUMS ====================

enum Role {
  ADMIN
  EMPLOYEE
  DRIVER
}

enum TripType {
  ONE_WAY
  ROUND_TRIP
  PICKUP_DROPOFF
}

enum TripStatus {
  PENDING
  APPROVED
  REJECTED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum VehicleStatus {
  AVAILABLE
  IN_USE
  IN_MAINTENANCE
  RETIRED
}

enum DriverStatus {
  AVAILABLE
  ON_TRIP
  ON_LEAVE
  INACTIVE
}

enum LeaveType {
  SICK
  VACATION
  PERSONAL
  HOLIDAY
}

enum MaintenanceType {
  SCHEDULED
  BREAKDOWN
  TIRE_CHANGE
  OIL_CHANGE
  OTHER
}

// ==================== MODELS ====================

model Organization {
  id         String   @id @default(cuid())
  name       String
  createdAt  DateTime @default(now())
  offices    Office[]
  users      User[]
  vehicles   Vehicle[]
}

model Office {
  id             String       @id @default(cuid())
  name           String
  type           String       // HQ, REGIONAL, FACTORY, BRANCH
  address        String
  latitude       Float?
  longitude      Float?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  tripsFrom      Trip[]       @relation("TripFromOffice")
  tripsTo        Trip[]       @relation("TripToOffice")
}

model User {
  id              String      @id @default(cuid())
  name            String
  email           String      @unique
  phone           String?
  passwordHash    String
  role            Role
  employeeId      String?     // Company employee ID
  department      String?
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  profilePhoto    String?
  fcmToken        String?     // Firebase push notification token
  isActive        Boolean     @default(true)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  // Relations
  tripRequests    Trip[]      @relation("TripRequester")
  driverProfile   Driver?
  notifications   Notification[]
  refreshTokens   RefreshToken[]
}

model Driver {
  id              String       @id @default(cuid())
  userId          String       @unique
  user            User         @relation(fields: [userId], references: [id])
  licenseNumber   String       @unique
  licenseExpiry   DateTime
  status          DriverStatus @default(AVAILABLE)
  currentLat      Float?
  currentLng      Float?
  lastLocationAt  DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  // Relations
  assignedTrips   Trip[]
  leaveRequests   DriverLeave[]
  fuelLogs        FuelLog[]
}

model Vehicle {
  id              String        @id @default(cuid())
  registrationNo  String        @unique
  make            String        // Toyota, Ford, etc.
  model           String
  year            Int
  type            String        // Sedan, SUV, Van, Bus, Truck
  capacity        Int           // Passenger capacity
  fuelType        String        // PETROL, DIESEL, CNG, ELECTRIC
  fuelEfficiency  Float         // km/L rated
  status          VehicleStatus @default(AVAILABLE)
  odometer        Float         @default(0) // Current km reading
  organizationId  String
  organization    Organization  @relation(fields: [organizationId], references: [id])
  photo           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  trips           Trip[]
  fuelLogs        FuelLog[]
  maintenanceLogs MaintenanceLog[]
}

model Trip {
  id              String      @id @default(cuid())
  requesterId     String
  requester       User        @relation("TripRequester", fields: [requesterId], references: [id])
  vehicleId       String?
  vehicle         Vehicle?    @relation(fields: [vehicleId], references: [id])
  driverId        String?
  driver          Driver?     @relation(fields: [driverId], references: [id])
  fromOfficeId    String
  fromOffice      Office      @relation("TripFromOffice", fields: [fromOfficeId], references: [id])
  toOfficeId      String
  toOffice        Office      @relation("TripToOffice", fields: [toOfficeId], references: [id])
  purpose         String
  tripType        TripType
  status          TripStatus  @default(PENDING)
  departureAt     DateTime
  returnAt        DateTime?   // For round trips
  startedAt       DateTime?   // When driver actually started
  completedAt     DateTime?   // When driver completed
  startOdometer   Float?
  endOdometer     Float?
  distanceCovered Float?
  adminNotes      String?
  rejectionReason String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  // Relations
  passengers      TripPassenger[]
  trackingPoints  TrackingPoint[]
  fuelLogs        FuelLog[]
}

model TripPassenger {
  id       String @id @default(cuid())
  tripId   String
  trip     Trip   @relation(fields: [tripId], references: [id])
  userId   String
  name     String // In case external person
  email    String?
}

model TrackingPoint {
  id        String   @id @default(cuid())
  tripId    String
  trip      Trip     @relation(fields: [tripId], references: [id])
  driverId  String
  latitude  Float
  longitude Float
  speed     Float?   // km/h
  heading   Float?   // degrees
  timestamp DateTime @default(now())

  @@index([tripId, timestamp])
}

model FuelLog {
  id              String   @id @default(cuid())
  vehicleId       String
  vehicle         Vehicle  @relation(fields: [vehicleId], references: [id])
  driverId        String
  driver          Driver   @relation(fields: [driverId], references: [id])
  tripId          String?
  trip            Trip?    @relation(fields: [tripId], references: [id])
  odometerReading Float    // km at time of refuel
  fuelAdded       Float    // Liters
  pricePerLiter   Float
  totalCost       Float
  receiptPhoto    String   // Cloudinary URL
  stationName     String?
  notes           String?
  consumptionRate Float?   // Calculated: L/100km
  isAnomaly       Boolean  @default(false)
  loggedAt        DateTime @default(now())
  createdAt       DateTime @default(now())
}

model MaintenanceLog {
  id             String          @id @default(cuid())
  vehicleId      String
  vehicle        Vehicle         @relation(fields: [vehicleId], references: [id])
  type           MaintenanceType
  description    String
  cost           Float?
  odometerAt     Float?
  scheduledAt    DateTime?
  completedAt    DateTime?
  isCompleted    Boolean         @default(false)
  notes          String?
  createdAt      DateTime        @default(now())
}

model DriverLeave {
  id          String    @id @default(cuid())
  driverId    String
  driver      Driver    @relation(fields: [driverId], references: [id])
  leaveType   LeaveType
  startDate   DateTime
  endDate     DateTime
  reason      String?
  isApproved  Boolean   @default(false)
  createdAt   DateTime  @default(now())
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  title     String
  body      String
  type      String   // TRIP_UPDATE, FUEL_ALERT, MAINTENANCE, GENERAL
  isRead    Boolean  @default(false)
  data      Json?    // Extra payload
  createdAt DateTime @default(now())
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

---

## 7. API Endpoints

### Auth
```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
```

### Users
```
GET    /api/users                     # Admin: list all users
POST   /api/users                     # Admin: create user
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
PUT    /api/users/:id/status          # Activate/deactivate
GET    /api/users/:id/fcm-token       # Update push token
```

### Vehicles
```
GET    /api/vehicles                  # List vehicles (with availability filter)
POST   /api/vehicles                  # Admin: add vehicle
GET    /api/vehicles/:id
PUT    /api/vehicles/:id
DELETE /api/vehicles/:id
GET    /api/vehicles/available        # Filter by date/time
PUT    /api/vehicles/:id/status       # Update status
```

### Trips
```
POST   /api/trips                     # Employee: create request
GET    /api/trips                     # Admin: all trips | Employee: own trips | Driver: assigned
GET    /api/trips/:id
PUT    /api/trips/:id/approve         # Admin: approve + assign vehicle & driver
PUT    /api/trips/:id/reject          # Admin: reject with reason
PUT    /api/trips/:id/start           # Driver: start journey
PUT    /api/trips/:id/complete        # Driver: complete journey
PUT    /api/trips/:id/cancel          # Admin/Employee: cancel
GET    /api/trips/:id/tracking        # Get GPS trail
```

### Fuel
```
POST   /api/fuel                      # Driver: log fuel
GET    /api/fuel                      # Admin: all logs | Driver: own logs
GET    /api/fuel/:vehicleId           # Logs for specific vehicle
GET    /api/fuel/anomalies            # Admin: anomaly alerts
```

### Maintenance
```
GET    /api/maintenance
POST   /api/maintenance               # Admin: schedule maintenance
PUT    /api/maintenance/:id/complete  # Mark as done
```

### Drivers
```
GET    /api/drivers/available         # Available drivers for a date/time
POST   /api/drivers/:id/leave         # Driver: request leave
GET    /api/drivers/:id/leaves        # Leave history
```

### Reports
```
GET    /api/reports/trips             # Trip summary report
GET    /api/reports/fuel              # Fuel consumption report
GET    /api/reports/vehicles          # Vehicle utilization
GET    /api/reports/drivers           # Driver performance
```

### Tracking (Socket.io events)
```
// Driver emits:
socket.emit('location:update', { lat, lng, speed, heading, tripId })

// Server broadcasts to Admin room:
socket.to('admin').emit('vehicle:location', { driverId, vehicleId, lat, lng, ... })

// Driver emits:
socket.emit('trip:started', { tripId })
socket.emit('trip:completed', { tripId, endOdometer })
```

---

## 8. Key Features

### 🗺️ Real-time Tracking
- Driver's mobile app broadcasts GPS every 5 seconds via Socket.io
- Admin panel shows live markers on Leaflet/OpenStreetMap
- Marker moves smoothly with interpolation
- Full route polyline stored in `TrackingPoint` table
- Distance auto-calculated from GPS points

### ⛽ Fuel Transparency
- Driver uploads: odometer, liters, price/L, receipt photo
- System calculates actual vs rated consumption
- **Anomaly alert** if deviation > 20%
- All records are tamper-evident (timestamped + photo)

### 🔔 Notifications
- Firebase Cloud Messaging for mobile push notifications
- In-app notification center
- Events: trip approved/rejected, driver assigned, trip started/completed, fuel anomaly

### 📊 Admin Dashboard
- KPI cards: active trips, vehicles on road, fuel spent today
- Live map with all vehicle locations
- Recent trip requests with quick approve/reject
- Fuel consumption chart (last 30 days)
- Vehicle utilization rates

### 📱 Role-based Mobile Experience
- **Employee**: Request trip → Track status → View history
- **Driver**: View assigned trips → Start journey (GPS auto-starts) → Upload fuel → Complete

---

## 9. 4-Day Execution Plan

### Day 1 — Backend Foundation
- [ ] Init Express + TypeScript + Prisma project
- [ ] Set up Neon PostgreSQL, run migrations
- [ ] Implement Auth module (JWT + refresh tokens)
- [ ] User, Vehicle, Driver, Office CRUD APIs
- [ ] Set up Socket.io server

### Day 2 — Core Business Logic
- [ ] Trip request, approval, assignment APIs
- [ ] Trip status lifecycle (start, complete, cancel)
- [ ] Real-time GPS tracking via Socket.io
- [ ] Fuel logging with anomaly detection
- [ ] Push notifications (Firebase)

### Day 3 — Admin Panel
- [ ] Vite + React + Tailwind + shadcn/ui setup
- [ ] Dashboard page with KPI cards + charts
- [ ] Trip management page (list, approve, assign)
- [ ] Live tracking map (Leaflet + Socket.io)
- [ ] Vehicle & Driver management pages
- [ ] Fuel & Maintenance pages

### Day 4 — Mobile App + Polish
- [ ] Expo setup, auth screens, role routing
- [ ] Employee: trip request form + history
- [ ] Driver: assigned trips + start journey + GPS + fuel upload
- [ ] End-to-end testing
- [ ] Deploy backend to Railway/Render, admin to Vercel
- [ ] Demo recording + documentation

---

## 10. Interview Highlights

> These are the points to emphasize during your explanation:

1. **SDLC Approach**: Requirements → System Design → Database Design → Implementation → Testing → Deployment
2. **Scalable Architecture**: Module-based backend with separation of concerns
3. **Real-time Architecture**: Socket.io rooms — Admin room, per-trip rooms, driver socket management
4. **Fuel Transparency System**: Photo-verified, anomaly-detected — prevents theft
5. **Role-based Access Control**: JWT with role middleware protecting all routes
6. **Data Integrity**: Prisma transactions for trip assignment (vehicle + driver status update atomically)
7. **Mobile-first Driver Experience**: GPS runs as background task via Expo `expo-location` background
8. **OpenStreetMap Integration**: Free, no API key limits, better for enterprise use
9. **Cloud-native**: Neon serverless Postgres, Cloudinary for images, Firebase for push notifications
10. **Type Safety End-to-End**: TypeScript on backend + Zod validation + Prisma types flow through to frontend

---

*Generated for AppTriangle Limited hiring task — Vehicle Management System*
