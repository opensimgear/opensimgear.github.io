export const ALUMINIUM_RIG_MOBILE_BREAKPOINT = 1024;

export type AluminiumRigPaneExpandedState = {
  setup: boolean;
  modules: boolean;
};

export function isNarrowAluminiumRigViewport(width: number) {
  return width < ALUMINIUM_RIG_MOBILE_BREAKPOINT;
}

export function getAluminiumRigPaneExpandedState(isNarrow: boolean): AluminiumRigPaneExpandedState {
  if (isNarrow) {
    return {
      setup: false,
      modules: false,
    };
  }

  return {
    setup: true,
    modules: true,
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
