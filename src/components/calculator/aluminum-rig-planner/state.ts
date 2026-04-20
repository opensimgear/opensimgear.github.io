export const ALUMINUM_RIG_MOBILE_BREAKPOINT = 1024;

export type AluminumRigPaneExpandedState = {
  setup: boolean;
  modules: boolean;
  cutList: boolean;
};

export function isNarrowAluminumRigViewport(width: number) {
  return width < ALUMINUM_RIG_MOBILE_BREAKPOINT;
}

export function getAluminumRigPaneExpandedState(isNarrow: boolean): AluminumRigPaneExpandedState {
  if (isNarrow) {
    return {
      setup: false,
      modules: false,
      cutList: false,
    };
  }

  return {
    setup: true,
    modules: true,
    cutList: true,
  };
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
