<script lang="ts">
  import { useTask, useThrelte } from '@threlte/core';
  import type { WebGLRenderer } from 'three';

  import { POSTURE_SKELETON_OVERLAY_LAYER } from './posture-overlay';

  const { renderer, scene, camera, autoRenderTask } = useThrelte<WebGLRenderer>();

  useTask(
    'posture-skeleton-overlay-render',
    () => {
      const activeCamera = camera.current;
      const previousLayerMask = activeCamera.layers.mask;
      const previousAutoClear = renderer.autoClear;

      renderer.autoClear = false;
      renderer.clearDepth();
      activeCamera.layers.set(POSTURE_SKELETON_OVERLAY_LAYER);
      renderer.render(scene, activeCamera);
      activeCamera.layers.mask = previousLayerMask;
      renderer.autoClear = previousAutoClear;
    },
    {
      after: autoRenderTask,
      autoInvalidate: false,
    }
  );
</script>
