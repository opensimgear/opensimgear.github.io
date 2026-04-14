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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
