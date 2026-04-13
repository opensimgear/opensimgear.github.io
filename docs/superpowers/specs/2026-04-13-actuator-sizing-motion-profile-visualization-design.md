# Actuator Sizing Motion Profile Visualization - Design Spec

_2026-04-13_

## Goal

Add a compact, inline motion-profile visualization to the actuator sizing calculator so users can immediately see the
generated trapezoidal or triangular move shape from the existing derived profile values. The visualization should
reinforce the current engineering workflow without introducing a heavier charting dependency or changing the
calculator's core math.

---

## Approach

Use two small stacked SVG charts rendered inside the actuator sizing component:

- **Top:** velocity vs time trapezoid, or triangular fallback when the stroke is too short to reach commanded peak
  velocity
- **Bottom:** position vs time curve over the same motion interval
- **Shared time axis:** accel, constant-velocity, decel, and optional dwell segments align vertically between both
  charts

This should live near the existing calculated outputs in `src/components/calculator/actuator-sizing/index.svelte` so it
reads as an interpretation of the current computed values rather than a separate analysis tool.

---

## Rendering Strategy

Implement the visualization as a lightweight SVG-based presentational component, likely
`src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte`.

Why SVG instead of a charting library:

- keeps bundle size low
- matches the existing hand-built calculator UI
- makes it easy to control phase dividers, labels, fills, and triangular fallback geometry
- avoids introducing a dependency for a single fixed-format diagram

The component receives already-derived profile values and converts them into normalized points for display. No new
motion-model calculations are introduced.

---

## Inputs

The diagram component should accept only the values it needs to render:

- `strokeLength` (displayed stroke extent)
- `profile.t_accel_s`
- `profile.t_const_s`
- `profile.t_decel_s`
- `profile.v_peak_m_s` or the already-converted display velocity value used by the calculator
- `profile.isTriangular`
- `dwellTime`

It may also accept precomputed totals if that simplifies the parent component:

- `motionTime = t_accel_s + t_const_s + t_decel_s`
- `totalTimeWithDwell = motionTime + dwellTime`

---

## Geometry

Both charts use a normalized horizontal axis from `0` to `totalTimeWithDwell`.

### Velocity Chart

- Starts at zero
- Ramps linearly during acceleration
- Holds flat during constant velocity when `t_const_s > 0`
- Ramps back to zero during deceleration
- Stays at zero during dwell

When `profile.isTriangular` is true, the constant segment collapses to zero width and the top chart becomes a triangle.

### Position Chart

- Starts at zero stroke
- Rises with a concave-up segment during acceleration
- Continues linearly during the constant-velocity segment
- Rises with a concave-down segment during deceleration
- Holds at full stroke during dwell

The position curve does not need to plot dense samples. A small set of normalized points or simple path segments is
sufficient, as long as the shape clearly communicates the motion phases.

---

## Visual Design

The styling should stay aligned with the current calculator's monochrome engineering-panel look:

- black or dark-gray primary strokes
- subtle gray fills under the curves
- one restrained accent color for the active motion traces or phase guides
- thin grid or frame lines only where they improve readability

Labels should be short and utilitarian:

- `Velocity`
- `Position`
- `Accel`
- `Const`
- `Decel`
- `Dwell` when dwell is non-zero

If horizontal space is tight, labels may be abbreviated or omitted rather than overlapping.

---

## Layout Placement

Place the diagram in the right-side calculation/results column of
`src/components/calculator/actuator-sizing/index.svelte`, close to the existing `Calculated` pane.

Recommended layout behavior:

- On larger widths, render the diagram as a compact card below or adjacent to the calculated monitors
- On smaller widths, allow it to stack naturally with the surrounding panels
- Keep the card compact enough that it supports quick interpretation instead of becoming a full-width reporting section

---

## Component Responsibilities

### `index.svelte`

- continues to own all calculator state and derived motion-profile values
- passes only the required display inputs into the diagram component
- decides placement in the existing calculator layout

### `MotionProfileDiagram.svelte`

- converts phase times into normalized axis positions
- builds the velocity trace and position trace geometry
- renders SVG frame, dividers, labels, and optional dwell region
- handles narrow-segment cases gracefully by suppressing labels that do not fit

If the geometry logic becomes non-trivial, extract it into a small pure utility module so it can be tested directly
without relying on SVG snapshots.

---

## Edge Cases

The visualization should explicitly handle:

- **Triangular moves:** no constant-velocity segment, top chart becomes triangular
- **Zero dwell:** no dwell label or dwell tail section
- **Very short constant segment:** divider may remain, but the `Const` label should hide if it would overlap neighboring
  labels
- **Very small or very large values:** all rendering remains normalized so the chart shape stays readable

The diagram is explanatory, so visual clarity takes priority over literal scale annotations beyond the shared time
segmentation.

---

## Testing Strategy

Follow TDD by testing the diagram geometry before wiring the UI:

- write a failing test for the geometry output of a standard trapezoidal profile
- verify a triangular profile collapses the constant segment correctly
- verify dwell extends the horizontal domain and adds a flat tail to both traces
- verify zero-dwell output omits that tail section

Prefer testing pure geometry data such as normalized breakpoints, phase boundaries, and rendered segment intent. Do not
rely on brittle full-SVG snapshots unless a small targeted rendering test is needed later.

---

## Out of Scope

- interactive chart controls or hover tooltips
- charting-library adoption
- additional motion models beyond the current trapezoidal/triangular profile logic
- replacing the existing numeric monitors
- exporting chart images or report views
