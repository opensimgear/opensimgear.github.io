# Stewart Platform — Linear Actuator Constraints

**Date:** 2026-04-12  
**Status:** Approved

## Overview

Add min/max extension settings for the Stewart platform's linear actuators, with hard constraints that prevent any leg from over-extending or over-compressing. Violating legs are color-coded for visual feedback.

## Scope

- All 6 legs share the same actuator min/max settings.
- When a requested platform pose would cause any leg to violate the constraints, the entire pose update is rejected (last valid pose is kept).
- Visual feedback: grey rod turns red (over-extended) or orange (over-compressed).
- Housing (black cylinder) length reflects `actuatorMin`, giving a proportionally accurate representation of the actuator body.

---

## Section 1: UI Controls (`index.svelte`)

- Uncomment and expand the existing "Actuator Range" folder.
- Replace the single `IntervalSlider` with two `Slider` controls:
  - **Min Extension** — default `0.35` m, displayed as mm via `configLinear`
  - **Max Extension** — default `0.60` m, displayed as mm via `configLinear`
- Add a **Reset Actuator** button that restores both defaults.
- Pass `actuatorMin` and `actuatorMax` as props to `Scene.svelte`.

---

## Section 2: Constraint Logic (`Scene.svelte`)

New props: `actuatorMin: number`, `actuatorMax: number`.

Three additions to the reactive logic:

1. **Leg length computation** — after computing `transformedPointsP`, calculate all 6 leg distances (`initialPointsB[i].distanceTo(transformedPointsP[i])`).

2. **Last-valid pose state** — store `lastValidTransformedPointsP: Vector3[]` and `lastValidTransformedCor: Vector3`, initialized to the neutral pose (`initialPointsP` / initial `centerOfRotation`). Before committing a new pose:
   - If all 6 leg lengths are within `[actuatorMin, actuatorMax]` → update last-valid and use the new pose.
   - If any leg fails → use last-valid pose instead.

3. **Per-leg status array** — derived from the committed pose's leg lengths:
   ```ts
   type LegStatus = 'ok' | 'over-extended' | 'over-compressed';
   ```
   Passed as a `statuses: LegStatus[]` array into each `<Leg>` via `statuses[i]`.

---

## Section 3: Visual Representation (`Leg.svelte`)

New props: `status: LegStatus`, `actuatorMin: number`, `actuatorMax: number`.

**Color coding (rod):**
| Status | Rod color |
|---|---|
| `ok` | `grey` |
| `over-extended` | `red` |
| `over-compressed` | `orange` |

Housing (black cylinder) always stays black.

**Proportional housing:**  
- Housing height = `actuatorMin` (in scene units).
- Housing center = `basePoint + direction × (actuatorMin / 2)` — anchored at `basePoint`.
- Rod length = full leg length (unchanged behavior).

---

## Data Flow

```
index.svelte
  actuatorMin, actuatorMax (sliders)
      ↓
Scene.svelte
  - computes transformedPointsP
  - checks leg lengths vs [actuatorMin, actuatorMax]
  - keeps lastValidTransformedPointsP if any leg violates
  - computes legStatuses[]
      ↓
Leg.svelte (×6)
  - status → rod color
  - actuatorMin → housing height/position
```

---

## Out of Scope

- Per-leg individual actuator settings.
- Partial pose application (iterative IK solver).
- Actuator speed or force modelling.
