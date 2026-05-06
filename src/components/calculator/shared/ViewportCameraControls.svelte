<script lang="ts">
  import type { CameraProjectionMode } from './scene-controls';
  import type { ThreeSpaceMouseMotionTarget } from './space-mouse';

  type Props = {
    activeCameraMode?: CameraProjectionMode;
    onResetView: () => void | Promise<void>;
    onActivateSpaceMouse?: (() => void | Promise<void>) | null;
    onShowTopFovOverlay?: (() => void | Promise<void>) | null;
    onSetCameraMode?: ((mode: CameraProjectionMode) => void | Promise<void>) | null;
    onSetSpaceMouseMotionTarget?: ((target: ThreeSpaceMouseMotionTarget) => void | Promise<void>) | null;
    spaceMouseActive?: boolean;
    spaceMouseMotionTarget?: ThreeSpaceMouseMotionTarget | null;
    topFovOverlayActive?: boolean;
    topOffsetPx?: number;
  };

  const {
    activeCameraMode = 'perspective',
    onResetView,
    onActivateSpaceMouse = null,
    onShowTopFovOverlay = null,
    onSetCameraMode = null,
    onSetSpaceMouseMotionTarget = null,
    spaceMouseActive = false,
    spaceMouseMotionTarget = null,
    topFovOverlayActive = false,
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

  const showTopFovOverlay = async () => {
    if (!onShowTopFovOverlay) {
      return;
    }

    await onShowTopFovOverlay();
  };

  const activateSpaceMouse = async () => {
    if (!onActivateSpaceMouse) {
      return;
    }

    await onActivateSpaceMouse();
  };

  const setSpaceMouseMotionTarget = async (target: ThreeSpaceMouseMotionTarget) => {
    if (!onSetSpaceMouseMotionTarget) {
      return;
    }

    await onSetSpaceMouseMotionTarget(target);
  };
</script>

<div class="scene-controls-wrapper pointer-events-none absolute right-4 z-10" style={`top: ${topOffsetPx}px;`}>
  <div class="pointer-events-auto scene-controls-group flex flex-col items-end gap-1.5 text-zinc-700">
    <button
      type="button"
      class="scene-control-btn grid h-8 w-8 place-items-center rounded-full border border-white/30 bg-white/10 text-zinc-500 backdrop-blur-sm transition hover:border-white/60 hover:bg-white/25 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2"
      aria-label="Reset camera view"
      title="Reset view"
      onclick={resetView}
    >
      <svg
        viewBox="0 0 24 24"
        class="scene-control-icon h-4.5 w-4.5"
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

    {#if onActivateSpaceMouse}
      <button
        type="button"
        class={[
          'scene-control-btn hidden h-8 w-8 place-items-center rounded-full border backdrop-blur-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 lg:grid',
          spaceMouseActive
            ? 'border-blue-300/80 bg-white/30 shadow-[0_2px_12px_rgba(59,130,246,0.12)]'
            : 'border-white/30 bg-white/10 hover:border-white/60 hover:bg-white/25',
        ]}
        aria-pressed={spaceMouseActive}
        aria-label="Activate 3Dconnexion SpaceMouse"
        title={spaceMouseActive ? '3Dconnexion SpaceMouse active' : 'Activate 3Dconnexion SpaceMouse'}
        onclick={activateSpaceMouse}
      >
        <svg viewBox="68 44 55 55" class="scene-control-icon h-4.5 w-4.5" aria-hidden="true">
          <path
            d="M118.787 64.533c-1.848.577-11.715 7.565-11.715 7.565l-7.795 26.498s11.945-8.263 16.643-15.396c4.107-6.216 6.721-15.689 4.908-18.101-.471-.629-1.201-.832-2.041-.566z"
            fill="#dbb042"
          ></path>
          <path
            d="M82.851 52.021c-.494.296-.501.706-.316 1.062.174.342.616.474 1.089.25l.916-.421c1.823-.968 6.105-3.23 10.852-2.577 3.203.438 6.505 1.652 10.101 3.713 3.309 1.896 5.139 3.826 5.293 5.591.006.079.01.16.01.236 0 .948-.502 1.844-1.496 2.675-2.457 2.044-5.824 3.646-6.973 4.185-2.066-1.041-14.916-7.511-15.334-7.708-.543-.252-.953-.068-1.148.192-.247.318-.214.784.082 1.134.125.148.322.281 1.396.96 1.411.892 3.769 2.39 5.713 3.943 2.854 2.284 4.666 5.207 4.964 8.017.26 2.443.164 6.112-1.799 9.731-3.072 5.659-7.792 6.917-14.024 3.729-5.09-2.604-9.756-5.488-11.045-6.298l4.888-17.487a.804.804 0 0 0 .034-.262c0-.378-.223-.716-.588-.827a.754.754 0 0 0-.945.504l-6.97 20.551 28.796 15.681 8.464-28.764 17.377-11.275L94.672 44.86l-11.821 7.161z"
            fill="#416379"
          ></path>
        </svg>
        <span class="sr-only">Activate 3Dconnexion SpaceMouse</span>
      </button>
    {/if}

    {#if onSetSpaceMouseMotionTarget && spaceMouseMotionTarget}
      <button
        type="button"
        class={[
          'scene-control-btn grid h-8 w-8 place-items-center rounded-full border backdrop-blur-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2',
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
          class="scene-control-icon h-4.5 w-4.5"
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
          'scene-control-btn grid h-8 w-8 place-items-center rounded-full border backdrop-blur-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2',
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
          class="scene-control-icon h-4.5 w-4.5"
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
          'scene-control-btn grid h-8 w-8 place-items-center rounded-full border backdrop-blur-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2',
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
          class="scene-control-icon h-4.5 w-4.5"
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

    {#if onShowTopFovOverlay}
      <button
        type="button"
        class={[
          'scene-control-btn grid h-8 w-8 place-items-center rounded-full border backdrop-blur-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2',
          topFovOverlayActive
            ? 'border-blue-300/80 bg-white/30 text-blue-600 shadow-[0_2px_12px_rgba(59,130,246,0.12)]'
            : 'border-white/30 bg-white/10 text-zinc-500 hover:border-white/60 hover:bg-white/25 hover:text-zinc-900',
        ]}
        aria-pressed={topFovOverlayActive}
        aria-label="Show top FOV overlay"
        title="Top FOV"
        onclick={showTopFovOverlay}
      >
        <svg
          viewBox="0 0 24 24"
          class="scene-control-icon h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M13.3 6.8a6.7 6.7 0 0 1 0 10.4"></path>
          <path d="M8.2 9.1 17.6 5.8"></path>
          <path d="M8.2 14.9 17.6 18.2"></path>
        </svg>
        <span class="sr-only">Top FOV</span>
      </button>
    {/if}
  </div>
</div>

<style>
  @media (max-width: 1023px) {
    .scene-controls-wrapper {
      right: auto !important;
      left: 1rem;
      top: 0.75rem !important;
    }

    .scene-controls-group {
      align-items: flex-start !important;
    }
  }

  @media (pointer: coarse) {
    .scene-controls-group {
      gap: 0.5rem;
    }

    :global(.scene-control-btn) {
      width: 2.5rem !important;
      height: 2.5rem !important;
    }

    :global(.scene-control-icon) {
      width: 1.25rem !important;
      height: 1.25rem !important;
    }
  }
</style>
