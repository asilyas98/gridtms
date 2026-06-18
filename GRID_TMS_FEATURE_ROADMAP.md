# Grid TMS — Feature Roadmap & Market Research

> Compiled from market research across McLeod Software, Oracle TM, SAP TM, Alvys, Samsara,
> Motive, Toro TMS, Vektor TMS, Transport Pro, and FMCSA regulatory requirements.
> Status key: ✅ Implemented · 🔶 Partial / Needs Work · ❌ Not Yet Built

---

## Table of Contents

1. [Load & Order Management](#1-load--order-management)
2. [Dispatch & Scheduling](#2-dispatch--scheduling)
3. [Real-Time Tracking & Visibility](#3-real-time-tracking--visibility)
4. [Driver Management](#4-driver-management)
5. [Fleet & Equipment Management](#5-fleet--equipment-management)
6. [Compliance & Safety (DOT/FMCSA)](#6-compliance--safety-dotfmcsa)
7. [Maintenance Management](#7-maintenance-management)
8. [Financial — Invoicing & Billing](#8-financial--invoicing--billing)
9. [Financial — Settlements & Payroll](#9-financial--settlements--payroll)
10. [Financial — Accounting & Tax](#10-financial--accounting--tax)
11. [Customer Relationship Management](#11-customer-relationship-management)
12. [Integrations & Connectivity](#12-integrations--connectivity)
13. [Reports & Analytics](#13-reports--analytics)
14. [Document Management](#14-document-management)
15. [Safety Program Management](#15-safety-program-management)
16. [Admin, Settings & Platform](#16-admin-settings--platform)
17. [AI & Automation (Future)](#17-ai--automation-future)

---

## 1. Load & Order Management

The core function of any TMS. Every load's full lifecycle from quote to paid.

| Feature | Status | Notes |
|---|---|---|
| Create / edit loads with all fields | ✅ | |
| Load number auto-generation | ✅ | |
| Load status workflow (Created → Dispatched → … → Paid) | ✅ | |
| Multi-stop loads (more than 1 pickup or delivery) | ❌ | High priority — LTL and relay runs need this |
| Load type support (FTL, LTL, Partial, Flatbed, Reefer, Hazmat) | 🔶 | Type field exists, no type-specific workflows |
| Commodity / freight description fields | ❌ | Required for BOL and compliance |
| Weight, dims, piece count, pallet count fields | 🔶 | Weight exists; dims/pieces missing |
| Temperature requirements (reefer) | ❌ | |
| Hazmat fields (UN number, class, placard) | ❌ | Required for FMCSA compliance |
| Rate confirmation upload / attach to load | ❌ | Critical for broker loads |
| BOL (Bill of Lading) generation from load data | ❌ | Should auto-populate from load fields |
| POD (Proof of Delivery) capture / upload | ❌ | Required before invoicing |
| Lumper / unload fee tracking per stop | ❌ | Common accessorial |
| Accessorial charges (detention, layover, TONU, fuel surcharge) | ❌ | Major revenue component |
| Fuel Surcharge (FSC) auto-calculation by mileage / rate table | ❌ | |
| Deadhead miles tracking per load | ❌ | Key profitability KPI |
| Empty miles vs loaded miles breakdown | ❌ | |
| Load duplication / template loads | ❌ | Speeds up recurring lane entry |
| Load search and advanced filtering | 🔶 | Basic filter exists |
| Archive / cancel load with notes | ✅ | |
| Load activity / audit trail (who changed what, when) | ❌ | Critical for disputes |

---

## 2. Dispatch & Scheduling

Planning, assigning, and communicating loads to drivers.

| Feature | Status | Notes |
|---|---|---|
| Dispatch board / calendar schedule view | ✅ | |
| Drag-and-drop load assignment | ❌ | McLeod, Alvys both have this |
| Driver availability view | ✅ | |
| Multi-day load display on calendar | ✅ | |
| Color-coded load status on board | ✅ | |
| Driver HOS availability indicator | ❌ | Requires ELD integration |
| Truck availability / maintenance hold status | 🔶 | Status field exists |
| Recommended driver match (by proximity, HOS, qualifications) | ❌ | AI feature |
| Load board integration (DAT, Truckstop.com) | ❌ | Post loads, find capacity |
| Broker load import (email / EDI / API) | ❌ | |
| Relay / team driver dispatch support | ❌ | |
| Driver messaging / two-way communication | ❌ | In-app chat or SMS integration |
| Push notifications to driver mobile app | ❌ | |
| Dispatcher notes per load | 🔶 | Notes field exists |
| Load tender accept / reject workflow | ❌ | For shipper-initiated loads |

---

## 3. Real-Time Tracking & Visibility

Where is every truck right now? Customers need to know; dispatchers need to see.

| Feature | Status | Notes |
|---|---|---|
| Live GPS map view of all active trucks | ❌ | Highest-impact missing feature |
| ELD integration (Samsara, Motive, KeepTruckin) | ❌ | Auto-pulls location, HOS, odometer |
| Geofencing — auto status update on arrival/departure | ❌ | Triggers "Picked Up" / "Delivered" automatically |
| ETA calculations with traffic/weather | ❌ | |
| Driver check-in / check-out per stop | ❌ | |
| Real-time load status pushed to customer | ❌ | |
| Customer-facing shipment tracking link | ❌ | Self-service visibility portal |
| Late load / delay alerts | ❌ | Proactive exception management |
| Breadcrumb trail / trip history replay | ❌ | |
| Idle time reporting | ❌ | Fuel cost management |

---

## 4. Driver Management

Comprehensive driver profiles required by FMCSA Part 391.

| Feature | Status | Notes |
|---|---|---|
| Driver profile with all contact info | ✅ | |
| CDL number, class, endorsements, expiry | ✅ | |
| Medical examiner certificate (MEC) with expiry | ✅ | |
| MVR (Motor Vehicle Record) — upload & track | ✅ | |
| Drug & alcohol consent form | ✅ | |
| Pre-employment drug test record | ✅ | |
| Employment application on file | ✅ | |
| Road test certificate | ✅ | |
| Safety performance history (prior employers) | ✅ | |
| Annual review of driving record | ❌ | DQF requirement — schedule and track |
| Driver qualification file (DQF) completeness score | 🔶 | Compliance tab shows this |
| Document expiry alerts (auto email/push) | 🔶 | Compliance tab alerts exist |
| Driver pay type (per mile, % of load, hourly, flat) | 🔶 | Exists in settlements |
| Pay rate per driver | 🔶 | Exists in settlements |
| Driver performance scorecard (OTP, miles, loads, incidents) | 🔶 | Basic in Reports tab |
| Driver hire date, termination date, status (Active/Terminated) | 🔶 | Status field exists |
| Emergency contact information | ❌ | |
| Training records (HazMat, OSHA, orientation) | ❌ | |
| Accident / incident history log | ❌ | FMCSA requirement |
| License endorsements (HazMat, Tanker, Doubles/Triples, Passenger) | 🔶 | Listed in profile |
| FMCSA Clearinghouse query records | ❌ | Required on hire and annually |
| PSP (Pre-Employment Screening Program) report | ❌ | |
| Owner-operator vs company driver distinction | ❌ | Affects pay calculation and insurance |
| Driver app login / mobile access | ❌ | |
| Archive driver with notes / reason | ✅ | |

---

## 5. Fleet & Equipment Management

Every power unit and trailer your company operates.

| Feature | Status | Notes |
|---|---|---|
| Truck / unit profile | ✅ | |
| VIN, make, model, year, license plate | ✅ | |
| Unit type (tractor, trailer, reefer, flatbed, straight truck) | ✅ | |
| DOT number, MC number per unit | ❌ | Needed for FMCSA lookup |
| Annual DOT inspection record | ✅ | |
| Registration expiry with alerts | ✅ | |
| IFTA decal / state permits tracking | ❌ | Apportioned plate management |
| Oversize / overweight permit tracking | ❌ | |
| Current assigned driver | ✅ | |
| Odometer tracking (auto-update from ELD) | ❌ | |
| Engine hours tracking | ❌ | For maintenance scheduling |
| GPS unit assignment | ❌ | Link ELD device to unit |
| Fuel card assignment per unit | ❌ | |
| Insurance policy per unit | ❌ | Required by FMCSA |
| Lease vs. owned status | ❌ | |
| GVWR / axle weight ratings | ❌ | Needed for weight compliance |
| Tire tracking (brand, position, tread, replacement) | ❌ | Cost management |
| Equipment depreciation tracking | ❌ | Financial planning |
| Archive unit with notes | ✅ | |

---

## 6. Compliance & Safety (DOT/FMCSA)

The make-or-break section for any carrier operating in the US.

| Feature | Status | Notes |
|---|---|---|
| DOT Audit readiness score | ✅ | |
| Driver Qualification File (DQF) completeness per driver | ✅ | |
| Compliance document upload per driver/unit | ✅ | |
| Expiry alerts for all compliance documents | ✅ | |
| FMCSA Clearinghouse integration | ❌ | Mandatory query on hire + annually |
| HOS (Hours of Service) status per driver | ❌ | Requires ELD feed |
| ELD mandate compliance tracking | ❌ | |
| CSA (Compliance, Safety, Accountability) score monitoring | ❌ | Pull from FMCSA SMS website |
| Roadside inspection results log | ❌ | BASIC program data |
| Accident register (FMCSA required, 3-year retention) | ❌ | Date, location, fatalities, injuries |
| Safety rating tracking (Satisfactory / Conditional / Unsatisfactory) | ❌ | |
| Mock DOT audit workflow | ✅ | |
| Generate DOT audit package (export all DQF docs) | ✅ | |
| UCR (Unified Carrier Registration) tracking | ❌ | Annual federal requirement |
| BOC-3 process agent on file | ❌ | Federal filing requirement |
| Operating authority (MC number) status | ❌ | Active / revoked / pending |
| MCS-150 biennial update reminder | ❌ | Federal requirement |
| Drug & Alcohol testing program (random pool) | 🔶 | Basic tracking in compliance tab |
| Return-to-duty / follow-up testing tracking | ❌ | Post-positive test protocol |
| FMCSA Clearinghouse consent form tracking | ❌ | Required before pulling records |

---

## 7. Maintenance Management

Unplanned breakdowns are the #1 destroyer of trucking margins.

| Feature | Status | Notes |
|---|---|---|
| Preventive maintenance schedule (by mileage or date) | ❌ | Oil change, tire rotation, annual PM |
| Maintenance record per unit | ❌ | Full repair history |
| Work order creation and tracking | ❌ | Assign to shop, track parts & labor |
| Vendor / repair shop directory | ❌ | Preferred vendors per region |
| DVIR (Driver Vehicle Inspection Report) digital form | ❌ | Pre-trip, post-trip per FMCSA |
| Defect reporting and resolution workflow | ❌ | Out-of-service tracking |
| Parts inventory (basic) | ❌ | For fleets with in-house shop |
| Maintenance cost tracking per unit | ❌ | Cost per mile analysis |
| Breakdown incident log | ❌ | Date, location, cause, cost |
| Maintenance due alerts (email / push) | ❌ | |
| Out-of-service status flag on unit | ❌ | Prevents dispatch of unavailable truck |
| Warranty tracking per unit | ❌ | |

---

## 8. Financial — Invoicing & Billing

Getting paid — fast and accurately.

| Feature | Status | Notes |
|---|---|---|
| Invoice creation from load | ✅ | |
| Invoice builder with line items | ✅ | |
| Accessorial line items (detention, fuel surcharge, etc.) | ❌ | |
| Invoice number auto-generation | ✅ | |
| Invoice PDF generation & email send | 🔶 | Builder exists; email needs SMTP |
| Invoice status workflow (Draft → Sent → Paid) | ✅ | |
| Partial payment recording | ✅ | |
| Payment method tracking (check, ACH, wire, factoring) | ✅ | |
| Overdue invoice aging buckets | ✅ | |
| Disputed invoice resolution workflow | ✅ | |
| Credit memo creation | ❌ | For adjustments and disputes |
| Factoring integration (OTR, RTS, Triumph, Denim) | ❌ | Submit invoice directly to factor |
| Quick pay / early pay discount | ❌ | |
| Customer credit limit / credit hold | ❌ | AR risk management |
| Batch invoicing (multiple loads → one invoice) | ❌ | Common for high-volume customers |
| Recurring invoice for dedicated lanes | ❌ | |
| Invoice audit trail (who changed, when) | ❌ | |
| Ready-to-invoice alerts (compact banner) | ✅ | |

---

## 9. Financial — Settlements & Payroll

Paying drivers correctly and on time prevents turnover.

| Feature | Status | Notes |
|---|---|---|
| Driver settlement calculation | ✅ | |
| Per-mile pay calculation | ✅ | |
| Percentage-of-load pay calculation | 🔶 | |
| Flat rate per load | 🔶 | |
| Stop pay, layover, detention pay | ❌ | Accessorial driver pay |
| Fuel advance / escrow deduction | ❌ | |
| EFS / Comdata fuel card deduction | ❌ | |
| Deduction tracking (insurance, tools, advances) | ❌ | |
| Owner-operator settlement (separate from company driver) | ❌ | Different tax treatment |
| Settlement statement PDF for driver | 🔶 | Basic calculation shown |
| ACH / direct deposit integration | ❌ | |
| QuickBooks export for payroll | ❌ | |
| Payroll history per driver | ❌ | |
| Bonus / incentive tracking | ❌ | Safety, performance bonuses |

---

## 10. Financial — Accounting & Tax

Back-office financial control.

| Feature | Status | Notes |
|---|---|---|
| Revenue dashboard (total, by period, by customer) | ✅ | |
| Expense tracking (fuel, maintenance, tolls, permits) | ❌ | |
| Profit & loss per load | ❌ | Load-level profitability |
| Profit & loss by driver | ❌ | |
| Profit & loss by customer / lane | ❌ | |
| IFTA fuel tax reporting (quarterly) | ❌ | State mileage × fuel purchased |
| HUT (Highway Use Tax) tracking | ❌ | Federal Form 2290 |
| IRP (International Registration Plan) management | ❌ | Apportioned plates |
| QuickBooks / Xero / accounting integration | ❌ | High demand feature |
| Chart of accounts (basic GL) | ❌ | |
| Accounts receivable aging | ✅ | In Reports and Invoices |
| Accounts payable (vendor bills) | ❌ | |
| Fuel purchase log (per unit, per state) | ❌ | Required for IFTA |
| Toll expense tracking | ❌ | |
| Detention / accessorial revenue tracking | ❌ | |

---

## 11. Customer Relationship Management

Your shippers are your revenue — keep them close.

| Feature | Status | Notes |
|---|---|---|
| Customer profile (contact, billing, shipping addresses) | ✅ | |
| Customer load history | 🔶 | Can filter loads by customer |
| Customer billing preferences (net 15/30/45, method) | 🔶 | |
| Lane / rate history per customer | ❌ | What did we charge them last time? |
| Contract lane rates (per-mile or flat by O&D pair) | ❌ | Dedicated contract management |
| Customer credit limit / balance owing | ❌ | |
| Customer portal — shipment tracking link | ❌ | Self-service track & trace |
| Customer satisfaction / rating | 🔶 | Invoice rating exists |
| Quote generation (before load is booked) | ❌ | Convert quote → load |
| Email communication log per customer | ❌ | |
| Notes / activity log per customer | ❌ | |
| EDI 204/214/210 support (for large shippers) | ❌ | Enterprise shipper requirement |

---

## 12. Integrations & Connectivity

No TMS is an island. These integrations multiply the system's value.

| Category | Integration | Status |
|---|---|---|
| **ELD / Telematics** | Samsara, Motive, Verizon Connect, Fleet Complete | ❌ |
| **Load Boards** | DAT, Truckstop.com, 123Loadboard | ❌ |
| **Accounting** | QuickBooks Online, QuickBooks Desktop, Xero | ❌ |
| **Factoring** | OTR Solutions, RTS Financial, Triumph, Denim | ❌ |
| **Fuel Cards** | EFS (now Relay), Comdata, WEX, Fleetcor | ❌ |
| **EDI** | EDI 204 (Load Tender), 214 (Status), 210 (Invoice) | ❌ |
| **Maps / Routing** | Google Maps, PC Miler, Rand McNally | ❌ |
| **Document Scanning** | OCR for BOL / rate con capture | ❌ |
| **FMCSA** | SAFER web (carrier lookup), PSP, Clearinghouse | ❌ |
| **Email** | SMTP (invoice send, alerts) | ❌ |
| **SMS / Messaging** | Twilio (driver alerts, customer ETAs) | ❌ |
| **Load Matching** | Convoy, Uber Freight, Amazon Relay | ❌ |
| **Insurance** | Certificate of insurance auto-check per carrier | ❌ |
| **Payroll** | ADP, Paychex | ❌ |
| **API / Webhooks** | Public API for customer integrations | ❌ |

---

## 13. Reports & Analytics

Dispatch without data is guessing. Every number below is tracked by top carriers.

### Operational KPIs (Dashboard-level)
| Metric | Status |
|---|---|
| Total loads this week / month / YTD | ✅ |
| Revenue this week / month / YTD | ✅ |
| Active drivers count | ✅ |
| Active trucks count | ✅ |
| On-time delivery rate (%) | ❌ |
| Deadhead miles (%) | ❌ |
| Truck utilization rate (%) | ❌ |
| Revenue per truck per week | ❌ |
| Average revenue per mile (RPM) | 🔶 |
| Average cost per mile (CPM) | ❌ |
| Net margin per load | ❌ |

### Standard Reports
| Report | Status |
|---|---|
| Load Activity Report (by date range, status, driver, customer) | 🔶 |
| Revenue by Customer | 🔶 |
| Revenue by Lane (O&D pair) | ❌ |
| Revenue by Driver | 🔶 |
| Driver Performance Scorecard | 🔶 |
| Invoice Aging Report | ✅ |
| Profit & Loss by Load | ❌ |
| Deadhead Miles Report | ❌ |
| Fuel Cost Report | ❌ |
| IFTA Mileage Summary | ❌ |
| Driver Settlement History | ❌ |
| Maintenance Cost per Unit | ❌ |
| Safety / CSA Score Trend | ❌ |
| Document Expiry Report | 🔶 |
| Out-of-Service Days by Unit | ❌ |
| Customer Trend Report (loads, revenue over time) | ❌ |
| Accessorial Revenue Report | ❌ |

### Report Functionality
| Feature | Status |
|---|---|
| Date range filter on all reports | 🔶 |
| Export to CSV | 🔶 |
| Export to PDF / print | 🔶 |
| Column sorting | ✅ |
| Saved / scheduled reports (email delivery) | ❌ |
| Custom report builder | ❌ |
| Charts / graphs on reports | 🔶 |

---

## 14. Document Management

A paperless trucking operation is faster, audit-ready, and harder to lose.

| Feature | Status |
|---|---|
| Document upload (PDF, image) per driver | ✅ |
| Document upload per unit | ✅ |
| Document upload per load (BOL, POD, rate con) | ❌ |
| Document types with expiry tracking | ✅ |
| Document version history | ❌ |
| OCR auto-extract from uploaded documents | ❌ |
| Document search across fleet | ❌ |
| Bulk document export for DOT audit | ✅ |
| Document sharing link (for customer / broker) | ❌ |
| Document retention policy (7-year FMCSA requirement) | ❌ |
| E-signature for driver documents | ❌ |
| Rate confirmation management (upload, link to load) | ❌ |

---

## 15. Safety Program Management

Proactive safety reduces accidents, lowers insurance premiums, and protects the MC number.

| Feature | Status |
|---|---|
| Drug & alcohol random testing pool management | 🔶 |
| Random selection generator (DOT-compliant %) | ❌ |
| Testing history per driver | 🔶 |
| Supervisor reasonable suspicion training log | ❌ |
| Return-to-duty / follow-up test schedule | ❌ |
| Accident register (FMCSA 49 CFR 390.15) | ❌ |
| Near-miss / incident reporting | ❌ |
| Driver coaching record | ❌ |
| Safety meeting attendance log | ❌ |
| CSA BASIC score display and trend | ❌ |
| Roadside inspection log (date, location, level, violations) | ❌ |
| Violation tracking (citations, fines) | ❌ |
| Insurance certificate tracking per truck | ❌ |
| Safety score per driver (internal) | 🔶 |

---

## 16. Admin, Settings & Platform

The infrastructure that makes the platform reliable and usable.

| Feature | Status |
|---|---|
| Company profile (name, MC#, DOT#, address, logo) | ✅ |
| Multi-user support with role-based access | ❌ |
| User roles: Admin, Dispatcher, Driver, Accountant, Safety Manager | ❌ |
| Audit log (who logged in, what they changed) | ❌ |
| Dark mode | ✅ |
| Font size accessibility control | ✅ |
| Mobile-responsive UI | ✅ |
| Notifications center | ❌ |
| Email notification preferences | ❌ |
| Data backup / export (full data export) | ❌ |
| Two-factor authentication (2FA) | ❌ |
| SSO (Google / Microsoft login) | ❌ |
| Onboarding wizard for new companies | ❌ |
| Help documentation / in-app tooltips | ❌ |
| Carrier profile (MC#, DOT#, SCAC code, insurance) | ❌ |
| Multiple terminals / offices support | ❌ |

---

## 17. AI & Automation (Future)

Where the market is heading — differentiation opportunities.

| Feature | Priority | Notes |
|---|---|---|
| AI load matching (match available driver + truck to load) | High | Samsara, TMS.ai already doing this |
| Automated email → load creation (parse rate cons) | High | TMS.ai "TED" feature — huge time saver |
| Predictive maintenance alerts | Medium | Flag trucks likely to need service |
| Smart rate recommendation (based on lane history) | High | Price loads competitively |
| Automated invoicing on delivery confirmation | High | Trigger invoice when POD received |
| Driver coaching AI (from dashcam events) | Medium | Safety program differentiator |
| Chatbot dispatcher assistant | Medium | Answer "where is my driver?" |
| Automated document expiry renewal reminders | High | Email driver + safety manager |
| Freight market rate intelligence (live DAT/spot rates) | Medium | Price optimization |
| Anomaly detection (unusual costs, routes, billing) | Low | Fraud / error prevention |
| Natural language load search ("show me all overdue Chicago loads") | Low | |

---

## Priority Build Order

Based on market research and what's most common in competitor systems, here is the recommended build priority:

### 🔴 Critical (Required for production use by a real carrier)
1. **Live GPS map view** — dispatchers need to see where trucks are
2. **ELD integration** (Samsara or Motive) — HOS, odometer, location
3. **BOL generation** — print-ready Bill of Lading from load data
4. **POD capture** — required before invoicing
5. **Multi-stop loads** — most loads have more than 2 stops
6. **Rate confirmation upload** — attach to loads from brokers
7. **Accessorial charges** — detention, fuel surcharge; major revenue leakage without this
8. **IFTA fuel tax reporting** — quarterly legal requirement
9. **QuickBooks integration** — accountants will demand this
10. **User roles & multi-user access** — can't share one login in a real company

### 🟡 High Value (Competitive with mid-market TMS)
11. Factoring integration (submit invoices to factor directly)
12. Load board integration (DAT, Truckstop)
13. Preventive maintenance scheduling
14. DVIR digital form
15. Driver mobile app (view loads, check in/out, upload docs)
16. Customer tracking portal
17. Accident register
18. CSA score monitoring
19. Profit & Loss per load
20. Deadhead miles tracking

### 🟢 Differentiators (Best-in-class, ahead of most SMB TMS)
21. AI rate recommendation
22. Automated invoice on POD received
23. Email → load creation (parse rate confirmations)
24. Predictive maintenance
25. Driver coaching scorecard with trend

---

## Competitive Benchmark

| Feature Category | Grid TMS | McLeod | Alvys | Toro TMS | Samsara |
|---|---|---|---|---|---|
| Load Management | 7/10 | 10/10 | 9/10 | 8/10 | 6/10 |
| Dispatch Board | 7/10 | 9/10 | 8/10 | 7/10 | 5/10 |
| GPS / Tracking | 0/10 | 6/10 | 7/10 | 5/10 | 10/10 |
| Driver Compliance | 7/10 | 9/10 | 9/10 | 8/10 | 8/10 |
| Invoicing | 7/10 | 10/10 | 9/10 | 8/10 | 3/10 |
| Settlements | 5/10 | 9/10 | 9/10 | 8/10 | 2/10 |
| Maintenance | 2/10 | 7/10 | 6/10 | 5/10 | 9/10 |
| Accounting / Tax | 2/10 | 8/10 | 8/10 | 6/10 | 3/10 |
| Reports | 5/10 | 9/10 | 8/10 | 7/10 | 7/10 |
| Integrations | 0/10 | 9/10 | 9/10 | 7/10 | 9/10 |
| UI / Design | 9/10 | 5/10 | 7/10 | 7/10 | 8/10 |

Grid TMS has a **strong design advantage** and solid compliance/load foundation.
The biggest gaps are GPS/tracking, maintenance, accounting/tax, and integrations.

---

*Research sources: FreightWaves, McLeod Software, Alvys TMS, Toro TMS, Vektor TMS, FMCSA.dot.gov,
Samsara, Motive, Apex Capital, Truckstop.com, Sage, DataTruck, SharpSheets, TMS.ai*
