# Motor Scaling Calculator — Design Spec

_2026-04-12_

> Historical note: this spec describes removed `motor-scaling` calculator. Current calculator lives in
> `src/components/calculator/actuator-sizing/`.

## Goal

Redesign the motor-scaling widget to match the portal UI (Tweakpane panel + styled results, consistent with the Stewart
platform calculator) and extend its scope to a full motor selection tool: given axial speed/force requirements, show
which motors from a curated + user-extensible database satisfy those requirements, with per-motor headroom analysis and
optimal drive ratio calculation.

---

## Layout

Split-panel widget matching the Stewart platform outer style (border, rounded corners, `not-content` class):

- **Left**: Tweakpane `<Pane position="inline">` — requirements, ballscrew, drive ratio, load inertia inputs
- **Right**: Svelte-native scrollable panel — one `MotorCard` per motor, "Add custom motor" form at the bottom

On narrow screens the two panels stack vertically (Tweakpane on top, cards below).

---

## Tweakpane Folders (left panel)

### Requirements

| Parameter     | Input           | Unit           |
| ------------- | --------------- | -------------- |
| Axial Speed   | Slider / number | mm/s           |
| Axial Force   | Slider / number | N              |
| Safety Factor | Slider          | % (default 20) |

### Ballscrew

| Parameter                 | Input                                                          |
| ------------------------- | -------------------------------------------------------------- |
| Pitch                     | Select: 1605, 1610, 2005, 2010, 2505, 2510, 3205, 3210, Custom |
| Efficiency                | Slider, % (default 90)                                         |
| (Custom only) Pitch value | Number, mm                                                     |

### Drive Ratio

| Parameter | Input                               |
| --------- | ----------------------------------- |
| Mode      | Button toggle: Auto / Fixed         |
| Ratio     | Slider (visible in Fixed mode only) |

### Load Inertia

| Parameter  | Input  | Unit |
| ---------- | ------ | ---- |
| Screw mass | Number | kg   |
| Load mass  | Number | kg   |

---

## Calculations

All calculations use values **after** applying the safety factor multiplier: `required = raw × (1 + safetyFactor/100)`.

```
requiredRPM      = (axialSpeed_mm_s × 60 × driveRatio) / ballscrewPitch_mm
requiredTorque   = (axialForce_N × ballscrewPitch_mm) / (1000 × 2π × driveRatio × efficiency)
requiredPower_W  = requiredTorque_Nm × (requiredRPM × 2π / 60)
reflectedInertia = (screwMass + loadMass) × (pitch_m / (2π × driveRatio))²
```

### Auto drive ratio

Binary search over `[0.5, 10]` for the ratio that minimises `max(rpmDeficit%, torqueDeficit%)`, where a deficit is
negative headroom. This is solved independently per motor so each card shows its own optimal ratio.

### Per-motor headroom

```
rpmMargin%     = (motor.ratedRPM    - requiredRPM)    / requiredRPM    × 100
torqueMargin%  = (motor.ratedTorque - requiredTorque) / requiredTorque × 100
powerMargin%   = (motor.continuousPower - requiredPower) / requiredPower × 100
inertiaRatio   = reflectedInertia / motor.inertia_kgm2   (shown as x.x:1)
```

---

## Motor Card (right panel)

Each card shows:

- Motor name + pass/fail/warning badge
- Headroom bar for RPM, Torque, Power (filled = rated, tick = required)
- Inertia ratio (flagged if > 10:1)
- Optimal drive ratio (Auto mode) or applied ratio (Fixed mode)

**Card border color (evaluated in priority order):**

- Any margin < 0 → red + ✗
- All margins ≥ 0 but any margin < 20% → amber + ⚠
- All margins ≥ 20% → green + ✓

**Headroom bar color per axis:**

- > 20% → green
- 0–20% → amber
- < 0% → red

---

## Motor Database (`motors.ts`)

```ts
interface Motor {
  id: string;
  name: string;
  ratedRPM: number;
  ratedTorque_Nm: number;
  peakTorque_Nm: number;
  continuousPower_W: number;
  inertia_kgm2: number;
  source: 'builtin' | 'user';
}
```

Builtin list covers common sim racing actuator motors (NEMA 23/34 steppers, Leadshine/JMC/Delta AC servos —
representative specs). User motors persist in `localStorage` under key `motor-scaling-user-motors`.

---

## Add Custom Motor

Inline form below the motor cards (no modal). Fields: name, rated RPM, rated torque (Nm), peak torque (Nm), continuous
power (W), rotor inertia (kg·m²). Save appends to the reactive user motor list and writes to `localStorage`. Each user
motor card has a delete button.

---

## URL State Persistence

Same pattern as the Stewart platform: encode state as base64 JSON in query param `ms`. State includes: axialSpeed,
axialForce, safetyFactor, ballscrewKey, ballscrewCustomPitch, efficiency, driveRatioMode, driveRatioFixed. Does not
include motor DB (too large; user motors in localStorage).

---

## File Structure

```
src/components/calculator/motor-scaling/
  index.svelte        — main widget: layout, state, URL persistence
  MotorCard.svelte    — single motor card component
  motors.ts           — builtin motor DB + Motor type
  calculations.ts     — pure functions: RPM, torque, power, inertia, binary search
```

The existing `index.svelte` is replaced entirely.

---

## What Is Not In Scope

- Motor power curve / torque-speed curve rendering
- Thermal simulation / duty cycle calculation
- Integration with Stewart platform calculator (copy-paste of values is sufficient for now)
