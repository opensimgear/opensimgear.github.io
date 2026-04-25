import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const plannerSource = readFileSync(
  new URL('../../components/calculator/aluminum-rig-planner/index.svelte', import.meta.url),
  'utf8'
);

describe('aluminum rig planner component wiring', () => {
  it('does not mark presets custom from programmatic solver updates', () => {
    expect(plannerSource).toContain('suppressProgrammaticPlannerInputEdit');
    expect(plannerSource).toMatch(/function assignProgrammaticPlannerInput\(input: PlannerInput\)/);
    expect(plannerSource).toMatch(/if \(suppressProgrammaticPlannerInputEdit\) {\s*return;\s*}/);
    expect(plannerSource).toMatch(/pendingCustomPresetInput = null;/);
    expect(plannerSource).toMatch(
      /assignProgrammaticPlannerInput\(applyPresetToPlannerInput\(plannerInput, value, postureSettings\.heightCm\)\)/
    );
    expect(plannerSource).toMatch(
      /assignProgrammaticPlannerInput\(\s*recomputePresetDynamicPlannerInput\(plannerInput, postureSettings\.preset, nextHeightCm\)\s*\)/
    );
  });
});
