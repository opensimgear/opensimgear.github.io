export const ALUMINIUM_RIG_MOBILE_BREAKPOINT = 1024;

export type AluminiumRigPaneExpandedState = {
  setup: boolean;
  posture: boolean;
  cutList: boolean;
  preview: boolean;
};

export function isNarrowAluminiumRigViewport(width: number) {
  return width < ALUMINIUM_RIG_MOBILE_BREAKPOINT;
}

export function getAluminiumRigPaneExpandedState(isNarrow: boolean): AluminiumRigPaneExpandedState {
  if (isNarrow) {
    return {
      setup: false,
      posture: false,
      cutList: false,
      preview: false,
    };
  }

  return {
    setup: true,
    posture: true,
    cutList: true,
    preview: true,
  };
}

export function getNextAluminiumRigPaneExpandedState(
  current: AluminiumRigPaneExpandedState,
  wasNarrow: boolean,
  isNarrow: boolean,
  reset = false
) {
  if (reset || wasNarrow !== isNarrow) {
    return getAluminiumRigPaneExpandedState(isNarrow);
  }

  return current;
}
