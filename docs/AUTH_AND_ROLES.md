# Apex VMS — Authentication, Identity & Role-Based Access Control (RBAC) Specification

## 1. Identity & Role Architecture

In Apex Enterprise Vehicle Management System, every user account is assigned one of three operational roles:

| Role | Primary Functions | Access Points | Login Identifier |
| :--- | :--- | :--- | :--- |
| **ADMIN** | Fleet oversight, dispatch approval, telemetry monitoring, user provisioning, audit | Web Admin Panel (`http://localhost:5173`) | Email (`admin@vms.com`) or Admin ID (`ADM-001`) |
| **EMPLOYEE** | Requisition submission, accompanying passenger roster, requisition tracking | Expo Mobile App & Employee Portal | Employee ID (`EMP-104`) or Corporate Email |
| **DRIVER** | Trip mission execution, live GPS streaming, fuel receipt submission | Expo Mobile App (`/(driver)`) | Driver ID (`DRV-201`) or Email |

---

## 2. Identifier Resolution & Unified Login

The backend `/api/auth/login` endpoint accepts an `identifier` parameter that supports both:
1. **Corporate Identifier**:
   - Employees: `EMP-001`, `EMP-104`, `EMP-109`
   - Drivers: `DRV-201`, `DRV-202`, `DRV-203`
   - Admins: `ADM-001`
2. **Email Address**:
   - `admin@vms.com`, `john.doe@vms.com`, `driver1@vms.com`

### Authentication Flow:
```
Mobile / Web App
      │
      ▼  POST /api/auth/login { identifier, password }
┌────────────────────────────────────────────────────────┐
│ Backend Auth Controller                                │
│ 1. Search User table where:                            │
│    (employeeId = identifier OR email = identifier)     │
│ 2. Verify account is active (isActive = true)          │
│ 3. Bcrypt compare password with passwordHash           │
│ 4. Issue HMAC-SHA256 JWT with role & driver claims     │
└────────────────────────────────────────────────────────┘
      │
      ▼  HTTP 200 { success: true, token, user }
Mobile Storage (expo-secure-store / persistent session)
      │
      ├── If role === 'DRIVER'   ──► Route /(driver)/active-trip
      └── If role === 'EMPLOYEE' ──► Route /(employee)/my-trips
```

---

## 3. JWT Token Payload & Claims

```json
{
  "userId": "cmugf89010000llila1234567",
  "email": "sarah.smith@vms.com",
  "role": "EMPLOYEE",
  "name": "Sarah Smith",
  "driverId": null,
  "iat": 1727254800,
  "exp": 1727859600
}
```

For drivers, `driverId` contains the relational ID in the `Driver` table, enabling zero-lookup queries for assigned trips.

---

## 4. Role Permissions Matrix

| Feature / Action | ADMIN | EMPLOYEE | DRIVER |
| :--- | :---: | :---: | :---: |
| **Submit Trip Requisition** | ✗ | ✅ | ✗ |
| **Search Colleague by Employee ID** | ✅ | ✅ | ✗ |
| **Custom Pickup / Dropoff Locations** | ✗ | ✅ | ✗ |
| **View Own Requisitions** | ✗ | ✅ | ✗ |
| **Approve & Assign Trip** | ✅ | ✗ | ✗ |
| **Reject Trip Request** | ✅ | ✗ | ✗ |
| **View All Fleet Trips** | ✅ | ✗ | ✗ |
| **View Assigned Trips** | ✗ | ✗ | ✅ |
| **Start Trip & Stream GPS** | ✗ | ✗ | ✅ |
| **Complete Trip & Log Final Odometer**| ✗ | ✗ | ✅ |
| **Submit Fuel Receipt & Station Info**| ✗ | ✗ | ✅ |
| **Live Fleet GPS Map (Web)** | ✅ | ✗ | ✗ |
| **Send Broadcast / Target Notifications**| ✅ | ✗ | ✗ |
| **Receive Real-time In-App Notifications**| ✅ | ✅ | ✅ |
| **Create Employee / Driver Credentials**| ✅ | ✗ | ✗ |
| **Fleet Vehicle Management** | ✅ | ✗ | ✗ |

---

## 5. User Creation & Automatic ID Provisioning

Administrators create accounts directly from the Admin Panel via:
- **Drivers Page** (`/drivers`): `+ Add Driver` modal
- **Employee Directory** (`/employees`): `+ Add Employee` modal
- **API Endpoint**: `POST /api/auth/users` (Requires `Authorization: Bearer <ADMIN_TOKEN>`)

### ID Generation Scheme:
- **Employee**: If not manually specified, auto-generates `EMP-${100 + employee_count + 1}` (e.g. `EMP-105`).
- **Driver**: If not manually specified, auto-generates `DRV-${pad(driver_count + 1, 3)}` (e.g. `DRV-204`).
- **Default Temporary Password**: `password123` (hashed via bcrypt with salt rounds = 10).

---

## 6. Session Persistence & Sign-Out Protocol

### Session Storage:
- **Web Admin Panel**: Stored in `localStorage.getItem('vms_token')`.
- **Expo Mobile App**: Stored in `expo-secure-store` via `authStorage` with in-memory fallback. Automatically restored upon app launch via `initAuth()`.

### Sign-Out Protocol:
1. User taps **Exit / Sign Out** in `<AppHeader />`.
2. Native confirmation dialog prevents accidental sign-outs.
3. Socket emits `user:offline` to update dispatcher rosters.
4. Persistent token and user record are deleted.
5. In-memory Zustand store resets to unauthenticated state.
6. Expo Router replaces current route with `/` (Login screen).
