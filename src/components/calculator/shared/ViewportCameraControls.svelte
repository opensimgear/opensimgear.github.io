<script lang="ts">
  import type { CameraProjectionMode } from './scene-controls';
  import type { ThreeSpaceMouseMotionTarget } from './space-mouse';

  type Props = {
    activeCameraMode?: CameraProjectionMode;
    onResetView: () => void | Promise<void>;
    onSetCameraMode?: ((mode: CameraProjectionMode) => void | Promise<void>) | null;
    onSetSpaceMouseMotionTarget?: ((target: ThreeSpaceMouseMotionTarget) => void | Promise<void>) | null;
    spaceMouseMotionTarget?: ThreeSpaceMouseMotionTarget | null;
    topOffsetPx?: number;
  };

  const {
    activeCameraMode = 'perspective',
    onResetView,
    onSetCameraMode = null,
    onSetSpaceMouseMotionTarget = null,
    spaceMouseMotionTarget = null,
    topOffsetPx = 0,
  }: Props = $props();

  const resetView = async () => {
    await onResetView();
  };

  const setCameraMode = async (mode: CameraProjectionMode) => {
    if (!onSetCameraMode) {
      return;
    }

    await onSetCameraMode(mode);
  };

  const setSpaceMouseMotionTarget = async (target: ThreeSpaceMouseMotionTarget) => {
    if (!onSetSpaceMouseMotionTarget) {
      return;
    }

    await onSetSpaceMouseMotionTarget(target);
  };
</script>

<div class="pointer-events-none absolute right-4 z-10" style={`top: ${topOffsetPx}px;`}>
  <div class="pointer-events-auto flex flex-col items-end gap-1.5 text-zinc-700">
    <button
      type="button"
      class="grid h-8 w-8 place-items-center rounded-full border border-white/30 bg-white/10 text-zinc-500 backdrop-blur-sm transition hover:border-white/60 hover:bg-white/25 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2"
      aria-label="Reset camera view"
      title="Reset view"
      onclick={resetView}
    >
      <svg
        viewBox="0 0 24 24"
        class="h-4.5 w-4.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M20 11a8 8 0 1 0-2.34 5.66"></path>
        <path d="M20 4v7h-7"></path>
      </svg>
      <span class="sr-only">Reset view</span>
    </button>

    {#if onSetSpaceMouseMotionTarget && spaceMouseMotionTarget}
      <button
        type="button"
        class={[
          'grid h-8 w-8 place-items-center rounded-full border backdrop-blur-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2',
          spaceMouseMotionTarget === 'platform'
            ? 'border-blue-300/80 bg-white/30 text-blue-600 shadow-[0_2px_12px_rgba(59,130,246,0.12)]'
            : 'border-white/30 bg-white/10 text-zinc-500 hover:border-white/60 hover:bg-white/25 hover:text-zinc-900',
        ]}
        aria-pressed={spaceMouseMotionTarget === 'platform'}
        aria-label="Make SpaceMouse control platform"
        title={spaceMouseMotionTarget === 'platform' ? 'SpaceMouse: Platform' : 'SpaceMouse: Scene'}
        onclick={async () => {
          await setSpaceMouseMotionTarget(spaceMouseMotionTarget === 'platform' ? 'scene' : 'platform');
        }}
      >
        <svg
          viewBox="0 0 24 24"
          class="h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="6" y="3" width="12" height="6" rx="1.5"></rect>
          <path d="M4 13h16"></path>
          <path d="M7 13v4.5A1.5 1.5 0 0 0 8.5 19h7a1.5 1.5 0 0 0 1.5-1.5V13"></path>
          <path d="M10 16h4"></path>
        </svg>
        <span class="sr-only">Toggle SpaceMouse platform control</span>
      </button>
    {/if}

    {#if onSetCameraMode}
      <button
        type="button"
        class={[
          'grid h-8 w-8 place-items-center rounded-full border backdrop-blur-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2',
          activeCameraMode === 'perspective'
            ? 'border-blue-300/80 bg-white/30 text-blue-600 shadow-[0_2px_12px_rgba(59,130,246,0.12)]'
            : 'border-white/30 bg-white/10 text-zinc-500 hover:border-white/60 hover:bg-white/25 hover:text-zinc-900',
        ]}
        aria-pressed={activeCameraMode === 'perspective'}
        aria-label="Use perspective camera"
        title="Perspective"
        onclick={async () => {
          await setCameraMode('perspective');
        }}
      >
        <svg
          viewBox="0 0 24 24"
          class="h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8h12l3 8H3z"></path>
          <path d="M9 8l-1.5 8"></path>
          <path d="M15 8l1.5 8"></path>
        </svg>
        <span class="sr-only">Perspective</span>
      </button>

      <button
        type="button"
        class={[
          'grid h-8 w-8 place-items-center rounded-full border backdrop-blur-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2',
          activeCameraMode === 'orthographic'
            ? 'border-blue-300/80 bg-white/30 text-blue-600 shadow-[0_2px_12px_rgba(59,130,246,0.12)]'
            : 'border-white/30 bg-white/10 text-zinc-500 hover:border-white/60 hover:bg-white/25 hover:text-zinc-900',
        ]}
        aria-pressed={activeCameraMode === 'orthographic'}
        aria-label="Use orthographic camera"
        title="Orthographic"
        onclick={async () => {
          await setCameraMode('orthographic');
        }}
      >
        <svg
          viewBox="0 0 24 24"
          class="h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="5" y="5" width="14" height="14" rx="1.5"></rect>
          <path d="M9 5v14"></path>
          <path d="M15 5v14"></path>
        </svg>
        <span class="sr-only">Orthographic</span>
      </button>
    {/if}
  </div>
</div>
