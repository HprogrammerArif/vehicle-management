# Apex VMS — Mobile Application Specification (Employee & Driver)

## 1. Architecture & Native Stack
The Apex VMS Mobile App is a unified React Native application built with Expo for both corporate Employees and fleet Drivers. The application dynamically adjusts its routing, navigation tabs, and permissions based on the authenticated user's role.

- **Framework**: React Native 0.76+ with Expo SDK 52
- **Routing**: Expo Router v4 (file-based routing with `app/(employee)` and `app/(driver)` groups)
- **State Store**: Zustand (`useMobileStore.ts`)
- **Telemetry Hardware**: `expo-location` (High-accuracy GPS background and foreground watch position)
- **Networking**: Axios / Fetch with automatic JWT bearer attachment
- **Real-time Client**: `socket.io-client` with automatic reconnection and presence announcements

---

## 2. Universal Role-Based Login (`app/index.tsx`)
Users log in with administrator-provisioned corporate credentials:
- **Employee ID / Driver ID / Email**: Accepts `EMP-104`, `DRV-201`, or standard corporate email.
- **Password**: User-assigned secure password.
- **Routing Logic**:
  - If `role === 'EMPLOYEE'`: routes to `app/(employee)/my-trips.tsx`
  - If `role === 'DRIVER'`: routes to `app/(driver)/active-trip.tsx`
  - Emits `socket.emit('user:online', { userId, name, role })` upon authentication.

---

## 3. Employee Workflows

### 3.1 Corporate Vehicle Requisition (`app/(employee)/request-trip.tsx`)
Allows any corporate staff member to requisition transportation across Bangladesh:
1. **Custom Geolocation Inputs**:
   - **Pickup Location**: Supports either free-text custom address (e.g., *Plot 15, Gulshan-1, Dhaka*) or corporate office.
   - **Destination / Drop-off**: Supports free-text custom destination anywhere in the country (e.g., *Karnaphuli EPZ, Chattogram*).
2. **Trip Configuration**:
   - Trip Type selector: `➡️ One Way`, `🔄 Round Trip`, `🔁 Pickup & Drop-off`.
   - Departure Date & Time inputs.
   - Official Corporate Purpose text area.
3. **Dynamic Colleague Roster (Database-Driven)**:
   - Search input accepting Employee ID (e.g. `EMP-109`).
   - Hits `GET /api/auth/lookup-employee?employeeId=...` against the backend.
   - If found: previews colleague card with avatar, name, department, and phone number.
   - Adds colleague to the passenger manifest. Prevents duplicate additions or self-addition.
   - Supports adding multiple accompanying colleagues.
   - If not found: shows inline warning "No employee found with that ID".

### 3.2 My Requisitions (`app/(employee)/my-trips.tsx`)
1. Real-time listing of all submitted requisitions with status badges:
   - `Pending Review` (Amber)
   - `Approved` (Green)
   - `In Progress` (Cyan)
   - `Completed` (Indigo)
   - `Rejected` (Rose)
2. Displays origin and destination (with `📍 Custom Location` badge when applicable).
3. Displays assigned Vehicle (`Make Model · Plate`) and Driver (`Name · Phone`).
4. Displays accompanying colleagues tags (`👤 Name (EMP-ID)`).

### 3.3 Employee Notification Center (`app/(employee)/notifications.tsx`)
1. Notification cards categorized with icons:
   - ✅ Trip Approved & Dispatched
   - 🚗 New Vehicle & Driver Assigned
   - 🚀 Trip Journey Started
   - 🏁 Trip Arrived & Concluded
   - ❌ Trip Rejected
   - 📢 General Corporate Broadcast
2. Unread indicator dots and counter badge.
3. "Mark all read" and swipe-to-read actions.

---

## 4. Driver Workflows

### 4.1 Active Trip Console (`app/(driver)/active-trip.tsx`)
1. **Automatic Assignment Detection**:
   - On load, fetches driver's assigned trips via `tripsApi.getMyTrips()`.
   - If no active trip: displays "Standby Status: Available" with pull-to-refresh.
   - If assigned: binds to the vehicle and route.
2. **Route & Passenger Manifest**:
   - Displays pickup address and destination.
   - Displays passenger count, colleague names, employee IDs, and trip purpose.
3. **Live GPS Telemetry Activation**:
   - Tapping "🚀 Start Journey" requests native foreground location permission.
   - Calls `PUT /api/trips/:id/start` to mark the trip `IN_PROGRESS`.
   - Initiates `Location.watchPositionAsync` at 3-second intervals.
   - Streams live coordinates (`lat`, `lng`, `speed`, `heading`) via Socket.io `location:update` to the Admin Operations Map.
4. **Trip Completion Dialog**:
   - Driver taps "🏁 Complete Journey".
   - Prompts for Ending Odometer reading via modal dialog.
   - Calls `PUT /api/trips/:id/complete` to calculate distance and release vehicle.

### 4.2 Fuel Purchase Logging (`app/(driver)/fuel-log.tsx`)
- Allows driver to record fuel refills on the road.
- Fields: Fuel volume (L), total cost (BDT), current odometer reading.
- Integrated camera / photo library receipt attachment upload.

### 4.3 Driver Notification Center (`app/(driver)/notifications.tsx`)
- Immediate alert when a new trip is assigned by the dispatcher.
- Admin operational announcements (e.g. road closures, cyclone alerts).

---

## 5. Mobile Theme & UI System
- **Background**: `#020617` (Deep Obsidian)
- **Cards**: `#0f172a` (Dark Slate) with `#1e293b` borders
- **Primary Buttons**: `#4f46e5` (Indigo)
- **Complete Action**: `#9333ea` (Purple)
- **Fuel Action**: `#f59e0b` (Amber)
- **Typography**: Clean sans-serif with high contrast white (`#ffffff`) and muted slate (`#94a3b8`)
