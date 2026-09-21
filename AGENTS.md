# Project Instructions

## Project

This is a web application for creating wedding seating plans.

## Tech Stack

* Next.js
* TypeScript
* Tailwind CSS
* IndexedDB for browser persistence
* GitHub Pages for static hosting

## Architecture & Documentation

* Follow the architecture defined in `docs/`.
* Before implementing a feature, identify and read only the documentation directly relevant to that feature.
* Do not read unrelated documentation.
* Treat existing project conventions and documentation as the source of truth.
* Do not introduce architectural changes unless the task explicitly requires them.

## Development Rules

* Keep the application simple and mobile-first.
* Prefer Server Components when appropriate.
* Keep components small, focused, and reusable.
* Do not introduce dependencies without a clear reason.
* Avoid unrelated refactoring or improvements while implementing a task.
* Preserve existing behavior unless the requested change requires modifying it.

## Context Efficiency

* Start by identifying the smallest set of files relevant to the task.
* Read only what is necessary to understand and implement the requested change.
* Prefer targeted searches (`grep`, `glob`, etc.) over reading entire files when possible.
* Do not reread files that have already been inspected unless they may have changed or their previous contents are no longer sufficient.
* Do not inspect unrelated files or documentation "just in case".
* When the task is already well understood, implement it rather than continuing repository exploration.
* Before using `bash`, consider whether a more targeted tool is sufficient.
* Group related shell operations when practical.
* Avoid repeated verification of the same information.
* Keep the active context focused on the current task.

## Implementation Workflow

For each task:

1. Understand the requested change.
2. Identify the relevant documentation and files.
3. Inspect only the necessary context.
4. Implement the smallest appropriate change.
5. Run targeted checks relevant to the change.
6. Run lint and typecheck before considering the task complete.
7. Review the final diff and ensure there are no unrelated changes.

## Task Management

* Do not create or update TODO items for trivial tasks.
* Use TODOs only when the task contains multiple meaningful implementation steps.
* Keep TODOs focused on the current task.
* Remove or complete TODO items when the task is finished.

## Completion Criteria

A task is complete when:

* The requested behavior is implemented.
* The implementation follows the existing architecture and conventions.
* No unnecessary dependencies or unrelated changes were introduced.
* Relevant checks pass.
* The final diff contains only changes related to the task.
