import { describe, expect, it } from 'vitest';

import {
  ALUMINUM_RIG_MOBILE_BREAKPOINT,
  getNextAluminumRigPaneExpandedState,
  getAluminumRigPaneExpandedState,
  isNarrowAluminumRigViewport,
} from '../../components/calculator/aluminum-rig-planner/state';

describe('aluminum rig planner responsive state', () => {
  it('treats widths below mobile breakpoint as narrow', () => {
    expect(isNarrowAluminumRigViewport(ALUMINUM_RIG_MOBILE_BREAKPOINT - 1)).toBe(true);
  });

  it('treats breakpoint width and above as wide', () => {
    expect(isNarrowAluminumRigViewport(ALUMINUM_RIG_MOBILE_BREAKPOINT)).toBe(false);
    expect(isNarrowAluminumRigViewport(ALUMINUM_RIG_MOBILE_BREAKPOINT + 160)).toBe(false);
  });

  it('starts all panes collapsed on narrow viewports', () => {
    expect(getAluminumRigPaneExpandedState(true)).toEqual({
      setup: false,
      modules: false,
      optimizer: false,
    });
  });

  it('starts all panes expanded on wide viewports', () => {
    expect(getAluminumRigPaneExpandedState(false)).toEqual({
      setup: true,
      modules: true,
      optimizer: true,
    });
  });

  it('resets pane state when reset flag is true', () => {
    expect(
      getNextAluminumRigPaneExpandedState({ setup: false, modules: false, optimizer: false }, false, false, true)
    ).toEqual(
      getAluminumRigPaneExpandedState(false)
    );
  });

  it('resets pane state to mobile defaults when viewport crosses into narrow band', () => {
    expect(getNextAluminumRigPaneExpandedState({ setup: true, modules: true, optimizer: true }, false, true)).toEqual(
      getAluminumRigPaneExpandedState(true)
    );
  });

  it('resets pane state to desktop defaults when viewport crosses into wide band', () => {
    expect(
      getNextAluminumRigPaneExpandedState({ setup: false, modules: false, optimizer: false }, true, false)
    ).toEqual(
      getAluminumRigPaneExpandedState(false)
    );
  });

  it('keeps pane state unchanged on same-band resize without reset', () => {
    const currentPaneExpanded = {
      setup: false,
      modules: true,
      optimizer: false,
    };

    expect(getNextAluminumRigPaneExpandedState(currentPaneExpanded, false, false)).toBe(currentPaneExpanded);
  });
});
