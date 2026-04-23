export type CameraProjectionMode = 'perspective' | 'orthographic';

export function getSceneControlsTopOffsetPx(gizmoSize: number) {
  return gizmoSize + 28;
}
