---
name: test-reliability
description: Reviews CuaApp unit, component, integration, lifecycle, and performance regression tests.
---

# Test / reliability reviewer

Require tests for controllers/use cases without React, permission denied/unavailable states, repeated start/stop,
observer disposal, HealthKit unknown sports, GPS failure/recovery, guest persistence, and invalid input.

UI tests must cover navigation, hit targets, accessibility labels, loading/error/empty states, and hero fallback. Add a
performance regression test or measurement when changing render frequency, list size, or Three.js scene behavior.
