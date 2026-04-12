# Stewart Platform Actuator Constraints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add min/max extension settings for the Stewart platform's linear actuators, with hard constraints that prevent any leg from over-extending or over-compressing, and visual color feedback on violating legs.

**Architecture:** Constraint logic lives in `Scene.svelte`, which already owns all kinematics. When a requested pose would violate any leg's limits, the last valid pose is kept. Per-leg status (ok / over-extended / over-compressed) flows down into `Leg.svelte` for color coding. `index.svelte` exposes two sliders to the user.

**Tech Stack:** Svelte 4, Threlte (@threlte/core), Three.js, svelte-tweakpane-ui

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/calculator/stewart-platform/Leg.svelte` | Add `status`, `actuatorMin`, `actuatorMax` props; update housing height/position; color-code rod |
| `src/components/calculator/stewart-platform/Scene.svelte` | Add `actuatorMin`, `actuatorMax` props; add constraint check + last-valid state; compute `legStatuses` |
| `src/components/calculator/stewart-platform/index.svelte` | Uncomment "Actuator Range" folder; add two sliders + reset button; pass props to Scene |

---

## Task 1: Update `Leg.svelte` — proportional housing and status color

**Files:**
- Modify: `src/components/calculator/stewart-platform/Leg.svelte`

- [ ] **Step 1: Replace Leg.svelte with the new version**

Replace the entire file content:

```svelte
<script lang="ts">
  import { T } from '@threlte/core';
  import { Euler, Quaternion, Vector3, type EulerOrder } from 'three';

  export let basePoint = new Vector3(0, 0, 0);
  export let platformPoint = new Vector3(0, 0, 0);
  export let status: 'ok' | 'over-extended' | 'over-compressed' = 'ok';
  export let actuatorMin = 0.35;

  let rotation: [x: number, y: number, z: number, order: EulerOrder] = [0, 0, 0, 'XYZ'];
  let positionBase: [number, number, number] = [0, 0, 0];
  let positionPiston: [number, number, number] = [0, 0, 0];

  $: length = basePoint.distanceTo(platformPoint) * 0.95;
  $: rodColor = status === 'over-extended' ? 'red' : status === 'over-compressed' ? 'orange' : 'grey';
  $: {
    const direction = new Vector3().subVectors(platformPoint, basePoint).normalize();
    const euler = new Euler();
    euler.setFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction));
    rotation = [euler.x, euler.y, euler.z, 'XYZ'] as [x: number, y: number, z: number, order: EulerOrder];
  }
  $: {
    const direction = new Vector3().subVectors(platformPoint, basePoint).normalize();
    positionBase = basePoint.clone().add(direction.multiplyScalar(actuatorMin / 2)).toArray();
  }
  $: {
    positionPiston = basePoint.clone().add(platformPoint).divideScalar(2).toArray();
  }
</script>

<T.Mesh position={positionBase} {rotation}>
  <T.CylinderGeometry args={[0.02, 0.02, actuatorMin]} />
  <T.MeshBasicMaterial color="black" />
</T.Mesh>

<T.Mesh position={positionPiston} {rotation}>
  <T.CylinderGeometry args={[0.01, 0.01, length]} />
  <T.MeshBasicMaterial color={rodColor} />
</T.Mesh>
```

- [ ] **Step 2: Run type check**

```bash
pnpm astro check
```

Expected: no errors related to Leg.svelte.

- [ ] **Step 3: Commit**

```bash
git add src/components/calculator/stewart-platform/Leg.svelte
git commit -m "feat: proportional housing and status color in Leg"
```

---

## Task 2: Update `Scene.svelte` — constraint logic and leg statuses

**Files:**
- Modify: `src/components/calculator/stewart-platform/Scene.svelte`

- [ ] **Step 1: Add new props and state after existing props**

In the `<script>` block, after `export let centerOfRotationRelative: Vector3;`, add:

```ts
export let actuatorMin = 0.35;
export let actuatorMax = 0.6;

type LegStatus = 'ok' | 'over-extended' | 'over-compressed';

let lastValidTransformedPointsP: Vector3[] = [];
let lastValidTransformedCor: Vector3 = new Vector3();
let legStatuses: LegStatus[] = Array(6).fill('ok');
```

- [ ] **Step 2: Reset last-valid when geometry params change**

In the existing reactive block that computes `initialPointsB` and `initialPointsP` (the block starting with `const alphaPh = alphaP / 2;`), add this line at the very end of the block:

```ts
lastValidTransformedPointsP = [];
```

This ensures that whenever the platform geometry changes (baseDiameter, platformDiameter, etc.), the last-valid state resets and the neutral pose is always accepted.

- [ ] **Step 3: Replace the transformedPointsP reactive block**

Replace the entire `$: { const thetaX = ... }` block (the one that computes `transformedPointsP` and `transformedCor`) with:

```ts
$: {
  const thetaX = (platformRotation.x * Math.PI) / 180;
  const thetaY = (platformRotation.y * Math.PI) / 180;
  const thetaZ = (platformRotation.z * Math.PI) / 180;
  const dX = platformTranslation.x;
  const dY = platformTranslation.y;
  const dZ = platformTranslation.z;
  const qTheta = new Matrix3(1, 0, 0, 0, Math.cos(thetaX), -Math.sin(thetaX), 0, Math.sin(thetaX), Math.cos(thetaX))
    .multiply(new Matrix3(Math.cos(thetaY), 0, Math.sin(thetaY), 0, 1, 0, -Math.sin(thetaY), 0, Math.cos(thetaY)))
    .multiply(new Matrix3(Math.cos(thetaZ), -Math.sin(thetaZ), 0, Math.sin(thetaZ), Math.cos(thetaZ), 0, 0, 0, 1));
  const a = qTheta.toArray();
  a[0] -= 1;
  a[4] -= 1;
  a[8] -= 1;
  const qThetaX = new Vector3(a[0], a[1], a[2]);
  const qThetaY = new Vector3(a[3], a[4], a[5]);
  const qThetaZ = new Vector3(a[6], a[7], a[8]);

  const candidatePointsP = initialPointsP.map((point) => {
    const pointTranslated = point.clone().add(new Vector3(dX, dY, dZ));
    const dM = point.clone().sub(centerOfRotation);
    const dTheta = new Vector3(dM.dot(qThetaX), dM.dot(qThetaY), dM.dot(qThetaZ));
    return pointTranslated.add(dTheta);
  });
  const candidateCor = centerOfRotation.clone().add(new Vector3(dX, dY, dZ));

  const candidateStatuses: LegStatus[] = initialPointsB.map((b, i) => {
    const l = b.distanceTo(candidatePointsP[i]);
    if (l > actuatorMax) return 'over-extended';
    if (l < actuatorMin) return 'over-compressed';
    return 'ok';
  });

  const valid =
    lastValidTransformedPointsP.length === 0 ||
    candidateStatuses.every((s) => s === 'ok');

  if (valid) {
    transformedPointsP = candidatePointsP;
    transformedCor = candidateCor;
    lastValidTransformedPointsP = candidatePointsP;
    lastValidTransformedCor = candidateCor;
  } else {
    transformedPointsP = lastValidTransformedPointsP;
    transformedCor = lastValidTransformedCor;
  }

  legStatuses = candidateStatuses;
}
```

- [ ] **Step 4: Pass status and actuatorMin to each Leg in the template**

Replace:

```svelte
{#each initialPointsB as point, i}
  <Leg basePoint={point} platformPoint={transformedPointsP[i]} />
{/each}
```

With:

```svelte
{#each initialPointsB as point, i}
  <Leg basePoint={point} platformPoint={transformedPointsP[i]} status={legStatuses[i]} {actuatorMin} />
{/each}
```

- [ ] **Step 5: Run type check**

```bash
pnpm astro check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/calculator/stewart-platform/Scene.svelte
git commit -m "feat: actuator constraint logic and leg statuses in Scene"
```

---

## Task 3: Update `index.svelte` — actuator UI controls

**Files:**
- Modify: `src/components/calculator/stewart-platform/index.svelte`

- [ ] **Step 1: Add actuatorMin and actuatorMax state variables**

After `let cor = { x: 0, y: 0, z: 0 };`, add:

```ts
let actuatorMin = 0.35;
let actuatorMax = 0.6;
```

- [ ] **Step 2: Add reset function**

Inside `resetParams`, reset the actuator values too. Replace:

```ts
const resetParams = () => {
  baseDiameter = 0.8;
  platformDiameter = 0.4;
  platformHeight = 0.5;
  alphaP = 10;
  alphaB = 110;
  cor = { x: 0, y: 0, z: 0 };
};
```

With:

```ts
const resetParams = () => {
  baseDiameter = 0.8;
  platformDiameter = 0.4;
  platformHeight = 0.5;
  alphaP = 10;
  alphaB = 110;
  cor = { x: 0, y: 0, z: 0 };
  actuatorMin = 0.35;
  actuatorMax = 0.6;
};
```

- [ ] **Step 3: Add a resetActuator function**

After `resetParams`, add:

```ts
const resetActuator = () => {
  actuatorMin = 0.35;
  actuatorMax = 0.6;
};
```

- [ ] **Step 4: Replace the commented-out Actuator Range folder**

Replace this block:

```svelte
<!-- 
<Folder title="Actuator Range">
  <IntervalSlider bind:value={acctuatorInterval} {...configLinear} min={0} max={2} />
</Folder>
-->
```

With:

```svelte
<Folder title="Actuator Range">
  <Slider bind:value={actuatorMin} label="Min Extension" {...configLinear} min={0.1} max={actuatorMax} />
  <Slider bind:value={actuatorMax} label="Max Extension" {...configLinear} min={actuatorMin} max={2} />
  <Button on:click={resetActuator} label="Reset Actuator" title="Reset" />
</Folder>
```

- [ ] **Step 5: Pass actuatorMin and actuatorMax to Scene**

Replace:

```svelte
<Scene
  {baseDiameter}
  {platformDiameter}
  {platformHeight}
  {alphaB}
  {alphaP}
  {platformTranslation}
  {platformRotation}
  {centerOfRotationRelative}
/>
```

With:

```svelte
<Scene
  {baseDiameter}
  {platformDiameter}
  {platformHeight}
  {alphaB}
  {alphaP}
  {platformTranslation}
  {platformRotation}
  {centerOfRotationRelative}
  {actuatorMin}
  {actuatorMax}
/>
```

- [ ] **Step 6: Remove unused acctuatorInterval variable (it was commented out)**

The variable `// let acctuatorInterval: [number, number] = [0.35, 0.6];` is already commented out — leave it as-is or remove the comment line. No action needed.

- [ ] **Step 7: Run type check**

```bash
pnpm astro check
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/calculator/stewart-platform/index.svelte
git commit -m "feat: actuator min/max sliders in control panel"
```
