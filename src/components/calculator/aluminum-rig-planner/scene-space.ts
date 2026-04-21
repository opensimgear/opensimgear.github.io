export type SceneVector3 = [number, number, number];

export const Z_UP_SCENE_ROOT_ROTATION = [Math.PI / 2, 0, 0] as SceneVector3;

export function plannerYUpToSceneZUp([x, y, z]: SceneVector3): SceneVector3 {
  return [x, -z, y];
}
