# Apex VMS — Mobile App Screens & Navigation Specification

The mobile application is built using **Expo Router**, **React Native**, and **Zustand**. It serves two distinct corporate personas: **Corporate Employees** and **Fleet Drivers**.

---

## 1. App Architecture & Navigation Hierarchy

```
app/
├── index.tsx                         # Unified Login Screen (Employee ID / Driver ID / Email)
│
├── (employee)/                        # Protected Persona: EMPLOYEE
│   ├── my-trips.tsx                  # My Requisitions (Status tracking & assigned vehicle/driver)
│   ├── request-trip.tsx              # New Trip Booking (Custom pickup/dropoff + Colleague roster)
│   ├── notifications.tsx             # Real-time In-App Notifications & Alerts
│   ├── conversations.tsx             # Support & Trip Dispatch Chat Roster
│   └── chat/[id].tsx                 # Real-time WebSocket Trip Chat
│
└── (driver)/                          # Protected Persona: DRIVER
    ├── active-trip.tsx               # Active Mission & High-Frequency GPS Telemetry Stream
    ├── my-trips.tsx                  # Assigned Mission Board (Upcoming, In-Progress, Past)
    ├── fuel-log.tsx                  # Fuel Purchase & Odometer Log
    ├── notifications.tsx             # Dispatch Assignments & Broadcast Alerts
    ├── conversations.tsx             # Fleet Dispatch & Passenger Chat
    └── chat/[id].tsx                 # Real-time Chat Thread
```

---

## 2. Screen Specifications

### 2.1 Unified Login Screen (`app/index.tsx`)
- **Authentication Input:** Accepts Employee ID (e.g. `EMP-104`), Driver ID (e.g. `DRV-201`), or Corporate Email (`john.doe@vms.com`).
- **Password Input:** Secure text field with visibility toggle.
- **Session Persistence:** Saves session token into `authStorage` (`expo-secure-store` with memory fallback).
- **Auto-routing:** Automatically evaluates role upon sign-in:
  - `DRIVER` → Redirects to `/(driver)/active-trip`
  - `EMPLOYEE` → Redirects to `/(employee)/my-trips`

---

### 2.2 Employee: My Requisitions (`app/(employee)/my-trips.tsx`)
- Displays historical and active vehicle requisitions.
- **Status Badges:**
  - `PENDING` (Pending Review — Amber)
  - `APPROVED` (Approved & Dispatched — Green)
  - `IN_PROGRESS` (Journey in Transit — Blue)
  - `COMPLETED` (Arrived & Concluded — Purple)
  - `REJECTED` (Declined with reason — Red)
- **Trip Details:** Displays pickup address, destination address, departure time, purpose, accompanying colleagues roster, assigned driver name, and vehicle registration number.
- **Header:** Features `<AppHeader activeScreen="my-trips" />` with profile, live unread notification badge, and sign-out button.

---

### 2.3 Employee: New Trip Request (`app/(employee)/request-trip.tsx`)
- **Nationwide Route Planning:** Supports free-text pickup and drop-off addresses anywhere in the country.
- **Trip Type Selector:** `One Way`, `Round Trip`, or `Pickup & Drop-off`.
- **Departure Scheduling:** Date and time selection.
- **Dynamic Colleague Roster:**
  - Enter employee ID (e.g. `EMP-109`).
  - Calls `GET /api/auth/lookup-employee?employeeId=EMP-109`.
  - Validates and displays colleague card with name and department.
  - "+ Add Colleague" dynamically adds passenger to the request. Prevents duplicates and self-addition.

---

### 2.4 Driver: Active Mission Console (`app/(driver)/active-trip.tsx`)
- **Mission Status:** Displays assigned journey route, passenger contact info, and scheduled departure.
- **GPS Telemetry Engine:**
  - Requests high-accuracy foreground location permissions.
  - Activates `Location.watchPositionAsync` (3000ms interval, 10m delta).
  - Streams coordinates, speed, and heading over Socket.io `location:update` directly to the central Dispatch map.
- **Finalize Trip:** Ending odometer modal calculates distance covered and automatically marks driver and vehicle as `AVAILABLE`.

---

### 2.5 Driver: Assigned Trips Board (`app/(driver)/my-trips.tsx`)
- Tabbed filters: `All`, `Assigned`, `In Progress`, `Completed`.
- Shows assigned vehicle model, license plate, requester contact details, and distance logged.
- Provides direct "Open Duty Console" button to commence navigation.

---

### 2.6 Notifications Screen (`notifications.tsx`)
- In-app inbox receiving real-time socket events (`notification:new`).
- Type icons: `TRIP_APPROVED` (✅), `TRIP_REJECTED` (❌), `TRIP_ASSIGNED` (🚗), `TRIP_STARTED` (🚀), `TRIP_COMPLETED` (🏁), `GENERAL` (📢).
- Mark individual or all notifications as read.
