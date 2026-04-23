<script lang="ts">
  import { T } from '@threlte/core';
  import type { Mesh, MeshBasicMaterial } from 'three';

  import type { PosturePoint } from './posture';
  import { POSTURE_SKELETON_OVERLAY_LAYER } from './posture-overlay';

  type Props = {
    color: string;
    length: number;
    position: PosturePoint;
    radius: number;
    renderOrder: number;
    rotation: PosturePoint;
    segments: number;
  };

  const { color, length, position, radius, renderOrder, rotation, segments }: Props = $props();
  const clearDepthBeforeRender: Mesh['onBeforeRender'] = (renderer) => {
    renderer.clearDepth();
  };

  function configureMesh(mesh: Mesh) {
    mesh.frustumCulled = false;
    mesh.layers.set(POSTURE_SKELETON_OVERLAY_LAYER);
    mesh.renderOrder = renderOrder;
    mesh.onBeforeRender = clearDepthBeforeRender;
  }

  function configureMaterial(material: MeshBasicMaterial) {
    material.depthTest = false;
    material.depthWrite = false;
    material.opacity = 1;
    material.toneMapped = false;
    material.transparent = true;
    material.needsUpdate = true;
  }
</script>

<T.Mesh oncreate={configureMesh} {position} {rotation}>
  <T.CylinderGeometry args={[radius, radius, length, segments]} />
  <T.MeshBasicMaterial oncreate={configureMaterial} {color} />
</T.Mesh>
