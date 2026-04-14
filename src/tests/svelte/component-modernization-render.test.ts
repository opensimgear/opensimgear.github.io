import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import MotionProfileDiagram from '../../components/calculator/actuator-sizing/MotionProfileDiagram.svelte';
import { buildMotionProfileDiagram } from '../../components/calculator/actuator-sizing/motion-profile-diagram';
import StewartPlatformCalculator from '../../components/calculator/stewart-platform/index.svelte';
import CookiePreferencesLink from '../../components/util/CookiePreferencesLink.svelte';

const renderComponent = render as (component: unknown, options?: { props?: Record<string, unknown> }) => { body: string };

describe('component modernization render baseline', () => {
  it('renders motion profile diagram svg with accessible label', () => {
    const diagram = buildMotionProfileDiagram({
      t_accel_s: 0.2,
      t_const_s: 0.6,
      t_decel_s: 0.2,
      dwellTime_s: 0.5,
    });

    const { body } = renderComponent(MotionProfileDiagram, {
      props: {
        diagram,
      },
    });

    expect(body).toContain('<svg');
    expect(body).toContain('aria-label="Phase timing diagram"');
  });

  it('renders stewart platform calculator shell headings during ssr', () => {
    const { body } = renderComponent(StewartPlatformCalculator);

    expect(body).toContain('Platform');
    expect(body).toContain('Constraints');
  });

  it('renders cookie preferences label inside button', () => {
    const { body } = renderComponent(CookiePreferencesLink, {
      props: {
        label: 'Manage cookie preferences',
      },
    });

    expect(body).toContain('<button');
    expect(body).toContain('Manage cookie preferences');
  });
});
