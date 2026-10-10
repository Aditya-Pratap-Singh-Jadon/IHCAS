# IHCAS Implementation Walkthrough

## A. Project Overview
- **Purpose**: The Intelligent Hostel Counselling & Allocation System (IHCAS) digitizes the hostel allocation process.
- **Technology Stack**: React (Frontend), Node.js + Express (Backend), MySQL (Database).
- **Documentation**:
  - [PRD v2](file:///c:/Users/lenovo/Documents/Software%20Engineering/ihcas/Documentation/IHCAS_PRD_v2.md)
  - [Architecture v2](file:///c:/Users/lenovo/Documents/Software%20Engineering/ihcas/Documentation/IHCAS_architecture_v2.md)
  - [Workflow v2](file:///c:/Users/lenovo/Documents/Software%20Engineering/ihcas/Documentation/IHCAS_workflow_v2.md)
  - [Implementation v2](file:///c:/Users/lenovo/Documents/Software%20Engineering/ihcas/Documentation/IHCAS_implementation_v2.md)
  - [Design v2](file:///c:/Users/lenovo/Documents/Software%20Engineering/ihcas/Documentation/IHCAS_design_v2.md)
- **Current Status**: Phase 1 in progress (Database implementation).

## B. Environment Setup
- **Software**: Node.js v24.18.0, npm, MySQL Server.
- **Environment Variables**: See `ihcas/backend/.env.example`. Required vars: `PORT`, `CORS_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- **MySQL Setup Instructions**: Ensure a local MySQL service is running on port 3306.
- **Database Commands**:
  - Run Migrations: `node scripts/migrate.js` (from `ihcas/backend`, uses `DB_NAME` which is `ihcas_dev`)
  - Run Seeding: `node scripts/seed.js` (from `ihcas/backend`)
  - Setup Test DB: `node scripts/setup-test-db.js` (creates `ihcas_test_db`)
- **App Startup**:
  - Frontend: `npm run dev` (from `ihcas/frontend`)
  - Backend: `node src/server.js` (from `ihcas/backend`). Server requires configuration for database and port.
- **Health Endpoints**:
  - `GET /api/health`: Confirms the server is running.
  - `GET /api/health/db`: Confirms the backend can reach MySQL.

## C. Database Walkthrough
- **Implemented Tables**: USER, STUDENT, ADMIN, WARDEN, COMPATIBILITY_PROFILE, HOSTEL, ROOM_TYPE, ROOM, COUNSELLING_SESSION, COUNSELLING_SLOT, ALLOCATION, STUDENT_ROOMMATE, OTP_VERIFICATION, AI_RECOMMENDATION, NOTIFICATION, LEAVE_REQUEST, ROOM_CHANGE_REQUEST, MESS_CHANGE_REQUEST, COMPLAINT.
- **Important Constraints**: 
  - `ALLOCATION` references `ROOM` directly since allocation is room-level.
  - Foreign keys ensure cascading deletions or restrict references.
  - *Known Limitation*: A unique constraint on active allocations (i.e. one student = one active allocation) cannot be strictly enforced in MySQL schema alone due to conditional unique indices not being natively supported. This must be handled in application transaction logic.
- **Migrations**: We implemented a script `scripts/migrate.js` that tracks executed SQL scripts via the `migration_history` table to avoid repeating applied files.
- **Test DB Reset**: To clean the test DB, just drop the schema: `DROP DATABASE ihcas_test_db; CREATE DATABASE ihcas_test_db;`.

## D. Phase-Wise Implementation Log

### Phase 0: Repository Audit and Project Setup
- **Date**: 2026-10-10
- **Scope**: Initialize repository, setup React and Node.js folders.
- **Files**: `ihcas/backend/package.json`, `ihcas/frontend/package.json`.
- **Status**: PASS

### Phase 1: Relational Database Design
- **Date**: 2026-10-10
- **Scope**: MySQL Schema, integration tests, schema validation against ERD.
- **Files Modified/Created**: 
  - `ihcas/backend/scripts/migrate.js`
  - `ihcas/backend/scripts/seed.js`
  - `ihcas/backend/scripts/setup-test-db.js`
  - `ihcas/backend/tests/integration/db.test.js`
- **Commands Executed**: `node scripts/setup-test-db.js`, `npm test`
- **Tests Executed**: Connection pool mock test (1), Integration test suite (5 tests covering schema, foreign keys, unique keys, seed data, rollbacks).
- **Status**: PASS
- **Known limitations**: A unique constraint on active allocations (i.e. one student = one active allocation) cannot be strictly enforced in MySQL schema alone due to conditional unique indices not being natively supported. This must be handled in application transaction logic (Phase 6).
- **Phase Status**: COMPLETE.

### Phase 2: Backend Foundation
- **Date**: 2026-10-10
- **Scope**: Express application foundation, graceful shutdown, environment validation, health endpoints, centralized error handling, and Zod validation middleware.
- **Files Modified/Created**: 
  - `ihcas/backend/src/app.js`
  - `ihcas/backend/src/server.js`
  - `ihcas/backend/src/routes/health.routes.js`
  - `ihcas/backend/src/middleware/errorHandler.js`
  - `ihcas/backend/src/middleware/validate.js`
  - `ihcas/backend/tests/integration/app.test.js`
  - `ihcas/backend/tests/integration/server.test.js`
- **Commands Executed**: `npm install zod`, `npm test`
- **Tests Executed**: Health checks (2), routing/error handling (2), validation (1), server startup configuration (1), graceful shutdown (1).
- **Status**: PASS
- **Known limitations**: Logging is rudimentary via console.error/console.log; no advanced structured loggers (Pino/Winston) configured yet, but sensitive data is stripped.
- **Phase Status**: COMPLETE.

### Next Phase and Prerequisites
- **Next Phase**: Phase 4 (Hostel Inventory and Availability).
- **Prerequisites**: Phase 3 (Authentication and User Data) is complete. The system has role-based protection, JWT session management, and secure password hashing.

### Phase 3: Authentication and User Data
- **Date**: 2026-10-10
- **Scope**: Login, logout, JWT-based sessions in HttpOnly cookies, Bcrypt password hashing, role-based access control, rate limiting, and profile management (read/update).
- **Files Modified/Created**:
  - `ihcas/backend/src/app.js`
  - `ihcas/backend/src/middleware/auth.js`
  - `ihcas/backend/src/modules/auth/auth.controller.js`
  - `ihcas/backend/src/modules/auth/auth.routes.js`
  - `ihcas/backend/src/modules/auth/auth.schema.js`
  - `ihcas/backend/src/modules/users/users.controller.js`
  - `ihcas/backend/src/modules/users/users.routes.js`
  - `ihcas/backend/src/modules/users/users.schema.js`
  - `ihcas/backend/tests/integration/auth.test.js`
  - `ihcas/backend/tests/integration/users.test.js`
- **Commands Executed**: `npm install jsonwebtoken cookie-parser express-rate-limit bcryptjs`, `npm test`
- **Tests Executed**: Auth endpoints (missing inputs, wrong credentials, success login, logout, missing token, invalid token), User endpoints (own profile, profile update, unauthorized access across roles, admin access). 
- **Status**: PASS
- **Known limitations**: No email recovery flows or self-registration forms are implemented (assuming institution imports these).
- **Phase Status**: COMPLETE.

### Next Phase and Prerequisites
- **Next Phase**: Phase 6 (Allocation Engine and Roommate Verification).
- **Prerequisites**: Phase 5 (Counselling Queue and Sessions) is complete. The system has reliable queues ordered by academic rank, and sessions are properly gated by a server-enforced 3-minute timeout which reverts students to the ready queue upon expiry.

### Phase 5: Counselling Queue and Sessions
- **Date**: 2026-10-11
- **Scope**: Implemented admin session configuration, dynamic rank-based slot generation, and a student queue lobby. Added robust server-side expiry checking returning students to the ready queue with their original priority preserved. Prevented duplicate active sessions and handled race conditions with SQL row locking.
- **Files Modified/Created**:
  - `ihcas/backend/src/app.js`
  - `ihcas/backend/src/modules/counselling/counselling.controller.js`
  - `ihcas/backend/src/modules/counselling/counselling.routes.js`
  - `ihcas/backend/src/modules/counselling/counselling.schema.js`
  - `ihcas/backend/tests/integration/counselling.test.js`
- **Commands Executed**: `mkdir -p src/modules/counselling`, `npm test`
- **Tests Executed**: Admin creates session and slots ordered by rank. Student retrieves position based on `academic_rank` and `cgpa`. Session activation respects queue pos. Timeout detection automatically flips status back to `PENDING` without losing priority. Concurrent requests fail safely.
- **Status**: PASS
- **Known limitations**: No realtime WebSocket/SSE implementation; students must poll the status endpoint or rely on frontend timers.
- **Phase Status**: COMPLETE.

### Phase 4: Hostel Inventory and Availability
- **Date**: 2026-10-11
- **Scope**: Hostel/Room/RoomType management APIs, role-based authorization for Wardens (limited to their own hostels), student gender filtering, and dynamic calculation of `available_capacity` derived directly from active allocations (status IN `CONFIRMED`, `LOCKED`).
- **Files Modified/Created**:
  - `ihcas/backend/src/app.js`
  - `ihcas/backend/src/modules/inventory/inventory.controller.js`
  - `ihcas/backend/src/modules/inventory/inventory.routes.js`
  - `ihcas/backend/src/modules/inventory/inventory.schema.js`
  - `ihcas/backend/tests/integration/inventory.test.js`
- **Commands Executed**: `mkdir -p src/modules/inventory`, `npm test`
- **Tests Executed**: Admin creates Hostels/Rooms/RoomTypes, Student sees gender-appropriate Hostels/Rooms, Warden is restricted to updating only their assigned Hostel's Rooms, Availability calculates accurately based on active DB allocations only.
- **Status**: PASS
- **Known limitations**: Warden assignments directly to hostels are currently one-to-one based on the `hostel_id` foreign key on the `WARDEN` table. 
- **Phase Status**: COMPLETE.

## E. Test Evidence

| Test ID | Scenario | Command or procedure | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| INT-00 | Setup Test DB | `node scripts/setup-test-db.js` | Test DB created/ready | `Test database ihcas_test_db is ready` | PASS |
| INT-01 | DB initialization | `npm test` | Tables created | 6 passed | PASS |
| INT-02 | Seed data load | `npm test` | Seed rows inserted | 6 passed | PASS |
| INT-03 | Foreign Key constraints | `npm test` | Rejected invalid insert | 6 passed | PASS |
| INT-04 | Unique Constraints | `npm test` | Rejected duplicate | 6 passed | PASS |
| INT-05 | Transaction Rollback | `npm test` | Rollback clears uncommitted | 6 passed | PASS |
| APP-01 | Express Health & 404 | `npm test` | 200 OK / 404 handled | 25 passed | PASS |
| APP-02 | Error Handler | `npm test` | 500 without leaking stack | 25 passed | PASS |
| APP-03 | Zod Validation | `npm test` | 400 with details | 25 passed | PASS |
| APP-04 | DB Health Probe | `npm test` | 200 if up, 503 if down | 25 passed | PASS |
| SVR-01 | Env Validation | `npm test` | Process exits on missing vars | 25 passed | PASS |
| SVR-02 | Graceful Shutdown | `npm test` | HTTP and DB Pool close | 25 passed | PASS |
| AUT-01 | Missing Inputs | `npm test` | 400 Validation Error | 25 passed | PASS |
| AUT-02 | Wrong Credentials | `npm test` | 401 Unauthorized | 25 passed | PASS |
| AUT-03 | Successful Login | `npm test` | JWT Cookie Set | 25 passed | PASS |
| AUT-04 | Protected Route | `npm test` | 401 without Cookie | 37 passed | PASS |
| USR-01 | Fetch Own Profile | `npm test` | 200 with Profile Data | 37 passed | PASS |
| USR-02 | Admin Override | `npm test` | 200 for Any Student | 37 passed | PASS |
| USR-03 | RBAC Enforcement | `npm test` | 403 Forbidden | 37 passed | PASS |
| INV-01 | Admin Creates Inventory | `npm test` | 201 Created | 37 passed | PASS |
| INV-02 | Gender Eligibility Filter | `npm test` | Students only see matching gender | 37 passed | PASS |
| INV-03 | Warden Hostel Scope | `npm test` | 403 outside Warden's hostel | 37 passed | PASS |
| INV-04 | Dynamic Availability | `npm test` | Capacity calculates accurately | 37 passed | PASS |
| CSL-01 | Rank Ordered Slots | `npm test` | Queue ordered by Rank ASC, CGPA DESC | 12 passed | PASS |
| CSL-02 | Server Side Expiry | `npm test` | Reverts to PENDING and preserves Priority | 12 passed | PASS |
| CSL-03 | Concurrent Activations | `npm test` | Only one succeeds, second gets 400 | 12 passed | PASS |

## F. Operational Troubleshooting
- **Error**: `Failed to connect to MySQL` running `test-db-connection.js`.
- **Resolution**: Ensure MySQL is installed, running, and accessible via the credentials specified in `.env` or defaults (`root` with no password on `127.0.0.1:3306`).

## G. Change History
- **2026-10-10**: Initial creation. Added walkthrough for Phase 0 and Phase 1 database design.
