<script lang="ts">
  import type { PlannerGeometry } from './geometry';
  import type { PlannerInput } from './types';

  type Props = {
    input: PlannerInput;
    geometry: PlannerGeometry;
  };

  const { input, geometry }: Props = $props();

  const seatBaseLengthMm = 420;
  const seatBackLengthMm = 420;
  const wheelRadiusMm = 135;
  const pedalLengthMm = 170;

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
</script>

<section class="">
  <div class="overflow-hidden">
    <svg {viewBox} class="h-auto w-full" role="img" aria-label="Aluminum rig side view preview">
      <rect x="-80" y="-40" width={input.baseLengthMm + 200} height={drawingHeightMm + 80} fill="url(#planner-grid)" />

      <defs>
        <pattern id="planner-grid" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#e4e4e7" stroke-width="1" />
        </pattern>
      </defs>

      <line
        x1="0"
        y1={toSvgY(0)}
        x2={input.baseLengthMm}
        y2={toSvgY(0)}
        stroke="#3f3f46"
        stroke-width="18"
        stroke-linecap="round"
      />
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
      <circle
        cx={wheelCenterX}
        cy={toSvgY(wheelCenterY)}
        r={wheelRadiusMm}
        fill="none"
        stroke="#d97706"
        stroke-width="16"
      />
      <circle cx={wheelCenterX} cy={toSvgY(wheelCenterY)} r="22" fill="#d97706" />

      <text x="16" y="32" fill="#71717a" font-size="28" font-weight="600">Base</text>
      <text x={input.seatXMm - 20} y={toSvgY(input.seatYMm + 70)} fill="#0f766e" font-size="28" font-weight="600"
        >Seat</text
      >
      <text x={input.pedalXMm - 60} y={toSvgY(input.pedalYMm + 80)} fill="#2563eb" font-size="28" font-weight="600"
        >Pedals</text
      >
      <text
        x={wheelCenterX - 70}
        y={toSvgY(wheelCenterY + wheelRadiusMm + 70)}
        fill="#a16207"
        font-size="28"
        font-weight="600">Wheel</text
      >
    </svg>
  </div>
</section>
