# IHCAS Implementation Plan

**Document:** `implementation.md`\
**Version:** 1.0\
**Purpose:** Provide a phased, dependency-aware plan to build, test,
integrate, and deploy IHCAS.

------------------------------------------------------------------------

## 1. Implementation Strategy

Build IHCAS incrementally, starting with a reliable SQL data model and
core backend rules, then connecting the user interface to real APIs. Do
not build all screens with mock data and postpone the difficult
allocation logic until the end.

The project has three academic domains: - **Software Engineering:**
requirements, modular design, implementation, testing, documentation,
and release process. - **Database Systems:** relational schema,
normalization, constraints, SQL queries, transactions, indexes,
migrations, and reporting. - **Artificial Intelligence:** a
teammate-owned recommendation/compatibility component integrated through
a documented contract.

The student-facing and staff-facing application, backend, SQL database,
authentication, allocation integrity, and integration are the primary
implementation responsibility described here. The AI model's internal
training method is outside this plan unless separately agreed with the
teammate.

## 2. Recommended Technology Baseline

These are proposed choices to confirm before coding, not assumptions
about what is already installed.

  -----------------------------------------------------------------------
  Layer                   Proposed option         Reason
  ----------------------- ----------------------- -----------------------
  Frontend                React with JSX          Component-based UI;
                                                  compatible with the
                                                  existing CRA project if
                                                  retained

  Styling                 CSS modules or          Supports the
                          organized plain CSS;    intentional visual
                          optionally a small      system without
                          utility layer           requiring a UI template

  Routing                 React Router            Role-specific pages and
                                                  post-allocation
                                                  redirect

  Backend                 Node.js + Express       Clear REST API and
                                                  familiar JavaScript
                                                  stack

  SQL database            MySQL                   University-required
                                                  relational database;
                                                  use transactions,
                                                  constraints, and
                                                  InnoDB

  Database access         `pg` with parameterized Explicit SQL learning
                          SQL, or a carefully     and control over
                          selected query builder  transactions

  Authentication          Secure server-side      To be finalized in
                          session or short-lived  architecture
                          access-token design     

  Validation              A shared backend        Consistent request
                          schema-validation       validation
                          library                 

  Real-time availability  Polling initially;      Avoid unnecessary
                          WebSockets/SSE if       complexity before
                          required by load and UX measuring needs

  AI integration          HTTP API/service        Separates model
                          adapter                 ownership from
                                                  application code

  Testing                 Unit, integration, API, Covers rules,
                          and end-to-end tests    persistence, and user
                                                  flows

  Deployment              A managed app host plus Simplifies first
                          managed MySQL, or       deployment while
                          institution-approved    retaining a migration
                          infrastructure          path
  -----------------------------------------------------------------------

**Database decision:** use MySQL because it is recommended/required by the university. Use InnoDB for transactional tables and define constraints, indexes, and transaction boundaries before implementation.

**Existing project note:** the current frontend was described as Create
React App with `.jsx` files. If that repository is still the active
project, keep it rather than creating a second frontend solely to change
build tools. Verify the actual repository before implementation.

## 3. Repository and Module Structure

A practical starting structure:

``` text
ihcas/
├── client/
│   ├── public/
│   └── src/
│       ├── assets/
│       │   └── fonts/
│       ├── components/
│       ├── layouts/
│       ├── pages/
│       │   ├── auth/
│       │   ├── student/
│       │   ├── counselling/
│       │   ├── admin/
│       │   └── warden/
│       ├── services/        # API client functions
│       ├── hooks/
│       ├── styles/
│       ├── utils/
│       └── App.jsx
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── students/
│   │   │   ├── hostels/
│   │   │   ├── counselling/
│   │   │   ├── allocations/
│   │   │   ├── roommates/
│   │   │   ├── requests/
│   │   │   ├── notifications/
│   │   │   ├── ai/
│   │   │   └── reports/
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   ├── seeds/
│   │   │   └── queries/
│   │   ├── app.js
│   │   └── server.js
│   └── tests/
├── docs/
│   ├── PRD.md
│   ├── design.md
│   ├── workflow.md
│   ├── implementation.md
│   └── architecture.md
├── .env.example
├── .gitignore
└── README.md
```

If the existing repository is a single CRA app, do not restructure
everything in one risky change. First inspect the repository, then
either add `server/` alongside the existing client or adapt the layout
gradually. Keep `.jsx` for React components if required by the course.

## 4. Phase 0 --- Repository Audit and Project Setup

### Tasks

1.  Inspect the current repository, package scripts, existing routes,
    and reusable components.
2.  Identify which Stitch/Antigravity-generated pages are usable and
    which need redesign.
3.  Confirm Node.js version and package manager.
4.  Confirm SQL engine and local database setup.
5.  Create a branch for the implementation work.
6.  Add `.env.example`, `.gitignore`, formatting/linting rules, and a
    clear README.
7.  Set up development, test, and production configuration boundaries.
8.  Establish the agreed design tokens and selected font files.

### Exit criteria

-   The existing app starts successfully.
-   Repository structure and current behavior are documented.
-   No secrets are committed.
-   SQL engine and initial dependency choices are confirmed.
-   A clean baseline commit exists.

## 5. Phase 1 --- Relational Database Design

Database work should happen before the application depends on the
schema.

### Tasks

1.  Review the supplied ER diagram against actual product rules.
2.  Convert entities and relationships into relational tables.
3.  Resolve inheritance for `USER`, `STUDENT`, `ADMIN`, and `WARDEN`.
4.  Define primary keys, foreign keys, unique constraints, checks, and
    delete/update rules.
5.  Normalize repeating data and separate lookup/reference data where
    useful.
6.  Decide whether AC/non-AC is a room feature or a room category.
7.  Decide how rooms, beds, and allocations are represented.
8.  Define the authoritative source for occupancy.
9.  Define active-allocation uniqueness and concurrency strategy.
10. Create versioned SQL migration scripts.
11. Create seed data for roles, room types, statuses, test users,
    hostels, and rooms.
12. Create an ERD updated to match the actual schema.
13. Write core SQL queries for room availability, occupancy,
    rank-ordered slots, allocation history, and request queues.

### Required integrity tests

-   Duplicate email or registration number is rejected.
-   Foreign keys prevent orphaned allocations and requests.
-   Room capacity cannot be exceeded.
-   A student cannot receive conflicting active allocations.
-   Deleting a referenced hostel or room cannot silently destroy
    allocation history.
-   Concurrent allocation transactions cannot reserve the same final
    capacity.

### Exit criteria

-   Database can be created from migrations on a clean environment.
-   Seed scripts are repeatable or safely guarded.
-   Core constraints and transactions are tested.
-   SQL schema and ERD agree.

## 6. Phase 2 --- Backend Foundation

### Tasks

1.  Set up Express application and configuration.
2.  Create a database connection pool.
3.  Implement parameterized SQL access.
4.  Add centralized request validation and error handling.
5.  Add authentication and role-based authorization middleware.
6.  Add request IDs and structured logs.
7.  Implement health/readiness endpoints.
8.  Establish a consistent API response and error format.
9.  Add automated tests for middleware and configuration.

### Exit criteria

-   API starts and connects to the SQL database.
-   Invalid input receives a controlled response.
-   Unauthorized roles are rejected server-side.
-   Secrets are loaded from environment configuration.
-   Database errors do not leak sensitive internals to clients.

## 7. Phase 3 --- Authentication and User Data

### Tasks

1.  Implement login and logout.
2.  Hash passwords with a suitable password-hashing library.
3.  Implement session/token lifecycle, expiry, and revocation as
    selected.
4.  Implement role-specific profile retrieval.
5.  Implement admin import/management of student records.
6.  Validate unique registration numbers and emails.
7.  Import academic rank data and produce an error report for invalid
    rows.
8.  Enforce that students can only access their own protected data.
9.  Test authentication, authorization, account disablement, and invalid
    credentials.

### Exit criteria

-   Student, administrator, and warden routes are protected.
-   Rank/profile information is persisted in SQL.
-   Role restrictions are tested at API level.

## 8. Phase 4 --- Hostel Inventory and Availability

### Tasks

1.  Implement hostel and room-type management.
2.  Implement floor and room management as defined by the schema.
3.  Implement room status and capacity updates.
4.  Build room inventory and occupancy APIs.
5.  Implement gender/eligibility filtering on the backend.
6.  Add filters for hostel, room type, floor, status, and remaining
    capacity.
7.  Build admin room-inventory screens and student availability views.
8.  Add integration tests for inventory changes and capacity invariants.

### Exit criteria

-   The UI only displays eligible room options.
-   API independently rejects ineligible requests.
-   Availability reflects committed allocations.
-   Occupied/reserved rooms cannot be casually reconfigured.

## 9. Phase 5 --- Counselling Session and Slot Management

### Tasks

1.  Implement counselling session creation and configuration.
2.  Import or generate rank-ordered slots.
3.  Validate slot uniqueness and session membership.
4.  Implement scheduled, waiting, active, completed, expired, and review
    states as finalized.
5.  Use server time for start/end enforcement.
6.  Expose slot status and expiry time through APIs.
7.  Implement waiting lobby and counselling timer UI.
8.  Test refresh, delayed requests, clock manipulation, and missed
    slots.

### Exit criteria

-   Slot eligibility and time windows are enforced server-side.
-   A browser refresh cannot restart the timer.
-   Only the correct student can use a slot.
-   Slot transitions are recorded consistently.

## 10. Phase 6 --- Allocation Engine and Roommate Verification

This is the most correctness-sensitive phase.

### Tasks

1.  Define the allocation transaction and its invariants.
2.  Revalidate slot, eligibility, room status, remaining capacity, and
    conflicting allocations at confirmation.
3.  Implement row locking or an equivalent atomic capacity-reservation
    method.
4.  Insert allocation and roommate associations in one transaction.
5.  Update occupancy only according to the chosen source-of-truth
    strategy.
6.  Implement idempotency/duplicate-submit handling.
7.  Implement OTP generation, delivery adapter, expiry, single-use
    validation, and rate limits.
8.  Record verified roommate associations.
9.  Implement allocation confirmation and locked-state behavior.
10. Implement timeout handling that returns students to the ready queue with original rank priority, according to the
    institution-approved policy.
11. Record audit events and in-app notifications after successful
    commits.
12. Add concurrency tests simulating multiple users competing for the
    last bed.

### Exit criteria

-   No over-capacity allocation in automated tests.
-   Duplicate submissions do not create duplicate records.
-   Failed transactions roll back completely.
-   Confirmed allocations survive refresh and re-login.
-   Locked allocations cannot be changed directly by students.

## 11. Phase 7 --- Student Experience and Post-Allocation Features

Implement in small vertical slices, with each feature including
frontend, API, database, and tests.

### Suggested order

1.  Student dashboard and final allocation display.
2.  Notifications and announcements.
3.  Leave requests.
4.  Room-change requests.
5.  Mess-change requests.
6.  Complaints.
7.  Request history and status updates.

### Room-change implementation requirements

-   Existing allocation stays active while a request is pending.
-   Approval does not itself bypass availability validation.
-   Reassignment is transactional and preserves history.
-   Reviewer identity and decision timestamps are stored.

### Exit criteria

-   Students can submit and track each supported request.
-   Wardens can process only authorized requests.
-   Request transitions and decisions persist across sessions.
-   Room-change operations preserve allocation and audit history.

## 12. Phase 8 --- Administrator and Warden Workspaces

### Administrator

-   Counselling configuration and progress.
-   Rank-list import and validation report.
-   Hostel/room inventory.
-   Allocation monitor.
-   Exceptions and authorized overrides.
-   Occupancy and allocation reports.
-   Audit history.

### Warden

-   Assigned-hostel occupancy.
-   Student directory.
-   Leave requests.
-   Room-change and mess-change requests.
-   Complaint queue and status updates.
-   Announcements.

Build these screens using the shared design system, with tables for
operational data and only meaningful charts. Enforce authorization in
APIs, not only by hiding navigation items.

### Exit criteria

-   Role-specific routes and permissions are tested.
-   Live/near-live data comes from APIs rather than hard-coded dashboard
    values.
-   Administrative changes are audited.

## 13. Phase 9 --- AI Integration

**DEFERRED**: AI integration will happen only after all non-AI application functionality (up to and including Phase 12) has been implemented, integrated, and tested. The application must remain fully usable without AI.

AI is owned by a teammate, so agree on a contract before wiring the UI.

### Tasks

1.  Agree on request fields, response fields, model version, error
    format, and timeout.
2.  Define whether the AI service returns room recommendations, pairwise
    compatibility, group compatibility, or fallback ranking in the first
    release.
3.  Ensure the backend filters invalid candidates before calling AI.
4.  Validate every AI response against the API schema.
5.  Recheck availability and eligibility after the AI response.
6.  Store recommendation metadata in `AI_RECOMMENDATION`.
7.  Display scores and explanations without presenting uncalibrated
    scores as probabilities.
8.  Add deterministic fallback behavior when AI is unavailable.
9.  Test stale recommendations, malformed responses, latency, and
    service outage.

### Exit criteria

-   AI integration is behind a stable backend service adapter.
-   AI cannot allocate rooms or modify the database directly.
-   Invalid or stale AI suggestions are rejected.
-   Application workflows remain safe during AI outage.

## 14. Phase 10 --- Frontend Integration and Design QA

### Tasks

1.  Apply shared typography, spacing, colors, and component rules.
2.  Implement common application shell and role-specific navigation.
3.  Connect screens to real API services.
4.  Add loading, empty, error, disabled, and success states.
5.  Ensure the active counselling screen is focused and low-distraction.
6.  Remove hard-coded dashboard metrics and mock allocation success
    paths.
7.  Verify the allocation redirect occurs only after backend
    confirmation.
8.  Test keyboard navigation, contrast, and supported viewport sizes.
9.  Verify no generic AI anti-patterns have crept into new pages.

### Exit criteria

-   Primary screens use real API data.
-   All important actions have success and failure states.
-   The UI does not claim persistence before the backend confirms it.
-   Design review checklist passes.

## 15. Phase 11 --- Testing and Hardening

### Unit tests

-   Eligibility and business rules.
-   Slot transitions and time calculations.
-   Room capacity validation.
-   Request status transitions.
-   Input validation and permission rules.

### Integration tests

-   SQL transactions and foreign keys.
-   Authentication and role authorization.
-   Allocation and roommate records.
-   OTP expiry and single-use behavior.
-   Request approvals and room reassignment.
-   Notification persistence.

### End-to-end tests

-   Student login → slot → counselling → allocation → dashboard.
-   Roommate OTP verification.
-   Timeout fallback.
-   Leave request and warden decision.
-   Room-change request and approval/rejection.
-   Admin session setup and inventory changes.

### Security tests

-   Unauthorized route access.
-   SQL injection resistance through parameterized queries.
-   OTP brute-force/rate limits.
-   Session/token expiry.
-   Cross-student data access.
-   Privileged override auditing.

### Load/concurrency tests

Simulate multiple students requesting rooms simultaneously, especially a
room with one remaining bed. Measure API latency, database lock
behavior, error rates, and availability consistency.

### Exit criteria

-   Critical user journeys pass.
-   Capacity and authorization invariants pass under concurrency tests.
-   No known critical security issues remain.
-   Failures are observable without logging secrets.

## 16. Phase 12 --- Deployment and Operations

### Tasks

1.  Provision production application and SQL database.
2.  Configure environment secrets outside source control.
3.  Run migrations through a controlled release process.
4.  Configure HTTPS, allowed origins, secure cookies/tokens, and rate
    limits.
5.  Configure backups and test restoration.
6.  Set up health checks, logs, and error monitoring.
7.  Configure OTP/email provider credentials.
8.  Keep the AI model implementation independent; configure its service URL, credentials, timeout, and response validation when the integration contract is agreed.
9.  Test rollback and recovery procedures.
10. Conduct a pilot with synthetic or institution-approved limited data.
11. Train administrators and wardens.
12. Launch only after sign-off on data accuracy, policies, and
    operational readiness.

### Exit criteria

-   Production deployment is reproducible.
-   Database backups and restore are tested.
-   Secrets are not exposed to the browser or repository.
-   Monitoring and support ownership are defined.
-   A rollback plan exists.

## 17. Suggested Milestones

  Milestone   Deliverable
  ----------- ----------------------------------------------------
  M0          Repository audit and technical choices
  M1          SQL schema, migrations, seed data, integrity tests
  M2          Backend foundation and authentication
  M3          Hostel inventory and availability
  M4          Counselling sessions and slots
  M5          Transaction-safe allocation and OTP
  M6          Student dashboard and post-allocation requests
  M7          Administrator and warden workspaces
  M8          AI service integration
  M9          Full testing, security, and concurrency hardening
  M10         Deployment and pilot readiness

Milestone durations should be estimated only after the repository audit
and team availability are known.

## 18. Work Management and Collaboration

-   Keep tasks small and assign one owner per task.
-   Use feature branches and pull requests.
-   Require code review for allocation, authentication, and SQL
    migrations.
-   Keep migrations versioned; do not edit already-applied migrations
    casually.
-   Maintain API contracts for frontend/backend/AI integration.
-   Keep test data separate from production data.
-   Record decisions in `architecture.md` or an architecture decision
    record.
-   Avoid parallel edits to the same files without coordination.
-   Run tests and build checks before merging.

## 19. Definition of Done

A feature is done only when: 1. Requirements and expected behavior are
documented. 2. SQL migration/schema changes are included if needed. 3.
Backend authorization and validation are implemented. 4. Frontend
loading, success, error, and empty states exist. 5. Automated tests
cover core behavior. 6. No secrets or real student data are committed.
7. The UI follows `design.md`. 8. Logging and audit needs are addressed.
9. The feature works after refresh and re-login. 10. The feature has
been reviewed and merged.

## 20. Immediate Next Actions

Before coding deeply: 1. Inspect the actual repository and retain the
working React project where practical. 2. Confirm PostgreSQL versus
MySQL. 3. Resolve room-versus-bed allocation semantics. 4. Review the ER
diagram for constraints and normalization. 5. Agree with the AI teammate
on the initial API contract. 6. Finalize the font and color choices from
the design prototype. 7. Implement the database migrations and
allocation integrity tests before polishing every screen.


## Confirmed Project Decisions (Revision)

- **Database:** MySQL, using InnoDB for transactional tables.
- **Allocation:** room-level only. IHCAS does not assign beds; roommates decide bed division themselves.
- **Timeout:** a student whose three-minute slot expires without confirmation returns to the ready queue with their original rank priority. On re-entry, room availability is refreshed.
- **AI:** the teammate may implement the model/service independently. Integration will use a backend adapter once the interface is agreed; AI is not a blocker for core application development. AI Integration (Phase 9) is completely deferred until after Phase 12.

## Updated Execution Order

The intended implementation sequence is:
1. Phase 0 — Repository audit and project setup
2. Phase 1 — Relational database design
3. Phase 2 — Backend foundation
4. Phase 3 — Authentication and user data
5. Phase 4 — Hostel inventory and availability
6. Phase 5 — Counselling sessions and slots
7. Phase 6 — Allocation engine and roommate OTP verification
8. Phase 7 — Student dashboard and post-allocation features
9. Phase 8 — Administrator and warden workspaces
10. Phase 10 — Frontend integration and design QA
11. Phase 11 — Testing and hardening
12. Phase 12 — Deployment and operations
13. Phase 9 — AI integration (only after all non-AI functionality has been completed and tested)
