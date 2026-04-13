# Actuator Sizing Velocity-Only Motion Profile - Design Spec

_2026-04-13_

## Goal

Simplify the actuator sizing motion-profile visualization so it shows only the trapezoidal or triangular velocity
waveform. Remove the position chart and all chart-header text while keeping the phase dividers and inline phase labels
that make the diagram readable.

---

## Approach

Reduce the current two-chart card to a single compact SVG waveform:

- keep the velocity trace
- keep phase dividers
- keep inline `Accel`, `Const`, `Decel`, and `Dwell` labels when there is enough space
- remove the position trace entirely
- remove `Motion Profile` header text
- remove the `Trapezoidal` / `Triangular` badge text
- remove the `Velocity` axis label text

The result should read as a compact engineering cue inside the `Calculated` pane rather than a labeled mini-dashboard.

---

## Component Changes

### `src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte`

Turn the component into a single-plot presentational SVG.

Expected structure:

- no header row
- no profile label prop
- one SVG sized for a single chart height
- one velocity path
- one set of phase divider lines
- one set of inline phase labels using the existing label-visibility logic

This component should still accept precomputed diagram data from the parent and should not compute motion geometry
internally.

---

## Geometry Changes

### `src/components/calculator/actuator-sizing/motion-profile-diagram.ts`

Simplify the helper output so it only supports the single velocity chart.

Keep:

- `phaseBoundaries`
- `segments`
- `labelVisibility`
- `velocityPath`

Remove:

- `positionPath`
- the position-curve helper math and related formatting that only existed for the removed lower chart

The helper should continue to support:

- trapezoidal profiles
- triangular fallback profiles
- optional dwell tail
- narrow-segment label suppression

---

## Parent Integration

### `src/components/calculator/actuator-sizing/index.svelte`

Keep the integration point in the `Calculated` pane, but simplify the props passed into the component:

- continue computing `profileDiagram` in the parent
- stop computing or passing a separate profile-label string
- keep placement compact and adjacent to the calculated monitors

No broader layout change is needed.

---

## Testing Strategy

Follow TDD for the simplification.

### Helper tests

Update the geometry tests so they:

- no longer assert `positionPath`
- still verify trapezoidal and triangular `velocityPath`
- still verify dwell/no-dwell behavior
- still verify label-visibility behavior

### Render tests

Update render tests so they verify:

- the component no longer renders `Motion Profile`
- the component no longer renders `Trapezoidal` or `Triangular` text badges
- the component no longer renders `Velocity`
- the component still renders the SVG waveform and phase labels allowed by `labelVisibility`
- the calculator still renders the integrated waveform in the `Calculated` pane

### Verification

Run at minimum:

- `pnpm test src/tests/actuator-sizing/motion-profile-diagram.test.ts src/tests/actuator-sizing/motion-profile-diagram-render.test.ts`
- `pnpm build`

---

## Out of Scope

- changing the phase-label wording
- changing the diagram placement in the calculator
- adding new chart annotations or hover states
- reworking the calculator layout around the diagram
