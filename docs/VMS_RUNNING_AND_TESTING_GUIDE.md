# 🚀 Apex VMS — Comprehensive System Running & Testing Guide

> **Enterprise Vehicle Management & Real-Time Telemetry System**  
> Complete operational manual for running, testing, and demonstrating the Backend API Gateway, Web Admin Console, and Expo Mobile Application connected to Neon Cloud PostgreSQL.

---

## 📋 1. System Architecture & Port Map

| Component | Technology Stack | Working Directory | Port / URL | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Gateway** | Node.js, Express, Socket.io, Prisma ORM | `c:\dev\VM\backend` | `http://localhost:5000` | Running |
| **Admin Web Console** | React 18, Vite, TailwindCSS, Zustand | `c:\dev\VM\admin-panel` | `http://localhost:5173` | Running |
| **Mobile Application** | React Native, Expo Router, Lucide | `c:\dev\VM\mobile-app` | `http://localhost:8081` | Ready |
| **Database** | Neon Cloud Serverless PostgreSQL | AWS us-east-2 | Connection Pooler | Connected |

---

## 🔑 2. Pre-Seeded Demo Credentials

The database is pre-seeded with enterprise roles, active trips, and driver profiles.

| Role | Name | Email | Password | DB Primary Key / Details |
| :--- | :--- | :--- | :--- | :--- |
| **Fleet Admin** | Tanvir Hossain | `admin@vms.com` | `admin123` | `cmuf7sqhw0001f6wpzz0b2pi1` (Fleet Ops Dispatcher) |
| **Driver 1** | Mohammad Rahim | `driver.rahim@vms.com` | `driver123` | `cmuf7su0n0007f6wpl5c77ukh` (Prado TX-L Assigned) |
| **Driver 2** | Abdul Karim | `driver.karim@vms.com` | `driver123` | `cmuf7swyg000bf6wp6my4nga4` (Available Fleet) |
| **Employee 1** | Johnathan Doe | `john.doe@vms.com` | `password123` | `cmuf7ss2c0003f6wpudwaswfg` (Factory Engineering) |
| **Employee 2** | Sarah Smith | `sarah.smith@vms.com` | `password123` | `cmuf7st1g0005f6wpjjn8vjs3` (Quality Assurance) |

---

## ⚙️ 3. Environment & Database Configuration

The backend connects directly to Neon Serverless PostgreSQL via connection pooling:

```env
# backend/.env
DATABASE_URL="postgresql://neondb_owner:npg_YI4RULe1TEFK@ep-still-wave-b5pll9d3-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
PORT=5000
JWT_SECRET="super-secret-vms-jwt-token-key-2026-apptriangle"
JWT_EXPIRES_IN="7d"
ADMIN_CLIENT_URL="http://localhost:5173"
MOBILE_CLIENT_URL="http://localhost:8081"
```

---

## 🏃 4. Launching the Services

### Terminal 1: Backend API Gateway
```powershell
cd c:\dev\VM\backend
npm run dev
```
* **Health Check**: `curl.exe http://localhost:5000/api/health` ➔ `{"status":"online"}`
* **Static Uploads Directory**: `http://localhost:5000/uploads/chat/`

### Terminal 2: Admin Panel (Web Console)
```powershell
cd c:\dev\VM\admin-panel
npm run dev
```
* **URL**: `http://localhost:5173`
* Automatically logs in on boot as `Tanvir Hossain` (Fleet Dispatcher).

### Terminal 3: Mobile App (Driver & Employee)
```powershell
cd c:\dev\VM\mobile-app
pnpm start
# OR: npx expo start
```
* Press <kbd>w</kbd> to open in browser (`http://localhost:8081`).
* Press <kbd>a</kbd> for Android Emulator.
* Press <kbd>i</kbd> for iOS Simulator.
* Scan QR code with **Expo Go** on a physical phone.

> [!TIP]
> **Testing with a Physical Phone on Local Wi-Fi:**
> Update `API_BASE_URL` in [`mobile-app/src/services/api.ts`](file:///c:/dev/VM/mobile-app/src/services/api.ts) and `SOCKET_URL` in [`mobile-app/src/services/socket.ts`](file:///c:/dev/VM/mobile-app/src/services/socket.ts) from `http://localhost:5000` to your PC's Wi-Fi IPv4 address (e.g., `http://192.168.1.15:5000`).

---

## 🧪 5. End-to-End Testing & Demonstration Scenarios

### Scenario A: Split-Screen Live Dispatch
1. Open **Admin Panel** (`http://localhost:5173`) on the left half of your screen.
2. Open **Mobile App Web Preview** (`http://localhost:8081`) on the right half.
3. On Mobile, select **Driver Console**:
   - The app authenticates as `Mohammad Rahim` with a real JWT.
   - Socket emits `user:online`.
   - In Admin Panel ➔ **Chat**, a **glowing green indicator** (`● Active now`) appears on Mohammad Rahim's conversation card.

### Scenario B: Real-Time Chat & Audio Chime
1. On Mobile, tap **Dispatch Chat** or **Active Threads**.
2. Tap a quick template: `🚗 Delayed in traffic (~10m)` and press **Send**.
3. **Admin Panel receives the message instantly:**
   - Web Audio API triggers a crisp, two-tone notification chime.
   - If the browser tab was backgrounded, the title changes to `(1) 💬 Mohammad Rahim - Apex VMS`.
4. In Admin Panel, reply using quick template `🌧️ Weather Alert`:
   - Mobile receives the message with a blue `HQ DISPATCH` badge and delivery double-checks (`✓✓`).

### Scenario C: Camera & Pump Slip Photo Upload
1. In Mobile chat, tap the **Camera icon (📷)** in the input toolbar.
2. Select any photo or pump slip receipt.
3. The button displays an active spinner while uploading to `POST /api/chat/upload`.
4. The image renders in both mobile and admin message threads with high-resolution thumbnail preview.

### Scenario D: One-Tap GPS Coordinate Pin
1. In Mobile chat, tap the **MapPin icon (📍)**.
2. The app queries `expo-location` for device coordinates.
3. Sends a dedicated Location Card: `📍 Live Location: 23.79250, 90.40780`.
4. Clicking opens Google Maps with the exact pin.

### Scenario E: Live GPS Telemetry Stream to Fleet Map
1. In Admin Panel, open the **Live Tracking** page.
2. In Mobile App, go to **Driver Console ➔ Active Trip**.
3. Tap **"Start Journey (Activate GPS)"**:
   - Device streams real-time GPS coordinates via `location:update` over WebSocket.
   - The Land Cruiser Prado (`DHK-METRO-GHA-3344`) moves across the Admin Live Map in real-time.
4. Tap **"Complete Journey"** on mobile to finalize the mission and reset vehicle status to Available.

### Scenario F: Employee Ride Requisition
1. In Mobile App, tap **Employee Portal**.
2. Tap **Request Corporate Vehicle**:
   - Enter purpose: *"On-site engineering inspection at Gazipur"*.
   - Submit request.
3. In Admin Panel, navigate to **Trips Page**:
   - The newly requested trip appears under **Pending Approvals** with full passenger details.

---

## 🛠️ 6. Maintenance & Useful Commands

```powershell
# Open Prisma Studio to inspect Neon DB rows visually
cd c:\dev\VM\backend
npx prisma studio   # Opens at http://localhost:5555

# Re-seed the database (resets demo trips, telemetry breadcrumbs, and logs)
cd c:\dev\VM\backend
npm run db:seed

# TypeScript compilation checks across all codebases
cd c:\dev\VM\backend && npx tsc --noEmit
cd c:\dev\VM\admin-panel && npx tsc --noEmit
cd c:\dev\VM\mobile-app && npx tsc --noEmit
```
