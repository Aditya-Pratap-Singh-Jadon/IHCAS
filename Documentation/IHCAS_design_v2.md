# IHCAS Design System and Interface Specification

**Document:** `design.md`\
**Version:** 1.0\
**Purpose:** Define the visual and interaction system for the
Intelligent Hostel Counselling & Allocation System (IHCAS).

------------------------------------------------------------------------

## 1. Design Intent

IHCAS should look like a carefully designed institutional software
product---not a generic AI-generated SaaS dashboard. The supplied
references are inspiration for visual quality, hierarchy, navigation,
and information density. They are not templates to reproduce literally.

The interface should feel: - **Professional:** appropriate for a real
college deployment. - **Calm:** low visual noise during high-pressure
counselling. - **Data-oriented:** room availability, allocation status,
requests, and occupancy are easy to scan. - **Consistent:** student,
administrator, and warden pages share one design system. -
**Purposeful:** every chart, card, control, and accent color serves a
clear function. - **Distinctive:** avoid default AI-dashboard patterns
and use deliberate layout composition.

### Core design principle

> Use layout, typography, spacing, and information hierarchy to create
> character. Do not rely on gradients, excessive rounding, glass
> effects, or decorative cards to make the interface look modern.

## 2. Reference Interpretation

The supplied dashboard screenshots suggest several patterns worth
adapting:

-   Financial dashboard references: compact navigation, clear metrics,
    meaningful data visualizations, and a restrained visual hierarchy.
-   Light dashboard references: whitespace, clear typography,
    understated surfaces, and limited accent colors.
-   Project-management references: sidebar navigation, clear work
    states, tables/boards where appropriate, and compact task/request
    organization.
-   Dark analytics reference: strong contrast and dense data
    presentation, used selectively rather than as a reason to make every
    page dark.

Do not copy their branding, labels, charts, or exact layouts. IHCAS must
be designed around hostel allocation tasks.

## 3. Anti-Pattern Blocklist

The following are explicit prohibitions unless a specific, documented
product need justifies an exception.

### 3.1 Visual clichés to avoid

-   Default purple-to-blue gradients.
-   Unjustified beige-and-orange palettes.
-   Generic serif display headings.
-   Roboto as the default font.
-   Repeated bento grids on every dashboard.
-   Large decorative hero gradients behind routine application screens.
-   Glassmorphism everywhere: blur, translucent panels, frosted
    surfaces, and glowing edges.
-   Neon outlines, excessive glow, and gradients on ordinary cards.
-   Excessive pill-shaped buttons, navigation, filters, tabs, and status
    labels.
-   Oversized corner radii on every container.
-   Repeated cards with the same size and composition regardless of
    their content.
-   Decorative metrics, arbitrary charts, or fabricated activity.
-   Emoji as interface icons.
-   Inconsistent icon families and arbitrary icon styles.
-   Generic filler copy such as "Unlock your productivity" or "Your
    AI-powered journey starts here."
-   Repeated three- or four-column bento layouts without regard to the
    task.

### 3.2 Do not overcorrect

The blocklist is not a ban on every rounded corner, pill, gradient, or
card. Use them only when they improve usability or hierarchy. Small
corner radii, compact status badges, or a single selected-state accent
may be appropriate.

## 4. Theme Strategy

Use **one primary visual system** for the product. Do not create
unrelated color palettes for each role.

### 4.1 Initial palette direction

The final palette should be selected after a visual prototype is
reviewed. Start with a restrained neutral foundation and one primary
accent plus a limited semantic palette.

Suggested token structure (values are starting points, not final locked
colors):

  --------------------------------------------------------------------------
  Token                      Initial value           Usage
  -------------------------- ----------------------- -----------------------
  `--color-bg`               `#F5F6F4`               Application canvas

  `--color-surface`          `#FFFFFF`               Main content surfaces

  `--color-surface-muted`    `#ECEFEC`               Secondary surface or
                                                     selected table row

  `--color-text`             `#202622`               Primary text

  `--color-text-muted`       `#69736D`               Secondary text

  `--color-border`           `#DCE1DC`               Dividers, outlines,
                                                     table borders

  `--color-primary`          `#176B4D`               Primary actions and
                                                     selected navigation

  `--color-primary-hover`    `#10543C`               Hover/focus states

  `--color-primary-subtle`   `#E4F1EA`               Selected/soft accent
                                                     surface

  `--color-success`          `#26734D`               Successful allocation
                                                     or approved request

  `--color-warning`          `#A66A12`               Pending or attention
                                                     state

  `--color-danger`           `#B83A3A`               Errors, rejected
                                                     requests, destructive
                                                     actions

  `--color-info`             `#326C9A`               Informational state
  --------------------------------------------------------------------------

This palette is a neutral-plus-forest-green starting direction inspired
by the restrained operational dashboards. It is not a commitment to
green if prototype testing suggests a better accent. Avoid using every
semantic color decoratively.

### 4.2 Semantic color rules

-   Color must not be the only way to communicate status; pair it with
    text or an icon.
-   Use danger red only for errors, rejection, critical alerts, or
    destructive actions.
-   Use warning amber for pending/attention states, not as a general
    accent.
-   Use the primary accent for main actions and selected states.
-   Charts must use a limited, legible palette and meaningful labels.
-   Keep text/background contrast accessible.

### 4.3 Dark mode

Do not implement dark mode by inverting every color. If included, define
a separately tested token set. The initial release may use light mode as
the default unless product stakeholders explicitly require both themes.
The dark reference should influence restraint and information density,
not force a dark theme.

## 5. Typography

### 5.1 Font shortlist

Choose a small subset of the following Google Fonts rather than loading
all of them.

  -----------------------------------------------------------------------
  Font                    Intended role           Decision
  ----------------------- ----------------------- -----------------------
  **Manrope**             Primary interface font  Preferred first
                          candidate               candidate

  **DM Sans**             Alternative primary     Compare in prototype
                          interface font          

  **Plus Jakarta Sans**   Alternative with        Compare in prototype
                          slightly more character 

  **IBM Plex Sans**       Dense administrative    Optional secondary
                          tables and data         family

  **JetBrains Mono**      Registration numbers,   Optional and limited
                          codes, or technical     
                          values                  
  -----------------------------------------------------------------------

### 5.2 Recommended initial choice

Start by evaluating **Manrope** as the sole UI family. If it remains
readable in dense tables and smaller labels, keep the product to one
family. Use IBM Plex Sans only if a real readability benefit is
demonstrated. Use JetBrains Mono only for values that benefit from
fixed-width alignment.

### 5.3 Font weights

Suggested weights to download: - 400 --- regular body text. - 500 ---
labels and medium emphasis. - 600 --- section headings and buttons. -
700 --- page headings or strong emphasis, used sparingly.

Do not use ultra-light weights for critical data or timer values.

### 5.4 Local font files

Place downloaded font files in a project directory such as:

``` text
src/
  assets/
    fonts/
      Manrope-Regular.woff2
      Manrope-Medium.woff2
      Manrope-SemiBold.woff2
      Manrope-Bold.woff2
```

Google Fonts filenames can vary by download method. Keep the actual
filenames consistent with the `@font-face` declarations. Prefer variable
WOFF2 files when the downloaded family provides a suitable variable
font.

Example CSS:

``` css
@font-face {
  font-family: "Manrope";
  src: url("./assets/fonts/Manrope-Variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
}

:root {
  --font-ui: "Manrope", sans-serif;
}

body {
  font-family: var(--font-ui);
}
```

If using separate static files, define one `@font-face` rule for each
weight. Do not silently fall back to Roboto or a serif family. A generic
sans-serif fallback is acceptable if a font fails to load.

### 5.5 Download links

-   Manrope: https://fonts.google.com/specimen/Manrope
-   DM Sans: https://fonts.google.com/specimen/DM+Sans
-   Plus Jakarta Sans:
    https://fonts.google.com/specimen/Plus+Jakarta+Sans
-   IBM Plex Sans: https://fonts.google.com/specimen/IBM+Plex+Sans
-   JetBrains Mono: https://fonts.google.com/specimen/JetBrains+Mono

## 6. Layout and Navigation

### 6.1 Dashboard shell

Use a consistent application shell: - A stable left sidebar for primary
navigation on desktop. - A compact top bar for page context, global
notifications, and account actions. - A main content area with a clear
page title and optional short description. - Responsive navigation
behavior on narrower viewports.

Avoid a large, floating, pill-shaped navbar across the top of every
page.

### 6.2 Sidebar

-   Use a restrained width and clear active state.
-   Group links by purpose (for example: Overview, Counselling, Hostel,
    Requests, Administration).
-   Use one consistent icon set, such as Lucide, with consistent stroke
    weight.
-   Keep labels visible on desktop; do not rely on icons alone for core
    functions.
-   Use simple rectangular or subtly rounded active backgrounds rather
    than large capsule shapes.
-   Place sign-out and account options in a predictable location.

### 6.3 Top bar

-   Show the current page or breadcrumb when useful.
-   Include notifications and account controls.
-   Use dropdown menus for secondary actions where appropriate.
-   Avoid putting every action into a separate floating pill.
-   Search should appear only where it has a clear use.

### 6.4 Navigation controls

Choose based on interaction: - **Tabs:** switching between closely
related views in the same context. - **Dropdown:** choosing one item
from a longer list. - **Segmented control:** switching between a small
number of mutually exclusive views. - **Text navigation:** simple page
or section links. - **Slider:** continuous numeric adjustment or time
range, not ordinary page navigation. - **Buttons:** actions that change
state or submit data.

Do not use a slider merely as a visual replacement for navigation.
Controls must match the semantics of the task.

## 7. Component Rules

### 7.1 Buttons

-   Primary button: one clear primary action per region where possible.
-   Secondary button: lower emphasis, usually outlined or neutral.
-   Destructive button: visually distinct and requires appropriate
    confirmation.
-   Disabled state must be obvious and must not look like an active
    control.
-   Avoid making every button a capsule; use modest radii consistently.

### 7.2 Cards and surfaces

-   Use cards when grouping related information improves scanning.
-   Prefer tables, lists, and structured sections when the data is
    tabular.
-   Do not wrap every individual statistic or paragraph in a separate
    card.
-   Use subtle borders or surface contrast before adding shadows.
-   Reserve stronger emphasis for a genuinely important item.

### 7.3 Tables

Use tables for: - Student directory. - Room inventory. - Counselling
slots. - Allocation records. - Leave/room-change/mess requests. -
Complaints and audit events.

Tables should support clear column labels, aligned numeric values,
useful empty states, status text, pagination when needed, and filters
relevant to the data. Do not use a card grid to represent a table unless
the viewport requires it.

### 7.4 Status indicators

Use compact labels or badges only where they improve scanning. Status
must be readable as text: - Available. - Partially filled. - Full. -
Maintenance. - Pending. - Approved. - Rejected. - Confirmed. - Locked.

Avoid using a different decorative color for every status if neutral
styling is sufficient.

### 7.5 Forms

-   Group related fields with clear labels.
-   Explain validation errors next to the relevant field.
-   Do not use placeholder text as the only label.
-   Confirm destructive or irreversible actions clearly.
-   Preserve entered data when validation fails.
-   Make required fields obvious.

### 7.6 Dialogs and notifications

Use dialogs for decisions that require focused confirmation, not for
every minor action. Toasts should be brief and non-blocking; important
state changes must also be visible in the page or notification history.

### 7.7 Charts

Charts must answer a real operational question, such as occupancy by
hostel or allocation progress. Label axes and time periods. Do not
invent statistics or add charts solely to fill dashboard space.

### 7.8 Icons

Use one coherent icon library (Lucide is a suitable candidate). Do not
mix emoji, unrelated SVG sets, and inconsistent line/filled icon styles.

## 8. Role-Specific Page Design

### 8.1 Student experience

The student interface prioritizes clarity and low stress. Counselling
status, countdown, eligible room options, and the next action must be
immediately understandable.

### 8.2 Counselling screen

This screen has a distinct focused layout because the student has a
short time window: - Clear slot/rank status. - Prominent but restrained
countdown. - Visible hostel and room-type selection. - Room list/table
with capacity and remaining beds. - Clear selected-room state. -
Roommate verification as a contained optional flow. - AI recommendations
with concise reasons. - A review/confirmation step that explains the
finality of allocation. - Accessible error and timeout states.

Avoid distracting animations, decorative charts, unnecessary navigation,
or large promotional panels on the active counselling screen.

### 8.3 Student dashboard

Prioritize: - Final hostel/room allocation. - Allocation status. -
Roommates. - Relevant requests and their status. - Notifications and
announcements. - Quick actions for leave, room change, mess change, and
complaints.

Do not fill the first viewport with generic summary cards if the student
needs to see their allocation first.

### 8.4 Administrator dashboard

Prioritize operational visibility: - Counselling session status and
progress. - Allocation counts and room availability. - Exceptions
requiring attention. - Searchable/filterable student and room data. -
Reports and authorized administrative actions.

Use tables and meaningful charts rather than a generic bento layout.

### 8.5 Warden dashboard

Prioritize: - Assigned-hostel occupancy. - Pending leave requests. -
Room-change and mess-change requests. - Complaints requiring action. -
Student lookup and announcements.

Do not expose administrative controls that are outside the warden's
permissions.

## 9. Interaction and State Design

Every interactive component must have defined: - Default state. -
Hover/focus state. - Selected state. - Disabled state. - Loading state
where applicable. - Success and error feedback.

The interface must not claim an allocation succeeded until the backend
confirms it. During allocation, show a clear pending state and handle
conflicts if a room becomes unavailable.

### Irreversible allocation

Before final confirmation, explicitly explain that allocation becomes
locked after success and future changes require an administrative
request. Avoid ambiguous button labels such as "Continue" when the
action permanently confirms an allocation.

## 10. Responsive Behavior

-   Desktop: persistent sidebar and full tables.
-   Tablet: compact/collapsible sidebar and adjusted content width.
-   Small screens: navigation drawer, stacked form sections, and
    horizontally scrollable or intentionally simplified tables.
-   Counselling timer and primary action must remain visible without
    excessive scrolling where feasible.
-   Do not simply shrink desktop bento grids onto mobile.

## 11. Accessibility

-   Maintain readable contrast for text and controls.
-   Provide visible keyboard focus.
-   Label form controls.
-   Associate validation messages with their fields.
-   Do not rely on color alone for status.
-   Respect reduced-motion preferences.
-   Ensure timer warnings are communicated without relying only on
    animation or color.
-   Use semantic HTML elements and accessible names.

## 12. Motion

Use motion only to communicate a state change or provide feedback.
Avoid: - Constant floating animations. - Excessive parallax. - Animated
backgrounds. - Decorative chart motion. - Motion that distracts during
the counselling timer.

Prefer short, restrained transitions. Reduced-motion settings must be
respected.

## 13. Design Tokens and CSS Organization

Keep tokens centralized, for example:

``` css
:root {
  --color-bg: #F5F6F4;
  --color-surface: #FFFFFF;
  --color-surface-muted: #ECEFEC;
  --color-text: #202622;
  --color-text-muted: #69736D;
  --color-border: #DCE1DC;
  --color-primary: #176B4D;
  --color-primary-hover: #10543C;
  --color-primary-subtle: #E4F1EA;
  --color-success: #26734D;
  --color-warning: #A66A12;
  --color-danger: #B83A3A;
  --color-info: #326C9A;

  --font-ui: "Manrope", sans-serif;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
}
```

These are initial token values for prototyping. Validate the palette and
density with actual pages before treating them as final. Avoid adding
arbitrary one-off colors and radii to individual components.

## 14. Design Review Checklist

Before approving a page, verify: - Does it serve the user's actual
task? - Is the information hierarchy obvious? - Is a table/list more
appropriate than cards? - Are pills, gradients, shadows, and rounded
corners being used intentionally? - Does the page use the shared
typography, spacing, and color tokens? - Are all metrics real and
sourced? - Are controls semantically appropriate? - Are loading, empty,
error, and success states designed? - Is the page usable by keyboard and
at supported viewport sizes? - Does the layout differ where the role or
task genuinely differs? - Does the page avoid the AI anti-pattern
blocklist?

## 15. Design Deliverable

The implementation team should deliver: 1. Shared design tokens and
typography setup. 2. Reusable navigation shell and role-specific
navigation. 3. Buttons, form fields, tables, status indicators, dialogs,
and notifications. 4. Student counselling and dashboard layouts. 5.
Administrator and warden dashboard layouts. 6. Loading, empty, error,
disabled, and success states. 7. Responsive behavior and accessibility
checks.

The final visual system should be approved against the supplied
references before expanding it to every page.


## Confirmed Interaction Rules (Revision)

- Room selection is the allocation decision; do not include a bed-selection UI. Students sharing a room coordinate bed placement themselves.
- If the three-minute counselling timer expires, show a clear timeout state and return the student to the ready queue without assigning a room. Preserve rank priority and show refreshed availability when they re-enter.
- AI recommendations may be integrated later through the application backend; core screens must remain usable while the teammate's service is not yet connected.
