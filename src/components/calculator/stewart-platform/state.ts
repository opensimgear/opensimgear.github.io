type Rotation = { x: number; y: number; z: number };
type Translation = { x: number; y: number; z: number };

type PlatformSpec = {
  pitch: number;
  roll: number;
  yaw: number;
  transX: number;
  transY: number;
  transZUp: number;
  transZDown: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function clampPlatformMovement(rotation: Rotation, translation: Translation, spec: PlatformSpec) {
  return {
    rotation: {
      x: clamp(rotation.x, -spec.pitch, spec.pitch),
      y: clamp(rotation.y, -spec.roll, spec.roll),
      z: clamp(rotation.z, -spec.yaw, spec.yaw),
    },
    translation: {
      x: clamp(translation.x, -spec.transX, spec.transX),
      y: clamp(translation.y, -spec.transY, spec.transY),
      z: clamp(translation.z, -spec.transZDown, spec.transZUp),
    },
  };
}
