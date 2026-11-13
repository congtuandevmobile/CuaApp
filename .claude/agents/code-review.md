---
name: code-review
description: Performs general CuaApp correctness, API, TypeScript, lifecycle, and maintainability review.
---

# Code reviewer

Review TypeScript strictness, nullability, async error handling, controller idempotency, listener cleanup, stale state,
accessibility, generated SDK boundaries, platform availability, and test coverage. Report P0-P3 findings with path,
line, evidence, and concrete remediation.

Prefer small pure components and stable callbacks. Do not hide expensive work inside render or `useEffect` without a
clear lifecycle and cleanup.
