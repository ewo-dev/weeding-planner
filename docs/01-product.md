# Plan de Table — Product Specification

## 1. Product Goal

Plan de Table allows a user to create a visual seating plan quickly and intuitively.

The user should be able to go from an empty application to a complete seating plan without needing technical knowledge or creating an account.

The application focuses on one thing:

> Create, optimize and visually arrange a seating plan.

---

# 2. MVP User Journey

The primary user journey is:

```text
Open application
      ↓
Configure tables
      ↓
Add guests
      ↓
Define constraints (optional)
      ↓
Arrange guests
      ↓
Generate automatically (optional)
      ↓
Fine-tune manually
      ↓
Save / print / export
```

The user must be able to skip automatic generation and create the entire seating plan manually.

---

# 3. Application Entry

The application opens directly on the seating plan creation experience.

There should be no mandatory landing page, onboarding flow or account creation.

The user should immediately see an option to start configuring the plan.

Example:

```text
┌─────────────────────────────────────────┐
│                                         │
│             Plan de Table               │
│                                         │
│       Créez votre plan de table         │
│                                         │
│              [ Commencer ]              │
│                                         │
└─────────────────────────────────────────┘
```

If saved plans exist locally, they can also be accessed from the entry screen. The entry screen also provides project import and export.

---

# 4. Table Configuration

The user must be able to configure the tables before creating the seating plan.

## Required configuration

### Table shape

Supported shapes for the MVP:

* Round
* Rectangle

The architecture should allow additional shapes to be added later.

### Number of tables

The user can define how many tables are required.

### Seats per table

The user can define the default number of seats per table.

Example:

```text
Number of tables
[ 10 ]

Seats per table
[ 8 ]

Shape
(●) Round
( ) Rectangle
```

The user should be able to modify individual tables later.

For example:

```text
Table 1 → 8 seats
Table 2 → 8 seats
Table 3 → 10 seats
```

---

# 5. Guest Management

The user must be able to create and manage guests.

## Guest information

The minimum required information is:

* Name

Optional information can be introduced later.

## Guest operations

The user can:

* Add a guest.
* Edit a guest.
* Delete a guest.
* Search guests.
* See whether a guest is seated.
* Move a guest to another table.
* Remove a guest from a table.

Example:

```text
Guests

🔍 Search...

○ Marie
○ Thomas
○ Julien
○ Sophie

12 / 80 seated
```

The interface should clearly distinguish:

```text
Unseated guests
Seated guests
```

---

# 6. Seating Editor

The seating editor is the central part of the application.

It should provide a visual representation of the seating plan.

Example:

```text
             ○ Marie
       ○                 ○ Thomas

                TABLE 1

       ○                 ○ Sophie
             ○ Julien
```

Tables should be movable within the workspace.

Guests should be draggable.

The user must be able to:

* Drag a guest onto a table.
* Move a guest between tables.
* Remove a guest from a table.
* Move tables around the workspace.
* Reorganize the layout freely.

The visual editor should not force a fixed grid unless necessary for usability.

---

# 7. Guest Constraints

Users can define relationships between guests.

Constraints are optional.

The MVP supports three levels.

## Must be together

A mandatory relationship.

Example:

```text
Thomas
❤️ Must be with
Marie
```

The automatic seating engine must attempt to satisfy this constraint.

If it cannot be satisfied, the application must clearly indicate the conflict.

---

## Should be together

A preference rather than a hard requirement.

Example:

```text
Thomas
👍 Prefer to be with
Julien
```

The seating engine should try to maximize these preferences without violating mandatory constraints.

---

## Must not be together

A mandatory separation.

Example:

```text
Thomas
🚫 Must not be with
Julien
```

The automatic seating engine must avoid placing these guests at the same table.

---

# 8. Constraint Interface

Constraints should be accessible from the guest interface.

Example:

```text
Thomas

Relationships

❤️ Must be with
   Marie

👍 Prefer to be with
   Julien

🚫 Must not be with
   Marc

[ + Add relationship ]
```

Selecting a relationship should allow the user to choose another guest and the relationship type.

The UI should prevent invalid relationships such as a guest being required to sit with themselves.

---

# 9. Automatic Seating

The user can request an automatic seating plan.

Primary action:

```text
✨ Generate seating plan
```

The engine uses:

1. Mandatory constraints.
2. Table capacities.
3. Separation constraints.
4. Preferred relationships.
5. Overall distribution quality.

The generated result must never become immutable.

The user can always modify the result manually.

---

# 10. Automatic Seating Feedback

After generation, the application should communicate the result.

Example:

```text
Plan generated

✓ All mandatory relationships respected
✓ All tables within capacity
✓ No separation constraints violated

8 / 12 preferences satisfied
```

If constraints cannot be satisfied:

```text
Plan generated with conflicts

⚠ 1 mandatory constraint could not be satisfied.

Thomas must be with Marie,
but no valid table configuration was available.

[ Show conflict ]
```

The application should never silently ignore a mandatory constraint.

---

# 11. Manual Editing After Generation

The user can modify any automatically generated result.

Manual changes should not be blocked because they violate preferences.

However, the UI should warn the user when a manual change creates a mandatory conflict.

Example:

```text
⚠ Seating conflict

Thomas must be with Marie,
but they are currently at different tables.

[ Keep anyway ] [ Undo ]
```

The user remains in control of the final seating plan.

---

# 12. Table Layout

The user can freely arrange tables visually.

Each table should have:

* Table number/name.
* Shape.
* Capacity (number of seats).
* Current guests.
* Available seats.

Example:

```text
        ○ ○ ○
      ○       ○
      ○ TABLE 1 ○
      ○       ○
        ○ ○ ○

        6 / 8 seats
```

Tables should be draggable within the workspace. The layout position is part of the seating plan and must be persisted.

Selecting a table opens a detail view:

* Desktop: a side panel next to the canvas.
* Mobile: a bottom sheet or full-screen detail.

The detail view shows the table name, shape, capacity, current occupancy, the list of seated guests, empty seats, and actions to add, remove, or reassign guests. The selected table is also visually emphasized on the canvas.

The canvas is a spatial overview; the detail view is the primary place to read and manage a table's guests, especially on small screens.

---

# 13. Guest List and Seating Editor

The application should provide a clear relationship between the guest list and the visual editor.

On desktop, the guest list and the seating workspace are visible side by side:

```text
┌──────────────┬─────────────────────────────┐
│              │                             │
│   GUESTS     │        SEATING PLAN         │
│              │                             │
│ 🔍 Search    │       ○ ○ ○                 │
│              │      ○ T1 ○                 │
│ ○ Marie      │       ○ ○ ○                 │
│ ○ Thomas     │                             │
│ ○ Sophie     │              ○ ○ ◓          │
│ ○ Julien     │             ○ T2 ○          │
│              │              ○ ○ ○           │
└──────────────┴─────────────────────────────┘
```

On mobile, the guest list, table list, and seating plan are accessed through tabs. The primary way to place a guest on a phone is list-driven: tap "Placer" on a guest row, choose a table, then choose a seat. Drag-and-drop remains available as a secondary desktop interaction.

The guest list supports:

* Search by name or group.
* Filter chips: all, unseated, seated, by table, by group.
* Sort by name, group, table, or recently added.
* A clear indicator of each guest's table assignment.
* A quick action to place an unseated guest.

The exact layout can evolve during implementation, but the guest list and seating workspace should remain easily accessible, and large guest lists must remain comfortable to navigate.

---

# 14. Plan Status

The application should provide basic plan statistics.

Example:

```text
80 guests
10 tables
8 seats / table

72 seated
8 remaining

2 constraint conflicts
```

Useful indicators:

* Total guests.
* Seated guests.
* Unseated guests.
* Total seats.
* Available seats.
* Constraint conflicts.

---

# 15. Persistence and Portability

The application has no authentication, account system, backend, or remote database.

## Anonymous users

The current plan is automatically saved locally in IndexedDB.

The user should not lose their work when refreshing the page.

Use browser storage for the local version. Storage failures must be visible to the user; the app must never claim a change was saved when it was not.

Users must be able to:

* Create, rename, open, duplicate, and delete local plans.
* Export one complete project as a versioned JSON file.
* Import a project JSON file after validation and migration.
* Restore a project on another browser or device through export/import.

Browser storage is not a guaranteed backup. The UI should make export easy and warn users when local persistence is unavailable or full.

---

# 16. Export and Printing

The user should be able to produce a printable version of the seating plan.

Primary action:

```text
🖨 Imprimer le plan de table
```

The printed output is treated as a first-class UX, not as a screenshot of the screen. The MVP print layout is optimized for A4 portrait and shows:

* One clearly separated block per table.
* Table name/number and shape.
* Occupancy (`X / Y` seats).
* The ordered list of seated guests with seat numbers.
* Empty seats marked as "Place libre".
* A separate alphabetical guest index mapping each guest to their table.
* A separate section for unseated guests.

The print view hides all application controls, shadows, and colored backgrounds. Page breaks keep each table block together (`break-inside-avoid`). Both A4 and US Letter should preview cleanly.

PDF export relies on the browser's native print-to-PDF functionality. A dedicated PDF generation system is not required for the MVP.

Future formats may include a large visual seating map, a compact overview, or individual table sheets, but these are not part of the MVP.

---

# 17. Undo / Redo

Because the seating editor is highly interactive, undo/redo is desirable.

The user should be able to undo actions such as:

* Moving a guest.
* Moving a table.
* Adding/removing a guest.
* Changing table configuration.

This should be implemented if it can be done cleanly without significantly increasing complexity.

It must not delay the core MVP.

---

# 18. Mobile-First Responsive Behaviour

Mobile is a first-class MVP requirement, not a later enhancement. The application must work comfortably on:

* Desktop.
* Tablet.
* Mobile.

The seating editor must be designed for touch first, then adapted to larger screens. Desktop may expose more panels simultaneously, but it must not be the only practical editing environment.

On small screens and in portrait orientation, the UI should prioritize:

* Guest management.
* Table management.
* Viewing the seating plan.
* Basic guest movement using touch-friendly controls.

Mobile requirements:

* Core workflows require no mouse or hover interaction.
* Touch targets are at least 44 x 44 px with sufficient spacing.
* Layouts reflow without horizontal page scrolling at common phone widths.
* Dragging guests and tables has a clear touch affordance and does not depend on hover feedback.
* Where precise canvas dragging is difficult on a phone, provide an accessible action-based alternative such as "Move to table" or "Assign seat".
* Test portrait and landscape behavior on modern smartphones before release.

---

# 19. Empty States

Every major section should have a useful empty state.

Example:

```text
No guests yet

Add your guests to start creating
your seating plan.

[ + Add guest ]
```

For an empty seating plan:

```text
No tables yet

Configure your tables to start.

[ Configure tables ]
```

Empty states should guide the user toward the next useful action.

---

# 20. Error Handling

Errors should be understandable to normal users.

Avoid technical messages such as:

```text
ConstraintSolverException
```

Prefer:

```text
This seating plan could not satisfy all
mandatory relationships.

Try adding another table or changing
one of the constraints.
```

Technical details should remain available to developers through logs when appropriate.

---

# 21. MVP Feature List

The MVP is complete when the user can:

* [ ] Start without creating an account.
* [ ] Configure the number of tables.
* [ ] Configure table capacity.
* [ ] Choose table shape.
* [ ] Add guests.
* [ ] Edit guests.
* [ ] Delete guests.
* [ ] Search guests.
* [ ] Drag guests onto tables.
* [ ] Move guests between tables.
* [ ] Remove guests from tables.
* [ ] Move tables around the workspace.
* [ ] Define "must be together" constraints.
* [ ] Define "should be together" preferences.
* [ ] Define "must not be together" constraints.
* [ ] Generate a seating plan automatically.
* [ ] See unsatisfied constraints.
* [ ] Manually modify generated plans.
* [ ] Save the plan locally.
* [ ] Print the seating plan.
* [ ] Export a complete project as JSON.
* [ ] Import and restore a project from JSON.

---

# 22. Explicitly Not Part of the MVP

Do not implement:

* Invitations.
* RSVP.
* Email invitations.
* SMS.
* Guest messaging.
* Wedding budget management.
* Catering management.
* Menu management.
* Wedding timeline.
* Vendor management.
* Seating recommendations based on external data.
* AI-generated seating plans.
* Social features.
* Public sharing links.

These features may be considered in the future but should not be implemented as part of the MVP.

---

# 23. Product Success Criteria

The MVP should satisfy these principles:

### Fast

A user can configure a basic plan in minutes.

### Understandable

A non-technical user can understand the interface without instructions.

### Visual

The seating plan is represented visually rather than primarily as a spreadsheet.

### Controllable

Automatic generation helps the user but never takes control away from them.

### Recoverable

The user should be able to undo mistakes and recover their work.

### Simple

Every feature must justify its presence by making seating planning easier.
