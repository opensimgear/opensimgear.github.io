/**
 * Responsive layout helpers for the aluminum rig planner UI.
 */

/** Viewport width below which the planner switches to narrow (mobile) mode. */
export const ALUMINUM_RIG_MOBILE_BREAKPOINT = 1024;

/** Default expanded state for the desktop viewport. */
export const DESKTOP_PANE_EXPANDED_STATE = {
  general: true,
  setup: true,
  posture: true,
  optimizer: true,
} as const;

/** Default expanded state for the mobile viewport. */
export const MOBILE_PANE_EXPANDED_STATE = {
  general: false,
  setup: false,
  posture: false,
  optimizer: false,
} as const;

/** Aluminum rig pane expanded state type. */
export type AluminumRigPaneExpandedState = {
  general: boolean;
  setup: boolean;
  posture: boolean;
  optimizer: boolean;
};

/** Aluminum rig folder expanded state type. */
export type AluminumRigFolderExpandedState = {
  driver: boolean;
  postureTarget: boolean;
  enabledModules: boolean;
  monitor: boolean;
  monitorStand: boolean;
  base: boolean;
  seat: boolean;
  wheel: boolean;
  steeringColumn: boolean;
  pedalTray: boolean;
  pedals: boolean;
  optimizerSettings: boolean;
  optimizerHardware: boolean;
  optimizerRubberFeet: boolean;
  stockConfiguration: boolean;
  stockProfile40x40: boolean;
  stockProfile80x40: boolean;
};

/** Default folder expanded state. */
export const DEFAULT_FOLDER_EXPANDED_STATE = {
  driver: true,
  postureTarget: true,
  enabledModules: true,
  monitor: false,
  monitorStand: false,
  base: false,
  seat: false,
  wheel: false,
  steeringColumn: false,
  pedalTray: false,
  pedals: false,
  optimizerSettings: true,
  optimizerHardware: true,
  optimizerRubberFeet: true,
  stockConfiguration: false,
  stockProfile40x40: true,
  stockProfile80x40: true,
} as const satisfies AluminumRigFolderExpandedState;

/** Check whether the viewport is below the mobile breakpoint. */
export function isNarrowAluminumRigViewport(width: number) {
  return width < ALUMINUM_RIG_MOBILE_BREAKPOINT;
}

/** Return the default pane expanded state for the given viewport size. */
export function getAluminumRigPaneExpandedState(isNarrow: boolean): AluminumRigPaneExpandedState {
  if (isNarrow) {
    return { ...MOBILE_PANE_EXPANDED_STATE };
  }

  return { ...DESKTOP_PANE_EXPANDED_STATE };
}

/** Return the default folder expanded state. */
export function getAluminumRigFolderExpandedState(): AluminumRigFolderExpandedState {
  return { ...DEFAULT_FOLDER_EXPANDED_STATE };
}

/**
 * Compute the next pane expanded state after a viewport resize or explicit reset.
 * Re-initializes to defaults when crossing the breakpoint or when reset=true.
 */
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
