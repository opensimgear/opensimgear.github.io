import { ALUMINUM_RIG_MOBILE_BREAKPOINT, DESKTOP_PANE_EXPANDED_STATE, MOBILE_PANE_EXPANDED_STATE } from './constants';

export { ALUMINUM_RIG_MOBILE_BREAKPOINT };

export type AluminumRigPaneExpandedState = {
  setup: boolean;
  modules: boolean;
  posture: boolean;
  optimizer: boolean;
};

export function isNarrowAluminumRigViewport(width: number) {
  return width < ALUMINUM_RIG_MOBILE_BREAKPOINT;
}

export function getAluminumRigPaneExpandedState(isNarrow: boolean): AluminumRigPaneExpandedState {
  if (isNarrow) {
    return { ...MOBILE_PANE_EXPANDED_STATE };
  }

  return { ...DESKTOP_PANE_EXPANDED_STATE };
}

export function getNextAluminumRigPaneExpandedState(
  current: AluminumRigPaneExpandedState,
  wasNarrow: boolean,
  isNarrow: boolean,
  reset = false
) {
  if (reset || wasNarrow !== isNarrow) {
    return getAluminumRigPaneExpandedState(isNarrow);
  }

  return current;
}
