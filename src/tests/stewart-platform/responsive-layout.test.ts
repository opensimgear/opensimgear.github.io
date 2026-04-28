import { describe, expect, it } from 'vitest';

import {
  MOBILE_STEWART_BREAKPOINT,
  getNextStewartPaneExpandedState,
  getStewartPaneExpandedState,
  isNarrowStewartViewport,
} from '~/components/calculator/stewart-platform/state';

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
