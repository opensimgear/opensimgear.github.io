import type { ServoMotor } from './types';

export const BUILTIN_SERVO_MOTORS: ReadonlyArray<ServoMotor> = [
  {
    id: 'jmc-ihss57-200w',
    name: 'JMC iHSS57 (200W)',
    manufacturer: 'JMC',
    ratedRPM: 3000,
    maxRPM: 4500,
    ratedTorque_Nm: 0.64,
    peakTorque_Nm: 1.92,
    continuousPower_W: 200,
    inertia_kgm2: 1.7e-5,
    mass_kg: 0.9,
    frameSize_mm: 57,
    source: 'builtin',
  },
  {
    id: 'jmc-ihss57-400w',
    name: 'JMC iHSS57 (400W)',
    manufacturer: 'JMC',
    ratedRPM: 3000,
    maxRPM: 4500,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 3.81,
    continuousPower_W: 400,
    inertia_kgm2: 2.9e-5,
    mass_kg: 1.2,
    frameSize_mm: 57,
    source: 'builtin',
  },
  {
    id: 'jmc-ihss86-750w',
    name: 'JMC iHSS86 (750W)',
    manufacturer: 'JMC',
    ratedRPM: 3000,
    maxRPM: 4500,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 8e-5,
    mass_kg: 2.8,
    frameSize_mm: 86,
    source: 'builtin',
  },
  {
    id: 'jmc-ihss86-1000w',
    name: 'JMC iHSS86 (1000W)',
    manufacturer: 'JMC',
    ratedRPM: 3000,
    maxRPM: 4500,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 9.54,
    continuousPower_W: 1000,
    inertia_kgm2: 1.1e-4,
    mass_kg: 3.5,
    frameSize_mm: 86,
    source: 'builtin',
  },
  {
    id: 'leadshine-el5-d507',
    name: 'Leadshine EL5-D507 (750W)',
    manufacturer: 'Leadshine',
    ratedRPM: 3000,
    maxRPM: 4000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 3.9e-5,
    mass_kg: 2.1,
    frameSize_mm: 80,
    source: 'builtin',
  },
  {
    id: 'leadshine-el5-d1022',
    name: 'Leadshine EL5-D1022 (1kW)',
    manufacturer: 'Leadshine',
    ratedRPM: 3000,
    maxRPM: 4000,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 9.54,
    continuousPower_W: 1000,
    inertia_kgm2: 2e-4,
    mass_kg: 3.5,
    frameSize_mm: 80,
    source: 'builtin',
  },
  {
    id: 'lichuan-57-280w',
    name: 'Lichuan LC57H280 (280W)',
    manufacturer: 'Lichuan',
    ratedRPM: 3000,
    maxRPM: 4000,
    ratedTorque_Nm: 0.9,
    peakTorque_Nm: 2.7,
    continuousPower_W: 280,
    inertia_kgm2: 2.4e-5,
    mass_kg: 1,
    frameSize_mm: 57,
    source: 'builtin',
  },
  {
    id: 'lichuan-86-750w',
    name: 'Lichuan LC86H750 (750W)',
    manufacturer: 'Lichuan',
    ratedRPM: 3000,
    maxRPM: 4000,
    ratedTorque_Nm: 2.4,
    peakTorque_Nm: 7.2,
    continuousPower_W: 750,
    inertia_kgm2: 8.5e-5,
    mass_kg: 2.9,
    frameSize_mm: 86,
    source: 'builtin',
  },
  {
    id: 'omc-nema34-1000w',
    name: 'OMC NEMA34 Closed-Loop (1000W)',
    manufacturer: 'StepperOnline',
    ratedRPM: 3000,
    maxRPM: 4000,
    ratedTorque_Nm: 3,
    peakTorque_Nm: 9,
    continuousPower_W: 1000,
    inertia_kgm2: 1.2e-4,
    mass_kg: 3.2,
    frameSize_mm: 86,
    source: 'builtin',
  },
  {
    id: 'delta-ecma-c207-750w',
    name: 'Delta ECMA-C20807 (750W)',
    manufacturer: 'Delta',
    ratedRPM: 3000,
    maxRPM: 5000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.16,
    continuousPower_W: 750,
    inertia_kgm2: 1.13e-4,
    mass_kg: 2.3,
    frameSize_mm: 80,
    source: 'builtin',
  },
];

const USER_SERVO_MOTORS_KEY = 'actuator-sizing-user-motors';

function isValidServoMotor(value: unknown): value is ServoMotor {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const motor = value as Record<string, unknown>;
  return (
    typeof motor.id === 'string' &&
    typeof motor.name === 'string' &&
    typeof motor.ratedRPM === 'number' &&
    typeof motor.maxRPM === 'number' &&
    typeof motor.ratedTorque_Nm === 'number' &&
    typeof motor.peakTorque_Nm === 'number' &&
    typeof motor.continuousPower_W === 'number' &&
    typeof motor.inertia_kgm2 === 'number' &&
    motor.source === 'user'
  );
}

export function loadUserServoMotors(): ServoMotor[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(USER_SERVO_MOTORS_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidServoMotor) : [];
  } catch {
    return [];
  }
}

export function saveUserServoMotors(motors: ServoMotor[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(USER_SERVO_MOTORS_KEY, JSON.stringify(motors.filter((motor) => motor.source === 'user')));
}
