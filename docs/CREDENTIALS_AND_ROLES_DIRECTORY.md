# Apex VMS — System Credentials & Roles Directory

This reference document provides all pre-configured login credentials, roles, vehicles, and facilities seeded in the Apex Vehicle Management System.

---

## 1. User Accounts & Login Credentials

All users can sign in using **either** their Corporate ID (Employee ID / Driver ID) **or** their Email address.

| Role | Name | Corporate ID | Email Address | Password | Department / Function |
|---|---|:---:|:---:|:---:|---|
| **ADMIN** | Tanvir Hossain | `ADM-001` | `admin@vms.com` | `admin123` | Logistics & Fleet Manager |
| **EMPLOYEE** | Johnathan Doe | `EMP-104` | `john.doe@vms.com` | `password123` | Factory Engineering |
| **EMPLOYEE** | Sarah Smith | `EMP-109` | `sarah.smith@vms.com` | `password123` | Quality Assurance |
| **DRIVER** | Mohammad Rahim | `DRV-201` | `driver.rahim@vms.com` | `driver123` | BRTA Heavy & Light Fleet |
| **DRIVER** | Abdul Karim | `DRV-202` | `driver.karim@vms.com` | `driver123` | BRTA Executive Fleet |
| **DRIVER** | Alamgir Hossain | `DRV-203` | `driver.alam@vms.com` | `driver123` | BRTA Regional Distribution |

---

## 2. Pre-Configured Fleet Vehicles

| Registration Plate | Make & Model | Year | Category | Fuel Type | Rated Efficiency | Status |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `DHK-METRO-GA-1122` | Toyota HiAce Super GL | 2022 | Microbus / Van | Diesel | 9.5 km/L | AVAILABLE |
| `DHK-METRO-GHA-3344` | Toyota Land Cruiser Prado | 2023 | SUV | Octane | 7.0 km/L | AVAILABLE |
| `DHK-METRO-BA-5566` | Isuzu Forward F-Series | 2021 | Heavy Truck | Diesel | 4.8 km/L | AVAILABLE |
| `CTG-METRO-CHA-7788` | Hyundai Staria Premium | 2023 | Executive Van | Octane | 8.5 km/L | AVAILABLE |

---

## 3. Pre-Configured Corporate Facilities

| Facility Code | Facility Name | Facility Type | Location / Address |
|---|---|:---:|---|
| `office_hq` | Dhaka Corporate Headquarters | HQ | Plot 15, Road 11, Gulshan-1, Dhaka 1212 |
| `office_gazipur` | Gazipur Heavy Manufacturing Plant | FACTORY | Zone 4, Gazipur Industrial Area, Dhaka |
| `office_chittagong`| Chittagong Port Logistics Hub | REGIONAL | Agrabad Commercial Area, Chittagong |
| `office_sylhet` | Sylhet Regional Distribution Office | BRANCH | Zindabazar, Sylhet 3100 |

---

## 4. End-to-End Testing Walkthrough

### Scenario A: Employee Requisitions a Vehicle with Custom Destination & Colleague
1. Open the **Mobile App** (or sign in as Employee on mobile).
2. Enter ID: `EMP-104` and Password: `password123`.
3. Tap **"+ New"** on the My Requisitions screen.
4. Set Pickup: `Plot 15, Gulshan-1, Dhaka`.
5. Set Destination: `Karnaphuli EPZ, Chattogram`.
6. Set Departure Date: e.g. `26/09/2026` and Time: `09:00`.
7. Enter Purpose: `Semi-annual machinery audit and vendor alignment`.
8. Under **Accompanying Colleagues**, type `EMP-109` into the search box and tap **Search**.
   - Colleague `Sarah Smith (EMP-109 · Quality Assurance)` is previewed with avatar and phone.
   - Tap **"+ Add"** to include Sarah Smith in the requisition manifest.
9. Tap **"Submit Requisition"**.

### Scenario B: Fleet Manager Dispatches Vehicle & Driver
1. Open the **Admin Panel** at `http://localhost:5173`.
2. Sign in with `admin@vms.com` and `admin123`.
3. In the **Executive Operations Center**, observe the new requisition in the Pending Queue:
   - Displays `📍 Custom Location: Plot 15, Gulshan-1, Dhaka → Karnaphuli EPZ, Chattogram`.
   - Displays `+1 colleague(s): Sarah Smith (EMP-109)`.
4. Click **"Assign Vehicle & Driver"**.
5. Select vehicle `Toyota Land Cruiser Prado (DHK-METRO-GHA-3344)`.
6. Select driver `Mohammad Rahim (DRV-201)`.
7. Click **"Approve & Dispatch"**.
8. Observe:
   - Requester (Johnathan Doe), Accompanying Colleague (Sarah Smith), and Driver (Mohammad Rahim) all receive automated real-time notifications.
   - A dedicated multi-party chat thread `Trip: Plot 15, Gulshan-1, Dhaka → Karnaphuli EPZ, Chattogram` is initialized.

### Scenario C: Driver Accepts Duty & Streams GPS Telemetry
1. Open Mobile App and sign in with `DRV-201` and `driver123`.
2. The **Active Duty Console** automatically detects the assigned trip:
   - Displays Toyota Land Cruiser Prado and plate `DHK-METRO-GHA-3344`.
   - Displays Pickup and Destination addresses.
   - Displays passenger roster: `Sarah Smith (EMP-109)`.
3. Tap **"🚀 Start Journey"**.
   - The device activates native GPS streaming at 3-second intervals.
   - GPS coordinates stream in real time to the Admin Panel's Leaflet Fleet Map.
4. Upon arrival, tap **"🏁 Complete Journey"**.
   - Enter the ending odometer reading in the modal dialog.
   - The trip concludes, distance is computed, vehicle and driver return to `AVAILABLE` status.

### Scenario D: Admin Broadcasts Operational Notification
1. In the **Admin Dashboard**, locate the **Send Notification** panel.
2. Select target: `All Drivers`, `All Employees`, `Everyone`, `Specific Trip`, or `Specific Person`.
3. Enter title: e.g. `Dhaka-Chattogram Highway Roadworks Delay`.
4. Enter message and tap **"Send Notification"**.
5. Notification is instantly received across all target mobile app accounts.
