<script lang="ts">
  import type { MotionProfileDiagramData, MotionProfileSegment } from './motion-profile-diagram';

  let { diagram }: { diagram: MotionProfileDiagramData } = $props();

  const width = 320;
  const chartHeight = 72;
  const labelY = 14;
  const totalHeight = chartHeight;

  const labels: Record<MotionProfileSegment['kind'], string> = {
    accel: 'Accel',
    const: 'Const',
    decel: 'Decel',
    dwell: 'Dwell',
  };

  function toX(value: number): number {
    return value * width;
  }

  function labelCenter(start: number, end: number): number {
    return toX((start + end) / 2);
  }

  function showLabel(segment: MotionProfileSegment): boolean {
    return diagram.labelVisibility[segment.kind];
  }
</script>

<div class="motion-profile-card">
  <svg viewBox={`0 0 ${width} ${totalHeight}`} class="motion-profile-svg" aria-label="Phase timing diagram" role="img">
    {#each diagram.segments as segment}
      <line class="phase-boundary" x1={toX(segment.end)} y1="0" x2={toX(segment.end)} y2={totalHeight} />
      {#if showLabel(segment)}
        <text x={labelCenter(segment.start, segment.end)} y={labelY} text-anchor="middle" class="segment-label">
          {labels[segment.kind]}
        </text>
      {/if}
    {/each}

    <path d={diagram.velocityPath} transform={`scale(${width}, ${chartHeight})`} class="trace" />
  </svg>
</div>

<style>
  .motion-profile-card {
    border: 1px solid rgb(0 0 0 / 0.12);
    background: linear-gradient(180deg, rgb(255 255 255) 0%, rgb(245 245 245) 100%);
    padding: 0.75rem;
  }

  .motion-profile-svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    color: rgb(38 38 38);
  }

  .trace {
    fill: none;
    stroke: currentColor;
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  .segment-label {
    fill: rgb(115 115 115);
  }

  .segment-label {
    font-size: 9px;
  }

  .phase-boundary {
    stroke: rgb(200 200 200);
    stroke-dasharray: 3 3;
  }
</style>
