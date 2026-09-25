# Apex VMS — Backend System Specification & API Documentation

## 1. System Overview
The Apex Vehicle Management System (VMS) backend is an enterprise-grade REST and real-time WebSocket service designed for corporate vehicle requisition, multi-plant fleet allocation, anti-theft fuel monitoring, and live telemetry tracking.

- **Runtime**: Node.js 18+ / 20+
- **Framework**: Express.js with TypeScript
- **ORM & Database**: Prisma ORM with SQLite (Development) / PostgreSQL (Production)
- **Real-time Gateway**: Socket.io 4.8+ with bidirectional room multiplexing
- **Authentication**: JWT (JSON Web Tokens) with BCrypt password hashing and role-based middleware
- **File Storage**: Static uploads directory served at `/uploads` for fuel receipts and incident attachments

---

## 2. Role-Based Access Control (RBAC) Matrix

| Endpoint Group | ADMIN (Fleet Mgr) | EMPLOYEE | DRIVER |
|---|:---:|:---:|:---:|
| **Auth & Me** | Full | Full | Full |
| **Employee Lookup** | Full | Full | Full |
| **Offices Management** | Read / Write | Read Only | Read Only |
| **Vehicles Management** | Full CRUD | Read Available | Read Assigned |
| **Drivers Management** | Full CRUD | Read Only | Read Profile & Leave |
| **Trip Request** | Full | Create & View Own | View Assigned |
| **Trip Approval / Rejection** | Full | Forbidden | Forbidden |
| **Trip Journey Start / Complete**| Full | Forbidden | Own Assigned Trip |
| **Live GPS Telemetry (View)** | Full Fleet Map | Trip-Scoped | Forbidden |
| **Live GPS Telemetry (Stream)**| Simulated | Forbidden | High-Precision Native Stream |
| **Fuel Refuel Logging** | Full Audit | Forbidden | Create with Receipt |
| **Maintenance Logging** | Full CRUD | Forbidden | Forbidden |
| **Notifications (Send)** | Broadcast All / Trip / User | Forbidden | Forbidden |
| **Notifications (Inbox)** | Full | Own Notifications | Own Notifications |
| **Chat & Dispatch Threads** | Full (All Threads) | Trip & Support Threads | Assigned Trip Threads |

---

## 3. Data Models & Prisma Schema

### 3.1 User & Driver
- `User`: Handles credentials, role (`ADMIN`, `EMPLOYEE`, `DRIVER`), corporate `employeeId` (e.g., `EMP-104`, `DRV-201`, `ADM-001`), department, phone, and optional FCM token.
- `Driver`: 1-to-1 profile linked to `User`. Contains `licenseNumber`, `licenseExpiry`, operational `status` (`AVAILABLE`, `ON_TRIP`, `ON_LEAVE`, `INACTIVE`), and latest GPS fix (`currentLat`, `currentLng`, `lastLocationAt`).

### 3.2 Vehicle
- Contains `registrationNo`, `make`, `model`, `year`, `type`, `fuelType`, `tankCapacity`, `ratedEfficiencyKmPerL`, `odometer`, `status` (`AVAILABLE`, `IN_USE`, `MAINTENANCE`, `RETIRED`), `assignedOfficeId`, and maintenance alert thresholds.

### 3.3 Trip & TripPassenger
- `Trip`:
  - Requester: `requesterId` (foreign key to `User`)
  - Vehicle: `vehicleId` (nullable, assigned upon approval)
  - Driver: `driverId` (nullable, assigned upon approval)
  - Offices or Custom Locations:
    - Office pickup: `fromOfficeId`
    - Office dropoff: `toOfficeId`
    - **Custom pickup**: `pickupAddress` (free text anywhere in country)
    - **Custom destination**: `dropoffAddress` (free text anywhere in country)
  - Timestamps: `departureAt`, `returnAt`, `startedAt`, `completedAt`
  - Odometers: `startOdometer`, `endOdometer`, `distanceCovered`
  - Status: `PENDING`, `APPROVED`, `REJECTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `TripPassenger`:
  - `tripId`: Foreign key to `Trip`
  - `userId`: Optional foreign key to `User` (populated if colleague is registered)
  - `employeeId`: Corporate ID (e.g., `EMP-109`)
  - `name`: Full passenger name
  - `email`, `department`, `phone`: Contact details

### 3.4 Notifications
- `Notification`:
  - `userId`: Foreign key to recipient `User`
  - `title`: Subject line
  - `body`: Notification message
  - `type`: `TRIP_APPROVED`, `TRIP_REJECTED`, `TRIP_ASSIGNED`, `TRIP_STARTED`, `TRIP_COMPLETED`, `FUEL_ANOMALY`, `MAINTENANCE`, `GENERAL`
  - `isRead`: Boolean read receipt status
  - `data`: Serialized JSON payload for deep-linking
  - `createdAt`: Timestamp

---

## 4. REST API Specification

### 4.1 Authentication & Profile (`/api/auth`)
- **`POST /api/auth/login`**
  - Body: `{ identifier: string, password: string }`
  - Note: `identifier` accepts either `employeeId` (e.g., `EMP-104`, `DRV-201`) or `email`.
  - Returns: `{ success: true, token: string, user: UserObject }`
- **`GET /api/auth/me`**
  - Headers: `Authorization: Bearer <token>`
  - Returns current authenticated user and linked driver profile (if driver).
- **`GET /api/auth/lookup-employee?employeeId=EMP-104`**
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ success: true, data: { id, name, email, employeeId, department, phone } }`
  - Returns `404` if no matching active employee exists. Used dynamically by mobile requisition modal.
- **`PATCH /api/auth/fcm-token`**
  - Body: `{ fcmToken: string }`
  - Registers device push notification token.

### 4.2 Requisition & Trips (`/api/trips`)
- **`POST /api/trips`** (Employee / Admin)
  - Body:
    ```json
    {
      "fromOfficeId": "optional_office_id",
      "toOfficeId": "optional_office_id",
      "pickupAddress": "Gulshan-1, Dhaka (Custom Pickup)",
      "dropoffAddress": "Karnaphuli EPZ, Chittagong (Custom Dropoff)",
      "departureAt": "2026-09-25T14:00:00.000Z",
      "purpose": "Factory inspection and supplier audit",
      "tripType": "ONE_WAY",
      "passengers": [
        {
          "userId": "cmuf7st1g0005f6wpjjn8vjs3",
          "employeeId": "EMP-109",
          "name": "Sarah Smith",
          "department": "Quality Assurance",
          "phone": "+880 1913 444555"
        }
      ]
    }
    ```
- **`GET /api/trips/my`** (Employee / Driver)
  - Returns logged-in user's own requested trips (for Employees) or assigned trips (for Drivers).
- **`GET /api/trips`** (Admin)
  - Query params: `?status=PENDING&vehicleId=...&driverId=...`
- **`PUT /api/trips/:id/approve`** (Admin)
  - Body: `{ vehicleId: string, driverId: string, adminNotes?: string }`
  - Atomically sets trip to `APPROVED`, vehicle to `IN_USE`, driver to `ON_TRIP`.
  - Automatically creates notifications for Requester, Driver, and registered Passengers.
  - Automatically upserts a real-time `Conversation` thread with Requester, Driver, and Admin.
- **`PUT /api/trips/:id/reject`** (Admin)
  - Body: `{ rejectionReason: string }`
  - Sets trip to `REJECTED` and dispatches alert notifications.
- **`PUT /api/trips/:id/start`** (Driver / Admin)
  - Body: `{ startOdometer?: number }`
  - Sets trip to `IN_PROGRESS` and notifies requester.
- **`PUT /api/trips/:id/complete`** (Driver / Admin)
  - Body: `{ endOdometer: number }`
  - Calculates `distanceCovered`, updates vehicle odometer, releases vehicle and driver to `AVAILABLE`, and sends completion notifications.

### 4.3 Notification Engine (`/api/notifications`)
- **`GET /api/notifications/my`**
  - Returns up to 50 latest notifications with unread badge count.
- **`PATCH /api/notifications/:id/read`**
  - Marks single notification as read.
- **`PATCH /api/notifications/read-all`**
  - Marks all user notifications as read.
- **`POST /api/notifications/send`** (Admin Only)
  - Body:
    ```json
    {
      "title": "Severe Cyclone Warning — Coastal Route Alert",
      "body": "All vehicles headed to Chittagong Port must delay departure.",
      "type": "GENERAL",
      "target": "ALL_EMPLOYEES" // Options: ALL, ALL_EMPLOYEES, ALL_DRIVERS, TRIP, USER
      "tripId": "optional_trip_id",
      "userId": "optional_user_or_employee_id"
    }
    ```
  - Dispatches database records and broadcasts real-time `notification:new` WebSocket events.

---

## 5. WebSocket Real-time Protocol

The WebSocket gateway runs on Socket.io. Clients connect to `http://localhost:5000` (or production host).

### 5.1 Connection & Presence
```javascript
socket.emit('user:online', { userId, name, role });
```
- Emits presence event. Updates in-memory active sockets and broadcasts `presence:sync`.

### 5.2 Real-time GPS Telemetry Stream
- **Driver Mobile App**:
  ```javascript
  socket.emit('location:update', {
    tripId: "cmuf7t5jg000rf6wpydjqjr8x",
    vehicleId: "cmuf7t2m6000lf6wpsjwhb0i5",
    driverId: "cmuf7sv730009f6wp06cs1lke",
    lat: 23.7925,
    lng: 90.4078,
    speed: 55.4,
    heading: 90
  });
  ```
- **Admin Fleet Map Listener**:
  ```javascript
  socket.emit('join:admin');
  socket.on('fleet:location_update', (telemetry) => { ... });
  ```

### 5.3 Notifications Stream
- Event: `notification:new`
- Payload: `{ title, body, type, target, recipientUserIds, createdAt }`
- Client side: if recipient ID matches current user ID or target is role-compatible, unread count badge increments immediately.
