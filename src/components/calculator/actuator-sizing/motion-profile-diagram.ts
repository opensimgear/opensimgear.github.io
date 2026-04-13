export interface MotionProfileDiagramInput {
  t_accel_s: number;
  t_const_s: number;
  t_decel_s: number;
  dwellTime_s: number;
}

export interface MotionProfileSegment {
  kind: 'accel' | 'const' | 'decel' | 'dwell';
  start: number;
  end: number;
}

export interface MotionProfileDiagramData {
  phaseBoundaries: {
    accelEnd: number;
    constEnd: number;
    decelEnd: number;
    dwellEnd: number;
  };
  segments: MotionProfileSegment[];
  labelVisibility: {
    accel: boolean;
    const: boolean;
    decel: boolean;
    dwell: boolean;
  };
  velocityPath: string;
}

function fmt(value: number): string {
  return value
    .toFixed(6)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

function isWideEnough(start: number, end: number): boolean {
  return end - start >= 0.12;
}

export function buildMotionProfileDiagram(input: MotionProfileDiagramInput): MotionProfileDiagramData {
  if (input.t_accel_s <= 0 || input.t_decel_s <= 0) {
    throw new Error('Motion-profile diagram requires positive accel and decel durations.');
  }

  const motionTime_s = input.t_accel_s + input.t_const_s + input.t_decel_s;
  const totalTime_s = motionTime_s + input.dwellTime_s;
  const safeTotal = totalTime_s || 1;
  const hasConstPhase = input.t_const_s > 0;
  const hasDwell = input.dwellTime_s > 0;

  const accelEnd = input.t_accel_s / safeTotal;
  const constEnd = (input.t_accel_s + input.t_const_s) / safeTotal;
  const decelEnd = motionTime_s / safeTotal;
  const dwellEnd = 1;

  const segments: MotionProfileSegment[] = [{ kind: 'accel', start: 0, end: accelEnd }];

  if (hasConstPhase) {
    segments.push({ kind: 'const', start: accelEnd, end: constEnd });
  }

  segments.push({ kind: 'decel', start: hasConstPhase ? constEnd : accelEnd, end: decelEnd });

  if (hasDwell) {
    segments.push({ kind: 'dwell', start: decelEnd, end: dwellEnd });
  }

  const velocityPoints: Array<[number, number]> = [
    [0, 1],
    [accelEnd, 0],
    [decelEnd, 1],
  ];

  if (hasConstPhase) {
    velocityPoints.splice(2, 0, [constEnd, 0]);
  }

  if (hasDwell) {
    velocityPoints.push([1, 1]);
  }

  return {
    phaseBoundaries: { accelEnd, constEnd, decelEnd, dwellEnd },
    segments,
    labelVisibility: {
      accel: isWideEnough(0, accelEnd),
      const: hasConstPhase && isWideEnough(accelEnd, constEnd),
      decel: isWideEnough(hasConstPhase ? constEnd : accelEnd, decelEnd),
      dwell: hasDwell && isWideEnough(decelEnd, 1),
    },
    velocityPath: velocityPoints.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${fmt(x)} ${fmt(y)}`).join(' '),
  };
}
