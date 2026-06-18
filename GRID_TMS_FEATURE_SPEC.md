# Grid TMS — Comprehensive Feature Specification

**A carrier-focused Transportation Management System (TMS)**
Covers the full carrier lifecycle: driver onboarding → daily operations → financials → FMCSA compliance and audit readiness.

---

## 0. How to read this document (instructions for Claude Code)

This is a **feature specification**, not an implementation guide. It defines *what* the system must do, not *how* it should look. Do not invent UI styling, color systems, or layout from this document — those decisions are owned separately.

**Build rules:**

1. **Build by priority, not top-to-bottom.** Every module is tagged `[CORE]`, `[STANDARD]`, or `[ADVANCED]`. Ship all `[CORE]` modules first as a working product, then `[STANDARD]`, then `[ADVANCED]`. This ordering is also how the product stays minimal — do not surface `[ADVANCED]` features in primary navigation until they exist and are needed.
2. **One source of truth.** A piece of data is entered once (almost always at load creation or driver onboarding) and reused everywhere downstream — dispatch, tracking, invoicing, settlement, IFTA, reporting. Never require the user to retype data the system already has. Treat duplicate data entry as a bug.
3. **Compliance is proactive, not a filing cabinet.** The system does not just *store* compliance documents — it *watches* them, knows their expiration dates and retention rules, and warns the user before something lapses. A document store that requires the user to remember what's expiring has failed the core purpose.
4. **Each feature is independently testable.** Write features so each bullet can be verified on its own.
5. **Tags marked `(AI)`** are intelligence-assisted features. They are optional/premium-tier candidates; the system must be fully functional without them.

**Conventions used below:**
- `Entity` names are written in `CodeFont` and defined in §2.
- Regulatory citations (e.g., `49 CFR 391.51`) are included so the build can encode the actual rule. Treat all retention periods and rule values as **configurable defaults** that an admin can adjust, and verify against current FMCSA regulations at build time, since rules change.

---

## 1. Product principles & constraints

These are functional/architectural principles. They are not visual design.

- **Minimal surface area.** Show the user only what is relevant to their role and the task in front of them. Use progressive disclosure: advanced/rare actions live behind a secondary action, not on the main screen. A new dispatcher should be productive within ~30 minutes without training.
- **Status-driven, not form-driven.** The operational core revolves around the *state* of loads, drivers, and trucks. The user should be able to see and change state quickly; data entry is a means to that end.
- **Defaults over questions.** Pre-fill everything that can be inferred (driver's pay rate, customer's billing terms, truck's last known location). Ask the user only for what truly can't be derived.
- **Fail safe and visible.** When something is non-compliant, out of date, or blocking dispatch, the system makes that obvious at the point of action — e.g., it will not let a dispatcher assign a driver whose medical card expired, and it explains why.
- **Search-first.** Anything in the system (a load, a driver, a document, an invoice) is findable in one search by an obvious identifier.
- **Mobile reality for drivers.** Drivers interact through a lightweight mobile experience (document upload, status updates, viewing assignments) — not the full back-office app.
- **Auditable.** Every meaningful change is logged (who, what, when). This is both a business need and a compliance need.

---

## 2. Core data model (entities & relationships)

Build the schema around these entities. Relationships in parentheses.

- **`Carrier`** — the operating company itself. Holds authority/credential data (USDOT#, MC#, authority status, EIN, DBA, principal address). One per tenant for a single-carrier deployment; the model should not prevent multi-carrier later.
- **`User`** — a login. Has one or more `Role`s. (belongs to `Carrier`)
- **`Driver`** — a person who operates equipment. Has a `DriverQualificationFile`, a pay profile, status (active/inactive/terminated), and may be a company driver or owner-operator. (belongs to `Carrier`; assigned to `Load`s; linked to a `User` if they use the mobile app)
- **`DriverQualificationFile` (DQ File)** — the set of compliance documents and records for a `Driver` (see §5).
- **`Truck` (power unit)** — tractor/straight truck. Has VIN, plate, unit#, status, ownership, maintenance records. (belongs to `Carrier`)
- **`Trailer`** — has VIN/serial, type (van/reefer/flatbed/etc.), unit#, status, ownership. (belongs to `Carrier`)
- **`Customer`** — shipper/broker the carrier hauls for. Has billing terms, credit info, contacts. (belongs to `Carrier`)
- **`Load` (order/trip/shipment)** — the central operational object. Has stops, references, rate, assigned `Driver`/`Truck`/`Trailer`, status, documents, charges. (belongs to `Customer`; assigned resources; generates `Invoice` and `SettlementLineItem`s)
- **`Stop`** — a pickup or delivery on a `Load`: location, appointment window, contact, instructions, reference#, arrival/departure timestamps. (belongs to `Load`)
- **`Invoice`** — billing document to a `Customer` for one or more `Load`s. Has line items, status (draft/sent/paid/overdue), aging. (derived from `Load`)
- **`Settlement`** — a driver's pay statement for a period. Composed of `SettlementLineItem`s (load pay, accessorial pay, reimbursements, deductions, advances). (belongs to `Driver`)
- **`Document`** — any uploaded/generated file (BOL, POD, rate confirmation, DQ doc, inspection report, insurance cert, etc.). Has type, tags, linked entity, dates, retention rule. (polymorphic: attaches to `Load`, `Driver`, `Truck`, `Trailer`, `Carrier`, etc.)
- **`FuelTransaction`** — a fuel purchase: date, location/jurisdiction, gallons, amount, truck. Feeds IFTA and settlements. (belongs to `Truck`/`Driver`)
- **`MaintenanceRecord`** — service/repair on a `Truck` or `Trailer`, including the systematic inspection/maintenance file data. (belongs to equipment)
- **`InspectionReport`** — DVIR (driver), annual/periodic DOT inspection, or roadside inspection result. (belongs to equipment, and to `Driver` for DVIR)
- **`Accident`** — an accident register entry. (belongs to `Carrier`, references `Driver`/equipment)
- **`Credential`** — a trackable company-level registration/filing with an expiration or recurring deadline (IFTA, IRP, UCR, MCS-150, BOC-3, insurance, HVUT/Form 2290, authority). (belongs to `Carrier`)
- **`Notification`/`Task`** — a system-generated alert or to-do (expiring document, upcoming filing, overdue invoice, missing POD).

---

## 3. User roles & access `[CORE]`

Role-based access so each user sees only what's relevant (supports minimalism + security).

3.1 Predefined roles, each with a scoped permission set:
- **Owner/Admin** — full access, including company setup, financials, user management.
- **Dispatcher** — loads, drivers, trucks, tracking, documents; no financial/admin settings by default.
- **Accounting/Billing** — invoicing, settlements, AR, financial reports, fuel/IFTA.
- **Safety/Compliance** — DQ files, drug & alcohol, HOS, maintenance/inspections, CSA, filings, audit.
- **Driver** — mobile-scoped: own assignments, own documents, status updates, own settlements (view).

3.2 Permissions are per-module and per-action (view / create / edit / delete / approve). Admin can adjust role permissions.
3.3 A user may hold multiple roles (common in small carriers where one person wears several hats).
3.4 Every login session and permission-sensitive action is logged (see §24).

---

## 4. Carrier setup & account `[CORE]`

The company's own profile and authority/credential foundation. This is also where the "are we legal to operate" picture lives.

4.1 Company profile: legal name, DBA, EIN, physical and mailing address, phone, principal contact.
4.2 Authority & identifiers: USDOT number, MC/MX/FF number(s), authority type (common/contract/broker), authority status (active/pending/revoked), state(s) of operation, SCAC (optional), DUNS (optional).
4.3 Operation classification: interstate/intrastate, cargo types hauled, hazmat flag, number of power units and drivers (these feed MCS-150 and UCR).
4.4 Company-level `Credential` tracking (deep detail in §19): each credential stores issue date, expiration/next-due date, reference/account number, responsible party, and status. The system computes days-to-expiration and raises tasks/notifications ahead of each.
4.5 Insurance records: policy type (auto liability, cargo, general liability, etc.), carrier, policy number, coverage limits, effective and expiration dates, certificate document. **A lapse must be flagged loudly** — even one day's lapse can suspend authority. (See §19.)
4.6 Company documents repository: W-9, authority letter (MC certificate), BOC-3 confirmation, insurance certificates, signed policies (drug & alcohol policy, etc.).
4.7 Onboarding checklist for a new carrier (an `[ADVANCED]` "getting started / authority" guided flow that walks a brand-new operation through the credentials it needs and tracks completion — maps to the new-entrant period). Keep it as an optional guided checklist, not a wall the user must pass.

---

## 5. Driver onboarding & management (Driver Qualification Files) `[CORE]`

This is the "onboarding a driver" pillar and the single most audited area. The system must produce a **complete, FMCSA-compliant Driver Qualification File** per driver, per `49 CFR Part 391`.

### 5.1 Driver record (basics)
- Personal: full name, DOB, contact, address, emergency contact, hire date, termination date.
- Employment type: company driver vs owner-operator (drives downstream pay/settlement logic).
- Status: applicant → active → inactive → terminated, with reason and date.
- CDL details: license number, class, endorsements (H, N, T, P, S, X), restrictions, issuing state, issue/expiration dates.
- Assigned default equipment (optional).

### 5.2 DQ File contents (each is a tracked `Document`/record with required-by-date logic)
Per `49 CFR 391.51`, the file must contain and the system must track:
- **Employment application** (`391.21`) — completed and signed; for CDL drivers, 10-year employment history; non-CDL, 3-year.
- **Motor Vehicle Record (MVR)** from each licensing state at hire (`391.23(a)(1)`) — must be in file within 30 days of hire.
- **Annual MVR** + **annual review of driving record note** (`391.25`) — recurring every 12 months; system auto-schedules the next one.
- **Road test certificate** or accepted equivalent (CDL/certificate) (`391.31`/`391.33`).
- **Safety Performance History / previous employer investigations** (`391.23(d)/(e)`) — within 30 days of hire; document good-faith efforts if unobtainable.
- **Medical Examiner's Certificate (Med Card)** and verification that the examiner is on the National Registry (`391.43`, `391.51(b)(7)`); store `391.49` SPE certificate or federal medical exemption if applicable.
- **List/certificate of violations** where still required (`391.27`).
- (Drug & alcohol pre-employment and Clearinghouse query records live in §17 but must surface in the driver's compliance view.)

### 5.3 Onboarding workflow
- A guided onboarding sequence that creates the driver, opens the DQ file, and presents the required items as a checklist with status (missing / received / verified / expired).
- The system flags which items are **due within 30 days of hire** vs **recurring** vs **one-time**.
- Driver cannot be marked "qualified / dispatch-eligible" until required items are present and unexpired.

### 5.4 Expiration & recurrence engine (critical)
- CDL expiration, medical card expiration, annual MVR/review due date, and any endorsement expirations each generate advance warnings (configurable lead times, e.g., 60/30/7 days).
- A driver whose med card or CDL is expired is automatically blocked from new dispatch assignment, with a clear reason.

### 5.5 Retention
- DQ file retained for the **duration of employment + 3 years** (`391.51(c)`). System retains and clearly marks terminated-driver files until the retention date, then flags as eligible for archival/deletion.

### 5.6 Driver compliance dashboard
- Per-driver "compliance status" rollup (qualified / action needed / expired) summarizing all of the above in one place.
- Fleet-wide driver compliance list, filterable by what's expiring.

---

## 6. Equipment / asset management (trucks & trailers) `[CORE]`

### 6.1 Truck (power unit) record
- VIN, unit number, make/model/year, plate/registration (state, expiration), GVWR, fuel type, ownership (owned / leased / owner-operator-provided), purchase/lease info, status (active/inactive/sold/out-of-service).
- Apportioned (IRP) plate info and registration expiration.
- Linked telematics/ELD device identifier (for integration).

### 6.2 Trailer record
- VIN/serial, unit number, type (dry van / reefer / flatbed / step deck / tanker / etc.), dimensions/capacity, plate/registration, ownership, status.

### 6.3 Equipment compliance & expirations
- Registration expiration, annual DOT inspection due date (see §15), and any permits tracked with advance warnings.
- Out-of-service flag blocks the unit from dispatch assignment.

### 6.4 Equipment file
- Maintenance/inspection history (links to §15), assigned driver history, documents (title, registration, inspection certs, lease agreement).

---

## 7. Customer & broker management `[STANDARD]`

### 7.1 Customer record
- Company name, type (broker / shipper / consignee), MC/DOT (for brokers), contacts, addresses.
- Billing: billing address, terms (net 15/30/etc.), credit limit, factoring eligibility, preferred invoice delivery method (email/EDI/portal).
- Required paperwork per customer (e.g., signed POD before billing).

### 7.2 Broker credit / verification (AI/integration-friendly)
- Store broker credit score / days-to-pay reference and the carrier's own notes; flag brokers flagged as slow/no-pay. (Can integrate external broker-credit data — see §23.)

### 7.3 Carrier packet / broker setup packet builder
- Generate the "carrier packet" a broker requires to set the carrier up: authority (MC cert), W-9, insurance certificate, signed carrier agreement, references, notarized/standard forms.
- Store a reusable packet so it can be sent in one action when onboarding with a new broker.

### 7.4 Customer activity view
- Loads, revenue, outstanding AR, and on-time/billing history per customer.

---

## 8. Load & dispatch management `[CORE]`

The operational heart. A `Load` is created once and reused for tracking, billing, and settlement — no re-entry.

### 8.1 Load creation
- Core fields: customer, rate (line haul + fuel surcharge + accessorials), reference/PO/load numbers, commodity, weight, equipment type required.
- Stops (1..n): each with type (pickup/delivery), location/address, appointment date/time window, contact, special instructions, reference numbers.
- Multi-stop and multi-pickup/multi-drop support.
- Quick-create from a rate confirmation (paste/upload → prefill) `(AI)`.

### 8.2 Rate & charges
- Line haul rate, fuel surcharge, and **accessorial charges** as discrete line items: detention, layover, lumper, TONU (truck ordered not used), stop-off pay, detention, reconsignment, etc. Each accessorial has a type, amount, and note.
- Total revenue auto-calculated; rate-per-mile computed from routed miles.

### 8.3 Assignment (dispatch)
- Assign `Driver` + `Truck` + `Trailer` to a load.
- **Hard blocks at assignment** (this is where compliance meets operations): cannot assign a driver who is not dispatch-eligible (expired med card/CDL, prohibited Clearinghouse status, missing required DQ items) or an out-of-service unit. The block states the exact reason.
- Driver availability awareness: show which drivers are available vs already on a load, and (if HOS integrated) flag insufficient available hours.
- Quick-assign action from a pending-loads view.

### 8.4 Load lifecycle / status
- A clear status model, e.g.: `Quoted → Booked → Assigned → Dispatched → At Pickup → Loaded → In Transit → At Delivery → Delivered → Ready to Invoice → Invoiced → Paid`. (Exact set configurable; keep it small and meaningful.)
- Status changes are timestamped and logged; some can be driven automatically by tracking/ELD geofence events (see §9).

### 8.5 Dispatch communication
- Send dispatch details (stops, appointments, rate/pay as configured, instructions) to the assigned driver in one action via the driver app and/or text/email.
- Capture driver acknowledgement.

### 8.6 Rate confirmation generation
- Generate a rate confirmation / dispatch sheet document from the load data.

### 8.7 Dispatch board / planning view
- A working view of loads by status and by driver/truck across a time horizon (e.g., week), so a dispatcher can see coverage and gaps at a glance. (Functional requirement only — do not design the visual here.)
- Pending/unassigned loads list; active trips list; available-driver list. (These three operational lists are higher value than a map and should be prioritized over mapping.)

### 8.8 Load documents
- Attach BOL, POD, rate confirmation, lumper receipts, scale tickets, and other paperwork to the load. Drivers upload from mobile (see §10).

### 8.9 Load financial rollup
- Per-load: revenue, driver pay, fuel/other allocated cost, and resulting margin — visible on the load and feeding profitability reports (§21).

---

## 9. Tracking & visibility `[STANDARD]`

9.1 Real-time location for active loads, sourced from ELD/telematics integration (preferred) or driver-app check-ins (fallback) — without requiring a separate invasive app where ELD data exists.
9.2 Automatic status/milestone updates via geofence (arrived at pickup, departed, arrived at delivery) where telematics is connected.
9.3 Detention timing: capture arrival/departure at stops to support detention billing; cross-reference location/time so detention charges are defensible.
9.4 Check-call elimination: status and ETA visible without phoning the driver.
9.5 Customer-facing visibility (optional): share live status/tracking with the customer (portal or link), since brokers increasingly require tracking coverage. `[ADVANCED]`

---

## 10. Document management `[CORE]`

Central, because both operations (billing needs PODs) and compliance (audit needs files) depend on it.

10.1 Universal document store: any file attaches to its entity (load, driver, truck, trailer, customer, carrier) with a **document type**, tags, upload date, effective/expiration dates where relevant, and a retention rule.
10.2 Driver mobile capture: drivers scan/upload BOL/POD and other paperwork directly from a phone; documents land on the correct load automatically.
10.3 Search & filter: by type, date range, customer, driver, broker, load number, expiration window.
10.4 Document-driven gating: e.g., a load cannot move to "Ready to Invoice" without a POD if the customer requires one.
10.5 Expiration awareness: documents with expirations (insurance, med cards, registrations, inspections) feed the same notification engine used everywhere.
10.6 Generated documents: invoices, settlements, rate confirmations, and audit packages are produced as documents and stored alongside uploads.
10.7 Bulk export: export a set of documents (e.g., everything tied to a driver, or an audit package) in one action.

---

## 11. Billing & accounts receivable (invoicing) `[CORE]`

11.1 Generate an invoice directly from a completed load (line haul + fuel + accessorials), no re-entry. Support consolidating multiple loads onto one invoice per customer.
11.2 Invoice numbering, terms, and required attachments (auto-attach BOL/POD/rate con per customer rule).
11.3 Batch/instant invoicing: bill many ready loads at once.
11.4 Delivery: email invoice + paperwork to the customer; mark sent. (EDI delivery where integrated — §23.)
11.5 AR tracking: invoice status (draft/sent/paid/partially paid/overdue), aging buckets (0–30/31–60/61–90/90+), and per-customer outstanding balance.
11.6 Payment recording: record full/partial payments, short-pays, and reasons; reconcile against the invoice.
11.7 Factoring support: mark loads/invoices submitted to a factoring company; track factored vs non-factored and advance status. (Integration in §23.)
11.8 Overdue follow-up: surface overdue invoices and (optionally) generate reminders. `(AI)` draft collection reminders.

---

## 12. Driver settlements & payroll `[CORE]`

12.1 Pay profiles per driver supporting common structures: **per-mile, percentage-of-linehaul, flat per-load, hourly**, and combinations; plus stop pay and accessorial pay rules. Owner-operator vs company-driver logic differs and must be supported.
12.2 Auto-build settlements: for a pay period, the system assembles each driver's loads and computes gross pay from the pay profile + load data — no manual entry.
12.3 Additions: stop pay, detention/accessorial share, reimbursements (tolls, scales, lumpers), bonuses.
12.4 Deductions: advances, fuel (if owner-operator buys on company card), insurance, escrow, equipment lease, recurring deductions, chargebacks. Support **recurring/scheduled deductions** and one-offs.
12.5 Advances: record cash/fuel advances and auto-deduct on the next settlement.
12.6 Net pay calculation, settlement statement PDF (load-by-load earnings + deductions), and a review/approve step before finalizing.
12.7 Settlement history with revisions tracked (saved settlements, edits logged).
12.8 Export to payroll/accounting (QuickBooks etc. — §23). Map pay to the correct accounting categories.

---

## 13. Accounting & financial reporting `[STANDARD]`

13.1 Expense tracking: categorized company expenses (fuel, maintenance, tolls, permits, insurance, etc.), with receipt capture.
13.2 Revenue/AP/AR overview tied to loads as the source of truth.
13.3 Profitability analytics: profit per load, per truck, per driver, per lane, and cost-per-mile. (Higher-value than generic dashboards — prioritize within reporting.)
13.4 Accounting integration: sync invoices, settlements, and expense/category mapping to QuickBooks Online or similar so books stay current without re-entry (§23).
13.5 Standard financial reports: AR aging, revenue by period/customer, driver pay summary, expense summary, P&L-style view.
13.6 Tax-prep support: exportable summaries for fuel, mileage, and pay.

---

## 14. Fuel & IFTA `[STANDARD]`

14.1 Fuel transaction capture: by manual entry, receipt upload, or fuel-card integration — date, location/jurisdiction, gallons, price, truck, driver.
14.2 Jurisdiction mileage: capture miles by state/province per trip (from ELD/telematics where integrated, or trip entry) — required for IFTA.
14.3 **IFTA quarterly report generation**: compute miles and gallons by jurisdiction and produce the quarterly fuel-tax report; track filing status and due dates (quarterly). Retain IFTA records (commonly 4 years).
14.4 Fuel reporting: fuel spend by truck/driver/period; integrate fuel cost into per-load margin and settlements.
14.5 Fuel-card integration ingest (§23) so fuel data flows in automatically.

---

## 15. Maintenance & inspections (vehicle) `[STANDARD]`

This area maps to the FMCSA **Vehicle** audit factor and `49 CFR Part 396`.

### 15.1 Maintenance file (per unit) — `49 CFR 396.3`
- Each truck/trailer has a maintenance file with the required identifying data (company/unit number, make, year, VIN/serial, tire size; and, if not carrier-owned, the name of the entity furnishing it).
- Service/repair history: date, odometer, description, vendor, cost, parts.
- Retain maintenance records **1 year while in service + 6 months after the unit leaves the carrier's control** (`396.3(c)`).

### 15.2 Preventive maintenance (PM) scheduling
- Define PM schedules (by mileage, engine hours, or time). System tracks due/overdue PMs and warns ahead of time.

### 15.3 Annual / periodic DOT inspection — `49 CFR 396.17 / 396.21`
- Track each unit's annual inspection date and **next-due date**; store the inspection report/certificate. Retain the periodic inspection report (commonly 14 months). An overdue annual inspection flags the unit out-of-service-eligible and blocks dispatch (operating without a valid annual inspection is an automatic-failure area — see Appendix B).

### 15.4 Driver Vehicle Inspection Reports (DVIR) — `49 CFR 396.11 / 396.13`
- Driver submits a DVIR for each unit when a defect is found (electronic DVIR supported); store report, defect list, and (when defects exist) the **repair certification** and the **next driver's review/sign-off** — the full driver→mechanic→next-driver loop.
- Retain DVIR + repair cert + review cert **3 months** from the date of the report (`396.11(c)`).
- Defects flow to maintenance as actionable items; an open safety-critical defect can block the unit from dispatch.

### 15.5 Roadside inspection results
- Record roadside/CVSA inspection outcomes and any violations/OOS orders; these feed the safety/CSA picture (§18) and may justify DataQs challenges.

---

## 16. Hours of Service (HOS) & ELD `[STANDARD]`

16.1 ELD integration (primary): pull driver duty status and available hours from connected ELD/telematics providers (e.g., Motive, Samsara, Geotab, Omnitracs, Verizon Connect, JJ Keller — see §23). The TMS is not itself the certified ELD; it consumes ELD data.
16.2 HOS visibility in dispatch: show each driver's remaining drive/on-duty hours so dispatch doesn't assign a load a driver can't legally run; flag insufficient hours at assignment.
16.3 HOS records & supporting documents retained **6 months** (`395.8`) — store/reference logs and supporting docs for the retention window for audit.
16.4 HOS violation surfacing: highlight logged HOS violations for the safety module and CSA picture.
16.5 Where no ELD is connected, the system still tracks the requirement and the records retention, but does not fabricate logs.

---

## 17. Drug & alcohol program / Clearinghouse `[CORE]`

A top automatic-failure area (`49 CFR Part 382`, `Part 40`, FMCSA Clearinghouse). The system tracks the **program** and the **records**, and gates dispatch on prohibited status.

17.1 Written policy: store the company's drug & alcohol policy and each driver's signed acknowledgement of receipt.
17.2 Testing records per driver and event type: **pre-employment, random, post-accident, reasonable suspicion, return-to-duty (RTD), follow-up.** Each with date, type, result, and document.
17.3 Pre-employment gate: a driver cannot be marked dispatch-eligible without a negative pre-employment test result on file.
17.4 Random testing program management: maintain the testing pool (all CDL drivers), track the selection cycle and the annual minimum rates (current FMCSA rates: 50% drug / 10% alcohol — store as configurable), and record completions. Surface whether the program is meeting required rates.
17.5 **Clearinghouse queries** (`Part 382 Subpart G`):
- Pre-employment **full query** (with driver consent) recorded before the driver performs safety-sensitive functions.
- **Annual limited query** for every CDL driver; system schedules each driver's annual query (best practice: stagger by hire date) and tracks the program-level annual deadline (January 5 for the prior calendar year).
- Store consent records and query results/history.
17.6 **Prohibited status gate (hard block):** a driver with a "prohibited" Clearinghouse status (unresolved violation / not RTD-complete) is blocked from any dispatch assignment, with the reason shown.
17.7 Violation handling & RTD tracking: record reported violations, the SAP/return-to-duty process steps, and follow-up testing schedule.
17.8 Supervisor reasonable-suspicion training records (60-minute requirement) tracked as a company compliance item.
17.9 Retention: positive results, refusals, RTD, and follow-up records retained **5 years**; negative results commonly **1 year**; random selection records **5 years** (`382.401` — store as configurable defaults).
17.10 Owner-operator note: support designating a C/TPA (owner-operators cannot self-query) and reflect that in the program setup.

---

## 18. Safety & CSA / SMS monitoring `[ADVANCED]`

18.1 Track the carrier's CSA picture across the FMCSA **BASIC categories**: Unsafe Driving, Crash Indicator, HOS Compliance, Vehicle Maintenance, Controlled Substances/Alcohol, Hazardous Materials Compliance, Driver Fitness. (Build the category set as **configurable** — FMCSA is restructuring BASICs into "Compliance Categories" with Vehicle Maintenance split and Controlled Substances folded into Unsafe Driving; do not hardcode the seven.)
18.2 Display percentile/score per category (0–100, higher is worse), the 24-month lookback nature, and trend over time (improving/worsening). Data is monthly-refreshed from FMCSA SMS.
18.3 Threshold alerts: warn when a category approaches/exceeds intervention thresholds.
18.4 Violation & inspection log: aggregate roadside inspection and crash data tied to drivers/units (feeding from §15.5/§16).
18.5 **DataQs management**: track challenges to inaccurate roadside/crash data and crash-preventability determinations — status, submission date, outcome. (Note in-product: DataQs challenges *data accuracy / preventability*, not whether a citation should have been issued.)
18.6 Safety rating: store the carrier's FMCSA safety rating (Satisfactory/Conditional/Unsatisfactory) and surface its operational/insurance implications.
18.7 Accident register (`49 CFR 390.15`): maintain a register of accidents (date, location, driver, equipment, injuries/fatalities, hazmat, narrative); retain **3 years**. This doubles as an audit factor (§20).

---

## 19. Regulatory filings & credentials lifecycle `[STANDARD]`

A single place that knows every recurring company obligation, its deadline, and its status — the "stay legal" engine. Each is a `Credential` with reference#, responsible party, last-filed date, next-due date, status, document, and advance notifications.

19.1 **MCS-150 biennial update** (`Motor Carrier Identification Report`): due every 2 years; due month derived from the USDOT number; also required within 30 days of certain business changes. Track and warn (missing it can deactivate the USDOT number; penalties up to $10k).
19.2 **UCR (Unified Carrier Registration):** annual renewal; fee tier by fleet size; enforcement begins Jan 1.
19.3 **IFTA:** license status + quarterly filing deadlines (links to §14); records retained ~4 years.
19.4 **IRP (apportioned registration):** annual renewal; jurisdiction/mileage schedule; per-unit apportioned plate tracking (links to §6).
19.5 **BOC-3 (process agent designation):** on file with FMCSA; track the filing and any change — a lapse can suspend authority.
19.6 **Insurance filings (BMC-91/MCS-90 as applicable) & certificates:** coverage, limits, effective/expiration; loud lapse alerts (links to §4.5).
19.7 **HVUT / IRS Form 2290 (heavy vehicle use tax):** annual; due Aug 31; store stamped Schedule 1; track per applicable unit.
19.8 **State-specific permits** where relevant (e.g., CA MCP, KYU, NM/NY/OR weight-distance, etc.) — track as additional credentials.
19.9 **Operating authority status** monitoring (active/pending/revoked) and the new-entrant period clock.
19.10 Unified compliance calendar: a single view of all upcoming filing/expiration deadlines across the company, with status and lead-time warnings.

---

## 20. FMCSA audit readiness — "Audit Cockpit" `[STANDARD]`

The "passing an audit" pillar. Because the system already holds the underlying records, this module **assembles** them into an audit-ready package and tells the user where the gaps are *before* an auditor does. Most safety audits are now conducted offsite via document upload (e.g., the FMCSA NEWS portal), so a clean, exportable, well-labeled package is the deliverable.

20.1 Audit factor organization — group the carrier's records into the FMCSA review factors and show a readiness status (complete / gaps) per factor:
- **General / company records** (authority, MCS-150, insurance, accident register, recordkeeping).
- **Driver** (DQ files per §5, CDL/med-card validity, MVRs, previous-employer checks).
- **Operational / HOS** (HOS & ELD records per §16, supporting docs).
- **Vehicle** (annual inspections, maintenance files, DVIRs per §15).
- **Controlled Substances & Alcohol** (program, testing records, Clearinghouse queries per §17).
- **Accident** (accident register per §18.7).
- **Hazardous Materials** (only if the carrier hauls hazmat).

20.2 **Gap detection / self-audit:** scan all records against requirements and produce a prioritized list of deficiencies (e.g., "Driver X missing previous-employer check," "Truck Y annual inspection overdue," "Q3 Clearinghouse annual query not run for 3 drivers"). Highlight any items that map to **automatic-failure** violations (Appendix B).
20.3 **Mock-audit / retrieval test:** let the user pull each required document quickly; flag anything that can't be produced.
20.4 **Audit package export:** one action assembles a complete, clearly labeled package (by factor / by the portal's expected sections) for offsite submission.
20.5 **Corrective Action Plan (CAP) tracking:** if the carrier fails, track the deficiencies, required corrections, evidence of correction, and the deadline (typically 45 days).
20.6 New-entrant readiness mode: surface the audit-readiness picture specifically for the new-entrant safety audit window (first ~12 months).

---

## 21. Reporting & analytics `[STANDARD]`

21.1 Operational dashboard: loads by status, coverage/utilization, on-time performance, deliveries pending paperwork.
21.2 Financial dashboard: revenue, AR aging, margin, cost-per-mile, profit by truck/driver/lane/customer (links to §13.3).
21.3 Compliance dashboard: expiring driver/equipment/company items, open DVIR defects, overdue inspections, CSA trend, upcoming filings — one consolidated "what needs attention" view.
21.4 Custom date ranges and export (CSV/PDF) on all reports.
21.5 `(AI)` natural-language querying / summaries of operational and financial data (premium-tier candidate).

---

## 22. Notifications & alerts (cross-cutting engine) `[CORE]`

A single notification/task engine consumed by every module — this is what makes compliance proactive (Principle 3).

22.1 Triggers (non-exhaustive): expiring CDL/med card/insurance/registration/permit; upcoming filing deadline (MCS-150/UCR/IFTA/IRP/2290); annual MVR/review due; annual Clearinghouse query due; overdue PM/annual inspection; open DVIR defect; missing POD on a delivered load; overdue invoice; prohibited Clearinghouse status; authority/credential status change.
22.2 Configurable lead times per trigger type (e.g., 60/30/7 days).
22.3 Delivery channels: in-app, email, and (optionally) SMS for high-urgency items.
22.4 Tasks/to-dos: alerts can become assignable tasks with status (open/done) routed to the responsible role.
22.5 Daily/weekly digest option so users aren't overwhelmed (supports minimalism).

---

## 23. Integrations `[ADVANCED]`

Build the data model and load lifecycle so a load entered once flows to every connected system. Each integration is optional and individually toggleable.

23.1 **ELD / telematics:** Motive, Samsara, Geotab, Omnitracs, Verizon Connect, JJ Keller — for location, HOS, geofence status, jurisdiction mileage.
23.2 **Load boards:** DAT (DAT One, RateView/RateView analytics) and Truckstop.com — search/book loads and pull rate confirmations into the TMS; optionally post loads.
23.3 **Accounting:** QuickBooks Online (and similar) — sync invoices, settlements, expenses with category mapping.
23.4 **Factoring:** submit invoices/loads to factoring providers; track advances.
23.5 **Fuel cards:** ingest fuel transactions automatically (feeds §14 and settlements).
23.6 **EDI:** with brokers/shippers for load tender acceptance, status milestones (including detention begin/end), and invoicing — to eliminate double entry.
23.7 **Broker credit / carrier-vetting data** and **FMCSA SMS data** feeds for §18.
23.8 **Maps/routing** for mileage and routing (note: a map view is a *supporting* feature, not a substitute for the operational lists in §8.7 — prioritize accordingly).
23.9 Integration design: prefer official APIs; handle auth/credential errors gracefully and surface a clear re-connect prompt; never require the user to re-enter data an integration already provides.

---

## 24. System / admin, audit trail, security & retention `[CORE]`

24.1 **Audit trail / activity log:** every create/edit/delete/approve on key entities records who, what (before/after where meaningful), and when. Immutable, searchable.
24.2 **Data retention enforcement:** each record type carries its retention rule (Appendix A); the system retains records for the required window and flags expired-retention records for archival/deletion rather than silently dropping them.
24.3 **Backups & recovery:** automated backups; the carrier must be able to recover records (FMCSA expects backup systems; lost records must be reconstructable).
24.4 **Security:** role-based access (§3), least-privilege defaults, secure auth (MFA option for admin), encryption in transit and at rest, no plaintext storage of sensitive credentials/PII beyond what's required.
24.5 **Driver PII handling:** treat DOB, license numbers, medical, and drug/alcohol data as sensitive; restrict to Safety/Admin roles by default.
24.6 **Data export / portability:** the carrier can export its own data (records, documents) on demand.
24.7 **Settings:** company-wide configurable defaults (lead times, retention overrides, pay-rule templates, load status set, required-document rules per customer).

---

## Appendix A — Compliance record retention reference (build as configurable defaults)

| Record | Retention | Cite |
|---|---|---|
| Driver Qualification File | Duration of employment **+ 3 years** | `391.51(c)` |
| Annual MVR / annual review note | In DQ file (per above) | `391.25` |
| HOS / ELD records + supporting docs | **6 months** | `395.8` |
| DVIR + repair cert + review cert | **3 months** | `396.11(c)` |
| Vehicle maintenance file | **1 year** in service **+ 6 months** after unit leaves control | `396.3(c)` |
| Annual / periodic inspection report | ~**14 months** | `396.21` |
| Drug/alcohol — positives, refusals, RTD, follow-up | **5 years** | `382.401` |
| Drug/alcohol — negative results | ~**1 year** | `382.401` |
| Random selection records | **5 years** | `382.401` |
| Accident register | **3 years** | `390.15` |
| IFTA records | ~**4 years** | IFTA |
| MCS-150 biennial update | Filed every **2 years** | FMCSA |
| UCR | Renewed **annually** | UCR |
| HVUT / Form 2290 | **Annual** (Schedule 1 retained) | IRS |

> Note for build: store each as an editable default keyed to the record type. Verify current values against FMCSA/IRS/IFTA at implementation time — regulations and rates change.

---

## Appendix B — FMCSA automatic-failure areas (build as hard-stop alerts)

Sixteen specific violations under `49 CFR 385.321(b)` cause a new-entrant safety audit to fail regardless of other performance. The system should treat the data that maps to these as **highest-severity gap alerts** in the Audit Cockpit (§20.2) and, where it intersects dispatch, as **hard assignment blocks** (§8.3). The most common include:

- No drug & alcohol testing program in place.
- Using a driver who refused or tested positive (or has prohibited Clearinghouse status) — RTD not completed.
- Using a driver with no valid/current CDL.
- Using a medically unqualified driver (expired/invalid medical card).
- Operating a vehicle without a required **annual/periodic inspection**.
- Operating without the required **insurance** (lapse = critical alert).
- Knowingly using a disqualified driver.
- Missing a large share (≈51%+) of required HOS records.

> Build guidance: map each automatic-failure area to the specific record/gate the system already controls, so the system can *prevent* the underlying condition (block dispatch) and *report* it (audit gap), not merely note it after the fact. Confirm the full current list of 16 against `385.321(b)` at build time.

---

## Appendix C — Out of scope / non-goals (to preserve minimalism)

To keep the product focused and uncluttered, the following are explicitly **not** part of the core build unless later justified:

- The TMS is **not a certified ELD** — it integrates with ELDs; it does not replace one.
- It does not file directly with FMCSA/IRS/state agencies — it prepares, tracks, and reminds; the user (or an integration) submits.
- No broker/3PL operations module (carrier-focused only), though the model should not preclude a future brokered-load add-on.
- No load-board *marketplace* of its own — it integrates with existing boards.
- No general HR/benefits suite beyond what DQ/driver compliance requires.
- Mapping is a supporting feature, not a centerpiece — do not prioritize a map over the dispatch operational lists.
- `[ADVANCED]` and `(AI)` features are not shown in primary navigation until built and warranted; default views stay lean.

---

*End of specification.*
