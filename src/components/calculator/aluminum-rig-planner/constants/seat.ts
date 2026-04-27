/**
 * Seat module visual constants.
 * Dimensions describe a generic bucket-style racing seat for 3D preview rendering.
 */

/** Color of seat upholstery surfaces. */
export const UPHOLSTERY_COLOR = '#141414';

/** PBR material properties for upholstery. */
export const UPHOLSTERY_MATERIAL = {
  metalness: 0.02,
  roughness: 0.94,
} as const;

// ── Seat base shape ──────────────────────────────────────────────────────────

/** Overlap between bolster and seat base geometry to avoid visual gaps (mm). */
export const SEAT_SOLID_OVERLAP_MM = 6;
/** Vertical thickness of the seat cushion base (mm). */
export const SEAT_BASE_THICKNESS_MM = 46;
/** Width of each side bolster (mm). */
export const SEAT_SIDE_BOLSTER_WIDTH_MM = 52;
/** Height of each side bolster (mm). */
export const SEAT_SIDE_BOLSTER_HEIGHT_MM = 118;
/** Corner rounding radius for all seat panels (mm). */
export const SEAT_CORNER_RADIUS_MM = 14;
/** Number of segments used to render rounded corners. */
export const SEAT_CORNER_SEGMENTS = 5;
/** Minimum allowed outer seat width (mm). */
export const SEAT_OUTER_WIDTH_MIN_MM = 430;
/** Maximum allowed outer seat width (mm). */
export const SEAT_OUTER_WIDTH_MAX_MM = 530;
/** Extra width added to inner beam spacing for outer seat width (mm). */
export const SEAT_OUTER_WIDTH_INNER_BEAM_PAD_MM = 120;
/** Inset from base outer edge when computing outer seat width (mm). */
export const SEAT_OUTER_WIDTH_BASE_INSET_MM = 30;
/** Minimum inner seat width (mm). */
export const SEAT_INNER_WIDTH_MIN_MM = 300;
/** Minimum margin between outer and inner seat width (mm). */
export const SEAT_INNER_WIDTH_MARGIN_MM = 40;
/** Distance from rear pivot to the start of the side bolster (mm). */
export const SEAT_SIDE_BOLSTER_START_MM = 30;
/** Offset from seat front to bolster end, before overlap (mm). */
export const SEAT_SIDE_BOLSTER_END_INSET_MM = 70;
/** Distance from seat rear to the front mounting anchor (mm). */
export const SEAT_FRONT_ANCHOR_REAR_OFFSET_MM = 38;

// ── Backrest shape ───────────────────────────────────────────────────────────

/** Thickness of the backrest panel (mm). */
export const BACKREST_THICKNESS_MM = 54;
/** Total height of the backrest (mm). */
export const BACKREST_HEIGHT_MM = 760;
/** Z bound of the lower backrest panel (mm). */
export const BACKREST_LOWER_PANEL_TOP_MM = 486;
/** Z start of the upper backrest panel (mm). */
export const BACKREST_UPPER_PANEL_BOTTOM_MM = 480;
/** Z end of the upper backrest panel (mm). */
export const BACKREST_UPPER_PANEL_TOP_MM = 652;
/** Z start of the headrest panel (mm). */
export const BACKREST_HEADREST_BOTTOM_MM = 646;
/** Width delta added to inner width for lower back panel (mm). */
export const BACKREST_LOWER_WIDTH_DELTA_MM = 46;
/** Width delta subtracted from inner width for upper back panel (mm). */
export const BACKREST_UPPER_WIDTH_DELTA_MM = 12;
/** Width delta added to inner width for headrest (mm). */
export const BACKREST_HEADREST_WIDTH_DELTA_MM = 26;
/** Lower back panel width limits [min, max] (mm). */
export const BACKREST_LOWER_WIDTH_LIMITS_MM = { min: 306, max: 390 } as const;
/** Upper back panel width limits [min, max] (mm). */
export const BACKREST_UPPER_WIDTH_LIMITS_MM = { min: 248, max: 312 } as const;
/** Headrest width limits [min, max] (mm). */
export const BACKREST_HEADREST_WIDTH_LIMITS_MM = { min: 268, max: 328 } as const;
/** Width of each shoulder wing (mm). */
export const SHOULDER_WING_WIDTH_MM = 96;
/** Height of each shoulder wing (mm). */
export const SHOULDER_WING_HEIGHT_MM = 176;
/** Inset of shoulder wing from the upper back panel edge (mm). */
export const SHOULDER_WING_INSET_MM = 24;
/** Z start of the shoulder wing (mm). */
export const SHOULDER_WING_Z_START_MM = 432;
