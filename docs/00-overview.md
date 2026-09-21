# Plan de Table — Overview

## 1. Project

**Plan de Table** is a small web application for creating and managing a wedding or event seating plan.

The application allows users to:

* Define the number and shape of tables.
* Define the capacity of each table.
* Add and manage guests.
* Place guests around tables using drag & drop.
* Define relationships and seating constraints between guests.
* Automatically generate a seating plan while respecting constraints.
* Manually adjust the generated plan.
* Save and reload plans.
* Print or export the final seating plan.

The application should feel like a simple visual editor rather than a complex event-management platform.

---

## 2. Product Philosophy

The application should be:

* **Simple** — users should be able to start creating a plan immediately.
* **Visual** — the seating plan is the central part of the application.
* **Fast** — creating a basic plan should take only a few minutes.
* **Flexible** — users can manually modify anything generated automatically.
* **Private** — plan data stays in the user's browser unless the user exports it.
* **Portable** — complete projects can be exported as JSON and restored elsewhere.
* **Offline-capable** — the core editor works without a network connection after the application is loaded.

The application should avoid unnecessary features and complexity.

---

## 3. Core User Flow

The primary flow is:

```text
Open application
      ↓
Configure tables
      ↓
Add guests
      ↓
Define constraints (optional)
      ↓
Place guests manually
      ↓
OR
Generate seating plan automatically
      ↓
Adjust the plan manually
      ↓
Save / print / export
```

A user should be able to start building a plan without creating an account.

---

## 4. Local-first Experience

The application has no account, authentication, backend, or remote database.

The normal data flow is:

```text
User
  ↓
Application state
  ↓
Browser IndexedDB
```

Users should be able to create and edit a complete seating plan without an account.

To move a project to another browser or device, the user exports the complete project JSON and imports it there:

```text
Application state
       ↓
Versioned JSON project file
```

Browser persistence and project-file export remain separate concerns. Browser storage is convenient working storage, not a backup guarantee.

---

## 5. Main Concepts

The application is built around five core concepts:

### Plan

A seating plan containing:

* Table configuration
* Guests
* Seating assignments
* Guest constraints
* Layout information

### Guest

A person participating in the event.

A guest has:

* Name
* Optional metadata
* Seating relationships with other guests

### Table

A physical table in the seating plan.

A table has:

* Shape
* Capacity
* Position
* Assigned guests

### Constraint

A relationship between guests that affects automatic seating generation.

Examples:

* Guest A must sit with Guest B.
* Guest A should preferably sit with Guest B.
* Guest A should not sit with Guest B.

### Seating Plan

The visual arrangement of tables and guests.

It can be:

* Generated automatically.
* Modified manually.
* Saved.
* Printed/exported.

---

## 6. Automatic Seating

Automatic seating is an important feature but should not control the application.

The generated result must always be manually editable.

The seating engine should consider:

1. Mandatory constraints.
2. Table capacity.
3. Guest relationships.
4. Preferences.
5. Overall seating quality.

The engine should provide enough information to explain problematic or unsatisfied constraints.

---

## 7. Scope

The initial MVP focuses exclusively on seating plans.

### In scope

* Table configuration.
* Guest management.
* Guest constraints.
* Visual seating editor.
* Drag & drop.
* Automatic seating generation.
* Manual adjustments.
* Local persistence.
* Automatic local persistence in IndexedDB.
* Complete JSON project import/export.
* Printing/exporting the seating plan.

### Out of scope

The application is not intended to become a complete wedding-management platform.

Do not add features such as:

* Invitations.
* RSVP management.
* Wedding budgeting.
* Vendor management.
* Wedding websites.
* Guest messaging.
* Catering management.
* Timeline management.

These may be considered separately in the future but are not part of the MVP.

---

## 8. Guiding Principle

> **Make seating planning easy, visual and fast.**

Every technical or product decision should support this principle.
