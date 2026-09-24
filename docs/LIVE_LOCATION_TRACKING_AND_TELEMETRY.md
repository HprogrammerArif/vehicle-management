# 🛰️ Live Location Tracking & Telemetry Architecture

> **Feature Specification & Technical Reference**  
> Complete technical documentation for the Real-Time GPS Tracking, Telemetry Gateway, and Map Rendering pipeline across the Apex VMS platform.

---

## 📌 Executive Summary

The Apex VMS Live Location Tracking system allows fleet managers to monitor active vehicle locations, route breadcrumbs, vehicle speeds, and driver statuses in real-time. 

Unlike traditional platforms that rely on expensive proprietary APIs (such as Google Maps Platform or Mapbox) which incur high recurring per-load and per-coordinate costs, Apex VMS employs a **cost-effective, open, and high-performance multi-tier architecture**:

```
[ Driver Mobile App ] ──(expo-location GPS)──> [ Socket.io WebSocket Gateway ] 
                                                          │
                    ┌─────────────────────────────────────┴─────────────────────────────────────┐
                    ▼                                                                           ▼
      [ PostgreSQL / Prisma DB ]                                                  [ Admin Web Dashboard ]
   (Driver.currentLat & TrackingPoint)                                           (Leaflet + OpenStreetMap)
```

---

## 🧱 Technical Stack & API Breakdown

### 1. Map Rendering & Tile Layer API (Frontend Admin)

| Technology | Purpose | API / URL | Why Chosen |
| :--- | :--- | :--- | :--- |
| **OpenStreetMap (OSM)** | Base Map Tile Provider | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | **100% Free & Open-Source**: Zero credit-card requirements, no usage tiers or surprise billing. |
| **Leaflet & React-Leaflet** | Interactive Mapping Engine | [`LiveFleetMap.tsx`](file:///c:/dev/VM/admin-panel/src/components/map/LiveFleetMap.tsx) | Lightweight (~40KB), smooth panning/zooming, supports custom animated SVG markers and dynamic polyline breadcrumbs. |

#### Key Visual Features:
* **Custom Animated Vehicle Markers**: Pulsing radar rings (`animate-ping`) surrounding active vehicle icons.
* **Corporate Office Markers**: Color-coded badges for Headquarters, Regional Logistics Hubs, and Plants with interactive popup metadata.
* **Smart Map Centering (`MapUpdater`)**: Auto-centers and pans smoothly when coordinates update without jarring UI refreshes.
* **Dynamic Breadcrumb Polyline**: Connects historic coordinates to visualize the exact route driven.

---

### 2. Mobile Device Location API (Driver Mobile App)

| Library | Function | Implementation File | Purpose |
| :--- | :--- | :--- | :--- |
| **`expo-location`** | `watchPositionAsync()` | [`active-trip.tsx`](file:///c:/dev/VM/mobile-app/app/%28driver%29/active-trip.tsx) | Subscribes to continuous native GPS hardware stream while on an active mission. |
| **`expo-location`** | `getCurrentPositionAsync()` | [`ChatThreadView.tsx`](file:///c:/dev/VM/mobile-app/src/components/chat/ChatThreadView.tsx) | Grabs instantaneous coordinates for one-tap location pin sharing in dispatch chat. |

#### Tracking Tuning Configuration:
```typescript
const watcher = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.High, // Fused GPS + Wi-Fi + Cell tower
    timeInterval: 3000,              // Emit every 3 seconds
    distanceInterval: 10,            // Filter out jitter (< 10 meters)
  },
  (loc) => { /* emit to telemetry gateway */ }
);
```

---

### 3. Real-Time Telemetry Transmission Gateway (WebSocket Protocol)

Managed by **Socket.io** on the backend and client devices to deliver sub-second telemetry with minimal battery and cellular bandwidth consumption.

| Socket Event | Sender ➔ Receiver | Payload Structure | Action Performed |
| :--- | :--- | :--- | :--- |
| **`location:update`** | Driver Mobile ➔ Backend | `{ tripId, vehicleId, driverId, lat, lng, speed, heading }` | Ingests coordinates, updates DB in background, and triggers broadcast. |
| **`vehicle:location`** | Backend ➔ Admin Dashboard | `{ tripId, vehicleId, driverId, latitude, longitude, speed, heading, timestamp }` | Pushes telemetry to Admin Map to move the car icon in real-time. |
| **`trip:status_change`** | Driver Mobile ➔ Backend | `{ tripId, status: 'IN_TRANSIT' \| 'COMPLETED' }` | Notifies HQ when mission starts or completes. |

---

### 4. Backend Persistence & Database Schema (Prisma ORM)

Located in [`backend/src/sockets/socketHandler.ts`](file:///c:/dev/VM/backend/src/sockets/socketHandler.ts) and [`backend/src/modules/tracking/`](file:///c:/dev/VM/backend/src/modules/tracking/).

#### 1. Instant Location Update (Driver Record)
```prisma
model Driver {
  id             String    @id @default(cuid())
  currentLat     Float?    // Latest latitude
  currentLng     Float?    // Latest longitude
  lastLocationAt DateTime? // Heartbeat timestamp
}
```

#### 2. Historical Breadcrumb Trail (TrackingPoint Record)
```prisma
model TrackingPoint {
  id        String   @id @default(cuid())
  tripId    String
  driverId  String
  latitude  Float
  longitude Float
  speed     Float?   // In km/h
  heading   Float?   // Degrees (0-360)
  timestamp DateTime @default(now())

  trip      Trip     @relation(fields: [tripId], references: [id])
}
```

---

### 5. Telemetry REST API Endpoints

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tracking/fleet` | Authenticated | Fetches the latest known positions, vehicle registration, and driver details for all active trips. |
| `GET` | `/api/tracking/trips/:tripId/route` | Authenticated | Returns all recorded historical GPS breadcrumb coordinates for a trip (used to draw route lines). |
| `POST` | `/api/tracking/simulate/:tripId` | Admin | Built-in test simulator that generates and broadcasts coordinates along predefined Bangladesh highway waypoints every 1.5 seconds. |

---

## 💡 Key Architectural Benefits

1. **Zero Recurring Map Licensing Costs**:
   - Google Maps charges **$7.00 per 1,000 requests** for Dynamic Maps and **$5.00 per 1,000 calls** for Directions.
   - Using **OpenStreetMap + Leaflet** reduces external map API expenses to **$0.00**.

2. **Battery & Data Conservation**:
   - The `distanceInterval: 10` filter prevents emitting coordinates when vehicles are stationary (e.g., at traffic lights or checkpoints), preventing battery drain on driver phones.

3. **Multi-Channel Distribution**:
   - Telemetry broadcasts automatically to both the **Fleet Operations Room (`admin_fleet`)** and the specific **Trip Channel (`trip_${tripId}`)**, enabling passengers to track their approaching corporate shuttle.

4. **Integrated Emergency & Pin Sharing**:
   - One-tap GPS sharing inside dispatch chat gives instant visibility into vehicle position during roadside assistance, accidents, or detour queries.
