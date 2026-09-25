# Apex VMS — Complete Backend API Reference

Base URL: `http://localhost:5000/api` (Local) / `http://<LAN_IP>:5000/api` (Mobile)

All protected routes require an HTTP Header:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. Authentication & User Management (`/api/auth`)

### `POST /api/auth/login`
Authenticates a user via Employee/Driver ID or email address.
- **Request Body:**
  ```json
  {
    "identifier": "EMP-104",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cmugf89...",
      "name": "Johnathan Doe",
      "email": "john.doe@vms.com",
      "role": "EMPLOYEE",
      "department": "Engineering",
      "employeeId": "EMP-104",
      "driverId": null,
      "organization": "AppTriangle Corporate Fleet"
    }
  }
  ```

### `GET /api/auth/me`
Fetches current session user profile. Requires token.

### `GET /api/auth/lookup-employee?employeeId=EMP-104`
Public directory query to find an employee by their ID. Used for passenger search when booking vehicle requisitions.

### `POST /api/auth/users` *(ADMIN Only)*
Provisions a new corporate Employee or Driver account.
- **Request Body:**
  ```json
  {
    "name": "Kamal Uddin",
    "email": "kamal@vms.com",
    "role": "DRIVER",
    "employeeId": "DRV-204",
    "licenseNumber": "DL-994821",
    "licenseExpiry": "2028-10-01",
    "phone": "+880 1711-234567",
    "password": "password123"
  }
  ```

### `GET /api/auth/users` *(ADMIN Only)*
Lists system users. Supports query params `?role=EMPLOYEE|DRIVER|ADMIN` and `?search=...`.

### `DELETE /api/auth/users/:id` *(ADMIN Only)*
Soft-deactivates an employee or driver.

---

## 2. Vehicle Requisitions & Trips (`/api/trips`)

### `POST /api/trips`
Submits a new vehicle requisition.
- **Request Body:**
  ```json
  {
    "pickupAddress": "Gulshan-1 HQ, Dhaka",
    "dropoffAddress": "Gazipur Regional Plant",
    "fromOfficeId": null,
    "toOfficeId": null,
    "departureAt": "2026-09-26T08:30:00.000Z",
    "returnAt": "2026-09-26T18:00:00.000Z",
    "purpose": "Quarterly hardware audit and site inspection",
    "tripType": "ROUND_TRIP",
    "passengers": [
      {
        "userId": "cmugf89010...",
        "employeeId": "EMP-109",
        "name": "Sarah Smith",
        "department": "Quality Assurance"
      }
    ]
  }
  ```

### `GET /api/trips/my`
Returns logged-in user's own trips (all requisitioned trips for Employee, all assigned trips for Driver).

### `GET /api/trips`
Returns trips for admin dispatch queue. Query params: `?status=PENDING|APPROVED|IN_PROGRESS|COMPLETED`.

### `PUT /api/trips/:id/approve` *(ADMIN Only)*
Approves trip and assigns vehicle and driver.
- **Request Body:**
  ```json
  {
    "vehicleId": "veh_01",
    "driverId": "drv_01",
    "adminNotes": "Approved for official visit"
  }
  ```
- **Side effects:**
  - Updates vehicle status to `IN_USE`
  - Updates driver status to `ON_TRIP`
  - Emits real-time notification socket event to requester & driver
  - Generates dedicated trip chat thread

### `PUT /api/trips/:id/reject` *(ADMIN Only)*
Rejects trip request with justification reason.

### `PUT /api/trips/:id/start` *(DRIVER & ADMIN)*
Commences trip and initiates live GPS telemetry stream.

### `PUT /api/trips/:id/complete` *(DRIVER & ADMIN)*
Finalizes trip with final odometer reading:
- **Request Body:**
  ```json
  {
    "endOdometer": 34850
  }
  ```
- Releases vehicle (`AVAILABLE`) and driver (`AVAILABLE`).

---

## 3. Fleet Vehicles (`/api/vehicles`)

- `GET /api/vehicles` — Full vehicle registry with odometer, type, and status
- `GET /api/vehicles/available` — Vehicles currently available for dispatch
- `POST /api/vehicles` — Register new fleet vehicle
- `PUT /api/vehicles/:id` — Update vehicle details
- `DELETE /api/vehicles/:id` — Retire/remove vehicle

---

## 4. Drivers (`/api/drivers`)

- `GET /api/drivers` — Full driver registry with license numbers and status
- `GET /api/drivers/available` — Drivers currently ready for dispatch
- `PUT /api/drivers/:id/status` — Update driver status (`AVAILABLE`, `ON_TRIP`, `ON_LEAVE`, `INACTIVE`)
- `POST /api/drivers/leave` — Submit leave request
- `PUT /api/drivers/leave/:leaveId` — Approve/reject leave request

---

## 5. Live Telemetry & GPS Tracking (`/api/tracking`)

- `GET /api/tracking/fleet` — Latest live coordinates and telemetry for all active fleet vehicles
- `GET /api/tracking/route/:tripId` — Historical breadcrumb points recorded during a specific trip
- `POST /api/tracking/simulate/:tripId` — Server-side simulation of a trip trajectory for testing

---

## 6. Fuel Logs & Anti-Theft Audit (`/api/fuel`)

- `GET /api/fuel` — List fuel purchase records with anomaly tags
- `GET /api/fuel/analytics` — Fleet consumption trends, anomaly rates, cost per km
- `POST /api/fuel` — Driver submits fuel receipt, liters added, price, and odometer

---

## 7. Notifications (`/api/notifications`)

- `GET /api/notifications/my` — User's personal notification inbox and unread count
- `PATCH /api/notifications/:id/read` — Mark specific notification as read
- `PATCH /api/notifications/read-all` — Mark entire inbox as read
- `POST /api/notifications/send` *(ADMIN Only)* — Dispatch target notification:
  - `target: 'ALL' | 'ALL_EMPLOYEES' | 'ALL_DRIVERS' | 'TRIP' | 'USER'`
  - Real-time broadcast over Socket.io `notification:new`
