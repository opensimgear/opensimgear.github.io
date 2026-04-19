<script lang="ts">
  import type { GuidanceItem } from './ergonomics';
  import type { PlannerGeometry } from './geometry';
  import type { PlannerInput } from './types';

  type Props = {
    input: PlannerInput;
    geometry: PlannerGeometry;
    guidance: GuidanceItem[];
  };

  const { input, geometry, guidance }: Props = $props();

  const seatBaseLengthMm = 420;
  const seatBackLengthMm = 420;
  const wheelRadiusMm = 135;
  const pedalLengthMm = 170;
  const baseDepthMm = 60;

  const wheelCenterX = $derived(input.wheelXMm + geometry.wheelMountOffsets.wheelCenterOffsetXMm);
  const wheelCenterY = $derived(input.wheelYMm + geometry.wheelMountOffsets.wheelCenterOffsetYMm);
  const seatBaseEndX = $derived(input.seatXMm + seatBaseLengthMm);
  const seatBackEndX = $derived(input.seatXMm - Math.cos((input.seatBackAngleDeg * Math.PI) / 180) * seatBackLengthMm);
  const seatBackEndY = $derived(input.seatYMm + Math.sin((input.seatBackAngleDeg * Math.PI) / 180) * seatBackLengthMm);
  const pedalEndX = $derived(input.pedalXMm + Math.cos((input.pedalAngleDeg * Math.PI) / 180) * pedalLengthMm);
  const pedalEndY = $derived(input.pedalYMm + Math.sin((input.pedalAngleDeg * Math.PI) / 180) * pedalLengthMm);
  const drawingHeightMm = $derived(
    Math.max(input.seatYMm + 420, wheelCenterY + wheelRadiusMm + 120, input.pedalYMm + 240, input.baseHeightMm + 180)
  );
  const viewBox = $derived(`-80 -40 ${input.baseLengthMm + 200} ${drawingHeightMm + 80}`);

  function toSvgY(value: number) {
    return drawingHeightMm - value;
  }

  function getGuidanceClassName(severity: GuidanceItem['severity']) {
    if (severity === 'good') {
      return 'border-emerald-300 bg-emerald-50 text-emerald-700';
    }

    if (severity === 'review') {
      return 'border-amber-300 bg-amber-50 text-amber-700';
    }

    return 'border-rose-300 bg-rose-50 text-rose-700';
  }
</script>

<section class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
  <div class="mb-3 flex items-center justify-between gap-3">
    <div>
      <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">2D side view</p>
      <h2 class="text-sm font-semibold text-zinc-900">Rig envelope</h2>
    </div>
    <div class="text-right text-[11px] text-zinc-500">
      <div>{input.presetType.toUpperCase()} preset</div>
      <div>{input.wheelMountType} wheel mount</div>
    </div>
  </div>

  <div class="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
    <svg viewBox={viewBox} class="h-auto w-full" role="img" aria-label="Aluminium rig side view preview">
      <rect x="-80" y="-40" width={input.baseLengthMm + 200} height={drawingHeightMm + 80} fill="url(#planner-grid)" />

      <defs>
        <pattern id="planner-grid" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#e4e4e7" stroke-width="1" />
        </pattern>
      </defs>

      <line x1="0" y1={toSvgY(0)} x2={input.baseLengthMm} y2={toSvgY(0)} stroke="#3f3f46" stroke-width="18" stroke-linecap="round" />
      <line
        x1="0"
        y1={toSvgY(input.baseHeightMm)}
        x2={input.baseLengthMm}
        y2={toSvgY(input.baseHeightMm)}
        stroke="#71717a"
        stroke-width="10"
        stroke-linecap="round"
      />
      <line x1="20" y1={toSvgY(0)} x2="20" y2={toSvgY(input.baseHeightMm)} stroke="#71717a" stroke-width="10" />
      <line
        x1={input.baseLengthMm - 20}
        y1={toSvgY(0)}
        x2={input.baseLengthMm - 20}
        y2={toSvgY(input.baseHeightMm)}
        stroke="#71717a"
        stroke-width="10"
      />

      <line
        x1={input.seatXMm}
        y1={toSvgY(input.seatYMm)}
        x2={seatBaseEndX}
        y2={toSvgY(input.seatYMm + 16)}
        stroke="#0f766e"
        stroke-width="18"
        stroke-linecap="round"
      />
      <line
        x1={input.seatXMm}
        y1={toSvgY(input.seatYMm)}
        x2={seatBackEndX}
        y2={toSvgY(seatBackEndY)}
        stroke="#14b8a6"
        stroke-width="18"
        stroke-linecap="round"
      />

      <line
        x1={input.pedalXMm - 20}
        y1={toSvgY(input.pedalYMm)}
        x2={pedalEndX}
        y2={toSvgY(pedalEndY)}
        stroke="#2563eb"
        stroke-width="16"
        stroke-linecap="round"
      />

      <line
        x1={input.wheelXMm + geometry.wheelMountOffsets.mountXMm}
        y1={toSvgY(input.baseHeightMm)}
        x2={wheelCenterX}
        y2={toSvgY(wheelCenterY)}
        stroke="#a16207"
        stroke-width="12"
        stroke-linecap="round"
      />
      <circle cx={wheelCenterX} cy={toSvgY(wheelCenterY)} r={wheelRadiusMm} fill="none" stroke="#d97706" stroke-width="16" />
      <circle cx={wheelCenterX} cy={toSvgY(wheelCenterY)} r="22" fill="#d97706" />

      <text x="16" y="32" fill="#71717a" font-size="28" font-weight="600">Base</text>
      <text x={input.seatXMm - 20} y={toSvgY(input.seatYMm + 70)} fill="#0f766e" font-size="28" font-weight="600">Seat</text>
      <text x={input.pedalXMm - 60} y={toSvgY(input.pedalYMm + 80)} fill="#2563eb" font-size="28" font-weight="600">Pedals</text>
      <text x={wheelCenterX - 70} y={toSvgY(wheelCenterY + wheelRadiusMm + 70)} fill="#a16207" font-size="28" font-weight="600"
        >Wheel</text
      >
    </svg>
  </div>

  <div class="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
    <div class="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 sm:grid-cols-2">
      <div class="rounded-md bg-white px-3 py-2">
        <div class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Base length</div>
        <div class="mt-1 font-semibold text-zinc-900">{input.baseLengthMm} mm</div>
      </div>
      <div class="rounded-md bg-white px-3 py-2">
        <div class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Wheel reach</div>
        <div class="mt-1 font-semibold text-zinc-900">{geometry.wheelReachMm} mm</div>
      </div>
      <div class="rounded-md bg-white px-3 py-2">
        <div class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Leg extension</div>
        <div class="mt-1 font-semibold text-zinc-900">{geometry.legExtensionMm} mm</div>
      </div>
      <div class="rounded-md bg-white px-3 py-2">
        <div class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Seat / pedal height</div>
        <div class="mt-1 font-semibold text-zinc-900">{input.seatYMm} / {input.pedalYMm} mm</div>
      </div>
    </div>

    <div class="grid gap-2">
      {#each guidance as item (item.id)}
        <div class={`rounded-lg border px-3 py-2 text-xs ${getGuidanceClassName(item.severity)}`}>
          <div class="font-semibold">{item.id === 'elbow-angle' ? 'Elbow angle' : 'Knee angle'}: {item.angleDeg} deg</div>
          <div class="mt-1 leading-relaxed">{item.detail}</div>
        </div>
      {/each}
    </div>
  </div>
</section>
