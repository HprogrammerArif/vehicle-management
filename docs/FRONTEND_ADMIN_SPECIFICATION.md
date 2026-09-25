# Apex VMS — Frontend Admin Panel Specification

## 1. Overview
The Apex VMS Admin Panel is a mission-critical web dashboard designed for Fleet Managers, Operations Directors, and Logistics Dispatchers. It provides executive oversight, anti-theft fuel audits, real-time telemetry streaming, multi-passenger vehicle allocation, and broadcast communication.

- **Framework**: React 18 with TypeScript & Vite
- **Styling**: TailwindCSS with bespoke dark glassmorphism aesthetic (`#020617` obsidian background, `#0f172a` slate cards, indigo & emerald accents)
- **State Management**: Zustand (`useStore.ts`)
- **Map & Telemetry Engine**: Leaflet with `react-leaflet`, custom SVG vehicle markers, and path rendering
- **Icons**: Lucide React

---

## 2. Core Modules & Screen Breakdown

### 2.1 Executive Operations Center (`Dashboard.tsx`)
The primary mission-control console:
1. **Executive KPI Ribbon**:
   - Total Fleet Count with utilization percentage
   - In-Transit Live Missions
   - Fuel Anomaly Watchdog counter
   - Pending Requisition Queue size
2. **Fuel Audit Alert Banner**:
   - Automatically surfaces when refuel logs deviate from the rated vehicle efficiency (anti-theft detection).
   - Direct shortcut to investigate fuel receipts.
3. **Live Fleet Map (`LiveFleetMap.tsx`)**:
   - Interactive OpenStreetMap view of Bangladesh (Dhaka, Gazipur, Chittagong, Sylhet).
   - Vehicle markers color-coded by status (Green: Moving / On Trip, Blue: Available / Parked).
   - Clickable popups showing driver name, current speed (km/h), and destination.
4. **Pending Requisitions Queue**:
   - Real-time list of all trips awaiting dispatch.
   - Intelligently renders route using `routeLabel()` helper:
     - Office-to-Office routes: `Dhaka HQ → Chittagong Port`
     - Custom Free-Text routes: `📍 Custom Location: Gulshan-1, Dhaka → Karnaphuli EPZ`
   - Accompanying colleague chips showing Employee ID (e.g. `Sarah Smith (EMP-109)`).
   - "Assign Vehicle & Driver" dispatch button.
5. **Multi-Channel Notification Dispatcher**:
   - Dedicated administrative broadcasting card.
   - Target Audience Selector:
     - `👤 All Employees`: Delivers announcement to all active staff.
     - `🚗 All Drivers`: Delivers operational alert to all registered drivers.
     - `📢 Everyone`: Company-wide emergency or holiday broadcast.
     - `🛣️ Specific Trip`: Enter Trip ID; delivers targeted update to requester, assigned driver, and accompanying colleagues.
     - `🎯 Specific Person`: Enter Employee ID or email; delivers targeted personal notification.
   - Title, message body, and instant WebSocket dispatch with live feedback.

---

### 2.2 Trip Management & Allocation (`TripsPage.tsx` & `AssignTripModal.tsx`)
1. **Tabbed Trip Filtering**:
   - `ALL`, `PENDING`, `APPROVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
2. **Trip Card Architecture**:
   - Route banner indicating Office destinations or `📍 Custom Location` badge.
   - Accompaniment roster displaying all colleagues with employee IDs and departments.
   - Assigned vehicle plate, driver photo/name, start/end odometer, and actual distance covered.
3. **Allocation Modal (`AssignTripModal.tsx`)**:
   - Intelligent dropdown of Available Vehicles (filtered by status and maintenance lockouts).
   - Intelligent dropdown of Available Drivers (checks BRTA license expiration and leave status).
   - Dispatcher notes and instant confirmation.

---

### 2.3 Anti-Theft Fuel Audit & Telemetry (`FuelPage.tsx`)
1. **Refuel Log Verification**:
   - Fuel volume (L), total cost (BDT), and odometer reading.
   - Receipt attachment viewer with image modal.
2. **Anomaly Engine**:
   - Calculates effective efficiency: `(Current Odometer - Last Odometer) / Fuel Volume`.
   - Flags anomalies in red when consumption is >25% higher than rated manufacturer specifications.

---

### 2.4 Driver Management & Leave Roster (`DriversPage.tsx`)
- Driver profiles with BRTA license tracking.
- Leave request management (Sick, Casual, Annual) with one-click approve/reject.
- Real-time duty availability indicators.

---

### 2.5 Dispatcher & Incident Chat (`ChatPage.tsx`)
- Multi-channel real-time messaging with Socket.io.
- Trip-scoped chat threads automatically created upon trip approval.
- Incident report resolution workflow.

---

## 3. Styling & Design Tokens
- **Background**: `bg-slate-950` (`#020617`)
- **Card Surface**: `bg-slate-900/60` with backdrop-blur and `border-slate-800`
- **Primary Accent**: Indigo (`#4f46e5`, `#6366f1`)
- **Success / In-Transit**: Emerald (`#10b981`, `#34d399`)
- **Warning / Pending**: Amber (`#f59e0b`, `#fbbf24`)
- **Critical / Anomaly**: Rose (`#f43f5e`, `#ef4444`)
