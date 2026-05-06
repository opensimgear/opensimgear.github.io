import {
  Box3,
  Euler,
  Matrix4,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Vector3,
} from 'three';
import type { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type Vector3Tuple = [number, number, number];
export type Vector4Tuple = [number, number, number, number];
export type Matrix4Tuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export type ThreeSpaceMouseMotionTarget = 'scene' | 'platform';
export type ThreeSpaceMousePlatformPose = {
  rotation: Vector3Tuple;
  translation: Vector3Tuple;
};
export type ThreeSpaceMousePlatformDelta = ThreeSpaceMousePlatformPose;
type ThreeSpaceMousePlatformAffineOptions = {
  centerOfRotation?: Vector3Tuple;
};

type SpaceMouseControllerInstance = {
  connect(): boolean;
  create3dmouse(viewport: HTMLElement, name: string): void;
  delete3dmouse(): void;
  update3dcontroller(payload: Record<string, unknown>): void;
};

type SpaceMouseControllerCtor = new (client: ThreeSpaceMouseBridge) => SpaceMouseControllerInstance;

declare global {
  interface Window {
    _3Dconnexion?: SpaceMouseControllerCtor;
  }
}

export const SPACEMOUSE_Z_UP_COORDINATE_SYSTEM: Matrix4Tuple = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];

let spaceMouseScriptPromise: Promise<SpaceMouseControllerCtor | null> | null = null;
const spaceMouseScriptUrl = new URL('../../../assets/vendor/3dconnexion.min.js', import.meta.url).href;

export function buildPlaneEquation(point: Vector3Tuple, normal: Vector3Tuple): Vector4Tuple {
  const normalVector = new Vector3(...normal).normalize();
  const pointVector = new Vector3(...point);
  const d = -normalVector.dot(pointVector);

  return [normalVector.x, normalVector.y, normalVector.z, d];
}

export function getDiagonalFovRadians(verticalFovDegrees: number, aspect: number) {
  const halfVerticalFov = (verticalFovDegrees * Math.PI) / 360;

  return 2 * Math.atan(Math.tan(halfVerticalFov) * Math.sqrt(1 + aspect * aspect));
}

export function getVerticalFovDegreesFromDiagonalRadians(diagonalFovRadians: number, aspect: number) {
  const halfDiagonalFov = diagonalFovRadians / 2;
  const halfVerticalFov = Math.atan(Math.tan(halfDiagonalFov) / Math.sqrt(1 + aspect * aspect));

  return (halfVerticalFov * 360) / Math.PI;
}

export function getPerspectiveFrustum(camera: PerspectiveCamera): [number, number, number, number, number, number] {
  const halfVerticalFov = (camera.fov * Math.PI) / 360;
  const bottom = -camera.near * Math.tan(halfVerticalFov);
  const left = bottom * camera.aspect;

  return [left, -left, bottom, -bottom, camera.near, camera.far];
}

export function getTargetFromCameraPose(
  position: Vector3Tuple,
  direction: Vector3Tuple,
  distance: number
): Vector3Tuple {
  const positionVector = new Vector3(...position);
  const directionVector = new Vector3(...direction).normalize();

  return positionVector.add(directionVector.multiplyScalar(distance)).toArray() as Vector3Tuple;
}

export function syncOrbitCameraView(options: {
  camera: PerspectiveCamera | OrthographicCamera;
  controls: ThreeOrbitControls;
  cameraUp: Vector3Tuple;
  target: Vector3Tuple;
  position?: Vector3Tuple;
}) {
  const { camera, controls, cameraUp, target, position } = options;

  if (position) {
    camera.position.set(...position);
  }

  camera.up.set(...cameraUp);
  controls.object = camera;
  controls.target.set(...target);
  camera.lookAt(...target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  controls.update();
}

async function loadSpaceMouseScript() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window._3Dconnexion) {
    return window._3Dconnexion;
  }

  if (!spaceMouseScriptPromise) {
    spaceMouseScriptPromise = new Promise<SpaceMouseControllerCtor | null>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-3dconnexion-script]');

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window._3Dconnexion ?? null), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('3Dconnexion script failed to load')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.src = spaceMouseScriptUrl;
      script.async = true;
      script.dataset['3dconnexionScript'] = 'true';
      script.onload = () => resolve(window._3Dconnexion ?? null);
      script.onerror = () => reject(new Error('3Dconnexion script failed to load'));
      document.head.appendChild(script);
    }).catch(() => null);
  }

  return spaceMouseScriptPromise;
}

export type ThreeSpaceMouseSceneConfig = {
  appName: string;
  cameraUp: Vector3Tuple;
  constructionPlane: Vector4Tuple;
  coordinateSystem?: Matrix4Tuple;
  floorPlane?: Vector4Tuple;
  frontView?: Matrix4Tuple;
  unitsToMeters?: number;
};

export type ThreeSpaceMouseBridgeOptions = {
  scene: ThreeSpaceMouseSceneConfig;
  getControls: () => ThreeOrbitControls | null;
  getModelRoot: () => Object3D | null;
  getViewport: () => HTMLElement | null;
  getActiveCamera: () => PerspectiveCamera | OrthographicCamera | null;
  platformControl?: {
    getPose: () => ThreeSpaceMousePlatformPose;
    setPose: (pose: ThreeSpaceMousePlatformPose) => void;
    getAffine?: () => Matrix4Tuple;
    poseFromAffine?: (affine: number[]) => ThreeSpaceMousePlatformPose;
    translationScale?: number;
    rotationScale?: number;
    getCenterOfRotation?: () => Vector3Tuple;
  };
};

function matrixToPose(matrixData: number[]) {
  const matrix = new Matrix4().fromArray(matrixData);
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();

  matrix.decompose(position, quaternion, scale);

  return { position, quaternion };
}

function quaternionToEulerDegrees(quaternion: Quaternion) {
  const euler = new Euler().setFromQuaternion(quaternion, 'XYZ');
  const radiansToDegrees = 180 / Math.PI;

  return [euler.x * radiansToDegrees, euler.y * radiansToDegrees, euler.z * radiansToDegrees] as Vector3Tuple;
}

function poseToMatrix(pose: ThreeSpaceMousePlatformPose, options?: ThreeSpaceMousePlatformAffineOptions) {
  const centerOfRotation = new Vector3(...(options?.centerOfRotation ?? [0, 0, 0]));
  const matrix = new Matrix4().makeRotationFromEuler(
    new Euler(
      (pose.rotation[0] * Math.PI) / 180,
      (pose.rotation[1] * Math.PI) / 180,
      (pose.rotation[2] * Math.PI) / 180,
      'XYZ'
    )
  );
  const rotatedCenter = centerOfRotation.clone().applyMatrix4(matrix);
  const position = new Vector3(...pose.translation).add(centerOfRotation).sub(rotatedCenter);

  matrix.setPosition(position);

  return matrix;
}

export function getSpaceMousePlatformAffineFromPose(
  pose: ThreeSpaceMousePlatformPose,
  options?: ThreeSpaceMousePlatformAffineOptions
) {
  return poseToMatrix(pose, options).toArray() as Matrix4Tuple;
}

export function getSpaceMousePlatformPoseFromAffine(affine: number[], options?: ThreeSpaceMousePlatformAffineOptions) {
  const pose = matrixToPose(affine);
  const centerOfRotation = new Vector3(...(options?.centerOfRotation ?? [0, 0, 0]));
  const translation = pose.position
    .clone()
    .sub(centerOfRotation)
    .add(centerOfRotation.clone().applyQuaternion(pose.quaternion));

  return {
    translation: translation.toArray() as Vector3Tuple,
    rotation: quaternionToEulerDegrees(pose.quaternion),
  } satisfies ThreeSpaceMousePlatformPose;
}

export function getSpaceMousePlatformDeltaFromAffines(previousAffine: number[], nextAffine: number[]) {
  const previousPose = getSpaceMousePlatformPoseFromAffine(previousAffine);
  const nextPose = getSpaceMousePlatformPoseFromAffine(nextAffine);

  return {
    translation: [
      nextPose.translation[0] - previousPose.translation[0],
      nextPose.translation[1] - previousPose.translation[1],
      nextPose.translation[2] - previousPose.translation[2],
    ] as Vector3Tuple,
    rotation: [
      nextPose.rotation[0] - previousPose.rotation[0],
      nextPose.rotation[1] - previousPose.rotation[1],
      nextPose.rotation[2] - previousPose.rotation[2],
    ] as Vector3Tuple,
  } satisfies ThreeSpaceMousePlatformDelta;
}

export function applySpaceMousePlatformDelta(
  pose: ThreeSpaceMousePlatformPose,
  delta: ThreeSpaceMousePlatformDelta,
  options?: {
    translationScale?: number;
    rotationScale?: number;
  }
) {
  const translationScale = options?.translationScale ?? 1;
  const rotationScale = options?.rotationScale ?? 1;

  return {
    translation: [
      pose.translation[0] + delta.translation[0] * translationScale,
      pose.translation[1] + delta.translation[1] * translationScale,
      pose.translation[2] + delta.translation[2] * translationScale,
    ] as Vector3Tuple,
    rotation: [
      pose.rotation[0] + delta.rotation[0] * rotationScale,
      pose.rotation[1] + delta.rotation[1] * rotationScale,
      pose.rotation[2] + delta.rotation[2] * rotationScale,
    ] as Vector3Tuple,
  } satisfies ThreeSpaceMousePlatformPose;
}

export class ThreeSpaceMouseBridge {
  private controller: SpaceMouseControllerInstance | null = null;
  private animationFrameId: number | null = null;
  private animating = false;
  private disposed = false;
  private motionTarget: ThreeSpaceMouseMotionTarget = 'scene';
  private hasSelectionAffineUpdates = false;
  private previousPlatformViewMatrix: Matrix4Tuple | null = null;
  private pointerClientPosition: { x: number; y: number } | null = null;
  private readonly worldBox = new Box3();
  private readonly scratchMatrix = new Matrix4();
  private readonly raycaster = new Raycaster();
  private readonly lookOrigin = new Vector3();
  private readonly lookDirection = new Vector3(0, 1, 0);
  private readonly worldDirection = new Vector3();
  private lookAperture = 0.01;

  constructor(private readonly options: ThreeSpaceMouseBridgeOptions) {}

  setMotionTarget(target: ThreeSpaceMouseMotionTarget) {
    this.motionTarget = target;
    this.hasSelectionAffineUpdates = false;
    this.previousPlatformViewMatrix = target === 'platform' ? this.getActualViewMatrix() : null;
  }

  syncNavigationStateFromCamera() {
    if (this.motionTarget !== 'platform') {
      return;
    }

    this.previousPlatformViewMatrix = this.getActualViewMatrix();
  }

  async connect() {
    if (this.controller) {
      return true;
    }

    const ControllerCtor = await loadSpaceMouseScript();
    const viewport = this.options.getViewport();

    if (!ControllerCtor || !viewport || this.disposed) {
      return false;
    }

    viewport.addEventListener('pointermove', this.handlePointerMove);
    viewport.addEventListener('pointerenter', this.handlePointerMove);
    viewport.addEventListener('pointerdown', this.handlePointerDown);

    this.controller = new ControllerCtor(this);

    return this.controller.connect();
  }

  destroy() {
    this.disposed = true;
    this.stopAnimationLoop();

    const viewport = this.options.getViewport();
    viewport?.removeEventListener('pointermove', this.handlePointerMove);
    viewport?.removeEventListener('pointerenter', this.handlePointerMove);
    viewport?.removeEventListener('pointerdown', this.handlePointerDown);

    this.controller?.delete3dmouse();
    this.controller = null;
  }

  onConnect() {
    const viewport = this.options.getViewport();

    if (!viewport) {
      return;
    }

    this.controller?.create3dmouse(viewport, this.options.scene.appName);
  }

  on3dmouseCreated() {
    this.controller?.update3dcontroller({
      frame: {
        timingSource: 1,
      },
    });
  }

  onDisconnect() {
    this.stopAnimationLoop();
  }

  onStartMotion() {
    if (this.animating || this.disposed) {
      return;
    }

    if (this.motionTarget === 'platform') {
      this.hasSelectionAffineUpdates = false;
      this.previousPlatformViewMatrix = this.getActualViewMatrix();
    }

    this.animating = true;
    this.animationFrameId = window.requestAnimationFrame(this.handleAnimationFrame);
  }

  onStopMotion() {
    if (this.motionTarget === 'platform') {
      this.hasSelectionAffineUpdates = false;
      this.previousPlatformViewMatrix = this.getActualViewMatrix();
    }

    this.stopAnimationLoop();
  }

  getCoordinateSystem() {
    return [...(this.options.scene.coordinateSystem ?? SPACEMOUSE_Z_UP_COORDINATE_SYSTEM)];
  }

  getConstructionPlane() {
    return [...this.options.scene.constructionPlane];
  }

  getFloorPlane() {
    return [...(this.options.scene.floorPlane ?? this.options.scene.constructionPlane)];
  }

  getUnitsToMeters() {
    return this.options.scene.unitsToMeters ?? 1;
  }

  getFov() {
    const camera = this.getPerspectiveCamera();

    if (!camera) {
      return 0;
    }

    return getDiagonalFovRadians(camera.fov, camera.aspect);
  }

  getFrontView() {
    return [...(this.options.scene.frontView ?? this.getCoordinateSystem())];
  }

  getLookAt() {
    const camera = this.getCamera();
    const modelRoot = this.options.getModelRoot();

    if (!camera || !modelRoot || this.lookDirection.lengthSq() === 0) {
      return null;
    }

    modelRoot.updateWorldMatrix(true, true);
    this.raycaster.near = camera.near;
    this.raycaster.far = camera.far;
    this.raycaster.set(this.lookOrigin, this.lookDirection.clone().normalize());
    this.raycaster.params.Line.threshold = this.lookAperture / 2;
    this.raycaster.params.Points.threshold = this.lookAperture / 2;

    const hit = this.raycaster.intersectObject(modelRoot, true).find((entry) => entry.object.visible);

    return (hit?.point.toArray() as Vector3Tuple | undefined) ?? null;
  }

  getModelExtents() {
    const box = this.getModelBoundingBox();

    if (!box) {
      return [-1, -1, -1, 1, 1, 1];
    }

    return [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z];
  }

  getPerspective() {
    return this.getPerspectiveCamera() !== null;
  }

  getPivotPosition() {
    const controls = this.options.getControls();

    if (controls) {
      return controls.target.toArray();
    }

    const box = this.getModelBoundingBox();

    if (!box) {
      return [0, 0, 0];
    }

    return box.getCenter(new Vector3()).toArray();
  }

  getPointerPosition() {
    const camera = this.getCamera();
    const viewport = this.options.getViewport();

    if (!camera || !viewport) {
      return [0, 0, 0];
    }

    const rect = viewport.getBoundingClientRect();
    const clientX = this.pointerClientPosition?.x ?? rect.left + rect.width / 2;
    const clientY = this.pointerClientPosition?.y ?? rect.top + rect.height / 2;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const position = new Vector3(ndcX, ndcY, -1);

    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    position.unproject(camera);

    return position.toArray();
  }

  getViewExtents() {
    const camera = this.getOrthographicCamera();

    if (!camera) {
      return [-1, -1, -1, 1, 1, 1];
    }

    return [camera.left, camera.bottom, -camera.far, camera.right, camera.top, -camera.near];
  }

  getViewFrustum() {
    const camera = this.getPerspectiveCamera();

    if (!camera) {
      return [0, 0, 0, 0, 0.1, 20];
    }

    return getPerspectiveFrustum(camera);
  }

  getViewMatrix() {
    return this.getActualViewMatrix();
  }

  getViewRotatable() {
    return true;
  }

  getViewTarget() {
    const controls = this.options.getControls();

    return controls?.target.toArray() ?? this.getPivotPosition();
  }

  getSelectionAffine() {
    if (this.motionTarget !== 'platform' || !this.options.platformControl) {
      return null;
    }

    return (
      this.options.platformControl.getAffine?.() ??
      getSpaceMousePlatformAffineFromPose(this.options.platformControl.getPose())
    );
  }

  getSelectionEmpty() {
    return this.motionTarget !== 'platform';
  }

  getSelectionExtents() {
    return this.getModelExtents();
  }

  getFrameTimingSource() {
    return 1;
  }

  getFrameTime() {
    return performance.now();
  }

  setMoving(isMoving: boolean) {
    if (isMoving) {
      this.onStartMotion();
      return;
    }

    this.onStopMotion();
  }

  setTransaction(transaction: number) {
    if (transaction === 0) {
      this.hasSelectionAffineUpdates = false;
      this.syncControls();
    }
  }

  setViewMatrix(data: number[]) {
    if (this.motionTarget === 'platform') {
      if (!this.options.platformControl || this.hasSelectionAffineUpdates) {
        this.previousPlatformViewMatrix = [...data] as Matrix4Tuple;
        return;
      }

      const previousViewMatrix = new Matrix4().fromArray(this.previousPlatformViewMatrix ?? this.getActualViewMatrix());
      const nextViewMatrix = new Matrix4().fromArray(data);
      const currentPlatformAffine = this.getSelectionAffine();

      this.previousPlatformViewMatrix = [...data] as Matrix4Tuple;

      if (!currentPlatformAffine) {
        return;
      }

      const objectDeltaMatrix = previousViewMatrix.clone().multiply(nextViewMatrix.clone().invert());
      const objectDeltaTranslation = new Vector3();
      const objectDeltaRotation = new Quaternion();
      const objectDeltaScale = new Vector3();

      objectDeltaMatrix.decompose(objectDeltaTranslation, objectDeltaRotation, objectDeltaScale);
      const originalObjectDeltaRotation = objectDeltaRotation.clone();
      const correctedObjectDeltaRotation = objectDeltaRotation.clone().invert();
      let correctedObjectDeltaTranslation = objectDeltaTranslation;

      if (this.options.platformControl.getCenterOfRotation) {
        const currentPlatformMatrix = new Matrix4().fromArray(currentPlatformAffine);
        const rotationPivot = new Vector3(...this.options.platformControl.getCenterOfRotation()).applyMatrix4(
          currentPlatformMatrix
        );

        correctedObjectDeltaTranslation = objectDeltaTranslation
          .clone()
          .add(rotationPivot.clone().applyQuaternion(originalObjectDeltaRotation))
          .sub(rotationPivot.clone().applyQuaternion(correctedObjectDeltaRotation));
      }

      const correctedObjectDeltaMatrix = new Matrix4().compose(
        correctedObjectDeltaTranslation,
        correctedObjectDeltaRotation,
        objectDeltaScale
      );
      const nextPlatformAffine = correctedObjectDeltaMatrix.multiply(new Matrix4().fromArray(currentPlatformAffine));
      const nextPose =
        this.options.platformControl.poseFromAffine?.(nextPlatformAffine.toArray()) ??
        getSpaceMousePlatformPoseFromAffine(nextPlatformAffine.toArray());

      this.options.platformControl.setPose(nextPose);
      return;
    }

    const camera = this.getCamera();
    const controls = this.options.getControls();

    if (!camera) {
      return;
    }

    const currentDistanceToTarget = controls
      ? camera.position.distanceTo(controls.target)
      : (this.getModelBoundingBox()?.getSize(new Vector3()).length() ?? 1);

    this.scratchMatrix.fromArray(data);
    this.scratchMatrix.decompose(camera.position, camera.quaternion, camera.scale);
    camera.up.set(...this.options.scene.cameraUp);
    camera.updateMatrixWorld(true);

    if (controls) {
      controls.object = camera;
      camera.getWorldDirection(this.worldDirection);
      controls.target.fromArray(
        getTargetFromCameraPose(
          camera.position.toArray() as Vector3Tuple,
          this.worldDirection.toArray() as Vector3Tuple,
          currentDistanceToTarget
        )
      );
    }
  }

  setViewExtents(data: number[]) {
    if (this.motionTarget === 'platform') {
      return;
    }

    const camera = this.getOrthographicCamera();

    if (!camera) {
      return;
    }

    camera.left = data[0];
    camera.bottom = data[1];
    camera.right = data[3];
    camera.top = data[4];
    camera.updateProjectionMatrix();
  }

  setFov(diagonalFovRadians: number) {
    if (this.motionTarget === 'platform') {
      return;
    }

    const camera = this.getPerspectiveCamera();

    if (!camera) {
      return;
    }

    camera.fov = getVerticalFovDegreesFromDiagonalRadians(diagonalFovRadians, camera.aspect);
    camera.updateProjectionMatrix();
  }

  setTarget(data: number[]) {
    if (this.motionTarget === 'platform') {
      return;
    }

    const controls = this.options.getControls();
    const camera = this.getCamera();

    if (!controls || !camera) {
      return;
    }

    controls.object = camera;
    controls.target.fromArray(data);
    controls.update();
  }

  setPivotPosition(data: number[]) {
    this.setTarget(data);
  }

  setPivotVisible(_visible: boolean) {}

  setSelectionAffine(data: number[]) {
    if (this.motionTarget !== 'platform' || !this.options.platformControl) {
      return;
    }

    this.hasSelectionAffineUpdates = true;
    const nextPose = this.options.platformControl.poseFromAffine?.(data) ?? getSpaceMousePlatformPoseFromAffine(data);

    this.options.platformControl.setPose(nextPose);
  }

  setLookFrom(data: number[]) {
    this.lookOrigin.fromArray(data);
  }

  setLookDirection(data: number[]) {
    this.lookDirection.fromArray(data);
  }

  setLookAperture(aperture: number) {
    this.lookAperture = aperture;
  }

  setSelectionOnly(_selectionOnly: boolean) {}

  setActiveCommand(_id: string | null) {}

  setKeyPress(_data: unknown) {}

  setKeyRelease(_data: unknown) {}

  setSettingsChanged(_data: unknown) {}

  private readonly handlePointerMove = (event: PointerEvent) => {
    this.pointerClientPosition = {
      x: event.clientX,
      y: event.clientY,
    };
  };

  private readonly handlePointerDown = () => {
    this.options.getViewport()?.focus();
  };

  private readonly handleAnimationFrame = (time: number) => {
    if (!this.animating || this.disposed) {
      return;
    }

    this.controller?.update3dcontroller({
      frame: {
        time,
      },
    });
    this.syncControls();
    this.animationFrameId = window.requestAnimationFrame(this.handleAnimationFrame);
  };

  private stopAnimationLoop() {
    this.animating = false;

    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private syncControls() {
    const camera = this.getCamera();
    const controls = this.options.getControls();

    if (!camera) {
      return;
    }

    camera.up.set(...this.options.scene.cameraUp);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    if (controls) {
      controls.object = camera;
      controls.update();
    }
  }

  private getActualViewMatrix(): Matrix4Tuple {
    const camera = this.getCamera();

    if (!camera) {
      return [...(this.options.scene.coordinateSystem ?? SPACEMOUSE_Z_UP_COORDINATE_SYSTEM)] as Matrix4Tuple;
    }

    camera.updateMatrixWorld(true);

    return camera.matrixWorld.toArray() as Matrix4Tuple;
  }

  private getCamera() {
    const camera = this.options.getActiveCamera();

    if (!camera) {
      return null;
    }

    camera.up.set(...this.options.scene.cameraUp);

    return camera;
  }

  private getPerspectiveCamera() {
    const camera = this.getCamera();

    return camera instanceof PerspectiveCamera ? camera : null;
  }

  private getOrthographicCamera() {
    const camera = this.getCamera();

    return camera instanceof OrthographicCamera ? camera : null;
  }

  private getModelBoundingBox() {
    const modelRoot = this.options.getModelRoot();

    if (!modelRoot) {
      return null;
    }

    modelRoot.updateWorldMatrix(true, true);
    this.worldBox.setFromObject(modelRoot);

    return this.worldBox.isEmpty() ? null : this.worldBox;
  }
}
