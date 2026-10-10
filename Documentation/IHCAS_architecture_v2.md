# IHCAS System Architecture

**Document:** `architecture.md`\
**Version:** 1.0\
**Purpose:** Define the proposed technical structure, module boundaries,
data flows, API responsibilities, and deployment model for the
Intelligent Hostel Counselling & Allocation System.

------------------------------------------------------------------------

## 1. Architectural Goals

The architecture must support: - A reliable online counselling and
hostel allocation workflow. - A relational SQL database as the
authoritative persistence layer. - Strict academic-rank, eligibility,
gender, capacity, and allocation-lock rules. - Safe allocation under
concurrent requests. - Separate responsibilities for frontend, backend,
database, and AI recommendation service. - Role-based access for
students, administrators, and wardens. - Post-allocation hostel
management. - Maintainable implementation and testability. - Production
deployment with monitoring, backups, and controlled configuration.

## 2. Architecture Style

Use a **modular client-server architecture** with a React frontend,
Node.js/Express backend, relational SQL database, and separately
integrated AI service.

The frontend must not connect directly to the SQL database. All data
access and business-rule enforcement must go through the backend API.

The AI service must not directly write allocations or mutate the SQL
database. It returns recommendations; the backend validates them against
current system rules and availability.

### High-level view

``` text
┌─────────────────────────────┐
│ Student / Admin / Warden    │
│ Browser                     │
└──────────────┬──────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────┐
│ React Frontend              │
│ Pages, components, API client│
└──────────────┬──────────────┘
               │ REST/JSON
               ▼
┌─────────────────────────────┐
│ Node.js + Express Backend   │
│ Auth, validation, rules,    │
│ transactions, audit, APIs   │
└────────┬────────────┬───────┘
         │            │
         │ SQL        │ HTTP/JSON
         ▼            ▼
┌────────────────┐  ┌─────────────────────┐
│ Relational SQL │  │ AI Recommendation   │
│ Database       │  │ Service              │
│ MySQL          │  │ teammate-owned model │
└────────────────┘  └─────────────────────┘
         │
         └──────► Background jobs / notification dispatch
                         │
                         ▼
                 Email/SMS/OTP provider

*MySQL is the confirmed database choice, based on the university recommendation.
```

## 3. Technology Responsibilities

  -----------------------------------------------------------------------
  Component               Proposed technology     Responsibility
  ----------------------- ----------------------- -----------------------
  Frontend                React with JSX          User interfaces for
                                                  student, admin, warden,
                                                  and counselling

  Routing                 React Router            Route handling and
                                                  post-allocation
                                                  navigation

  Styling                 Shared CSS tokens and   Consistent design
                          reusable components     system

  Backend                 Node.js and Express     APIs, authentication,
                                                  authorization,
                                                  validation, business
                                                  rules

  SQL database            MySQL;                   Persistent relational
                          MySQL is possible if    records and integrity
                          required                

  SQL access              Parameterized queries   Safe database
                          through `pg` or         operations and
                          selected database layer transaction control

  AI service              Separate HTTP           Compatibility and room
                          service/API             recommendations

  OTP delivery            Email/SMS provider      Deliver verification
                          adapter                 codes

  Notifications           SQL persistence plus    In-app notification
                          background delivery     history and optional
                                                  external delivery

  Testing                 Unit, integration,      Verify correctness and
                          end-to-end,             readiness
                          load/concurrency tests  

  Deployment              Managed application     Production hosting and
                          runtime and managed     operations
                          SQL, or institution     
                          infrastructure          
  -----------------------------------------------------------------------

Technology selection must be confirmed before implementation. The
architecture does not assume the frontend must be rewritten if the
existing Create React App project remains suitable.

## 4. Backend Module Boundaries

Keep the backend modular even if it is deployed as one application
initially.

### 4.1 Authentication and authorization

Responsibilities: - Login/logout and session/token lifecycle. - Password
verification. - Account status checks. - Role-based permissions. -
Ownership and assignment checks for student and warden data.

### 4.2 Users and students

Responsibilities: - User and student profiles. - Registration-number
validation. - Academic information and rank. - Eligibility
information. - Student import and data-validation reports.

### 4.3 Hostel inventory

Responsibilities: - Hostels and gender/eligibility rules. - Floors and
room records where represented. - Room types and amenities. - Room
capacity and operational status. - Availability queries.

### 4.4 Counselling

Responsibilities: - Counselling sessions. - Rank-ordered slot
generation/import. - Slot lifecycle and server-side timing. - Waiting
lobby state. - Expiry and completion outcomes.

### 4.5 Allocation

Responsibilities: - Candidate validation. - Allocation confirmation. -
Transactional capacity reservation. - Duplicate-submit handling. -
Allocation lock. - Timeout fallback coordination. - Authorized
reassignment and history.

This is a critical module. It must not delegate the final allocation
decision to frontend code or an AI service.

### 4.6 Roommates and OTP

Responsibilities: - Registration-number validation. - Eligibility and
conflicting-allocation checks. - OTP creation and delivery request. -
OTP expiry, single-use status, and attempt limits. - Verified roommate
association.

### 4.7 AI adapter

Responsibilities: - Construct recommendation requests from authorized
data. - Remove invalid candidates before AI evaluation. - Call the
teammate's AI service. - Validate response structure and timeout. -
Store recommendation metadata. - Revalidate candidate availability after
response. - Apply deterministic fallback policy when AI is unavailable.

The AI adapter should hide the model provider's implementation details
from other modules.

### 4.8 Hostel requests

Separate submodules or clearly separated services for: - Leave
requests. - Room-change requests. - Mess-change requests. - Complaints.

Each must validate role permissions, allowed status transitions, and
review decisions.

### 4.9 Notifications

Responsibilities: - Persist in-app notifications. - Dispatch optional
email/SMS messages. - Retry external delivery safely. - Track delivery
outcomes when available.

### 4.10 Reports and audit

Responsibilities: - Occupancy and allocation reports. - Counselling
progress. - Request queues. - Audit history. - AI recommendation
statistics. - Operational error reporting.

## 5. Frontend Module Boundaries

Organize the frontend by shared UI and business area.

``` text
src/
├── assets/
│   └── fonts/
├── components/
│   ├── buttons/
│   ├── forms/
│   ├── tables/
│   ├── status/
│   └── feedback/
├── layouts/
│   ├── StudentLayout.jsx
│   ├── AdminLayout.jsx
│   └── WardenLayout.jsx
├── pages/
│   ├── auth/
│   ├── student/
│   ├── counselling/
│   ├── admin/
│   └── warden/
├── services/
│   ├── apiClient.js
│   ├── authService.js
│   ├── counsellingService.js
│   ├── allocationService.js
│   └── requestService.js
├── hooks/
├── styles/
│   ├── tokens.css
│   └── global.css
└── App.jsx
```

This is a logical target structure, not a requirement to reorganize a
working project all at once. Inspect the existing repository and migrate
incrementally.

The frontend is responsible for presentation, interaction, client-side
usability validation, and showing server responses. It is not
responsible for enforcing authoritative eligibility, capacity,
allocation locking, or slot expiry.

## 6. Relational Data Architecture

The supplied ER diagram is the starting model. Principal entities
include:

-   `USER`, `STUDENT`, `ADMIN`, `WARDEN`
-   `COMPATIBILITY_PROFILE`
-   `HOSTEL`, `ROOM`, `ROOM_TYPE`
-   `COUNSELLING_SESSION`, `COUNSELLING_SLOT`
-   `ALLOCATION`, `STUDENT_ROOMMATE`
-   `OTP_VERIFICATION`
-   `AI_RECOMMENDATION`
-   `NOTIFICATION`
-   `LEAVE_REQUEST`, `ROOM_CHANGE_REQUEST`, `MESS_CHANGE_REQUEST`,
    `COMPLAINT`

The final schema must define: - Primary and foreign keys. - Unique identifiers and appropriate constraints. - User-role inheritance strategy. - Room-level allocation and active-allocation rules (individual beds are out of scope). - Whether occupancy is stored or derived. - Allocation history and reassignment. - Recommendation linkage to a counselling attempt/session. - OTP expiry, usage, and retention. - Request status transitions and reviewer references.

The architecture should favor normalized data for core entities, with
deliberate denormalization only where performance requires it and
reconciliation rules are documented.

### 6.1 Transaction boundaries

Allocation and any associated occupancy/bed reservation must commit
atomically. If an allocation includes multiple roommates, all required
allocation and association records must succeed together or roll back
together.

Room changes must also preserve a valid state throughout reassignment.
The implementation must define whether old capacity is released and new
capacity claimed in a single transaction; it must never leave a student
assigned to two active rooms or to no valid room due to a partial
update.

## 7. Critical Allocation Consistency

### 7.1 Required invariants

-   A student cannot have conflicting active allocations.
-   A room cannot exceed its capacity.
-   An allocation cannot target a room that is ineligible, unavailable,
    or under maintenance.
-   A slot cannot be completed by a student other than its assigned
    student.
-   A locked allocation cannot be changed through ordinary student APIs.
-   AI output cannot bypass any of these rules.

### 7.2 Suggested SQL transaction pattern

The exact SQL will depend on the selected database and schema.
Conceptually:

1.  Begin transaction.
2.  Lock or atomically reserve the target room/capacity row.
3.  Recheck student eligibility, slot status/deadline, room status, and
    capacity.
4.  Check for conflicting active allocation.
5.  Insert allocation and required roommate/bed records.
6.  Update stored occupancy if the selected model stores it.
7.  Insert audit and notification/outbox records as required.
8.  Commit.
9.  Return the confirmed allocation.

On any failure, roll back. Use appropriate uniqueness constraints and
locking/conditional updates; application-level checks alone are
insufficient.

## 8. API Architecture

Use versioned REST endpoints returning JSON. Example prefix: `/api/v1`.
Exact payloads should be defined in the implementation contract.

### Authentication and profile

-   `POST /api/v1/auth/login`
-   `POST /api/v1/auth/logout`
-   `GET /api/v1/auth/me`
-   `GET /api/v1/students/me`

### Counselling

-   `GET /api/v1/counselling/me/slot`
-   `GET /api/v1/counselling/me/status`
-   `POST /api/v1/counselling/me/start` (if an explicit start action is
    required)
-   `GET /api/v1/counselling/hostels`
-   `GET /api/v1/counselling/rooms?hostelId=...&roomTypeId=...`
-   `POST /api/v1/counselling/recommendations`

### Roommate verification

-   `POST /api/v1/roommates/otp/request`
-   `POST /api/v1/roommates/otp/verify`

### Allocation

-   `POST /api/v1/allocations`
-   `GET /api/v1/allocations/me`
-   `GET /api/v1/allocations/:allocationId` (authorization required)

### Student requests

-   `POST /api/v1/leave-requests`
-   `GET /api/v1/leave-requests/me`
-   `POST /api/v1/room-change-requests`
-   `GET /api/v1/room-change-requests/me`
-   `POST /api/v1/mess-change-requests`
-   `GET /api/v1/mess-change-requests/me`
-   `POST /api/v1/complaints`
-   `GET /api/v1/complaints/me`

### Admin and warden

-   `/api/v1/admin/students`
-   `/api/v1/admin/rank-lists`
-   `/api/v1/admin/counselling-sessions`
-   `/api/v1/admin/hostels`
-   `/api/v1/admin/rooms`
-   `/api/v1/admin/allocations`
-   `/api/v1/admin/reports`
-   `/api/v1/warden/occupancy`
-   `/api/v1/warden/requests`
-   `/api/v1/warden/complaints`
-   `/api/v1/warden/announcements`

These endpoints are illustrative contracts. Before implementation,
define HTTP methods, request/response schemas, validation errors,
permissions, pagination, filtering, and idempotency behavior. Do not
expose internal database errors or allow client-supplied role IDs to
grant privileges.

## 9. AI Service Contract

The AI component is developed separately. Agree on a stable
request/response contract before integration.

### Example request concept

-   Request ID and model/task type.
-   Student's approved compatibility features.
-   Eligible candidate room IDs.
-   Relevant occupant/group feature summaries.
-   Room preferences.
-   Current availability snapshot/version.
-   Constraints already applied by the backend.

### Example response concept

-   Request ID.
-   Model version.
-   Ranked candidate identifiers.
-   Score and explanation/reason.
-   Confidence only if the model defines and validates it.
-   Timestamp and status.

### Contract rules

-   AI returns recommendations, not authoritative allocations.
-   Candidate IDs must correspond to the request's allowed candidate
    set.
-   Backend rechecks availability before confirmation.
-   Recommendations should expire or be refreshed when relevant room
    data changes.
-   The AI service must not receive unnecessary personally identifiable
    information.
-   Timeouts and malformed responses must follow the approved fallback
    policy.

## 10. Authentication and Authorization

Use server-side authorization for every protected action.

Suggested permission boundaries: - **Student:** own profile, own slot,
own allocation, own requests, allowed hostel/room options. - **Warden:**
assigned hostel's students, occupancy, and permitted request/complaint
actions. - **Administrator:** institution-level management and
explicitly granted override/reporting permissions.

Do not rely on role-specific routes alone. Check ownership and scope at
the API/service layer. Record privileged overrides with actor,
timestamp, reason, and affected records.

The exact session/token design should be finalized before
implementation. If browser cookies are used, configure secure, HttpOnly,
SameSite settings and CSRF protection appropriate to the deployment. If
bearer tokens are used, define storage, expiry, refresh, and revocation
carefully.

## 11. External Integrations

### OTP/email/SMS

Use an adapter so the application is not tied to one provider. Keep
provider keys on the server. Record delivery status where available, and
never store raw OTPs in logs.

### AI recommendation service

Call through the backend AI adapter. Apply timeouts and response
validation. Do not allow the browser to call a private model endpoint
with secret credentials.

### Real-time availability

Start with periodic refresh if that satisfies expected scale. Add
WebSockets or Server-Sent Events only when required for timely updates.
Regardless of transport, every final allocation must revalidate capacity
transactionally.

## 12. Deployment Architecture

### Development

-   Developer machine runs frontend and backend separately.
-   Local MySQL instance or container holds development data.
-   AI service can be mocked until the teammate's API is ready.
-   OTP/email is routed through a test adapter or sandbox provider.
-   `.env` contains local secrets and is excluded from version control.

### Production

-   Browser connects to frontend over HTTPS.
-   Frontend calls backend API over HTTPS.
-   Backend connects to private SQL networking with least-privilege
    database credentials.
-   Backend calls AI service through authenticated service-to-service
    communication.
-   Background workers dispatch notifications if required.
-   Centralized logs/monitoring capture health and failures.
-   SQL backups are encrypted and restoration is periodically tested.

Do not expose the database directly to the public internet. Production
secrets must be managed through the hosting platform or a secret
manager.

## 13. Configuration and Environment

Maintain `.env.example` with variable names and placeholder values only,
such as: - `NODE_ENV` - `PORT` - `DATABASE_URL` - `SESSION_SECRET` or
token-related configuration - `AI_SERVICE_URL` - `AI_SERVICE_KEY` -
OTP/email provider configuration - Frontend origin / CORS allowlist

Never commit actual passwords, API keys, student data, or OTP
credentials. Validate required environment variables at startup and fail
safely if critical configuration is missing.

## 14. Reliability, Monitoring, and Recovery

Monitor: - API health and latency. - SQL connection pool usage and query
errors. - Allocation success/conflict/failure counts. - Capacity
invariant violations (expected zero). - Counselling timeout and fallback
outcomes. - OTP delivery and verification failures. - AI latency, error
rate, and stale recommendation rejection. - Notification dispatch
retries. - Authentication/authorization failure rates.

Use correlation IDs to connect frontend requests, backend logs, database
operations, and AI calls. Logs must exclude passwords, tokens, raw OTPs,
and unnecessary sensitive profile values.

Back up the database and test restoration. Define recovery time and
recovery point objectives with the institution before production launch.

## 15. Security Considerations

-   Use parameterized SQL; never concatenate untrusted values into SQL.
-   Validate all request payloads on the backend.
-   Apply least-privilege database credentials.
-   Use HTTPS in production.
-   Rate-limit login and OTP endpoints.
-   Protect against cross-student data access.
-   Restrict administrative overrides and audit them.
-   Apply retention rules to OTP and sensitive personal data.
-   Keep dependencies updated and scan for known vulnerabilities.
-   Avoid returning stack traces or internal SQL details to users.

## 16. Architectural Decisions to Finalize

1.  MySQL is confirmed as the SQL engine.
2.  Existing CRA continuation versus any planned frontend migration.
3.  SQL access library and migration tool.
4.  User-role inheritance strategy.
5.  Room-level allocation is confirmed; individual bed assignment is out of scope.
6.  Stored versus derived occupancy.
7.  Session cookie versus bearer-token authentication.
8.  Polling versus WebSocket/SSE availability updates.
9.  Agree on the AI service request/response contract when the teammate's independent implementation is ready.
10. OTP provider and retention policy.
11. Hosting provider and production network topology.
12. Timeout policy is confirmed: return to the ready queue with original rank priority and refresh room availability on re-entry.

## 17. Architecture Acceptance Checklist

-   Frontend never accesses SQL directly.
-   Backend is the only authority for eligibility and allocation.
-   AI cannot directly create allocations or bypass hard constraints.
-   SQL constraints and transactions protect capacity and uniqueness.
-   Role and ownership checks exist at the API/service layer.
-   Allocation and room-change operations are atomic and auditable.
-   External service failures do not corrupt core database state.
-   Environment secrets are not committed or exposed to the browser.
-   Deployment has backups, health checks, logs, and a recovery plan.
-   The architecture can be implemented incrementally without requiring
    a full rewrite of the existing frontend.

------------------------------------------------------------------------

## 18. Summary

IHCAS should begin as a modular client-server application rather than an
unnecessarily complex microservice system. React handles the user
experience, Express owns business rules and API orchestration, SQL
stores authoritative relational data, and the AI component returns
advisory recommendations through a controlled adapter. Transactional
allocation, server-side authorization, auditability, and safe failure
behavior are the architecture's most important guarantees.


## Confirmed Decisions (Revision)

- **Database:** MySQL, using InnoDB where transactions are required.
- **Allocation granularity:** room only. IHCAS will not assign beds; roommates decide among themselves.
- **Counselling timeout:** no automatic allocation. Expired attempts return to the ready queue with the student's original rank priority. Availability is refreshed when the student re-enters.
- **AI ownership:** the teammate can implement the recommendation engine independently. The application will integrate it through a backend adapter after the interface is agreed; core development should continue with a mock/stub meanwhile.
