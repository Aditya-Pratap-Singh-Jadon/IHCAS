# Product Requirements Document (PRD)

## Intelligent Hostel Counselling & Allocation System (IHCAS)

**Version:** 1.0\
**Status:** Baseline product requirements\
**Product type:** Web-based hostel counselling, allocation, and
management platform\
**Domains:** Software Engineering, Database Systems, Artificial
Intelligence

------------------------------------------------------------------------

## 1. Purpose

This PRD defines IHCAS's product vision, scope, users, functional
requirements, business rules, and acceptance criteria. Visual design,
operational workflow, implementation phases, and technical architecture
will be detailed in separate documents.

## 2. Product Summary

The Intelligent Hostel Counselling & Allocation System (IHCAS) is a web
platform designed to move hostel counselling from a physically
constrained process into an online, structured, time-bound, and
transparent experience. The institution already uses software in its
allocation process, but students still gather physically and are
counselled in small batches. This creates crowding, waiting,
uncertainty, stress, and administrative overhead.

IHCAS provides rank-based counselling slots, eligible-hostel filtering,
current room availability, room selection, verified roommate addition,
AI-assisted recommendations, and post-allocation hostel services.

**Product principle:** Institutional rules define what is allowed.
Academic rank determines counselling priority. AI recommends valid
options. Students make choices within the process. Authorized
administrators retain control.

## 3. Problem Statement

The existing process is digitally supported but still physically
constrained. Counselling throughput is limited by the number of students
who can be handled at once. Students have limited visibility into
changing room availability. Administrators must coordinate rank lists,
room inventory, allocations, exceptions, and post-allocation requests.

The product must address: - Physical queues and crowding during
counselling. - Long and uncertain waiting periods. - Limited visibility
into current room availability. - Duplicate allocations and
room-capacity violations. - Difficulty organizing roommate selection and
compatibility. - Manual administrative coordination and exception
handling. - Fragmented post-allocation hostel operations.

## 4. Product Vision and Goals

### Vision

Provide one reliable digital platform for hostel counselling,
allocation, and ongoing hostel management, supported by AI
recommendations and a consistent relational database.

### Primary goals

1.  Conduct counselling online using configured academic-rank priority.
2.  Assign each eligible student a counselling slot.
3.  Use a default three-minute counselling window.
4.  Show eligible hostels, room types, and current room availability.
5.  Prevent over-capacity and duplicate allocation.
6.  Support verified roommate addition through registration number and
    OTP.
7.  Integrate AI-generated room and roommate recommendations.
8.  Define safe behavior when a counselling slot expires.
9.  Lock confirmed allocations from the student interface.
10. Provide student, administrator, and warden dashboards.
11. Support leave, room-change, mess-change, complaint, notification,
    and announcement workflows.
12. Store operational records in a relational SQL database.

### Success indicators

-   Reduced physical attendance and queues.
-   Reduced average waiting and allocation completion time.
-   High online allocation completion rate.
-   Zero capacity violations and duplicate allocations.
-   Fewer manual interventions.
-   Consistent room-availability data.
-   Positive feedback on recommendations and allocation.
-   Measurable outcomes for room-change requests.

Targets should be set after the institution's current process has been
measured.

## 5. User Roles

### 5.1 Student

Can authenticate, view their profile/rank/slot, complete a compatibility
profile, enter counselling during their slot, view eligible hostels and
rooms, select a room, add verified roommates, view AI recommendations,
confirm allocation, view their final allocation, submit hostel requests,
and receive notifications.

Students cannot modify inventory, bypass eligibility, cancel a locked
allocation directly, or access other students' private data without
authorization.

### 5.2 Administrator

Can manage users and student records, import rank lists, configure
counselling sessions, manage hostels/rooms/types/capacities, monitor
allocations, perform authorized overrides, review occupancy and reports,
inspect AI analytics, and publish authorized announcements. Privileged
changes must be auditable.

### 5.3 Warden

Can view assigned-hostel students and occupancy, review
leave/room-change/mess-change requests, manage complaints, and publish
hostel announcements. Access must be restricted to assigned
responsibilities.

### 5.4 External services

Email, SMS, and OTP providers may deliver verification codes and
notifications. They are supporting systems; delivery failure must be
handled explicitly.

## 6. Scope

### In scope

-   Role-based authentication and authorization.
-   Student records, eligibility, and rank-list management.
-   Counselling sessions and rank-based slots.
-   Online waiting and active counselling states.
-   Three-minute countdown with server-side enforcement.
-   Gender-specific hostel eligibility.
-   Hostel, floor, room, and room-type inventory.
-   Room availability and occupancy tracking.
-   Room selection and allocation confirmation.
-   Roommate registration-number validation and OTP verification.
-   Behavioral compatibility profiles.
-   AI recommendation service integration.
-   Allocation locking and timeout fallback.
-   Student dashboard.
-   Leave, room-change, mess-change, and complaint workflows.
-   Notifications and announcements.
-   Administrator and warden dashboards.
-   Reports and audit history.
-   Relational SQL database with constraints and transactional
    allocation.

### Not assumed for the initial release

-   Online hostel fee collection.
-   Biometric or physical access-control hardware.
-   Native mobile applications.
-   Full mess inventory or meal planning.
-   Roommate chat or social request/accept workflows.
-   AI overriding institutional eligibility, capacity, or priority
    rules.

## 7. Core Counselling Workflow

1.  Student signs in.
2.  System validates identity, eligibility, and allocation status.
3.  Student views academic rank and assigned slot.
4.  Student waits in the online lobby until the slot becomes active.
5.  Server activates counselling; default duration is three minutes.
6.  Student views only eligible hostels.
7.  Student selects a room type: 1-bed, 2-bed, 4-bed, or 6-bed.
8.  System displays current availability for eligible rooms.
9.  Student selects an available room.
10. Student may add roommates using registration numbers.
11. System validates roommate eligibility and verifies identity through
    OTP.
12. If no manual roommates are added, AI may recommend compatible
    occupants or group combinations according to institutional policy.
13. Student reviews the allocation.
14. Student confirms.
15. Backend revalidates availability and reserves capacity in a
    concurrency-safe database transaction.
16. Allocation is confirmed and locked.
17. Student is redirected to the Student Dashboard.

### 7.1 Timeout behavior

If the slot expires before the student confirms a room, the counselling attempt ends and the student returns to the ready queue using their original academic-rank priority. No automatic allocation occurs solely because of timeout. When the student re-enters counselling, the system displays current room availability, reflecting rooms allocated since the previous attempt. The browser timer is not authoritative; the backend enforces slot expiry and queue ordering.

## 8. Hostel and Room Requirements

Supported room types are `1_BED`, `2_BED`, `4_BED`, and `6_BED`. The
current ER diagram also includes `AC` and `NON_AC`; the final SQL model
must clarify whether these are amenities or room categories.

Each room is associated with a hostel and room type and records its room
number, floor, capacity, occupancy (stored or safely derived), and
operational status.

**IHCAS decision: allocation is room-level only.** The system assigns a student to a room, not to an individual bed. Roommates decide among themselves how to divide the beds; bed assignment is outside the system's scope. Room capacity and occupied places still must be enforced.

### Hard allocation rules

-   Student and hostel eligibility must be checked on the backend.
-   Gender-separated hostel restrictions must be enforced.
-   A room cannot exceed its capacity.
-   A student cannot have conflicting active allocations.
-   A bed cannot be reserved twice.
-   Availability must be rechecked at confirmation.
-   AI cannot override eligibility, capacity, availability, or
    administrative locks.

## 9. Roommate Verification

1.  Student enters the roommate registration number.
2.  System validates the registration number and eligibility.
3.  OTP is sent to the registered contact.
4.  System validates OTP, expiry, and attempt limits.
5.  Verification result is recorded.
6.  Verified roommate is associated with the allocation according to the
    approved data model.

There is no roommate chat or request/accept social workflow. Duplicate
roommate assignments and conflicting active allocations must be
prevented.

## 10. Compatibility Profile and AI Integration

### 10.1 Behavioral attributes in the current ER diagram

-   Sleep schedule.
-   Study habits.
-   Cleanliness.
-   Noise tolerance.
-   Social preference.
-   Temperature preference.
-   Guest preference.

The exact answer options and scoring will be defined in the design and
AI specifications.

### 10.2 AI responsibilities

The AI component, developed separately by a teammate, is expected to
provide ranked recommendations for room suitability, roommate
compatibility, group compatibility, and valid fallback options. The
backend must integrate it through a documented API/service contract.

### 10.3 Recommendation records

The ER diagram's `AI_RECOMMENDATION` entity stores student, room, score,
reason, model version, and generation timestamp. The final schema must
also define association with a counselling session or allocation attempt
and rules for stale recommendations.

### 10.4 Governance

AI outputs are advisory. Eligibility, gender rules, capacity, academic
priority, and administrative decisions remain deterministic constraints.
Recommendation metadata should be recorded for evaluation and debugging.

## 11. Student Dashboard and Post-Allocation Services

The dashboard displays student details, hostel, room number, room type,
floor/bed when applicable, roommates, allocation status, notifications,
and announcements.

Available actions: - Apply for leave. - Request a room change. - Request
a mess change. - Submit a complaint. - Track request status.

### Allocation lock

Students cannot directly vacate a confirmed locked allocation or restart
counselling. Room changes use the official request workflow. The current
allocation remains active until an authorized change is approved and
committed.

## 12. Administrator and Warden Capabilities

### Administrator

-   Manage users and student records.
-   Import and validate rank lists.
-   Configure and monitor counselling.
-   Manage hostels, floors, rooms, types, and capacities.
-   Monitor allocations and perform authorized overrides.
-   Review occupancy, reports, AI analytics, and audit history.

### Warden

-   View assigned-hostel occupancy and student directory.
-   Review leave, room-change, and mess-change requests.
-   Manage complaint status.
-   Publish announcements.

Approval authority must follow institutional policy; a warden should not
automatically receive unrestricted allocation-override permissions.

## 13. Notifications

Persist in-app notifications for counselling updates, allocation
confirmation or fallback, request status changes, complaint updates, and
announcements. Email/SMS may supplement in-app notifications, but
database persistence must not depend on successful external delivery.

## 14. Relational SQL Database Requirements

The supplied ER diagram is the baseline for the relational data model.
It identifies: - `USER`, `STUDENT`, `ADMIN`, `WARDEN` -
`COMPATIBILITY_PROFILE` - `HOSTEL`, `ROOM`, `ROOM_TYPE` -
`COUNSELLING_SESSION`, `COUNSELLING_SLOT` - `ALLOCATION`,
`STUDENT_ROOMMATE` - `OTP_VERIFICATION` - `AI_RECOMMENDATION` -
`NOTIFICATION` - `LEAVE_REQUEST`, `ROOM_CHANGE_REQUEST`,
`MESS_CHANGE_REQUEST`, `COMPLAINT`

The SQL implementation must: - Define primary and foreign keys. -
Enforce unique email, registration number, and appropriate employee
identifiers. - Use check constraints or lookup tables for controlled
values. - Preserve referential integrity and normalize repeated data
appropriately. - Use transactions for allocation and occupancy
changes. - Prevent duplicate active allocations and capacity overrun. -
Store timestamps consistently. - Never store plaintext passwords or
plaintext OTPs. - Define retention rules for sensitive verification
records. - Include migration scripts, reference data, and seed data. -
Support reporting without weakening transactional correctness.

MySQL is the required SQL database for this project
in the architecture/implementation documents. MongoDB is not assumed as
the primary database.

## 15. Security, Privacy, and Audit

-   Enforce role-based authorization server-side.
-   Hash passwords using a suitable password-hashing algorithm.
-   Protect sessions/tokens and use secure transport in production.
-   Rate-limit authentication and OTP endpoints.
-   Expire and invalidate OTPs after use or timeout.
-   Validate and authorize every sensitive API request.
-   Restrict student contact and profile data to authorized users.
-   Audit rank-list changes, room inventory changes, allocations,
    overrides, and request decisions.
-   Avoid logging secrets.
-   Establish institutional retention and privacy rules.

## 16. Non-Functional Requirements

### Reliability

Allocation must persist across refreshes, navigation, and recoverable
network interruptions.

### Concurrency

Concurrent requests must not reserve the same final bed or exceed room
capacity.

### Performance

The UI should remain responsive during peak counselling. Allocation
correctness takes priority over cosmetic speed.

### Scalability

The architecture should support thousands of students during peak
counselling using efficient queries, indexes, and real-time updates
where appropriate.

### Maintainability

Frontend, backend business logic, SQL access, and AI integration must be
separated into clear modules.

### Accessibility and responsiveness

Core flows must support keyboard navigation, readable contrast, and
common desktop/tablet sizes. The timed counselling experience must
remain clear on supported smaller screens.

### Observability

Record application errors, failed allocation attempts, OTP failures, AI
service failures, and privileged actions without logging secrets.

## 17. Design Requirements

The supplied screenshots are visual references, not templates to copy.
IHCAS must use one coherent design system across student, administrator,
and warden experiences.

### Required characteristics

-   Clear hierarchy and restrained, purposeful color.
-   Sidebar and compact top-header patterns where appropriate.
-   Tables for dense operational data such as rooms, students, and
    requests.
-   Charts only when they communicate meaningful information.
-   Controls selected for purpose: tabs, dropdowns, segmented controls,
    or simple navigation.
-   Limited pill-shaped controls and no default glassmorphism.
-   Consistent spacing, iconography, typography, and component states.
-   Role-appropriate layouts within one shared design system.

### Anti-patterns to prohibit

-   Generic purple-to-blue gradients as the default identity.
-   Unjustified beige-and-orange palettes.
-   Generic serif display headings or default Roboto typography.
-   Repeated bento grids on every page.
-   Excessive pills, blur, translucent surfaces, glowing borders, and
    oversized rounding.
-   Decorative metrics, arbitrary charts, emoji icons, and repetitive
    generic card layouts.

### Typography candidates

Google Fonts candidates (not all should be loaded together): -
**Manrope** --- primary UI candidate. - **DM Sans** --- alternative UI
candidate. - **Plus Jakarta Sans** --- alternative UI candidate. - **IBM
Plex Sans** --- candidate for dense administrative data. - **JetBrains
Mono** --- optional for identifiers and technical/numerical values.

The design specification should select a small subset and document
weights, local filenames, and CSS font-family declarations.

## 18. Assumptions and Dependencies

-   The institution can provide or approve student records, rank data,
    hostel inventory, capacities, and eligibility rules.
-   OTP delivery requires a configured provider and valid registered
    contacts.
-   A teammate will provide the AI component and its API contract.
-   The SQL engine and deployment environment remain undecided.
-   A timed-out student returns to the ready queue with original rank priority;
    authority, and data retention.
-   The supplied ER diagram is the baseline and may require
    normalization or integrity improvements during schema design.

## 19. Acceptance Criteria

The product baseline is acceptable when: 1. Users can authenticate and
access only permitted role-based functions. 2. Eligible students can
view rank and slot information. 3. The server enforces the active
counselling window. 4. Students can view eligible hostels and current
room availability. 5. Full or ineligible rooms cannot be allocated. 6.
Concurrent requests cannot overbook a room. 7. Roommate identity can be
verified through OTP. 8. Compatibility profiles can be stored and
retrieved with authorization. 9. AI integration returns ranked
recommendations with appropriate metadata. 10. A valid allocation is
persisted, confirmed, and locked. 11. The Student Dashboard displays
final allocation after success. 12. Timeout and AI-unavailable cases
follow safe documented behavior. 13. Students can submit and track
hostel requests. 14. Wardens and administrators can perform authorized
workflows. 15. Important operations are auditable. 16. SQL constraints
enforce referential integrity and core uniqueness/capacity rules. 17.
All roles follow the same intentional design system with
role-appropriate layouts.

## 20. Open Decisions Before Implementation

1.  Use MySQL as required by the university.
2.  Clarify whether `AC`/`NON_AC` are amenities or room categories.
3.  Define rank import, tie handling, and validation.
4.  Implement timeout return-to-queue behavior with original rank priority and refreshed room availability.
5.  Define whether a roommate must independently confirm the same
    allocation.
6.  Decide whether occupancy is stored or derived and how it is
    reconciled.
7.  Define warden versus administrator approval authority.
8.  Keep AI model implementation independent; agree on an integration interface when the teammate's service is ready.
9.  Select final font families and color tokens.
10. Define institutional data-retention and privacy requirements.

## 21. Product Statement

IHCAS is an AI-assisted hostel counselling, room-allocation, and
hostel-management platform that preserves academic priority and
institutional constraints, provides current room availability, supports
verified roommate selection, and integrates explainable recommendations
into a reliable relational-data-backed workflow.
