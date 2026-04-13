# Actuator Sizing Motor Database Expansion Design

## Goal

Expand the built-in motor database used by the actuator sizing calculator so it can hold a much broader set of 200 W to
1000 W motors and preserve richer datasheet metadata, while leaving all existing calculator behavior unchanged.

This pass focuses on data quality and future reusability:

- Add roughly 30-50 built-in motors in the 200 W to 1000 W range.
- Accept AC/DC servos, BLDC motors, and steppers when they have reputable published datasheets.
- Store the source datasheets in-repo under `docs/motors/` so the raw references remain available for later
  reprocessing.
- Extend the schema to preserve additional datasheet characteristics without making the current calculator depend on
  them yet.

## Current Context

The current implementation in `src/components/calculator/actuator-sizing/motors.ts` contains a compact built-in list of
10 motors. The motor schema in `src/components/calculator/actuator-sizing/types.ts` already supports the fields the
calculator actively uses:

- speed (`ratedRPM`, `maxRPM`)
- torque (`ratedTorque_Nm`, `peakTorque_Nm`)
- power (`continuousPower_W`)
- inertia (`inertia_kgm2`)
- a few optional metadata fields (`mass_kg`, `frameSize_mm`, `hasBrake`, `thermalTimeConstant_s`, `cost_usd`)

The evaluation logic assumes these fields exist and does not use any richer datasheet structure today.

## Constraints

- Do not change calculator functionality, scoring, or UI behavior in this task.
- Keep all current evaluation/runtime code working with the expanded database.
- Preserve backward compatibility for user motors stored in localStorage.
- Prefer structured datasheet metadata over freeform notes when possible.
- Store source datasheets in the repository under `docs/motors/`.
- Prices are optional and should only be included when a reasonable average or representative market price can be
  supported.

## Options Considered

### Option A - Keep current schema, only add more motors

Pros:

- Lowest implementation risk
- Fastest dataset expansion

Cons:

- Loses most useful datasheet information
- Forces future reprocessing from scratch
- Cannot preserve torque/speed curves or physical dimensions well

### Option B - Recommended: Extend schema with optional metadata only

Pros:

- Preserves current functionality unchanged
- Captures richer datasheet data now
- Keeps migration and validation simple
- Supports future UI/engineering features without re-ingesting sources

Cons:

- `ServoMotor` becomes a broader record name than its contents
- Some optional fields may be sparse across vendors

### Option C - Full normalized catalog model

Pros:

- Best long-term data architecture
- Strong separation between raw catalog data and calculation-ready values

Cons:

- Over-scoped for this task
- Requires broader refactors and likely UI follow-up
- Increases risk of breaking current calculator behavior

## Chosen Approach

Use Option B.

We will keep the current calculator-facing record shape intact and add optional fields around it. The existing required
fields remain the canonical inputs for actuator-sizing evaluation, while the new fields store richer source data for
later use.

## Data Model Design

### Keep existing required calculation fields

These remain required and continue to drive all evaluation logic:

- `id`
- `name`
- `ratedRPM`
- `maxRPM`
- `ratedTorque_Nm`
- `peakTorque_Nm`
- `continuousPower_W`
- `inertia_kgm2`
- `source`

### Add optional metadata fields

The `ServoMotor` interface will be extended with optional fields like:

- Classification: `motorType`, `series`, `model`, `frameStandard`
- Electrical: `voltage_V`, `current_A`, `phases`, `poleCount`, `resistance_ohm`, `inductance_mH`
- Mechanical: `dimensions_mm`, `length_mm`, `flange_mm`, `shaftDiameter_mm`, `shaftLength_mm`, `mass_kg`, `frameSize_mm`
- Features: `hasBrake`, `encoder`, `protectionRating`, `insulationClass`, `cooling`, `thermalTimeConstant_s`
- Commercial/source: `price_usd`, `datasheetUrl`, `productUrl`, `sourceNote`
- Rich performance data: `torqueCurve`, `speedTorqueCurve`
- Misc: `notes`

### Curve representation

Curve data will be stored as arrays of points rather than formulas. The initial shape should be simple and JSON-safe,
for example:

```ts
type TorqueCurvePoint = {
  rpm: number;
  torque_Nm: number;
};
```

And optionally:

```ts
type SpeedTorqueCurvePoint = {
  rpm: number;
  continuousTorque_Nm?: number;
  peakTorque_Nm?: number;
};
```

This preserves discrete values from vendor charts without forcing interpolation logic into the calculator yet.

### Naming note

The interface name `ServoMotor` will remain unchanged in this task to avoid touching calculator functionality. Although
the dataset will include steppers and BLDC motors, the type name is treated as a compatibility layer for now.

## Source Storage Design

Datasheets will be stored in-repo under `docs/motors/`.

Proposed structure:

```text
docs/motors/
  <manufacturer>/
    <family-or-model>/
      datasheet.pdf
      product-page.url
      notes.md (optional, only when needed)
```

Guidelines:

- Use stable ASCII directory names.
- Group by manufacturer first, then family/model, so later reprocessing is predictable.
- Prefer original vendor PDFs when available.
- If a vendor only exposes an HTML page, store the product URL in the motor entry and add a `.url` file only if useful
  for later manual review.
- The motor database entry should point at the vendored datasheet path or vendor URL through metadata fields.

## Catalog Curation Rules

Include motors only when they meet all of the following:

- Continuous/rated power between 200 W and 1000 W inclusive
- Published by a reputable vendor or reputable marketplace seller with a usable datasheet
- Enough data exists to populate the current required calculator fields reliably
- Model identity is specific enough to be traced back to a stored datasheet or product page

Target mix:

- Industrial AC servo families
- Integrated servo/closed-loop servo packages
- BLDC servo motors with documented ratings
- Closed-loop stepper systems and stepper motors with usable speed/torque data

Avoid:

- Listings with no real datasheet
- Specs that look copied, contradictory, or physically implausible
- Models whose power/rated torque/rated speed relationship is obviously inconsistent without explanation

## Implementation Plan Boundaries

This design allows implementation to cover:

1. Extend types in `src/components/calculator/actuator-sizing/types.ts`
2. Expand built-in dataset in `src/components/calculator/actuator-sizing/motors.ts`
3. Keep localStorage validation backward-compatible
4. Add datasheet files under `docs/motors/`

This design explicitly does not include:

- Using torque curves in calculations
- Changing result ranking or fit scoring
- Adding new UI columns or motor detail panels
- Adding import/export tooling for the motor catalog
- Renaming `ServoMotor` across the app

## Error Handling and Data Integrity

- User-defined motors from localStorage remain valid as long as they include the currently required fields; all new
  metadata fields stay optional.
- Built-in entries should favor omission over guessed values. If a value is unclear, leave it undefined rather than
  approximating it without support.
- Price remains best-effort and optional.
- If torque curves are only visible in charts and not readily extractable with confidence, omit them for that model
  instead of inventing sampled values.

## Testing Strategy

Because functionality must remain unchanged, verification should focus on compatibility and data integrity:

- Type-check the expanded schema and dataset with `pnpm build`
- Ensure no existing actuator-sizing tests fail
- Sanity-check that motor evaluation still works with the expanded built-in array
- Confirm localStorage validation still accepts old user-motor objects and does not require new metadata fields

## Expected Outcome

After implementation:

- The calculator continues to behave exactly as it does today
- The built-in database grows from 10 motors to a curated catalog of roughly 30-50 motors
- The codebase stores richer source-backed motor metadata for future features
- The original datasheet sources live in `docs/motors/` for later reprocessing or normalization work
