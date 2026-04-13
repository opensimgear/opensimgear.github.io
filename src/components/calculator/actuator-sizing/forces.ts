import type { SystemType } from './types';

const G = 9.81;

export function computeGravityForce(mass_kg: number): number {
  return mass_kg * G;
}

export function computeStaticForce(mass_kg: number, frictionForce_N: number): number {
  return computeGravityForce(mass_kg) + frictionForce_N;
}

export function computeHoldingForce(mass_kg: number): number {
  return computeGravityForce(mass_kg);
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
