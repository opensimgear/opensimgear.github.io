/**
 * Posture solver constants.
 * Anatomical and geometric parameters used by the inverse-kinematics posture solver.
 */

import type { PlannerPosturePreset } from '../types';

// ── Anatomical resting angles ────────────────────────────────────────────────

/** Wrist resting angle before any bend (degrees). */
export const WRIST_ORIGINAL_FOREARM_ANGLE_DEG = 180;
/** Foot-to-toe resting angle before any bend (degrees). */
export const FOOT_TO_TOE_ORIGINAL_POSTURE_ANGLE_DEG = 180;
/** Perpendicular reference subtracted from pedalAngleDeg to get lean radians. */
export const PEDAL_LEAN_REFERENCE_DEG = 90;

// ── Foot/talon geometry ──────────────────────────────────────────────────────

/** Fraction of the foot bone that precedes the toe-start joint. */
export const POSTURE_TOE_BONE_START_SHARE = 0.6;
/** Angle the talon extends backward from the pedal surface (degrees). */
export const POSTURE_TALON_BACKWARD_ANGLE_DEG = 40;
/** Angle between talon and foot bone direction (degrees). */
export const POSTURE_TALON_FOOT_ANGLE_DEG = 90;
/** Heel offset from the pedal surface along the pedal-plane normal (mm). */
export const POSTURE_TALON_PEDAL_PLANE_OFFSET_MM = 0;
/** Toe contact offset from the pedal face along the pedal-plane normal (mm). */
export const POSTURE_TOE_PEDAL_PLANE_OFFSET_MM = 15;
/** Minimum bone length used as a safety floor (mm). */
export const MIN_BONE_LENGTH_MM = 20;

// ── Foot solver search ───────────────────────────────────────────────────────

/** Number of discrete slide positions tested when placing the foot on the pedal. */
export const PEDAL_FOOT_SLIDE_SEARCH_STEPS = 12;
/** Large penalty weight applied when foot cannot reach the pedal. */
export const PEDAL_FOOT_UNREACHABLE_SCORE_WEIGHT = 100000;
/** Penalty when the toe starts behind the pedal face. */
export const PEDAL_FOOT_NEGATIVE_FACE_OFFSET_SCORE = 10000;
/** Precision for deduplicating slide candidate values. */
export const PEDAL_FOOT_SLIDE_PRECISION = 6;

// ── Seat / hip placement ─────────────────────────────────────────────────────

/** Distance from seat rear pivot to hip center along the seat surface (mm). */
export const POSTURE_HIP_FORWARD_ON_SEAT_MM = 70;
/** Height of the hip center above the seat cushion surface (mm). */
export const POSTURE_HIP_ABOVE_SEAT_MM = 130;
/** Clearance between shoulder joint and hip when computing shoulder height (mm). */
export const POSTURE_SHOULDER_ABOVE_HIP_CLEARANCE_MM = 60;
/** Height threshold below which a booster seat insert is applied (cm). */
export const POSTURE_BOOSTER_HEIGHT_THRESHOLD_CM = 120;
/** Maximum bottom-raise offset of the booster seat insert (mm). */
export const POSTURE_BOOSTER_BOTTOM_OFFSET_MAX_MM = 10;
/** Maximum back-push offset of the booster seat insert (mm). */
export const POSTURE_BOOSTER_BACK_OFFSET_MAX_MM = 90;
/** Backrest angle adjustment when computing the body-forward direction (deg). */
export const POSTURE_BACKREST_LEAN_OFFSET_DEG = 95;
/** Ratio of sitting height used for neck position. */
export const POSTURE_NECK_HEIGHT_RATIO = 0.84;
/** Scale factor applied to the above-hip height adjustments. */
export const POSTURE_SCALE_ABOVE_FACTOR = 0.2;
/** Minimum shoulder-to-hip vertical distance (mm). */
export const MIN_SHOULDER_TO_HIP_MM = 250;

// ── Hand / arm ───────────────────────────────────────────────────────────────

/** Angle of the hand bone relative to the wheel torus plane (degrees). */
export const HAND_BONE_TORUS_PLANE_ANGLE_DEG = 60;
/** Minimum hand grip bone length (mm). */
export const HAND_GRIP_LENGTH_MIN_MM = 55;
/** Maximum hand grip bone length (mm). */
export const HAND_GRIP_LENGTH_MAX_MM = 140;
/** Ratio of total height used to estimate hand grip length. */
export const HAND_GRIP_HEIGHT_RATIO = 0.076;
/** Maximum share of forearm-hand length the hand grip may occupy. */
export const HAND_MAX_FOREARM_HAND_SHARE = 0.45;
/** Small lateral offset used as arm bend hint for IK solving. */
export const ARM_BEND_HINT_LATERAL = 0.02;

// ── Knee lift per preset ─────────────────────────────────────────────────────

/** Lateral bend-hint for each preset, controlling how far the knee lifts. */
export const PRESET_KNEE_LIFT: Record<PlannerPosturePreset, number> = {
  gt: 0.24,
  rally: 0.28,
  drift: 0.28,
  road: 0.24,
  custom: 0.24,
};

// ── Ankle bend scoring ───────────────────────────────────────────────────────

/** Weight multiplier for ankle-bend when scoring foot placement. */
export const ANKLE_BEND_SCORE_WEIGHT = 4;

// ── Monitor / posture report ─────────────────────────────────────────────────

/** Diameter of the monitor debug indicator ball (mm). */
export const MONITOR_DEBUG_BALL_DIAMETER_MM = 10;
/** Tolerance in mm before a status goes from 'ok' to 'warn'. */
export const POSTURE_STATUS_MM_TOLERANCE = 100;
/** Tolerance in degrees before a status goes from 'ok' to 'warn'. */
export const POSTURE_STATUS_DEG_TOLERANCE = 10;
/** Number of decimal places used when rounding metric display values. */
export const POSTURE_METRIC_ROUND_PRECISION = 1;
/** Factor to expand posture target range limits for UI controls. */
export const POSTURE_TARGET_RANGE_CONTROL_PADDING_FACTOR = 0.5;

// ── Seat pivot formula ───────────────────────────────────────────────────────

/**
 * Distance from the seat rear to the front anchor point (mm).
 * Same as SEAT_FRONT_ANCHOR_REAR_OFFSET_MM in the seat constants.
 * Re-exported here because the posture solver needs a numerically identical value
 * but should not have a circular dependency on the seat visual constants.
 */
export const POSTURE_SEAT_FRONT_ANCHOR_REAR_OFFSET_MM = 38;
