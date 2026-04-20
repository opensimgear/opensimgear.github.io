<script lang="ts">
  import { DEG_TO_RAD, SIDE_VIEW } from './constants';
  import type { PlannerGeometry } from './geometry';
  import type { PlannerInput } from './types';

  type Props = {
    input: PlannerInput;
    geometry: PlannerGeometry;
  };

  const { input, geometry }: Props = $props();

  const wheelCenterX = $derived(input.wheelXMm + geometry.wheelMountOffsets.wheelCenterOffsetXMm);
  const wheelCenterY = $derived(input.wheelYMm + geometry.wheelMountOffsets.wheelCenterOffsetYMm);
  const seatBaseEndX = $derived(input.seatXMm + SIDE_VIEW.seatBaseLengthMm);
  const seatBackEndX = $derived(
    input.seatXMm - Math.cos(input.seatBackAngleDeg * DEG_TO_RAD) * SIDE_VIEW.seatBackLengthMm
  );
  const seatBackEndY = $derived(
    input.seatYMm + Math.sin(input.seatBackAngleDeg * DEG_TO_RAD) * SIDE_VIEW.seatBackLengthMm
  );
  const pedalEndX = $derived(input.pedalXMm + Math.cos(input.pedalAngleDeg * DEG_TO_RAD) * SIDE_VIEW.pedalLengthMm);
  const pedalEndY = $derived(input.pedalYMm + Math.sin(input.pedalAngleDeg * DEG_TO_RAD) * SIDE_VIEW.pedalLengthMm);
  const drawingHeightMm = $derived(
    Math.max(
      input.seatYMm + SIDE_VIEW.drawingBaseSeatClearanceMm,
      wheelCenterY + SIDE_VIEW.wheelRadiusMm + SIDE_VIEW.drawingWheelClearanceMm,
      input.pedalYMm + SIDE_VIEW.drawingPedalClearanceMm,
      input.baseHeightMm + SIDE_VIEW.drawingBaseHeightClearanceMm
    )
  );
  const viewBox = $derived(
    `${-SIDE_VIEW.viewBoxPaddingX} ${-SIDE_VIEW.viewBoxPaddingTopMm} ${input.baseLengthMm + SIDE_VIEW.viewBoxExtraWidthMm} ${drawingHeightMm + SIDE_VIEW.viewBoxExtraHeightMm}`
  );

  function toSvgY(value: number) {
    return drawingHeightMm - value;
  }
</script>

<section class="">
  <div class="overflow-hidden">
    <svg {viewBox} class="h-auto w-full" role="img" aria-label="Aluminum rig side view preview">
      <rect
        x={-SIDE_VIEW.viewBoxPaddingX}
        y={-SIDE_VIEW.viewBoxPaddingTopMm}
        width={input.baseLengthMm + SIDE_VIEW.viewBoxExtraWidthMm}
        height={drawingHeightMm + SIDE_VIEW.viewBoxExtraHeightMm}
        fill="url(#planner-grid)"
      />

      <defs>
        <pattern
          id="planner-grid"
          width={SIDE_VIEW.gridSizeMm}
          height={SIDE_VIEW.gridSizeMm}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${SIDE_VIEW.gridSizeMm} 0 L 0 0 0 ${SIDE_VIEW.gridSizeMm}`}
            fill="none"
            stroke={SIDE_VIEW.gridColor}
            stroke-width={SIDE_VIEW.gridStrokeWidth}
          />
        </pattern>
      </defs>

      <line
        x1="0"
        y1={toSvgY(0)}
        x2={input.baseLengthMm}
        y2={toSvgY(0)}
        stroke={SIDE_VIEW.baseBottomColor}
        stroke-width={SIDE_VIEW.baseStrokeWidth}
        stroke-linecap="round"
      />
      <line
        x1="0"
        y1={toSvgY(input.baseHeightMm)}
        x2={input.baseLengthMm}
        y2={toSvgY(input.baseHeightMm)}
        stroke={SIDE_VIEW.baseColor}
        stroke-width={SIDE_VIEW.upperBaseStrokeWidth}
        stroke-linecap="round"
      />
      <line
        x1={SIDE_VIEW.supportInsetMm}
        y1={toSvgY(0)}
        x2={SIDE_VIEW.supportInsetMm}
        y2={toSvgY(input.baseHeightMm)}
        stroke={SIDE_VIEW.baseColor}
        stroke-width={SIDE_VIEW.upperBaseStrokeWidth}
      />
      <line
        x1={input.baseLengthMm - SIDE_VIEW.supportInsetMm}
        y1={toSvgY(0)}
        x2={input.baseLengthMm - SIDE_VIEW.supportInsetMm}
        y2={toSvgY(input.baseHeightMm)}
        stroke={SIDE_VIEW.baseColor}
        stroke-width={SIDE_VIEW.upperBaseStrokeWidth}
      />

      <line
        x1={input.seatXMm}
        y1={toSvgY(input.seatYMm)}
        x2={seatBaseEndX}
        y2={toSvgY(input.seatYMm + SIDE_VIEW.seatBaseRiseMm)}
        stroke={SIDE_VIEW.seatBaseColor}
        stroke-width={SIDE_VIEW.baseStrokeWidth}
        stroke-linecap="round"
      />
      <line
        x1={input.seatXMm}
        y1={toSvgY(input.seatYMm)}
        x2={seatBackEndX}
        y2={toSvgY(seatBackEndY)}
        stroke={SIDE_VIEW.seatBackColor}
        stroke-width={SIDE_VIEW.baseStrokeWidth}
        stroke-linecap="round"
      />

      <line
        x1={input.pedalXMm - SIDE_VIEW.pedalMountInsetMm}
        y1={toSvgY(input.pedalYMm)}
        x2={pedalEndX}
        y2={toSvgY(pedalEndY)}
        stroke={SIDE_VIEW.pedalColor}
        stroke-width={SIDE_VIEW.pedalStrokeWidth}
        stroke-linecap="round"
      />

      <line
        x1={input.wheelXMm + geometry.wheelMountOffsets.mountXMm}
        y1={toSvgY(input.baseHeightMm)}
        x2={wheelCenterX}
        y2={toSvgY(wheelCenterY)}
        stroke={SIDE_VIEW.wheelColumnColor}
        stroke-width={SIDE_VIEW.steeringColumnStrokeWidth}
        stroke-linecap="round"
      />
      <circle
        cx={wheelCenterX}
        cy={toSvgY(wheelCenterY)}
        r={SIDE_VIEW.wheelRadiusMm}
        fill="none"
        stroke={SIDE_VIEW.wheelColor}
        stroke-width={SIDE_VIEW.wheelStrokeWidth}
      />
      <circle cx={wheelCenterX} cy={toSvgY(wheelCenterY)} r={SIDE_VIEW.wheelHubRadiusMm} fill={SIDE_VIEW.wheelColor} />

      <text
        x={SIDE_VIEW.baseLabelX}
        y={SIDE_VIEW.baseLabelY}
        fill={SIDE_VIEW.baseColor}
        font-size={SIDE_VIEW.labelFontSizePx}
        font-weight={SIDE_VIEW.labelFontWeight}>Base</text
      >
      <text
        x={input.seatXMm - SIDE_VIEW.seatLabelXOffsetMm}
        y={toSvgY(input.seatYMm + SIDE_VIEW.seatLabelYOffsetMm)}
        fill={SIDE_VIEW.seatBaseColor}
        font-size={SIDE_VIEW.labelFontSizePx}
        font-weight={SIDE_VIEW.labelFontWeight}
        >Seat</text
      >
      <text
        x={input.pedalXMm - SIDE_VIEW.pedalLabelXOffsetMm}
        y={toSvgY(input.pedalYMm + SIDE_VIEW.pedalLabelYOffsetMm)}
        fill={SIDE_VIEW.pedalColor}
        font-size={SIDE_VIEW.labelFontSizePx}
        font-weight={SIDE_VIEW.labelFontWeight}
        >Pedals</text
      >
      <text
        x={wheelCenterX - SIDE_VIEW.wheelLabelXOffsetMm}
        y={toSvgY(wheelCenterY + SIDE_VIEW.wheelRadiusMm + SIDE_VIEW.wheelLabelYOffsetMm)}
        fill={SIDE_VIEW.wheelColumnColor}
        font-size={SIDE_VIEW.labelFontSizePx}
        font-weight={SIDE_VIEW.labelFontWeight}>Wheel</text
      >
    </svg>
  </div>
</section>
