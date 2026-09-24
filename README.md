# 🚗 Apex Vehicle Management System (VMS)

> **Enterprise Fleet Operations, Automated Dispatch, & Real-Time Telemetry Platform**  
> *Engineered for AppTriangle Limited Engineering Assessment*

---

## 🌟 Executive Summary

Apex VMS is an enterprise-grade vehicle and transit management platform built to coordinate high-volume corporate transit between **Corporate Headquarters, Regional Distribution Hubs, and Heavy Manufacturing Plants**.

It solves real-world logistics challenges:
1. **Asset Double-Booking Prevention**: Atomic database transactions guarantee vehicles and drivers cannot be simultaneously reserved.
2. **Real-Time GPS Telemetry**: Sub-second vehicle tracking on **OpenStreetMap** powered by WebSockets (Socket.io).
3. **Anti-Theft Fuel Audit**: Mathematical anomaly detection compares actual consumption ($\Delta \text{km} / \text{Liters}$) against manufacturer baselines paired with mandatory fuel station photo receipts.
4. **Availability & Downtime Management**: Driver leave workflows and vehicle workshop maintenance tracking ensure only certified, available assets are dispatched.

---

## 🏛️ System Architecture & SDLC

For the complete architectural dossier, sequence diagrams, and schema specifications, review:
- 📄 [System Architecture & Sequence Flows](docs/SYSTEM_ARCHITECTURE_AND_FLOW.md)
- 🗄️ [Database Schema & Mermaid ERD](docs/DATABASE_SCHEMA_AND_ERD.md)
- 📋 [VMS Master Execution Plan](docs/VMS_Master_Plan.md)

---

## 🛠️ Technology Stack

| Layer | Technologies |
|:------|:-------------|
| **Backend API** | Node.js, Express.js, TypeScript, Prisma ORM, PostgreSQL (Neon Cloud) |
| **Real-time Telemetry** | Socket.io (WebSocket streaming rooms & breadcrumbs) |
| **Security & Auth** | JSON Web Tokens (JWT), BCrypt password hashing, Role-Based Access Control (RBAC) |
| **Admin Web Portal** | React 18, Vite, Tailwind CSS, Leaflet.js (OpenStreetMap), Zustand, Lucide Icons |
| **Mobile Application** | React Native, Expo SDK 51, Expo Location, Expo Image Picker |

---

## 🚀 Quick Start Guide

### 1. Database Configuration
1. Open `backend/.env`
2. Update `DATABASE_URL` with your **Neon PostgreSQL** connection string:
   ```env
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

### 2. Push Schema & Seed Data
From `backend/`:
```bash
# Push database tables to PostgreSQL
pnpm db:push

# Populate realistic corporate offices, vehicles, drivers, trips & fuel logs
pnpm db:seed
```

### 3. Start the Backend API & WebSocket Gateway
```bash
cd backend
pnpm dev
# Server will run on http://localhost:5000
# Health check: http://localhost:5000/api/health
```

### 4. Start the Admin Web Dashboard
In a new terminal:
```bash
cd admin-panel
pnpm dev
# Dashboard available at http://localhost:5173
```

---

## 🔑 Pre-Seeded Demonstration Credentials

| Role | Email | Password | Description |
|:-----|:------|:---------|:------------|
| **Fleet Admin** | `admin@vms.com` | `admin123` | Full fleet control, dispatch, map, fuel audit |
| **Employee** | `john.doe@vms.com` | `password123` | Engineering Lead requesting transit |
| **Employee 2** | `sarah.smith@vms.com` | `password123` | QA Manager currently on mission |
| **Driver 1** | `driver.rahim@vms.com` | `driver123` | Available Driver (Toyota HiAce) |
| **Driver 2** | `driver.karim@vms.com` | `driver123` | On-Trip Driver (Toyota Prado) |
| **Driver 3** | `driver.alam@vms.com` | `driver123` | Driver on Medical Leave |

---

## 🎬 How to Conduct the 5-Minute Interview Demo

1. **Open the Admin Dashboard** (`http://localhost:5173`):
   - Show the **Executive Operations Center** KPI cards (Fleet Capacity, Active Missions, Driver Roster, Fuel Expenditure).
   - Point out the **Anti-Theft Anomaly Banner** flagged for a refuel that deviated 38% from rated efficiency.
2. **Show Live Moving Vehicle on OpenStreetMap**:
   - Navigate to **Live Fleet Tracking** or click **"Simulate Live GPS Stream"** in the top navigation bar.
   - Watch the vehicle marker smoothly move along the highway between Dhaka HQ and Gazipur Plant in real time!
3. **Dispatch a Pending Trip Request**:
   - Go to **Trip Requests & Dispatch**.
   - Review John Doe's pending travel requisition.
   - Click **"Approve & Assign Vehicle"**.
   - Show that the dropdown only displays *Available* vehicles and *Available* drivers (preventing conflicts).
   - Click **"Confirm Assignment"** — highlight that a **Prisma transaction** atomically reserves both assets.
4. **Inspect Fuel Anti-Theft Protection**:
   - Go to **Fuel Logs & Anti-Theft**.
   - Click **"View Receipt"** to show photograph proof of station pump slips.
   - Explain how the system calculates $\text{Realized Efficiency} = \Delta \text{Odometer} / \text{Liters}$ to detect fuel theft.
5. **Switch Personas Instantly**:
   - Use the Role Switcher in the top right to demonstrate the **Employee Requisition Portal** and the **Driver Dispatch Console**.
