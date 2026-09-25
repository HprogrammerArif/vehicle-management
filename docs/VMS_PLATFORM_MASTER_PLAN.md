# Apex VMS — Comprehensive Platform Plan
## Gap Analysis & Implementation Roadmap

---

## 1. Current State Summary

| Area | What Exists | What's Missing |
|------|-------------|----------------|
| **App — Auth** | Role selector (hardcoded demo login) | Real login with ID + password, JWT persistence, logout |
| **App — Employee** | Request trip (hardcoded offices), Chat | My trips list, trip status tracking, notifications |
| **App — Driver** | Active trip, Fuel log, Chat | Notifications, trip history, leave requests |
| **Backend** | Auth, Trips, Drivers, Fuel, Vehicles, Chat, Tracking | Notifications API, Requisition approval flow |
| **Admin Panel** | Dashboard, Fleet, Drivers, Trips, Fuel, Maintenance, Chat | Notification sender, Requisition approvals, employee creation |
| **DB Schema** | User (Role), Driver, Trip, Notification, Conversation | NotificationBroadcast model |
| **Docs** | Architecture, Schema, Tracking, Brand, Master Plan | Backend API ref, Frontend docs, App screen docs |

---

## 2. Critical Missing Features

### 2.1 — Authentication System (App)
**Problem:** App shows "Select Role" with hardcoded demo credentials. No real login.

**What to build:**
- Login screen: Employee ID (e.g. `EMP-001`) or Driver ID + Password
- Admin assigns credentials from admin panel
- JWT stored in `expo-secure-store`
- Auto-redirect by role from token
- Logout, token refresh

**Flow:**
```
App opens → Check stored token
  → Valid   → Route by role (EMPLOYEE / DRIVER home)
  → None    → Login Screen → POST /auth/login {identifier, password}
              → {token, user{role}} → store → route
```

---

### 2.2 — Vehicle Requisition System
**Problem:** Request form has hardcoded offices. No way to see request status after submitting.

**Employee App:**
- Form: pick From/To Office from API, date/time, purpose, passengers, trip type
- "My Requisitions" tab: status badges (PENDING / APPROVED / REJECTED / IN_PROGRESS / COMPLETED)
- See assigned vehicle + driver when approved
- Push notification on approval/rejection

**Admin Panel:**
- Pending requisitions queue on dashboard
- Approve/Reject with notes
- Assign vehicle + driver on approval

**Backend:**
- `GET /trips/my` — employee sees own trips
- Already have `GET /trips?status=PENDING` for admin

---

### 2.3 — Notification System
**Problem:** `Notification` model exists in DB but no API endpoints or push integration.

**Backend to build:**
- `POST /notifications/send` — Admin targets: ALL_EMPLOYEES, ALL_DRIVERS, userId, tripId
- `GET /notifications/my` — user's inbox
- `PATCH /notifications/:id/read`
- Firebase Admin SDK for FCM push (uses `fcmToken` already on User model)
- Auto-fire on trip status changes

**Admin Panel:**
- "Send Notification" page: target selector + title + body

**App:**
- Notifications tab with unread badge
- Register FCM token on login
- Handle `notification:new` socket event (in-app)
- Handle background push (Expo Notifications)

**Notification types:**

| Type | Trigger | Who Gets It |
|------|---------|-------------|
| TRIP_APPROVED | Admin approves | Requester |
| TRIP_REJECTED | Admin rejects | Requester |
| TRIP_ASSIGNED | Driver assigned | Driver |
| TRIP_STARTED | Driver starts trip | Requester, Admin |
| TRIP_COMPLETED | Driver ends trip | Requester, Admin |
| FUEL_ANOMALY | Anomaly flagged | Admin |
| GENERAL | Admin broadcast | Target group |

---

### 2.4 — Employee & Driver Identity
**Problem:** No way to distinguish specific users — anyone picks role and uses demo creds.

**Solution:**
- Each User has `employeeId` (already in schema, e.g. `EMP-001`)
- Drivers have `Driver` profile with `licenseNumber` (already in schema)
- Admin creates users from admin panel → system generates ID + temp password
- Login uses: `employeeId` + password (employee) or `driverId` + password (driver)
- `POST /auth/login` accepts `{ identifier, password }` — resolves by employeeId OR email

---

## 3. Implementation Phases

### Phase 1 — Authentication (COMPLETED ✅)
- [x] Backend: Update `/auth/login` to accept employeeId as identifier
- [x] Backend: `POST /auth/users` (admin only) — creates employee/driver with auto ID
- [x] Backend: `GET /auth/users` and `DELETE /auth/users/:id` for user management
- [x] App: Replace role-selector with real Login screen (ID + password)
- [x] App: Store JWT in secure persistent storage with auto-login on restart
- [x] App: Logout button with confirmation dialog for both roles
- [x] Admin Panel: "Add Employee" + "Add Driver" forms & Employee Directory

### Phase 2 — Requisition Flow (COMPLETED ✅)
- [x] App: Fetch offices & custom pickup/dropoff nationwide locations
- [x] App: Add date/time & purpose to request form
- [x] App: Dynamic colleague passenger search by Employee ID from DB
- [x] App: "My Requisitions" screen for employees (status badges & assigned assets)
- [x] App: "My Assigned Trips" screen for drivers (tabbed filters & mission link)
- [x] Admin Panel: Pending Approvals section with approve/reject + assign UI
- [x] Backend: Trip status change triggers notifications

### Phase 3 — Notifications (COMPLETED ✅)
- [x] Backend: `/notifications/my`, `/notifications/:id/read`, `/notifications/send`
- [x] Backend: Auto-notify on trip create, approve, reject, start, and complete
- [x] Backend: Real-time Socket.io broadcast (`notification:new`)
- [x] App: Notifications screen + live unread badge
- [x] App: Global socket listener for `notification:new` with in-app banner/alert
- [x] Admin Panel: Send Notification panel with targeted dispatch (`ALL`, `EMPLOYEES`, `DRIVERS`, `TRIP`, `USER`)

### Phase 4 — Documentation (COMPLETED ✅)
- [x] `docs/BACKEND_API.md` — all endpoints, request/response
- [x] `docs/FRONTEND_COMPONENTS.md` — admin panel page inventory
- [x] `docs/APP_SCREENS.md` — all screens, navigation, state
- [x] `docs/AUTH_AND_ROLES.md` — permissions matrix and identity specs

---

## 4. Role Permissions Matrix

| Feature | Admin | Employee | Driver |
|---------|-------|----------|--------|
| Login method | Email/Password | EmployeeID/Password | DriverID/Password |
| Request vehicle | ✗ | ✅ | ✗ |
| Approve/Reject trip | ✅ | ✗ | ✗ |
| View trips | All | Own only | Assigned only |
| Assign vehicle/driver | ✅ | ✗ | ✗ |
| Log fuel | ✗ | ✗ | ✅ |
| Start/End trip | ✗ | ✗ | ✅ |
| Send broadcast notification | ✅ | ✗ | ✗ |
| Receive notifications | ✅ | ✅ | ✅ |
| Manage fleet | ✅ | ✗ | ✗ |
| Admin dashboard | ✅ | ✗ | ✗ |

---

## 5. Target App Navigation

```
App
├── /login                        ← NEW (replaces role selector)
│
├── (employee)/                   ← Protected: role = EMPLOYEE
│   ├── my-trips                  ← NEW: my requisitions + statuses
│   ├── request-trip              ← Improved: real offices + date picker
│   ├── notifications             ← NEW
│   └── conversations
│
└── (driver)/                     ← Protected: role = DRIVER
    ├── active-trip
    ├── my-trips                  ← NEW: assigned + past trips
    ├── fuel-log
    ├── notifications             ← NEW
    └── conversations
```

---

## 6. Schema Addition Needed

```prisma
model NotificationBroadcast {
  id      String   @id @default(cuid())
  title   String
  body    String
  target  String   // ALL_EMPLOYEES | ALL_DRIVERS | USER:{id} | TRIP:{id}
  sentBy  String   // Admin userId
  sentAt  DateTime @default(now())
}
```

The existing `Notification` model handles per-user inbox records fine.

---

## 7. Recommended Build Order

1. **Login screen + real auth** — nothing else works without this
2. **My Trips screen** — employee needs to see their request after submitting
3. **Admin Pending Approvals** — close the requisition loop
4. **Notification bell + socket** — real-time for both parties
5. **Push notifications (FCM)** — background alerts
6. **Docs** — write as each feature ships
