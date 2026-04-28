import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import ActuatorSizingCalculator from '~/components/calculator/actuator-sizing/index.svelte';
import MotionProfileDiagram from '~/components/calculator/actuator-sizing/MotionProfileDiagram.svelte';
import { buildMotionProfileDiagram } from '~/components/calculator/actuator-sizing/motion-profile-diagram';

const renderComponent = render as (
  component: unknown,
  options?: { props?: Record<string, unknown> }
) => { body: string };

describe('MotionProfileDiagram', () => {
  it('renders only the allowed phase labels alongside the velocity waveform', () => {
    const baseDiagram = buildMotionProfileDiagram({
      t_accel_s: 0.2,
      t_const_s: 0.6,
      t_decel_s: 0.2,
      dwellTime_s: 0.5,
    });

    const { body } = renderComponent(MotionProfileDiagram, {
      props: {
        diagram: {
          ...baseDiagram,
          labelVisibility: {
            accel: true,
            const: false,
            decel: true,
            dwell: false,
          },
        },
      },
    });

    expect(body).toContain('aria-label="Phase timing diagram"');
    expect(body).toContain('Accel');
    expect(body).toContain('Decel');
    expect(body).not.toContain('Const');
    expect(body).not.toContain('Dwell');
    expect(body).not.toContain('Motion Profile');
    expect(body).not.toContain('Trapezoidal');
    expect(body).not.toContain('Triangular');
    expect(body).not.toContain('Velocity');
    expect(body).not.toContain('Position');
  });

  it('renders the actuator sizing calculator table and diagram landmarks', () => {
    const { body } = renderComponent(ActuatorSizingCalculator);

    expect(body).toContain('<table');
    expect(body).toContain('Motor');
    expect(body).toContain('aria-label="Phase timing diagram"');
    expect(body).toContain('Motion Profile');
    expect(body).toContain('Calculated');
    expect(body).toContain('Peak Tq');
  });
});
