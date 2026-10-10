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
- **Environment Variables**: See `ihcas/backend/.env.example`. Required vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- **MySQL Setup Instructions**: Ensure a local MySQL service is running on port 3306.
- **Database Commands**:
  - Run Migrations: `node scripts/migrate.js` (from `ihcas/backend`, uses `DB_NAME` which is `ihcas_dev`)
  - Run Seeding: `node scripts/seed.js` (from `ihcas/backend`)
  - Setup Test DB: `node scripts/setup-test-db.js` (creates `ihcas_test_db`)
- **App Startup**:
  - Frontend: `npm run dev` (from `ihcas/frontend`)
  - Backend: (Not fully implemented yet)

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

## E. Test Evidence

| Test ID | Scenario | Command or procedure | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| INT-00 | Setup Test DB | `node scripts/setup-test-db.js` | Test DB created/ready | `Test database ihcas_test_db is ready` | PASS |
| INT-01 | DB initialization | `npm test` | Tables created | 6 passed | PASS |
| INT-02 | Seed data load | `npm test` | Seed rows inserted | 6 passed | PASS |
| INT-03 | Foreign Key constraints | `npm test` | Rejected invalid insert | 6 passed | PASS |
| INT-04 | Unique Constraints | `npm test` | Rejected duplicate | 6 passed | PASS |
| INT-05 | Transaction Rollback | `npm test` | Rollback clears uncommitted | 6 passed | PASS |

## F. Operational Troubleshooting
- **Error**: `Failed to connect to MySQL` running `test-db-connection.js`.
- **Resolution**: Ensure MySQL is installed, running, and accessible via the credentials specified in `.env` or defaults (`root` with no password on `127.0.0.1:3306`).

## G. Change History
- **2026-10-10**: Initial creation. Added walkthrough for Phase 0 and Phase 1 database design.
