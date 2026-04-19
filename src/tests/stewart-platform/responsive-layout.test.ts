import { describe, expect, it } from 'vitest';

import {
  MOBILE_STEWART_BREAKPOINT,
  getStewartGizmoSize,
  getStewartStatusPanelClassNames,
  getStewartSceneClassNames,
  getStewartPaneExpandedState,
  isNarrowStewartViewport,
} from '../../components/calculator/stewart-platform/state';

describe('isNarrowStewartViewport', () => {
  it('treats widths below mobile breakpoint as narrow', () => {
    expect(isNarrowStewartViewport(MOBILE_STEWART_BREAKPOINT - 1)).toBe(true);
  });

  it('treats breakpoint width and above as wide', () => {
    expect(isNarrowStewartViewport(MOBILE_STEWART_BREAKPOINT)).toBe(false);
    expect(isNarrowStewartViewport(MOBILE_STEWART_BREAKPOINT + 160)).toBe(false);
  });
});

describe('getStewartPaneExpandedState', () => {
  it('starts all panes collapsed on narrow viewports', () => {
    expect(getStewartPaneExpandedState(true)).toEqual({
      parameters: false,
      actuatorRange: false,
      movement: false,
      constraints: false,
    });
  });

  it('starts all panes expanded on wide viewports', () => {
    expect(getStewartPaneExpandedState(false)).toEqual({
      parameters: true,
      actuatorRange: true,
      movement: true,
      constraints: true,
    });
  });
});

describe('getStewartSceneClassNames', () => {
  it('uses reduced fixed height without flex growth on narrow viewports', () => {
    expect(getStewartSceneClassNames(true)).toContain('h-[320px]');
    expect(getStewartSceneClassNames(true)).toContain('sm:h-[420px]');
    expect(getStewartSceneClassNames(true)).not.toContain('flex-1');
  });

  it('keeps flexible desktop scene sizing on wide viewports', () => {
    expect(getStewartSceneClassNames(false)).toContain('h-[600px]');
    expect(getStewartSceneClassNames(false)).toContain('flex-1');
  });
});

describe('mobile scene UI helpers', () => {
  it('uses smaller gizmo size on narrow viewports', () => {
    expect(getStewartGizmoSize(true)).toBe(80);
    expect(getStewartGizmoSize(false)).toBe(128);
  });

  it('uses tighter status panel styling on narrow viewports', () => {
    const classNames = getStewartStatusPanelClassNames(true);

    expect(classNames).toContain('top-2');
    expect(classNames).toContain('right-2');
    expect(classNames).toContain('px-2');
    expect(classNames).toContain('py-1.5');
    expect(classNames).toContain('text-[10px]');
  });

  it('keeps roomier status panel styling on wide viewports', () => {
    const classNames = getStewartStatusPanelClassNames(false);

    expect(classNames).toContain('top-3');
    expect(classNames).toContain('right-3');
    expect(classNames).toContain('px-3');
    expect(classNames).toContain('py-2');
    expect(classNames).toContain('text-xs');
  });
});
