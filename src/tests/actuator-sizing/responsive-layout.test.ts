import { describe, expect, it } from 'vitest';

import {
  ACTUATOR_SIZING_MOBILE_BREAKPOINT,
  getActuatorSizingPaneExpandedState,
  getNextActuatorSizingPaneExpandedState,
  isNarrowActuatorSizingViewport,
} from '~/components/calculator/actuator-sizing/state';

describe('isNarrowActuatorSizingViewport', () => {
  it('treats widths below mobile breakpoint as narrow', () => {
    expect(isNarrowActuatorSizingViewport(ACTUATOR_SIZING_MOBILE_BREAKPOINT - 1)).toBe(true);
  });

  it('treats breakpoint width and above as wide', () => {
    expect(isNarrowActuatorSizingViewport(ACTUATOR_SIZING_MOBILE_BREAKPOINT)).toBe(false);
    expect(isNarrowActuatorSizingViewport(ACTUATOR_SIZING_MOBILE_BREAKPOINT + 160)).toBe(false);
  });
});

describe('getActuatorSizingPaneExpandedState', () => {
  it('starts all panes collapsed on narrow viewports', () => {
    expect(getActuatorSizingPaneExpandedState(true)).toEqual({
      settingMode: false,
      motionProfile: false,
      system: false,
      calculated: false,
    });
  });

  it('starts all panes expanded on wide viewports', () => {
    expect(getActuatorSizingPaneExpandedState(false)).toEqual({
      settingMode: true,
      motionProfile: true,
      system: true,
      calculated: true,
    });
  });
});

describe('getNextActuatorSizingPaneExpandedState', () => {
  it('resets pane state when reset flag is true', () => {
    expect(
      getNextActuatorSizingPaneExpandedState(
        { settingMode: false, motionProfile: false, system: false, calculated: false },
        false,
        false,
        true
      )
    ).toEqual(getActuatorSizingPaneExpandedState(false));
  });

  it('resets pane state to mobile defaults when viewport crosses into narrow band', () => {
    expect(
      getNextActuatorSizingPaneExpandedState(
        { settingMode: true, motionProfile: true, system: true, calculated: true },
        false,
        true
      )
    ).toEqual(getActuatorSizingPaneExpandedState(true));
  });

  it('resets pane state to desktop defaults when viewport crosses into wide band', () => {
    expect(
      getNextActuatorSizingPaneExpandedState(
        { settingMode: false, motionProfile: false, system: false, calculated: false },
        true,
        false
      )
    ).toEqual(getActuatorSizingPaneExpandedState(false));
  });

  it('keeps pane state unchanged on same-band resize without reset', () => {
    const currentPaneExpanded = {
      settingMode: false,
      motionProfile: true,
      system: false,
      calculated: true,
    };

    expect(getNextActuatorSizingPaneExpandedState(currentPaneExpanded, false, false)).toBe(currentPaneExpanded);
  });
});
