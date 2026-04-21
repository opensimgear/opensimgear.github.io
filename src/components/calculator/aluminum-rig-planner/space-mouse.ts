import { Box3, Matrix4, Object3D, OrthographicCamera, PerspectiveCamera, Raycaster, Vector3 } from 'three';
import type { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { SCENE_VIEW } from './constants';

type Vector3Tuple = [number, number, number];
type Vector4Tuple = [number, number, number, number];
type Matrix4Tuple = [
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

type SpaceMouseControllerInstance = {
  connect(): boolean;
  create3dmouse(viewport: HTMLElement, name: string): void;
  delete3dmouse(): void;
  update3dcontroller(payload: Record<string, unknown>): void;
};

type SpaceMouseControllerCtor = new (client: PlannerSpaceMouseBridge) => SpaceMouseControllerInstance;

declare global {
  interface Window {
    _3Dconnexion?: SpaceMouseControllerCtor;
  }
}

export const SPACEMOUSE_Z_UP_COORDINATE_SYSTEM: Matrix4Tuple = [
  1, 0, 0, 0,
  0, 0, -1, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
];

const SPACEMOUSE_APP_NAME = 'OpenSimGear Rig Planner';

let spaceMouseScriptPromise: Promise<SpaceMouseControllerCtor | null> | null = null;

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

async function loadSpaceMouseScript(scriptUrl: string) {
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
        existingScript.addEventListener(
          'load',
          () => resolve(window._3Dconnexion ?? null),
          { once: true }
        );
        existingScript.addEventListener('error', () => reject(new Error('3Dconnexion script failed to load')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.dataset['3dconnexionScript'] = 'true';
      script.onload = () => resolve(window._3Dconnexion ?? null);
      script.onerror = () => reject(new Error('3Dconnexion script failed to load'));
      document.head.appendChild(script);
    }).catch(() => null);
  }

  return spaceMouseScriptPromise;
}

export type PlannerSpaceMouseBridgeOptions = {
  scriptUrl: string;
  getControls: () => ThreeOrbitControls | null;
  getModelRoot: () => Object3D | null;
  getViewport: () => HTMLElement | null;
  getActiveCamera: () => PerspectiveCamera | OrthographicCamera | null;
};

export class PlannerSpaceMouseBridge {
  private controller: SpaceMouseControllerInstance | null = null;
  private animationFrameId: number | null = null;
  private animating = false;
  private disposed = false;
  private pointerClientPosition: { x: number; y: number } | null = null;
  private readonly worldBox = new Box3();
  private readonly scratchMatrix = new Matrix4();
  private readonly raycaster = new Raycaster();
  private readonly lookOrigin = new Vector3();
  private readonly lookDirection = new Vector3(0, 1, 0);
  private lookAperture = 0.01;

  constructor(private readonly options: PlannerSpaceMouseBridgeOptions) {}

  async connect() {
    const ControllerCtor = await loadSpaceMouseScript(this.options.scriptUrl);
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

    this.controller?.create3dmouse(viewport, SPACEMOUSE_APP_NAME);
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

    this.animating = true;
    this.animationFrameId = window.requestAnimationFrame(this.handleAnimationFrame);
  }

  onStopMotion() {
    this.stopAnimationLoop();
  }

  getCoordinateSystem() {
    return [...SPACEMOUSE_Z_UP_COORDINATE_SYSTEM];
  }

  getConstructionPlane() {
    return buildPlaneEquation(
      [0, 0, SCENE_VIEW.gridPosition[2]],
      [SCENE_VIEW.cameraUp[0], SCENE_VIEW.cameraUp[1], SCENE_VIEW.cameraUp[2]]
    );
  }

  getFloorPlane() {
    return this.getConstructionPlane();
  }

  getUnitsToMeters() {
    return 1;
  }

  getFov() {
    const camera = this.getPerspectiveCamera();

    if (!camera) {
      return 0;
    }

    return getDiagonalFovRadians(camera.fov, camera.aspect);
  }

  getFrontView() {
    return [...SPACEMOUSE_Z_UP_COORDINATE_SYSTEM];
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
    const camera = this.getCamera();

    if (!camera) {
      return [...SPACEMOUSE_Z_UP_COORDINATE_SYSTEM];
    }

    camera.updateMatrixWorld(true);

    return camera.matrixWorld.toArray();
  }

  getViewRotatable() {
    return true;
  }

  getViewTarget() {
    const controls = this.options.getControls();

    return controls?.target.toArray() ?? this.getPivotPosition();
  }

  getSelectionAffine() {
    return null;
  }

  getSelectionEmpty() {
    return true;
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
      this.syncControls();
    }
  }

  setViewMatrix(data: number[]) {
    const camera = this.getCamera();
    const controls = this.options.getControls();

    if (!camera) {
      return;
    }

    this.scratchMatrix.fromArray(data);
    this.scratchMatrix.decompose(camera.position, camera.quaternion, camera.scale);
    camera.up.set(...SCENE_VIEW.cameraUp);
    camera.updateMatrixWorld(true);

    if (controls) {
      controls.object = camera;
    }
  }

  setViewExtents(data: number[]) {
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
    const camera = this.getPerspectiveCamera();

    if (!camera) {
      return;
    }

    camera.fov = getVerticalFovDegreesFromDiagonalRadians(diagonalFovRadians, camera.aspect);
    camera.updateProjectionMatrix();
  }

  setTarget(data: number[]) {
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

  setSelectionAffine(_data: number[]) {}

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

    camera.up.set(...SCENE_VIEW.cameraUp);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    if (controls) {
      controls.object = camera;
      controls.update();
    }
  }

  private getCamera() {
    const camera = this.options.getActiveCamera();

    if (!camera) {
      return null;
    }

    camera.up.set(...SCENE_VIEW.cameraUp);

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
