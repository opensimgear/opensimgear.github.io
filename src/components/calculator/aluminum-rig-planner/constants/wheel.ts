/**
 * Wheel module visual constants.
 * Dimensions & materials for the 3D steering wheel preview.
 */

// ── Colors ───────────────────────────────────────────────────────────────────

/** Outer rim torus color. */
export const WHEEL_RIM_COLOR = '#111318';
/** Wheel base box color. */
export const WHEEL_BASE_COLOR = '#17191d';
/** Hub disc and spoke color. */
export const WHEEL_HUB_COLOR = '#1c2026';
/** Metal connector shaft color. */
export const WHEEL_SHAFT_COLOR = '#8f98a3';

// ── Materials ────────────────────────────────────────────────────────────────

/** PBR values for plastic wheel parts (rim, hub, spokes). */
export const WHEEL_PLASTIC_MATERIAL = {
  metalness: 0.08,
  roughness: 0.78,
} as const;

/** PBR values for metal wheel parts (connector shaft). */
export const WHEEL_METAL_MATERIAL = {
  metalness: 0.82,
  roughness: 0.24,
} as const;

/** Custom roughness for the hub disc surface. */
export const WHEEL_HUB_ROUGHNESS = 0.58;
/** Custom roughness for the wheel base box. */
export const WHEEL_BASE_ROUGHNESS = 0.5;

// ── Geometry ─────────────────────────────────────────────────────────────────

/** Number of radial segments for cylinder shapes (hub, connector). */
export const WHEEL_CYLINDER_SEGMENTS = 24;
/** Number of radial segments for the torus rim cross-section. */
export const WHEEL_TORUS_RADIAL_SEGMENTS = 18;
/** Number of tubular segments around the torus ring. */
export const WHEEL_TORUS_TUBULAR_SEGMENTS = 36;
/** Cross-section radius of the rim torus tube (mm). */
export const WHEEL_TUBE_RADIUS_MM = 16;
/** Edge length of the wheel base box (mm). */
export const WHEEL_BASE_EDGE_MM = 115;
/** Distance from wheel center to the front face of the base box (mm). */
export const WHEEL_BASE_FRONT_FACE_OFFSET_MM = 100;
/** Radius of the cylindrical connector shaft (mm). */
export const WHEEL_CONNECTOR_RADIUS_MM = 14;
/** Radius of the central hub disc (mm). */
export const WHEEL_HUB_RADIUS_MM = 24;
/** Thickness of the hub disc (mm). */
export const WHEEL_HUB_THICKNESS_MM = 9;
/** Width of each spoke (mm). */
export const WHEEL_SPOKE_WIDTH_MM = 6;
/** Thickness of each spoke (mm). */
export const WHEEL_SPOKE_THICKNESS_MM = 20;
/** Scale factor for spoke length beyond the hub-to-rim span. */
export const WHEEL_SPOKE_LENGTH_SCALE = 1.05;
/** Corner rounding radius on spokes (mm). */
export const WHEEL_SPOKE_CORNER_RADIUS_MM = 0.75;
/** Angular offsets (deg) of the three spokes from 12-o'clock. */
export const WHEEL_SPOKE_ANGLE_OFFSETS_DEG = [180, -90, 0] as const;
/** Identifiers for each spoke. */
export const WHEEL_SPOKE_IDS = ['left', 'center', 'right'] as const;
/** Multiplier to inset hub radius when available space is tight. */
export const WHEEL_HUB_RADIUS_INSET_FACTOR = 1.75;
/** Factor for computing the spoke outer-radius extension past the rim inner edge. */
export const WHEEL_SPOKE_OUTER_RADIUS_FACTOR = 0.4;
/** Multiplier for connector visual bounding-box size relative to its radius. */
export const WHEEL_CONNECTOR_BBOX_FACTOR = 5;
/** Corner radius of the wheel base box (mm). */
export const WHEEL_BASE_CORNER_RADIUS_MM = 10;
/** Corner segments for the wheel base box. */
export const WHEEL_BASE_CORNER_SEGMENTS = 6;
/** Corner segments for each spoke. */
export const WHEEL_SPOKE_CORNER_SEGMENTS = 2;
