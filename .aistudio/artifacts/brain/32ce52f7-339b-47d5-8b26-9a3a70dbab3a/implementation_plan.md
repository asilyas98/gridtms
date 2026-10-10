# Driver App Access & Mobile Driver Portal

A cohesive, Apple-inspired operational framework allowing GridTMS dispatchers to provision, monitor, and revoke driver access to the mobile Driver Cockpit, paired with an email + password credential flow fortified with first-time email verification codes and instant QR/SMS onboarding.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and user experience decisions have been synthesized directly from your requirements:

- **Confirmed Decision 1 (Onboarding Delivery)**: Instant QR Code and SMS magic link to mobile Driver Cockpit. Dispatchers can generate a printable cab QR pass or 1-tap SMS/WhatsApp link containing pre-filled driver and carrier metadata.
- **Confirmed Decision 2 (TMS Interface Placement)**: Dedicated **Driver Portal** management tab integrated directly inside the **Fleet Assets** view (`AssetsView.tsx`), giving fleet managers a central command deck for driver logins, active mobile sessions, credential states, and invitation links.
- **Confirmed Decision 3 (Driver Authentication & Security)**: Drivers log in with **Email and Password credentials**. First-time login mandates a **6-digit email verification code** sent to the driver's registered email before access to dispatches and trip telemetry is granted.
- **Recommended Default (Session Persistence)**: Once the email verification code is verified and password established, the mobile Driver Cockpit maintains a secure persistent cab session with biometric/remember-device support, reducing cab friction while permitting instant remote revocation by dispatchers.

---

## 1. Overview & Core Concept

### What It Does
1. **Dispatcher Command Center (TMS Assets View)**: Dispatchers manage fleet driver access under a new **Driver Portal** tab in Fleet Assets. They can view credential status (`Active`, `Invited / Pending Verification`, `Suspended`), provision new logins, generate instant cab QR codes, send SMS magic onboarding links, resend verification codes, or revoke access in real time.
2. **Onboarding Pass**: Generates an instant, shareable Driver Pass featuring a high-contrast QR code (scannable from mobile cab devices) and a one-click SMS/WhatsApp link.
3. **Driver Mobile App (Driver Cockpit)**: Mobile-optimized interface for drivers on iOS and Android smartphones:
   - Clean, Apple-style email + password authentication.
   - First-time email verification screen (6-digit numeric input with auto-advance and countdown resend timer).
   - Once verified, gives drivers full access to active load dispatches, turn-by-turn stop workflows, 1-tap status updates, camera BOL/POD scanning, and HOS driving timers.

### Target Audience & Persona
- **Fleet Dispatchers & Carrier Admins**: Need a fast, frictionless way to get newly onboarded company drivers and owner-operators onto their loads without endless phone calls or manual IT account creation.
- **Truck Drivers & Owner-Operators**: On the road, operating smartphones in cab environments. Require high-contrast, uncluttered typography, large $\ge 44\text{px}$ touch targets, zero complicated forms, and immediate clarity on their active load assignments.

### Key Value
Eliminates dispatch phone tag and missed paperwork by establishing a direct, authenticated pipeline between the TMS dispatch board and the driver's mobile cockpit.

---

## 2. User Experience & Visual Design

### Key User Flows

#### Flow 1: Dispatcher Provisions Driver Access in TMS
```
[Assets View] ──> [Driver Portal Tab] ──> [Select Driver] ──> [Click "Provision Access"]
                                                                      │
┌─────────────────────────────────────────────────────────────────────┘
▼
[Driver Pass Modal Opens]
  ├── Dynamic QR Code (Driver scans with smartphone camera)
  ├── 1-Click "Send SMS Invite" / "Copy Onboarding Link"
  ├── Displays Initial Temporary Password or "Driver Sets Password" option
  └── Status updates to "Verification Pending"
```

#### Flow 2: Driver First-Time Onboarding on Mobile
```
[Driver Scans QR / Taps SMS Link] ──> [Mobile Driver Cockpit Opens]
                                              │
┌─────────────────────────────────────────────┘
▼
[Email Verification Gate]
  ├── Pre-filled Email & Carrier Info
  ├── 6-digit Verification Code Entry (Sent to driver's email)
  ├── Driver Sets / Confirms Password
  └── Tap "Verify & Launch Cockpit" ──> [Active Load Cockpit Ready]
```

#### Flow 3: Returning Driver Login
```
[Mobile Driver Cockpit] ──> [Enter Email & Password] ──> [Direct to Active Dispatches]
```

### Visual Identity & Theme (Apple Minimal & Functional)
- **Design Philosophy**: Minimal, distraction-free aesthetic matching Apple's Human Interface Guidelines. Fluid whitespace, subtle hairline dividers (`1px border-neutral-200 dark:border-neutral-800`), refined corner curvature (`rounded-2xl` cards, `rounded-xl` controls).
- **Color Palette & Discipline**:
  - *Canvas (60%)*: Pure white (`#FFFFFF`) in light mode; Deep obsidian (`#000000` / `#121214`) in dark mode.
  - *Structural Surfaces (30%)*: Translucent blurred navbars (`backdrop-blur-md bg-white/80`), subtle slate containers (`#F5F5F7` light, `#1C1C1E` dark).
  - *Accent Budget (10%)*: Apple Royal Blue (`#007AFF`) for interactive controls, Grass Green (`#34C759`) for verified status / on-time dispatches, Warning Amber (`#FF9500`) for pending verification codes.
- **Typography**:
  - Primary: `-apple-system`, `SF Pro Display`, `Plus Jakarta Sans`.
  - Numerics & Clocks: Monospace tabular numerals (`font-mono tabular-nums`, `SF Mono`, `JetBrains Mono`) for all load numbers, HOS clocks, rates, and 6-digit OTP verification codes.
- **Ergonomics & Touch Targets**:
  - All mobile buttons, tab items, and QR action triggers strictly comply with $\ge 44\text{px}$ touch target standards.
  - Zero pill badges on static metadata; clean unboxed labels with `·` separators.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Dedicated Driver Portal Tab inside Fleet Assets
- **Chosen Approach**: Introduce a third primary sub-tab in `AssetsView.tsx`: `Drivers | Units | Driver Portal`.
- **Why**: Fleet managers and safety officers already operate in `AssetsView` to inspect CDL compliance, medical cards, and truck assignments. Grouping driver digital credentials alongside their physical and compliance assets creates a coherent workflow rather than burying it in Settings.
- **Alternatives Considered**: Dedicated sidebar item (rejected: clutters top-level TMS navigation with an unnecessary 13th icon).

### Decision 2: Dual Onboarding (QR Code + SMS Link) leading to Email/Password Gate
- **Chosen Approach**: The dispatcher generates an onboarding pass containing both a visual QR code and a shareable URL. Opening the link directs the driver to the mobile cockpit where their verified email is pre-staged, prompting for the 6-digit email verification code and password creation.
- **Why**: Drivers are often physically near dispatchers at the terminal (where QR scanning off an iPad/monitor is instant) or hundreds of miles away on a route (where SMS/WhatsApp is necessary). Both paths funnel smoothly into the same secure email-verified credential store.

### Decision 3: First-Time Login Code Verification with Session Persistence
- **Chosen Approach**: First-time authentication validates the 6-digit code sent to the driver's registered email address. Once verified, the driver establishes their password. The application issues a long-lived signed session token stored in client storage (`localStorage`), allowing the driver to stay logged in across shifts while honoring instant revocation from the dispatcher portal.
- **Why**: Truck drivers cannot be burdened with multi-factor authentication at every single highway rest stop or weigh station. Securing the initial onboarding with an email verification code ensures account ownership, while session persistence ensures cab safety and velocity.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GridTMS Dispatcher UI                           │
│   (AssetsView.tsx -> Driver Portal Tab -> DriverPassModal.tsx)         │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ 1. Provision Access             │ 2. Revoke / Reset
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Express Server API                              │
│                    (frontend/server.ts)                                │
│  • /api/drivers/portal/list       • /api/drivers/portal/provision      │
│  • /api/drivers/portal/revoke     • /api/drivers/portal/resend-code    │
│  • /api/driver/auth/login         • /api/driver/auth/verify-email      │
└───────────────┬──────────────────────────────────┬─────────────────────┘
                │ Stores Credentials & Codes       │ Validates Session
                ▼                                  ▼
┌─────────────────────────────────┐   ┌──────────────────────────────────┐
│  Driver Accounts Store          │   │      Mobile Driver Cockpit       │
│  (tms_driver_accounts & memory) │   │     (public/solo_cockpit.html)   │
│  • driver_id   • email          │   │  • QR / SMS link listener        │
│  • password    • verification   │   │  • Email + Password Sign-In      │
│  • code        • code_expires   │   │  • 6-Digit Email Code Gate       │
│  • verified    • session_token  │   │  • Real-Time Load & HOS Cockpit  │
└─────────────────────────────────┘   └──────────────────────────────────┘
```

### Data Model & State Extensions

#### 1. Driver Portal Account Entity (`DriverAccount`)
```typescript
export interface DriverAccount {
  id: string;
  driverId: string;
  driverName: string;
  email: string;
  phone: string;
  dotNumber: string;
  assignedTruckId?: string;
  assignedTruckUnit?: string;
  portalStatus: 'Active' | 'Pending Verification' | 'Suspended';
  emailVerified: boolean;
  verificationCode?: string;
  verificationExpiresAt?: string;
  passwordHash?: string;
  sessionToken?: string;
  lastActive?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### 2. Driver Verification Payload
```typescript
export interface DriverVerifyPayload {
  email: string;
  code: string;
  newPassword?: string;
}
```

### Component & Interactive Handler Mapping

| Component | Responsibility & Interactions | Handlers |
|---|---|---|
| `AssetsView.tsx` | Hosts the new `Driver Portal` tab header and views. | `setActiveTab('DriverPortal')`, `handleSelectDriver(driver)` |
| `DriverPortalTab.tsx` | Lists all drivers, their portal access status, truck link, and quick action buttons. | `onProvision(driver)`, `onRevoke(driver)`, `onResendCode(driver)` |
| `DriverPassModal.tsx` | Displays high-contrast SVG QR code, 1-click SMS/WhatsApp share triggers, copyable magic link, and temporary password indicator. | `copyMagicLink()`, `sendSmsLink()`, `printQrPass()`, `closeModal()` |
| `solo_cockpit.html` / Mobile Driver View | Dedicated mobile view handling Email + Password login, 6-digit verification code screen, and active load cockpit. | `handleLogin()`, `handleVerifyCode()`, `handleResendCode()`, `handleUpdateTripStatus()` |
| `server.ts` | Handles credential provisioning, email verification validation, session generation, and driver data endpoints. | `/api/drivers/portal/*`, `/api/driver/auth/*` |

---

## 5. Implementation Steps (Execution Phase)

1. **Step 1: Backend API Endpoints (`frontend/server.ts`)**
   - Add in-memory & database store for `tms_driver_accounts`.
   - Implement `/api/drivers/portal/list`, `/api/drivers/portal/provision`, `/api/drivers/portal/revoke`, `/api/drivers/portal/resend-code`.
   - Implement driver authentication endpoints: `/api/driver/auth/login`, `/api/driver/auth/verify-email`, and session validation.
2. **Step 2: Dispatcher Driver Portal Tab (`AssetsView.tsx` / `DriverPortalTab.tsx`)**
   - Add `Driver Portal` tab to `AssetsView`.
   - Build scannable driver directory displaying portal status badges, truck associations, and 1-click action buttons.
3. **Step 3: Driver Pass Modal (`DriverPassModal.tsx`)**
   - Create Apple-style modal with instant dynamic QR code, formatted SMS dispatch link, copyable magic URL, and credential status card.
4. **Step 4: Mobile Driver App Login & Verification Flow (`solo_cockpit.html`)**
   - Implement email + password login screen with toggleable visibility.
   - Implement 6-digit email verification code screen with countdown timer and error handling.
   - Connect authenticated driver session directly to their assigned active loads and HOS timers.
5. **Step 5: Verification & End-to-End Build Test**
   - Verify zero lint/compilation errors.
   - Test dispatcher provisioning, QR code generation, mobile verification, and status synchronization.
