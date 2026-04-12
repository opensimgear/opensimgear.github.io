export interface Motor {
  id: string;
  name: string;
  ratedRPM: number;
  ratedTorque_Nm: number;
  peakTorque_Nm: number;
  continuousPower_W: number;
  inertia_kgm2: number;
  source: 'builtin' | 'user';
}

export const BUILTIN_MOTORS: ReadonlyArray<Motor> = [
  {
    id: 'jmc-ihss57-36-10-30',
    name: 'JMC iHSS57 (200W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 0.64,
    peakTorque_Nm: 1.92,
    continuousPower_W: 200,
    inertia_kgm2: 1.7e-5,
    source: 'builtin',
  },
  {
    id: 'jmc-ihss57-36-20-40',
    name: 'JMC iHSS57 (400W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 3.81,
    continuousPower_W: 400,
    inertia_kgm2: 2.9e-5,
    source: 'builtin',
  },
  {
    id: 'jmc-ihss86-36-30',
    name: 'JMC iHSS86 (750W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 8.0e-5,
    source: 'builtin',
  },
  {
    id: 'jmc-ihss86-36-40',
    name: 'JMC iHSS86 (1000W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 9.54,
    continuousPower_W: 1000,
    inertia_kgm2: 1.1e-4,
    source: 'builtin',
  },
  {
    id: 'leadshine-el5-d507',
    name: 'Leadshine EL5-D507 (750W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 3.9e-5,
    source: 'builtin',
  },
  {
    id: 'leadshine-el5-d1022',
    name: 'Leadshine EL5-D1022 (1kW)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 9.54,
    continuousPower_W: 1000,
    inertia_kgm2: 2.0e-4,
    source: 'builtin',
  },
  {
    id: 'lichuan-57',
    name: 'Lichuan LC57H280 (280W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 0.9,
    peakTorque_Nm: 2.7,
    continuousPower_W: 280,
    inertia_kgm2: 2.4e-5,
    source: 'builtin',
  },
  {
    id: 'stepperonline-a6m60-400h2a1-m17',
    name: 'OMC A6M60-400H2A1-M17 (400W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 4.45,
    continuousPower_W: 400,
    inertia_kgm2: 5.9e-5,
    source: 'builtin',
  },
  {
    id: 'stepperonline-a6m60-400h2b1-m17',
    name: 'OMC A6M60-400H2B1-M17 (400W, brake)',
    ratedRPM: 3000,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 4.45,
    continuousPower_W: 400,
    inertia_kgm2: 6.0e-5,
    source: 'builtin',
  },
  {
    id: 'stepperonline-a6m80-750h2a1-m17',
    name: 'OMC A6M80-750H2A1-M17 (750W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 8.36,
    continuousPower_W: 750,
    inertia_kgm2: 1.72e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-a6m80-750h2b1-m17',
    name: 'OMC A6M80-750H2B1-M17 (750W, brake)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 8.36,
    continuousPower_W: 750,
    inertia_kgm2: 1.77e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-a6m80-1000h2a1-m17',
    name: 'OMC A6M80-1000H2A1-M17 (1000W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 11.13,
    continuousPower_W: 1000,
    inertia_kgm2: 2.23e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-a6m80-1000h2b1-m17',
    name: 'OMC A6M80-1000H2B1-M17 (1000W, brake)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 11.13,
    continuousPower_W: 1000,
    inertia_kgm2: 2.28e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-e6m60-400h2a2-m17s',
    name: 'OMC E6M60-400H2A2-M17S (400W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 3.81,
    continuousPower_W: 400,
    inertia_kgm2: 5.6e-5,
    source: 'builtin',
  },
  {
    id: 'stepperonline-e6m80-750h2a2-m17s',
    name: 'OMC E6M80-750H2A2-M17S (750W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 1.56e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t6m60-400h2a3-m17s',
    name: 'OMC T6M60-400H2A3-M17S (400W, 17-bit)',
    ratedRPM: 3000,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 3.81,
    continuousPower_W: 400,
    inertia_kgm2: 5.6e-5,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t6m60-400h2b3-m17s',
    name: 'OMC T6M60-400H2B3-M17S (400W, 17-bit, brake)',
    ratedRPM: 3000,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 3.81,
    continuousPower_W: 400,
    inertia_kgm2: 5.8e-5,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t6m60-400h2a1-m23',
    name: 'OMC T6M60-400H2A1-M23 (400W, 23-bit)',
    ratedRPM: 3000,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 3.81,
    continuousPower_W: 400,
    inertia_kgm2: 5.6e-5,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t6m60-400h2b1-m23',
    name: 'OMC T6M60-400H2B1-M23 (400W, 23-bit, brake)',
    ratedRPM: 3000,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 3.81,
    continuousPower_W: 400,
    inertia_kgm2: 5.8e-5,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t6m80-750h2a3-m17s',
    name: 'OMC T6M80-750H2A3-M17S (750W, 17-bit)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 1.5e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t6m80-750h2b3-m17s',
    name: 'OMC T6M80-750H2B3-M17S (750W, 17-bit, brake)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 1.65e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t6m80-750h2a1-m23',
    name: 'OMC T6M80-750H2A1-M23 (750W, 23-bit)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 1.5e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t6m80-750h2b1-m23',
    name: 'OMC T6M80-750H2B1-M23 (750W, 23-bit, brake)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 1.65e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t6m80-1000h2a3-m17s',
    name: 'OMC T6M80-1000H2A3-M17S (1000W, 17-bit)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.19,
    peakTorque_Nm: 9.56,
    continuousPower_W: 1000,
    inertia_kgm2: 2.0e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t6m80-1000h2b3-m17s',
    name: 'OMC T6M80-1000H2B3-M17S (1000W, 17-bit, brake)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.19,
    peakTorque_Nm: 9.56,
    continuousPower_W: 1000,
    inertia_kgm2: 2.15e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t6m80-1000h2a1-m23',
    name: 'OMC T6M80-1000H2A1-M23 (1000W, 23-bit)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 9.54,
    continuousPower_W: 1000,
    inertia_kgm2: 2.0e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t6m80-1000h2b1-m23',
    name: 'OMC T6M80-1000H2B1-M23 (1000W, 23-bit, brake)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 9.54,
    continuousPower_W: 1000,
    inertia_kgm2: 2.15e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t7m60-400h2a1-m23',
    name: 'OMC T7M60-400H2A1-M23 (400W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 3.81,
    continuousPower_W: 400,
    inertia_kgm2: 5.6e-5,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t7m80-750h2a1-m23',
    name: 'OMC T7M80-750H2A1-M23 (750W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 1.5e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t7m80-1000h2a1-m23',
    name: 'OMC T7M80-1000H2A1-M23 (1000W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 9.54,
    continuousPower_W: 1000,
    inertia_kgm2: 2.0e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-t7m80-1000h2b1-m23',
    name: 'OMC T7M80-1000H2B1-M23 (1000W, brake)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 9.54,
    continuousPower_W: 1000,
    inertia_kgm2: 2.15e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-dsy60-400l2a2m17s',
    name: 'OMC DSY60-400L2A2M17S (400W DC servo)',
    ratedRPM: 3000,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 3.81,
    continuousPower_W: 400,
    inertia_kgm2: 4.9e-5,
    source: 'builtin',
  },
  {
    id: 'stepperonline-dsy60-400l2b2m17s',
    name: 'OMC DSY60-400L2B2M17S (400W DC servo, brake)',
    ratedRPM: 3000,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 3.81,
    continuousPower_W: 400,
    inertia_kgm2: 5.1e-5,
    source: 'builtin',
  },
  {
    id: 'stepperonline-dsy80-750l2a2m17s',
    name: 'OMC DSY80-750L2A2M17S (750W DC servo)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 1.42e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-dsy80-750l2b2m17s',
    name: 'OMC DSY80-750L2B2M17S (750W DC servo, brake)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 1.62e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-dsy80-1000l2a2m17s',
    name: 'OMC DSY80-1000L2A2M17S (1000W DC servo)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.2,
    peakTorque_Nm: 9.6,
    continuousPower_W: 1000,
    inertia_kgm2: 1.92e-4,
    source: 'builtin',
  },
  {
    id: 'stepperonline-dsy80-1000l2b2m17s',
    name: 'OMC DSY80-1000L2B2M17S (1000W DC servo, brake)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.2,
    peakTorque_Nm: 9.6,
    continuousPower_W: 1000,
    inertia_kgm2: 2.12e-4,
    source: 'builtin',
  },
  // Steppers have lower peak-to-rated ratio than AC servos (~1.5× vs 3×)
  {
    id: 'nema34-stepper',
    name: 'NEMA 34 Stepper (12Nm)',
    ratedRPM: 400,
    ratedTorque_Nm: 8.0,
    peakTorque_Nm: 12.0,
    continuousPower_W: 335,
    inertia_kgm2: 5.0e-4,
    source: 'builtin',
  },
];

const USER_MOTORS_KEY = 'motor-scaling-user-motors';

function isValidMotor(v: unknown): v is Motor {
  if (typeof v !== 'object' || v === null) return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    typeof m.name === 'string' &&
    typeof m.ratedRPM === 'number' &&
    typeof m.ratedTorque_Nm === 'number' &&
    typeof m.peakTorque_Nm === 'number' &&
    typeof m.continuousPower_W === 'number' &&
    typeof m.inertia_kgm2 === 'number' &&
    (m.source === 'builtin' || m.source === 'user')
  );
}

export function loadUserMotors(): Motor[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USER_MOTORS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as unknown[]).filter(isValidMotor) : [];
  } catch {
    return [];
  }
}

export function saveUserMotors(motors: Motor[]): void {
  if (typeof localStorage === 'undefined') return;
  const userOnly = motors.filter((m) => m.source === 'user');
  localStorage.setItem(USER_MOTORS_KEY, JSON.stringify(userOnly));
}
