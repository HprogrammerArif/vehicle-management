# Apex VMS — Brand Identity & Design System Specification

## 1. Brand Essence & Vision
**Apex VMS** is an enterprise-grade Vehicle Management & Fleet Telemetry Operating System. The brand identity fuses high-precision aerospace telemetry, automotive streamlines, and modern high-frequency SaaS aesthetics.

- **Primary Identity**: Aerodynamic 'A' monogram intersected by an electric telemetry velocity arc with connected sensor nodes.
- **Brand Personality**: Precision, Autonomous, Dependable, Mission-Critical, Ultra-Modern.
- **Key Visual Motifs**: Dark slate glassmorphism, electric cyan speedlines, glowing telemetry nodes, deep obsidian space.

---

## 2. Color Palette & Design Tokens

### Primary Brand Accents
| Role | Color Name | Hex Code | HSL | RGB | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Telemetry Pulse** | Neon Cyan | `#22d3ee` | `hsl(187, 85%, 53%)` | `rgb(34, 211, 238)` | Active pins, telemetry arcs, live GPS badges |
| **Enterprise Core** | Electric Indigo | `#6366f1` | `hsl(239, 84%, 67%)` | `rgb(99, 102, 241)` | Primary action buttons, brand gradients, focus rings |
| **Deep Accent** | Violet Pulse | `#818cf8` | `hsl(235, 92%, 74%)` | `rgb(129, 140, 248)` | Secondary highlights, driver portal accents |
| **Status Green** | Emerald Telemetry | `#4ade80` | `hsl(142, 69%, 58%)` | `rgb(74, 222, 128)` | Online presence indicators, trip completed status |
| **Warning/Fuel** | Amber Transit | `#f59e0b` | `hsl(38, 92%, 50%)` | `rgb(245, 158, 11)` | Fuel audit alerts, maintenance warnings |

### Surface & Atmosphere
| Role | Name | Hex Code | Purpose |
| :--- | :--- | :--- | :--- |
| **Background Dark** | Obsidian Slate | `#020617` | Main platform canvas, app root background |
| **Card Surface** | Deep Navy | `#0f172a` | Container cards, modals, table rows |
| **Border & Dividers**| Slate 800 | `#1e293b` | Structural dividers, subtle borders |
| **Text Primary** | Pure Ice | `#ffffff` | Primary headings, titles, timestamps |
| **Text Secondary** | Muted Silver | `#94a3b8` | Subtitles, driver names, vehicle specs |

---

## 3. Brand Assets Directory & Catalog

All generated branding assets are located in the repository:

| Asset Name | Location | Dimensions / Format | Description |
| :--- | :--- | :--- | :--- |
| **Horizontal Brandmark** | `admin-panel/public/brandmark.jpg`<br/>`docs/assets/brandmark.jpg` | 1920 × 1080 (16:9) | Full hero branding lockup with typography and telemetry nodes |
| **Mobile App Icon** | `mobile-app/assets/icon.png`<br/>`mobile-app/assets/adaptive-icon.png` | 1024 × 1024 (1:1) | High-res squircle app icon for Google Play Store & iOS App Store |
| **Mobile Splash Screen** | `mobile-app/assets/splash.png`<br/>`docs/assets/splash.jpg` | 1080 × 1920 (9:16) | Native splash screen with luminous transit telemetry grid |
| **Vector Favicon** | `admin-panel/public/favicon.svg` | Scalable Vector SVG | Micro-icon for browser tabs and web bookmarks |
| **React Component** | `admin-panel/src/components/common/ApexLogo.tsx` | React Component | Programmable SVG component (`variant="full \| icon \| compact"`, `size="sm \| md \| lg \| xl"`) |

---

## 4. Typography Hierarchy

1. **Brand & Display Typography**:
   - **Font**: `Outfit`, sans-serif
   - **Weights**: Bold (700), ExtraBold (800), Black (900)
   - **Letter Spacing**: `0.05em` (Wide tracking for modern tech authority)

2. **Interface & Telemetry Typography**:
   - **Font**: `Inter`, sans-serif
   - **Weights**: Regular (400), Medium (500), SemiBold (600)
   - **Numbers & GPS Data**: Tabular numbers (`font-variant-numeric: tabular-nums`) for jitter-free telemetry readouts.

---

## 5. Usage & Integration Guidelines

- **Clear Space**: Maintain a minimum clear space around the logo equal to 50% of the emblem's height.
- **Dark Mode Optimization**: Always render the brandmark on dark slate or obsidian backgrounds (`#020617` or `#0f172a`) to preserve the cyan and indigo neon luminescence.
- **Component Usage in Admin Panel**:
  ```tsx
  import { ApexLogo } from '@/components/common/ApexLogo';

  // In headers or navigation:
  <ApexLogo variant="full" size="md" />

  // In collapsed navigation or compact cards:
  <ApexLogo variant="icon" size="sm" />
  ```
- **Usage in Mobile App (`React Native`)**:
  ```tsx
  <Image 
    source={require('../assets/icon.png')} 
    style={{ width: 64, height: 64, borderRadius: 18 }} 
    resizeMode="cover"
  />
  ```
