export const ALUMINUM_RIG_MOBILE_BREAKPOINT = 1024;

export const DESKTOP_PANE_EXPANDED_STATE = {
  general: true,
  setup: true,
  posture: true,
  optimizer: true,
} as const;

export const MOBILE_PANE_EXPANDED_STATE = {
  general: false,
  setup: false,
  posture: false,
  optimizer: false,
} as const;

export type AluminumRigPaneExpandedState = {
  general: boolean;
  setup: boolean;
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
