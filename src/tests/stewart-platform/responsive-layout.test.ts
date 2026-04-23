import { describe, expect, it } from 'vitest';

import {
  MOBILE_STEWART_BREAKPOINT,
  getStewartGizmoSize,
  getNextStewartPaneExpandedState,
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

describe('getNextStewartPaneExpandedState', () => {
  it('resets pane state when reset flag is true', () => {
    expect(
      getNextStewartPaneExpandedState(
        { parameters: false, actuatorRange: false, movement: false, constraints: false },
        false,
        false,
        true
      )
    ).toEqual(getStewartPaneExpandedState(false));
  });

  it('resets pane state to mobile defaults when viewport crosses into narrow band', () => {
    expect(
      getNextStewartPaneExpandedState(
        { parameters: true, actuatorRange: true, movement: true, constraints: true },
        false,
        true
      )
    ).toEqual(getStewartPaneExpandedState(true));
  });

  it('resets pane state to desktop defaults when viewport crosses into wide band', () => {
    expect(
      getNextStewartPaneExpandedState(
        { parameters: false, actuatorRange: false, movement: false, constraints: false },
        true,
        false
      )
    ).toEqual(getStewartPaneExpandedState(false));
  });

  it('keeps pane state unchanged on same-band resize without reset', () => {
    const currentPaneExpanded = {
      parameters: false,
      actuatorRange: true,
      movement: false,
      constraints: true,
    };

    expect(getNextStewartPaneExpandedState(currentPaneExpanded, false, false)).toBe(currentPaneExpanded);
  });
});

describe('getStewartSceneClassNames', () => {
  it('keeps aspect-based scene sizing on narrow viewports', () => {
    expect(getStewartSceneClassNames(true)).toContain('relative');
    expect(getStewartSceneClassNames(true)).toContain('aspect-[3/2]');
    expect(getStewartSceneClassNames(true)).toContain('radial-gradient');
  });

  it('keeps same scene sizing shell on wide viewports', () => {
    expect(getStewartSceneClassNames(false)).toContain('relative');
    expect(getStewartSceneClassNames(false)).toContain('aspect-[3/2]');
    expect(getStewartSceneClassNames(false)).toContain('radial-gradient');
  });
});

describe('mobile scene UI helpers', () => {
  it('uses smaller gizmo size on narrow viewports', () => {
    expect(getStewartGizmoSize(true)).toBe(48);
    expect(getStewartGizmoSize(false)).toBe(64);
  });

  it('uses tighter status panel styling on narrow viewports', () => {
    const classNames = getStewartStatusPanelClassNames(true);

    expect(classNames).toContain('bottom-2');
    expect(classNames).toContain('inset-x-2');
    expect(classNames).toContain('px-2');
    expect(classNames).toContain('py-1.5');
    expect(classNames).toContain('text-[8px]');
  });

  it('keeps roomier status panel styling on wide viewports', () => {
    const classNames = getStewartStatusPanelClassNames(false);

    expect(classNames).toContain('bottom-3');
    expect(classNames).toContain('right-3');
    expect(classNames).toContain('px-3');
    expect(classNames).toContain('py-2');
    expect(classNames).toContain('text-xs');
  });
});
