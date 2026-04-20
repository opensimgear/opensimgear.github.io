export const ALUMINIUM_RIG_MOBILE_BREAKPOINT = 1024;

export type AluminiumRigPaneExpandedState = {
  setup: boolean;
  modules: boolean;
  cutList: boolean;
};

export function isNarrowAluminiumRigViewport(width: number) {
  return width < ALUMINIUM_RIG_MOBILE_BREAKPOINT;
}

export function getAluminiumRigPaneExpandedState(isNarrow: boolean): AluminiumRigPaneExpandedState {
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
