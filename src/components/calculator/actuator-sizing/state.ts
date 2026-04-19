export const ACTUATOR_SIZING_MOBILE_BREAKPOINT = 1024;

export type ActuatorSizingPaneExpandedState = {
  settingMode: boolean;
  motionProfile: boolean;
  system: boolean;
  calculated: boolean;
};

export function isNarrowActuatorSizingViewport(width: number) {
  return width < ACTUATOR_SIZING_MOBILE_BREAKPOINT;
}

export function getActuatorSizingPaneExpandedState(isNarrow: boolean): ActuatorSizingPaneExpandedState {
  if (isNarrow) {
    return {
      settingMode: false,
      motionProfile: false,
      system: false,
      calculated: false,
    };
  }

  return {
    settingMode: true,
    motionProfile: true,
    system: true,
    calculated: true,
  };
}

export function getNextActuatorSizingPaneExpandedState(
  currentPaneExpanded: ActuatorSizingPaneExpandedState,
  currentIsNarrow: boolean,
  nextIsNarrow: boolean,
  resetPanes = false
): ActuatorSizingPaneExpandedState {
  if (resetPanes || currentIsNarrow !== nextIsNarrow) {
    return getActuatorSizingPaneExpandedState(nextIsNarrow);
  }

  return currentPaneExpanded;
}
