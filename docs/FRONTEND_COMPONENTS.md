# Apex VMS — Frontend Admin Panel Architecture & Components

The Admin Panel is a high-performance, dark-themed operations dashboard built with **React 18**, **Tailwind CSS**, **Zustand**, and **Socket.io-client**.

---

## 1. Application Layout & Navigation

### 1.1 Sidebar Navigation (`src/components/layout/Sidebar.tsx`)
Pinned navigation providing direct access to operational modules:
- **Dashboard Overview** (`/dashboard`)
- **Live Fleet Tracking** (`/tracking`) — with active `LIVE` indicator
- **Trip Requests & Dispatch** (`/trips`)
- **Fleet Chat** (`/chat`) — with real-time unread counter
- **Vehicles Management** (`/fleet`)
- **Drivers & Availability** (`/drivers`)
- **Employee Directory** (`/employees`)
- **Fuel Logs & Anti-Theft** (`/fuel`) — with `AUDIT` indicator
- **Maintenance Schedule** (`/maintenance`)

### 1.2 Header Bar (`src/components/layout/Header.tsx`)
- System status indicator (Online / Live WebSocket connected)
- Logged-in Administrator profile details
- Direct shortcut to Live Map and Notifications

---

## 2. Core Operational Pages

### 2.1 Dashboard Overview (`src/pages/Dashboard.tsx`)
- **KPI Metrics Ribbon:** Active fleet utilization, in-transit units, pending requisitions, and fuel volume.
- **Fuel Audit Banner:** Immediate high-priority warning if an anomaly is detected in fuel logs.
- **OpenStreetMap Live Stream:** Real-time visual tracking of vehicles currently reporting coordinates over WebSockets.
- **Pending Dispatch Queue:** Requisition cards with employee details, department, nationwide route, departure time, and accompanying colleagues list.
- **Send Notification Panel:**
  - Select target: `ALL`, `ALL_EMPLOYEES`, `ALL_DRIVERS`, `TRIP`, or `USER`.
  - Sends immediate push payload and emits WebSocket event `notification:new`.

### 2.2 Corporate Employee Directory (`src/pages/EmployeesPage.tsx`)
- Complete directory of corporate employees with active requisition privileges.
- Live search filtering by Name, Email, Employee ID (`EMP-xxx`), or Department.
- Quick **Copy ID** and **Copy Credentials** buttons to onboard new staff effortlessly.
- **Add Employee Modal:** Provisions new corporate employee with automated ID assignment (`EMP-105`) and default password.

### 2.3 Drivers & Duty Status (`src/pages/DriversPage.tsx`)
- Displays all driver profiles with Driver Login ID (`DRV-xxx`), license numbers, expiry dates, and phone numbers.
- Duty status selector: `AVAILABLE`, `ON_TRIP`, `ON_LEAVE`, `INACTIVE`.
- **Add Driver Modal:** Provisions new driver profile, license credentials, and login credentials.

### 2.4 Trip Requests & Dispatch (`src/pages/TripsPage.tsx`)
- Filter tabs: `ALL`, `PENDING`, `APPROVED`, `IN_PROGRESS`, `COMPLETED`.
- Action buttons:
  - `Assign Vehicle & Driver` (Opens `AssignTripModal`)
  - `Reject Request` (Prompts for justification)
  - `Start Journey` (Simulates or begins trip)
  - `Complete Trip` (Prompts for ending odometer)
  - `Open Trip Chat` (Direct routing to dedicated conversation thread)

### 2.5 Vehicle Management (`src/pages/FleetPage.tsx`)
- Full fleet registry with status badges (`AVAILABLE`, `IN_USE`, `IN_MAINTENANCE`, `RETIRED`).
- Add Vehicle modal with registration number, make, model, type, fuel efficiency, and initial odometer.

### 2.6 Fuel Logs & Anti-Theft Audit (`src/pages/FuelPage.tsx`)
- Fuel purchase table with calculated consumption rates ($km/L$).
- Automated anomaly detection flag ($\Delta > 25\%$ from rated efficiency).
- Receipt image preview and station details.

### 2.7 Live Tracking Console (`src/pages/LiveTrackingPage.tsx`)
- Full-screen interactive map with animated vehicle markers.
- Side list of vehicles with live speed, heading, and driver details.
