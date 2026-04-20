import { describe, expect, it } from 'vitest';

import {
  ALUMINIUM_RIG_MOBILE_BREAKPOINT,
  getNextAluminiumRigPaneExpandedState,
  getAluminiumRigPaneExpandedState,
  isNarrowAluminiumRigViewport,
} from '../../components/calculator/aluminium-rig-planner/state';

describe('aluminium rig planner responsive state', () => {
  it('treats widths below mobile breakpoint as narrow', () => {
    expect(isNarrowAluminiumRigViewport(ALUMINIUM_RIG_MOBILE_BREAKPOINT - 1)).toBe(true);
  });

  it('treats breakpoint width and above as wide', () => {
    expect(isNarrowAluminiumRigViewport(ALUMINIUM_RIG_MOBILE_BREAKPOINT)).toBe(false);
    expect(isNarrowAluminiumRigViewport(ALUMINIUM_RIG_MOBILE_BREAKPOINT + 160)).toBe(false);
  });

  it('starts all panes collapsed on narrow viewports', () => {
    expect(getAluminiumRigPaneExpandedState(true)).toEqual({
      setup: false,
      modules: false,
    });
  });

  it('starts all panes expanded on wide viewports', () => {
    expect(getAluminiumRigPaneExpandedState(false)).toEqual({
      setup: true,
      modules: true,
    });
  });

  it('resets pane state when reset flag is true', () => {
    expect(getNextAluminiumRigPaneExpandedState({ setup: false, modules: false }, false, false, true)).toEqual(
      getAluminiumRigPaneExpandedState(false)
    );
  });

  it('resets pane state to mobile defaults when viewport crosses into narrow band', () => {
    expect(getNextAluminiumRigPaneExpandedState({ setup: true, modules: true }, false, true)).toEqual(
      getAluminiumRigPaneExpandedState(true)
    );
  });

  it('resets pane state to desktop defaults when viewport crosses into wide band', () => {
    expect(getNextAluminiumRigPaneExpandedState({ setup: false, modules: false }, true, false)).toEqual(
      getAluminiumRigPaneExpandedState(false)
    );
  });

  it('keeps pane state unchanged on same-band resize without reset', () => {
    const currentPaneExpanded = {
      setup: false,
      modules: true,
    };

    expect(getNextAluminiumRigPaneExpandedState(currentPaneExpanded, false, false)).toBe(currentPaneExpanded);
  });
});
