export type Rotation = { x: number; y: number; z: number };
export type Translation = { x: number; y: number; z: number };

export type PlatformSpec = {
  pitch: number;
  roll: number;
  yaw: number;
  transX: number;
  transY: number;
  transZUp: number;
  transZDown: number;
};

export type PlatformMovement = {
  rotation: Rotation;
  translation: Translation;
};

export type PlatformMovementControls = PlatformMovement & {
  rotationControlKey: number;
};

export const MOBILE_STEWART_BREAKPOINT = 1024;

export type StewartPaneExpandedState = {
  parameters: boolean;
  actuatorRange: boolean;
  movement: boolean;
  constraints: boolean;
};

export type StewartParameterState = {
  baseDiameter: number;
  platformDiameter: number;
  alphaP: number;
  alphaB: number;
  cor: Translation;
  actuatorMin: number;
  actuatorMax: number;
};

const STEWART_LIMITS = {
  baseDiameter: { min: 0, max: 3 },
  alpha: { min: 10, max: 360 / 3 - 10 },
  actuator: { min: 0.1, max: 2 },
} as const;
const ACTUATOR_MAX_EXTENSION_MIN_FACTOR = 1.05;
const ACTUATOR_MAX_EXTENSION_FACTOR = 2 - 0.15;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hasTranslationChange(current: Translation, next: Translation) {
  return current.x !== next.x || current.y !== next.y || current.z !== next.z;
}

export function isNarrowStewartViewport(width: number) {
  return width < MOBILE_STEWART_BREAKPOINT;
}

export function getStewartPaneExpandedState(isNarrow: boolean): StewartPaneExpandedState {
  if (isNarrow) {
    return {
      parameters: false,
      actuatorRange: false,
      movement: false,
      constraints: false,
    };
  }

  return {
    parameters: true,
    actuatorRange: true,
    movement: true,
    constraints: true,
  };
}

export function getNextStewartPaneExpandedState(
  currentPaneExpanded: StewartPaneExpandedState,
  currentIsNarrow: boolean,
  nextIsNarrow: boolean,
  resetPanes = false
): StewartPaneExpandedState {
  if (resetPanes || currentIsNarrow !== nextIsNarrow) {
    return getStewartPaneExpandedState(nextIsNarrow);
  }

  return currentPaneExpanded;
}

export function getStewartSceneClassNames(isNarrow: boolean) {
  if (isNarrow) {
    return 'relative aspect-[3/2] w-full border-zinc-200 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f4f4f5_60%,#e4e4e7_100%)]';
  }

  return 'relative aspect-[3/2] w-full border-zinc-200 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f4f4f5_60%,#e4e4e7_100%)]';
}

export function getStewartGizmoSize(isNarrow: boolean) {
  return isNarrow ? 48 : 64;
}

export function getStewartStatusPanelClassNames(isNarrow: boolean, isOpen: boolean) {
  if (isNarrow) {
    const base =
      'absolute bottom-2 right-2 rounded border border-gray-300 bg-white/80 font-mono backdrop-blur-sm select-none transition-all duration-200';

    if (isOpen) {
      return `${base} px-2 py-1.5 text-[8px] max-w-[calc(100%-52px)]`;
    }

    return `${base} px-2 py-1 text-[8px] cursor-pointer`;
  }

  return 'absolute bottom-3 right-3 rounded border border-gray-300 bg-white/80 px-3 py-2 text-xs font-mono backdrop-blur-sm pointer-events-none select-none';
}

export function clampStewartParameterState(state: StewartParameterState): StewartParameterState {
  const baseDiameter = clamp(state.baseDiameter, STEWART_LIMITS.baseDiameter.min, STEWART_LIMITS.baseDiameter.max);
  const platformDiameter = clamp(state.platformDiameter, 0, baseDiameter);
  const alphaP = clamp(state.alphaP, STEWART_LIMITS.alpha.min, STEWART_LIMITS.alpha.max);
  const alphaB = clamp(state.alphaB, STEWART_LIMITS.alpha.min, STEWART_LIMITS.alpha.max);
  const actuatorMin = clamp(state.actuatorMin, STEWART_LIMITS.actuator.min, STEWART_LIMITS.actuator.max);
  const actuatorMax = clamp(
    state.actuatorMax,
    getStewartActuatorMaxExtensionMin(actuatorMin),
    getStewartActuatorMaxExtension(actuatorMin)
  );
  const nextCor = {
    x: clamp(state.cor.x, -platformDiameter, platformDiameter),
    y: clamp(state.cor.y, -platformDiameter, platformDiameter),
    z: clamp(state.cor.z, 0, platformDiameter),
  };

  return {
    baseDiameter,
    platformDiameter,
    alphaP,
    alphaB,
    cor: hasTranslationChange(state.cor, nextCor) ? nextCor : state.cor,
    actuatorMin,
    actuatorMax,
  };
}

export function getStewartActuatorMaxExtensionMin(actuatorMin: number) {
  return actuatorMin * ACTUATOR_MAX_EXTENSION_MIN_FACTOR;
}

export function getStewartActuatorMaxExtension(actuatorMin: number) {
  return actuatorMin * ACTUATOR_MAX_EXTENSION_FACTOR;
}

export function clampPlatformMovement(
  rotation: Rotation,
  translation: Translation,
  spec: PlatformSpec
): PlatformMovement {
  const nextRotation = {
    x: clamp(rotation.x, -spec.pitch, spec.pitch),
    y: clamp(rotation.y, -spec.roll, spec.roll),
    z: clamp(rotation.z, -spec.yaw, spec.yaw),
  };

  const nextTranslation = {
    x: clamp(translation.x, -spec.transX, spec.transX),
    y: clamp(translation.y, -spec.transY, spec.transY),
    z: clamp(translation.z, -spec.transZDown, spec.transZUp),
  };

  return {
    rotation: hasPlatformMovementChange(rotation, translation, { rotation: nextRotation, translation })
      ? nextRotation
      : rotation,
    translation: hasPlatformMovementChange(rotation, translation, { rotation, translation: nextTranslation })
      ? nextTranslation
      : translation,
  };
}

export function clampStewartPlatformMovement(
  rotation: Rotation,
  translation: Translation,
  spec: PlatformSpec,
  translationLimit: number
): PlatformMovement {
  const movement = clampPlatformMovement(rotation, translation, spec);
  const nextTranslation = {
    x: clamp(movement.translation.x, -translationLimit, translationLimit),
    y: clamp(movement.translation.y, -translationLimit, translationLimit),
    z: clamp(movement.translation.z, -translationLimit, translationLimit),
  };

  return {
    rotation: movement.rotation,
    translation: hasTranslationChange(movement.translation, nextTranslation) ? nextTranslation : movement.translation,
  };
}

export function hasPlatformMovementChange(rotation: Rotation, translation: Translation, movement: PlatformMovement) {
  return (
    rotation.x !== movement.rotation.x ||
    rotation.y !== movement.rotation.y ||
    rotation.z !== movement.rotation.z ||
    translation.x !== movement.translation.x ||
    translation.y !== movement.translation.y ||
    translation.z !== movement.translation.z
  );
}
