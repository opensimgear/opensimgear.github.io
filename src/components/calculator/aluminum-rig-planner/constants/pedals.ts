/**
 * Pedal module visual constants.
 * Dimensions & materials for the 3D pedal preview rendering.
 */

/** Main pedal body color. */
export const PEDAL_COLOR = '#151a20';
/** Metal plate beneath the pedals color. */
export const PEDAL_PLATE_COLOR = '#404650';
/** PBR material for the plastic pedal body. */
export const PEDAL_PLASTIC_MATERIAL = {
  metalness: 0.1,
  roughness: 0.74,
} as const;
/** PBR material for the metal pedal plate. */
export const PEDAL_PLATE_MATERIAL = {
  metalness: 0.52,
  roughness: 0.4,
} as const;
/** Width of each pedal face (mm). */
export const PEDAL_WIDTH_MM = 60;
/** Thickness of each pedal body (mm). */
export const PEDAL_THICKNESS_MM = 8;
/** Thickness of the metal plate under all pedals (mm). */
export const PEDAL_PLATE_THICKNESS_MM = 3;
/** Corner rounding radius on pedals (mm). */
export const PEDAL_CORNER_RADIUS_MM = 5;
/** Corner rounding radius on the plate (mm). */
export const PEDAL_PLATE_CORNER_RADIUS_MM = 3;
/** Corner segments for rounded pedal body. */
export const PEDAL_CORNER_SEGMENTS = 4;
/** Corner segments for rounded pedal plate. */
export const PEDAL_PLATE_CORNER_SEGMENTS = 3;
/** Fraction of full pedal length visible for the accelerator pedal. */
export const ACCELERATOR_PEDAL_LENGTH_RATIO = 3 / 4;
/** Fraction of floor-hinged pedal length that is hidden (brake/clutch). */
export const FLOATING_PEDAL_START_RATIO = 1 / 2;
/** Identifiers for each pedal in left-to-right order. */
export const PEDAL_IDS = ['accelerator', 'brake', 'clutch'] as const;
