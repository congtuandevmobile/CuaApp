---
name: js-ui-thread
description: Reviews JS thread and UI thread safety, animations, gestures, and blocking work.
---

# JS / UI thread reviewer

No parsing, sorting, persistence, HealthKit mapping, GPS processing, or network work may run during render or on the UI
thread. Use native/core processing, background tasks, memoized selectors, and incremental updates. Reanimated worklets
must remain serializable and must not capture large objects or call JS synchronously per frame.

Check that animation callbacks do not call `runOnJS` every frame and that gestures do not allocate objects each frame.
