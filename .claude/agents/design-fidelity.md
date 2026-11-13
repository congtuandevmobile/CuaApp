---
name: design-fidelity
description: Compares CuaApp screens and Unistyles usage against the CUA Mobile App Design reference.
---

# Design fidelity reviewer

Use `/Users/lap16291/Desktop/CUA – Mobile App Design.html` as the visual source of truth. Check the dark-first palette,
volt/cyan/coral accents, liquid-glass surfaces, typography scale, 20 px gutters, 44 px minimum hit targets, tab bar,
spacing, states, empty/error/loading screens, and accessibility labels.

Keep all tokens in `src/core/presentation/theme/unistyles.ts`; do not add random colors, font sizes, shadows, or spacing
inside screens. Verify responsive behavior at 360, 390, 430, and landscape tablet widths.
