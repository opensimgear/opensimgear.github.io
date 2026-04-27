/**
 * Shared math utilities for the aluminum rig planner.
 * Centralizes common numeric helpers to avoid duplication across modules.
 */

/** Conversion factor from millimeters to Three.js meters (scene units). */
export const MM_TO_METERS = 0.001;

/** Conversion factor from meters (scene units) back to millimeters. */
export const METERS_TO_MM = 1000;

/** Small value used to avoid division-by-zero and floating-point edge cases. */
export const EPSILON = 0.000001;

/** Convert millimeters to scene-unit meters. */
export function mm(value: number) {
  return value * MM_TO_METERS;
}

/** Convert scene-unit meters back to whole millimeters. */
export function metersToRoundedMm(value: number) {
  return Math.round(value / MM_TO_METERS);
}

/** Convert degrees to radians. */
export function toRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Convert radians to degrees. */
export function toDeg(radians: number) {
  return (radians * 180) / Math.PI;
}

/** Clamp a value between min and max (inclusive). */
export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Round a value to the nearest step increment. */
export function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

// ---------------------------------------------------------------------------
// 3-component vector math (PosturePoint-compatible [x, y, z] tuples)
// ---------------------------------------------------------------------------

export type Vec3 = [number, number, number];

/** Add two vectors component-wise. */
export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Subtract vector b from a component-wise. */
export function vec3Subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** Scale a vector by a scalar. */
export function vec3Scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

/** Dot product of two vectors. */
export function vec3Dot(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Euclidean length of a vector. */
export function vec3Length(a: Vec3) {
  return Math.sqrt(vec3Dot(a, a));
}

/** Distance between two points. */
export function vec3Distance(a: Vec3, b: Vec3) {
  return vec3Length(vec3Subtract(a, b));
}

/** Normalize a vector; returns fallback when length ≈ 0. */
export function vec3Normalize(a: Vec3, fallback: Vec3 = [1, 0, 0]): Vec3 {
  const len = vec3Length(a);

  if (len < EPSILON) {
    return fallback;
  }

  return vec3Scale(a, 1 / len);
}

/** Rotate a vector in the XZ plane by angleRad (Y stays unchanged). */
export function rotateXZ(a: Vec3, angleRad: number): Vec3 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return [a[0] * cos - a[2] * sin, a[1], a[0] * sin + a[2] * cos];
}

// ---------------------------------------------------------------------------
// Angle measurement helpers
// ---------------------------------------------------------------------------

/** Angle (degrees) at vertex `joint` formed by segments joint→a and joint→b. */
export function angleAtJointDeg(a: Vec3, joint: Vec3, b: Vec3) {
  const jointToA = vec3Subtract(a, joint);
  const jointToB = vec3Subtract(b, joint);
  const denominator = vec3Length(jointToA) * vec3Length(jointToB);

  if (denominator < EPSILON) {
    return 0;
  }

  const cosine = clamp(vec3Dot(jointToA, jointToB) / denominator, -1, 1);

  return toDeg(Math.acos(cosine));
}

/** Angle (degrees) between two directed line segments. */
export function angleBetweenSegmentsDeg(aStart: Vec3, aEnd: Vec3, bStart: Vec3, bEnd: Vec3) {
  const a = vec3Subtract(aEnd, aStart);
  const b = vec3Subtract(bEnd, bStart);
  const denominator = vec3Length(a) * vec3Length(b);

  if (denominator < EPSILON) {
    return 0;
  }

  const cosine = clamp(vec3Dot(a, b) / denominator, -1, 1);

  return toDeg(Math.acos(cosine));
}

/**
 * How many degrees a joint angle has decreased from its original rest angle.
 * Returns 0 when the joint has opened further than the original.
 */
export function angleDecreaseFromOriginalDeg(originalAngleDeg: number, a: Vec3, joint: Vec3, b: Vec3) {
  return Math.max(0, originalAngleDeg - angleAtJointDeg(a, joint, b));
}

/** Compute the Y-centered offset used for symmetrically placing beams. */
export function centeredY(distanceFromLeftMm: number, totalWidthMm: number) {
  return mm(totalWidthMm / 2 - distanceFromLeftMm);
}
