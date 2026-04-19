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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
    return 'relative h-[320px] bg-gray-50 sm:h-[420px]';
  }

  return 'relative h-[600px] flex-1 bg-gray-50';
}

export function getStewartGizmoSize(isNarrow: boolean) {
  return isNarrow ? 80 : 128;
}

export function getStewartStatusPanelClassNames(isNarrow: boolean) {
  if (isNarrow) {
    return 'absolute top-2 right-2 rounded border border-gray-300 bg-white/80 px-2 py-1.5 text-[8px] font-mono backdrop-blur-sm pointer-events-none select-none';
  }

  return 'absolute top-3 right-3 rounded border border-gray-300 bg-white/80 px-3 py-2 text-xs font-mono backdrop-blur-sm pointer-events-none select-none';
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
