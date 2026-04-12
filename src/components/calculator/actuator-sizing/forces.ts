import type { AxisOrientation, SystemType } from './types';

const G = 9.81;

export function computeGravityForce(mass_kg: number, orientation: AxisOrientation, inclineAngle_deg: number): number {
  switch (orientation) {
    case 'horizontal':
      return 0;
    case 'vertical':
      return mass_kg * G;
    case 'inclined':
      return mass_kg * G * Math.sin((inclineAngle_deg * Math.PI) / 180);
  }
}

export function computeStaticForce(
  mass_kg: number,
  orientation: AxisOrientation,
  inclineAngle_deg: number,
  frictionForce_N: number,
  externalForce_N: number,
  guidePreloadForce_N: number
): number {
  return (
    computeGravityForce(mass_kg, orientation, inclineAngle_deg) +
    frictionForce_N +
    externalForce_N +
    guidePreloadForce_N
  );
}

export function computeHoldingForce(
  mass_kg: number,
  orientation: AxisOrientation,
  inclineAngle_deg: number,
  guidePreloadForce_N: number
): number {
  return computeGravityForce(mass_kg, orientation, inclineAngle_deg) + guidePreloadForce_N;
}

export function computeForcePerActuator(
  F_total_N: number,
  systemType: SystemType,
  imbalanceFactor: number,
  actuatorAngle_deg: number
): number {
  switch (systemType) {
    case 'single':
      return F_total_N * imbalanceFactor;
    case '4actuator':
      return (F_total_N / 4) * imbalanceFactor;
    case 'stewart':
      return (F_total_N / (6 * Math.cos((actuatorAngle_deg * Math.PI) / 180))) * imbalanceFactor;
  }
}
