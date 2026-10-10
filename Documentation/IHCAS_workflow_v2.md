# IHCAS Operational Workflow Specification

**Document:** `workflow.md`\
**Version:** 1.0\
**Purpose:** Describe how the completed Intelligent Hostel Counselling &
Allocation System operates during normal use and exceptional conditions.

------------------------------------------------------------------------

## 1. Scope and Operating Principle

This document describes runtime behavior after IHCAS has been
implemented and configured. It is not a development plan. It defines the
expected sequence of actions, state changes, data flows, and exception
handling across students, administrators, wardens, the backend, SQL
database, and AI recommendation service.

**Operating principle:** The backend enforces institutional rules and
persists authoritative state. The SQL database protects data integrity.
The AI service recommends valid options but does not override rules. The
frontend presents state and collects user actions.

## 2. Actors and System Components

### Human actors

-   **Student:** completes counselling and uses post-allocation
    services.
-   **Administrator:** configures sessions and inventory, monitors
    allocation, and handles authorized exceptions.
-   **Warden:** manages assigned-hostel operations and reviews requests.

### Supporting components

-   **Frontend:** presents screens, validates input for usability, and
    calls backend APIs.
-   **Backend API:** authenticates users, authorizes actions, applies
    business rules, and coordinates transactions.
-   **SQL database:** stores authoritative users, sessions, slots,
    rooms, allocations, requests, and audit data.
-   **AI recommendation service:** receives approved features and
    candidate options and returns ranked recommendations.
-   **OTP/email/SMS provider:** delivers verification codes and selected
    notifications.
-   **Notification subsystem:** persists in-app notifications and
    optionally dispatches external messages.

## 3. Initial Setup Workflow

Before counselling begins, an authorized administrator:

1.  Creates or imports user/student records.
2.  Validates registration numbers, contact details, gender/eligibility
    attributes, and academic information.
3.  Imports or confirms the academic rank list.
4.  Configures hostels, floors, room types, room capacities, and room
    status.
5.  Assigns wardens to the relevant hostels.
6.  Creates a counselling session and configures dates, slot duration,
    and eligible students.
7.  Generates or imports rank-ordered counselling slots.
8.  Reviews the slot list, inventory totals, and data-validation report.
9.  Publishes the counselling schedule.
10. Starts the session when ready.

The system must reject or flag invalid records before a session becomes
active. Rank and inventory changes after publication must be
permission-controlled and audited.

## 4. Authentication and Access

1.  User opens IHCAS and signs in.
2.  Backend validates credentials and account status.
3.  Backend establishes an authenticated session/token.
4.  The frontend loads the user's permitted dashboard and actions.
5.  Each protected API request is authorized on the server.

A hidden frontend control is not a security boundary. If a student
manually calls an administrator endpoint, the backend must reject the
request.

If authentication fails, the user receives a clear error without
revealing whether a private account detail exists unnecessarily.
Repeated attempts are rate-limited.

## 5. Student Preparation Workflow

Before their counselling slot, a student can:

1.  Review profile, rank, eligibility, and assigned slot.
2.  Complete the compatibility survey.
3.  Review permitted instructions and hostel rules.
4.  Confirm that their registered contact method is available for OTP
    verification.

The compatibility profile uses the attributes in the current ER model: -
Sleep schedule. - Study habits. - Cleanliness. - Noise tolerance. -
Social preference. - Temperature preference. - Guest preference.

The institution may configure which attributes are required. The system
must indicate incomplete profile information before counselling if it
affects recommendations.

## 6. Counselling Slot Lifecycle

The expected slot lifecycle is:

`SCHEDULED → WAITING → ACTIVE → COMPLETED`

Exceptional terminal states may include `EXPIRED`, `CANCELLED`, or
`REQUIRES_ADMIN_REVIEW`, depending on institutional policy.

### 6.1 Scheduled

The slot exists but its start time has not arrived. The student can view
the schedule but cannot allocate a room.

### 6.2 Waiting

The slot is approaching or the student is in the online lobby. The
system displays rank, expected start time, and current status. The
student cannot reserve a room before activation.

### 6.3 Active

At the authoritative start time, the backend marks the slot active and
records the server-side expiry time. The frontend displays the remaining
time. The default duration is three minutes.

### 6.4 Completed

The slot is completed after a valid allocation is committed and the
system records the completion outcome.

### 6.5 Expired or interrupted

When the server-side deadline passes, new student selection/confirmation
actions are rejected unless explicitly permitted by the configured
policy. The system begins the fallback workflow or flags the case for
administrative review.

A browser refresh or device clock change must not reset or extend the
counselling window.

## 7. Main Counselling Workflow

1.  Student enters the waiting lobby.
2.  Backend verifies the slot belongs to the student and is eligible to
    start.
3.  When active, the backend returns slot status and expiry time.
4.  Student chooses an eligible hostel.
5.  Student chooses a room type.
6.  Frontend requests current available rooms.
7.  Backend filters rooms by hostel eligibility, room type, status,
    capacity, and institutional restrictions.
8.  Student selects a room.
9.  Backend validates the selection and returns current room/occupancy
    details.
10. Student optionally adds roommates.
11. Student reviews AI recommendations, if available.
12. Student reviews the proposed allocation and confirms.
13. Backend revalidates the slot deadline, student eligibility, room
    status, room capacity, roommate verification, and conflicting
    allocations.
14. Backend starts a SQL transaction, locks or safely updates the
    relevant room/occupancy record, inserts the allocation and roommate
    associations, and commits only if all invariants hold.
15. The backend returns the confirmed allocation.
16. Frontend shows success and navigates to the Student Dashboard.
17. Dashboard retrieves the persisted allocation from the backend and
    displays it.

The frontend must not treat a selected room as allocated until the
backend confirms the transaction.

## 8. Room Availability and Concurrency

Room availability is derived from authoritative room capacity and active
occupancy/reservations. The exact storage strategy---stored occupancy
with transactional updates or derived occupancy from active
allocation/bed records---must be finalized in the architecture and
schema.

When two students attempt to reserve the last available bed: 1. Both may
initially see the room as available. 2. The first valid transaction
acquires the required lock or wins the conditional capacity update. 3.
The first transaction commits. 4. The second transaction rechecks
capacity and fails safely. 5. The second student receives a message and
refreshed availability.

The system must never rely solely on frontend filtering to prevent
overbooking. All allocation and capacity checks occur on the backend
within a transaction or equivalent atomic operation.

Availability should refresh after successful allocation and when
relevant data changes. Real-time transport may use WebSockets or
Server-Sent Events if chosen in the architecture; polling is acceptable
for an initial implementation if it meets operational needs.

## 9. Roommate Addition and OTP Workflow

1.  Student enters a roommate registration number.
2.  Backend verifies the student exists and checks eligibility and
    conflicting active allocations.
3.  Backend requests an OTP delivery to the registered contact.
4.  OTP provider reports delivery outcome where supported.
5.  Roommate completes the required verification step according to the
    chosen UX.
6.  Backend validates OTP expiry, status, and attempt count.
7.  On success, OTP is marked used and verification is recorded.
8.  The verified roommate can be included in the allocation only if the
    allocation rules allow it and sufficient capacity remains.

### Security behavior

-   OTPs expire after a configured short duration.
-   OTPs are single-use.
-   Verification attempts and resend requests are rate-limited.
-   OTP values must not be stored or logged in plaintext.
-   A verified registration number cannot be added repeatedly to the
    same allocation.
-   The final product must define whether a roommate must independently
    authenticate/consent to the shared allocation; this is an open
    policy decision and must not be silently assumed.

## 10. AI Recommendation Workflow

1.  Backend builds a recommendation request from authorized student
    features, room candidates, and relevant occupant/group information.
2.  Backend removes ineligible or unavailable candidates before asking
    AI to rank them.
3.  AI service returns ranked recommendations with score,
    explanation/reason, model version, and request status where
    supported.
4.  Backend validates the response format and rechecks that recommended
    rooms remain eligible and available.
5.  Backend stores recommendation records in SQL, linked to the student
    and the relevant counselling attempt/session.
6.  Frontend displays the ranked options and concise explanations.
7.  Student selects an option or continues with a valid manual choice.

### AI service unavailable

If AI times out or returns an invalid response: - Do not block the
entire counselling process if a safe deterministic option is
available. - Show a neutral message that recommendations are temporarily
unavailable. - Use a deterministic valid-candidate ordering or flag for
review according to the configured fallback policy. - Log the failure
without recording secrets. - Never allocate an ineligible room merely
because AI is unavailable.

AI scores must not be represented as scientifically validated
probabilities unless the model has actually been calibrated and
evaluated as such.

## 11. Timeout and Ready-Queue Return

When the three-minute slot deadline is reached before a student confirms a room:

1. The backend marks the counselling attempt as timed out/expired.
2. No room is automatically assigned because of the timeout.
3. The student returns to the ready queue with their original academic-rank priority.
4. When the student enters counselling again, the backend supplies the latest room inventory and availability, including rooms allocated since the previous attempt.
5. The student receives a fresh three-minute slot when admitted again.
6. The backend prevents duplicate active sessions and applies rank ordering consistently.

The backend timer and queue state are authoritative; the browser countdown is only a display. Every room confirmation must revalidate current eligibility and room availability inside a concurrency-safe database transaction.

## 12. Allocation Lifecycle

Expected allocation lifecycle:

`PENDING → CONFIRMED → LOCKED`

A cancellation or replacement must be performed only through an
authorized institutional workflow and must be audited. Students cannot
directly vacate a locked allocation or restart counselling.

### Successful allocation

-   Store the student, slot, room, allocation type, status, timestamps,
    and related roommate records.
-   Update or derive occupancy safely.
-   Record an audit event.
-   Create an in-app notification.
-   Return the allocation response to the frontend.
-   Redirect the student to the dashboard.

### Failed allocation

-   Roll back all partial writes.
-   Return a clear conflict/validation message.
-   Refresh room availability.
-   Preserve the student's ability to choose another valid option if
    their slot remains active.

## 13. Student Dashboard Workflow

After login or allocation, the dashboard fetches authoritative data from
the backend. It must not rely on browser-only state as the source of
truth.

The dashboard displays: - Student profile and rank where relevant. -
Hostel, room number, room type, floor/bed where available. -
Roommates. - Allocation status and confirmation time. - Notifications
and announcements. - Existing leave, room-change, mess-change, and
complaint requests.

If no allocation exists, show the correct state and next allowed action.
If allocation is locked, hide or disable direct
room-vacating/reselection controls and explain the formal room-change
process.

## 14. Post-Allocation Request Workflows

### 14.1 Leave request

1.  Student submits dates and reason.
2.  Backend validates date order and policy.
3.  Request is stored as pending.
4.  Warden reviews it.
5.  Warden approves or rejects with an optional decision note.
6.  Backend stores the decision and reviewer.
7.  Student receives an in-app notification and can view the status.

### 14.2 Room-change request

1.  Student submits requested room type or other permitted preference
    and reason.
2.  Backend verifies the student has an active allocation.
3.  Request is stored as pending; the current allocation remains active.
4.  Authorized reviewer checks policy, availability, and supporting
    information.
5.  If rejected, the current allocation remains unchanged.
6.  If approved, the change is executed through a transactional
    reassignment process.
7.  Old and new allocation/room history is preserved and audited.
8.  Student is notified.

Approval alone must not silently create an over-capacity assignment;
reassignment must revalidate inventory at execution time.

### 14.3 Mess-change request

1.  Student submits the requested mess and reason.
2.  Backend validates permitted options and policy.
3.  Request is stored as pending.
4.  Authorized warden/administrator reviews it.
5.  Decision is stored and communicated.

### 14.4 Complaint

1.  Student submits category, description, and optional supporting
    details.
2.  Backend validates and stores the complaint.
3.  Authorized staff review and update status.
4.  Optional AI classification may suggest category or priority.
5.  Staff remain responsible for decisions.
6.  Student can track status and resolution.

## 15. Administrator Operating Workflow

The administrator: 1. Signs in with an authorized account. 2. Reviews
system/session status. 3. Imports or updates students and rank data. 4.
Validates data errors before publication. 5. Configures counselling
sessions and slot duration. 6. Manages hostel/room inventory and room
status. 7. Publishes the session and monitors progress. 8. Reviews
occupancy, failed allocations, timeout cases, and exceptions. 9.
Performs only authorized manual corrections or overrides. 10. Reviews
reports and audit events.

Changes affecting a live session must be constrained, clearly warned,
and audited. The system should prevent casual edits to a room that is
currently occupied or reserved.

## 16. Warden Operating Workflow

The warden: 1. Signs in. 2. Sees only assigned-hostel information. 3.
Reviews occupancy and student directory. 4. Processes leave,
room-change, and mess-change requests within their permissions. 5.
Reviews and updates complaints. 6. Publishes relevant announcements. 7.
Receives confirmation that each decision was persisted.

## 17. Notification Workflow

For a significant event: 1. Backend commits the business transaction. 2.
Backend creates a notification record in SQL. 3. Notification is visible
in the user's in-app notification list. 4. If external delivery is
configured, an asynchronous job sends email/SMS. 5. Delivery
success/failure is recorded where possible. 6. Failed external delivery
does not undo a committed allocation or request decision.

For reliable production behavior, event persistence and notification
dispatch should use a retry-safe design, such as an outbox table or
equivalent mechanism.

## 18. Error and Recovery Workflows

### Network interruption

-   The frontend may retry safe read operations.
-   Mutating requests should use an idempotency key or another
    duplicate-protection mechanism where appropriate.
-   On reconnection, the frontend fetches current server state rather
    than assuming the previous action succeeded.

### Duplicate submission

-   Backend detects repeated allocation/confirmation submissions.
-   Return the already committed result where safe, or a conflict
    response.
-   Do not create duplicate allocations or roommate records.

### Database failure

-   Roll back the transaction.
-   Do not show success.
-   Log a correlation/request ID and present a retry or support message.

### AI failure

-   Use the approved fallback policy; never bypass deterministic
    constraints.

### OTP provider failure

-   Show that verification could not be completed.
-   Permit controlled retry/resend.
-   Do not mark the roommate as verified.

### Room becomes unavailable

-   Reject the selection/confirmation safely.
-   Refresh availability and let the student choose another valid option
    if time remains.

## 19. Audit and Observability

Record important events such as: - Rank-list import and edits. - Session
configuration and publication. - Room inventory and capacity changes. -
Allocation creation, confirmation, lock, reassignment, and override. -
OTP verification outcomes without storing OTP secrets. - Request
submission and review decisions. - AI recommendation request/result
metadata and service failures. - Authentication and authorization
failures at a useful level of detail.

Logs must not contain passwords, raw OTPs, session secrets, or
unnecessary sensitive profile data.

## 20. End-to-End Acceptance Scenarios

1.  **Valid student:** sees their slot, enters counselling at the
    correct time, selects a valid room, confirms, and sees the
    allocation on the dashboard.
2.  **Wrong eligibility:** cannot access or allocate a hostel that
    violates eligibility rules.
3.  **Last bed race:** only one concurrent allocation can claim the
    final bed.
4.  **Roommate OTP failure:** roommate remains unverified and cannot be
    included as verified.
5.  **Timer expires:** configured fallback runs safely or the case
    enters administrative review.
6.  **AI unavailable:** student flow remains safe; no invalid room is
    assigned.
7.  **Locked allocation:** student cannot directly vacate or restart
    counselling.
8.  **Room-change rejection:** current allocation remains active.
9.  **Room-change approval:** reassignment rechecks capacity and
    preserves history.
10. **Unauthorized role:** API rejects an action outside the user's
    permissions.
11. **External notification failure:** core transaction remains
    committed and notification remains visible in-app.
12. **Refresh after allocation:** dashboard reloads the same
    authoritative allocation from the backend.

## 21. Policy Decisions Requiring Confirmation

-   Exact rank calculation/import rules and tie handling.
-   Exact slot statuses and whether a missed slot can be rescheduled.
-   Whether timeout allocation can be finalized automatically without
    student consent.
-   Whether manually added roommates must independently
    consent/authenticate.
-   Whether a room represents a shared room allocation or individual bed
    assignments.
-   Whether occupancy is stored or derived.
-   Who can approve each request and perform allocation overrides.
-   What happens when no room is available.
-   OTP provider, expiry, retry, and retention settings.
-   AI integration contract will be agreed when the teammate's independently implemented service is ready.
-   Institutional audit and data-retention periods.

------------------------------------------------------------------------

## 22. Summary

IHCAS operates as a server-authoritative, SQL-backed workflow. Students
receive rank-based counselling, inspect eligible live inventory, and
complete allocation within a controlled window. AI ranks valid options
but cannot bypass institutional rules. Successful allocation is
committed transactionally, locked, audited, and displayed on the Student
Dashboard. The same platform then supports hostel requests and
operations through role-based workflows.
