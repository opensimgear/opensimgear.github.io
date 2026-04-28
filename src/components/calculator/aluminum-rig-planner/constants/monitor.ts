/**
 * Monitor module visual constants.
 * Dimensions & materials for the 3D monitor preview.
 */

import type { PlannerMonitorAspectRatio, PlannerMonitorCurvature } from '../types';

/** Conversion factor: 1 inch = 25.4 mm. */
export const INCH_TO_MM = 25.4;
/** Thickness of the monitor plate geometry (mm). */
export const MONITOR_PLATE_THICKNESS_MM = 3;
/** Bezel / screen surface color. */
export const MONITOR_COLOR = '#050505';
/** Corner rounding radius of each monitor segment (mm). */
export const MONITOR_CORNER_RADIUS_MM = 0;
/** Number of arc segments used to approximate a curved monitor. */
export const MONITOR_CURVED_SEGMENT_COUNT = 25;
/** Visual air gap between adjacent triple monitors (mm). */
export const MONITOR_TRIPLE_SCREEN_GAP_MM = 3;
/** Corner segments for the monitor rounded box. */
export const MONITOR_CORNER_SEGMENTS = 3;
/** PBR material for the monitor surface. */
export const MONITOR_MATERIAL = {
  metalness: 0.02,
  roughness: 0.7,
} as const;
/** Minimum FOV clamp when solving monitor distance from target FOV (deg). */
export const MONITOR_FOV_MIN_DEG = 1;
/** Maximum FOV clamp when solving monitor distance from target FOV (deg). */
export const MONITOR_FOV_MAX_DEG = 170;

/** Numeric aspect-ratio parts keyed by the human-readable label. */
export const ASPECT_RATIO_PARTS: Record<PlannerMonitorAspectRatio, readonly [number, number]> = {
  '16:10': [16, 10],
  '16:9': [16, 9],
  '21:9': [21, 9],
  '32:9': [32, 9],
  '4:3': [4, 3],
  '5:4': [5, 4],
  '3:2': [3, 2],
};

/** Map curvature labels to their radius in mm. */
export const CURVATURE_RADIUS_MM: Record<Exclude<PlannerMonitorCurvature, 'disabled'>, number> = {
  '5000r': 5000,
  '4000r': 4000,
  '3000r': 3000,
  '2500r': 2500,
  '2300r': 2300,
  '1800r': 1800,
  '1500r': 1500,
  '1000r': 1000,
  '800r': 800,
};
