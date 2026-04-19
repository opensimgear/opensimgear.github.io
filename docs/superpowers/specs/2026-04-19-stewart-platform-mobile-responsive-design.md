## Goal

Make `src/components/calculator/stewart-platform/index.svelte` usable on narrow screens without changing Stewart platform calculation behavior.

## Current State

- Desktop layout is two columns: 3D scene on left, control column on right.
- Control groups already use collapsible `Pane` sections from `svelte-tweakpane-ui`.
- Scene uses a fixed `h-[600px]`, which is too tall for small screens and pushes controls too far away.

## Scope

- Add responsive layout behavior for the Stewart platform calculator.
- On narrow screens, render the scene first and the control column underneath it.
- On narrow screens, make all existing control panes start closed by default.
- Reduce scene height on narrow screens while preserving a comfortable desktop viewport.

## Out of Scope

- No changes to geometry calculations, limit calculations, clamping, query-state encoding, or 3D interaction math.
- No replacement of `Pane` with a custom accordion system.
- No redesign of calculator copy or control labels.

## Recommended Approach

Use CSS-responsive layout plus a small amount of Svelte state for mobile-only pane defaults.

- Keep desktop behavior structurally the same.
- Switch the outer wrapper from row layout to column layout at a narrow breakpoint.
- Reorder markup so the scene remains first in DOM order and controls naturally flow beneath it on mobile.
- Feed each existing `Pane` an explicit expanded/open state derived from screen width and initial mobile defaults.

This is the lowest-risk option because it preserves the current widget library and control grouping while fixing the mobile usability issue.

## Design Details

### Layout

- Keep the existing bordered calculator shell.
- Desktop/tablet-wide view: retain side-by-side layout with scene first and controls second.
- Narrow view: stack vertically with the scene on top and controls below.
- Keep the controls in their current order: `Parameters`, `Actuator Range`, `Movement`, `Constraints`.

### Control Collapse Behavior

- Reuse the current collapsible `Pane` components.
- On narrow screens, all panes should initialize closed.
- On wider screens, preserve the current always-visible behavior.
- After initial render, users may open any panes they want; no one-open-only rule is required.

### Scene Sizing

- Replace the single fixed scene height with responsive heights.
- Use a shorter height on narrow screens so the controls are reachable without excessive scrolling.
- Keep a taller desktop height close to the current visual scale.

### State Management

- Add a responsive flag based on viewport width.
- Add pane state only if needed to control initial collapsed state on mobile.
- Do not touch existing calculator parameter state, derived platform spec logic, or URL synchronization.

## Testing Strategy

- Add or update tests only for any new extracted state/helper logic introduced for responsive pane defaults.
- Manually verify the component in a narrow viewport and a desktop viewport.
- Run the relevant test file plus the project test suite if new testable logic is added.

## Acceptance Criteria

- On narrow screens, the 3D scene appears before the control panels.
- On narrow screens, the control column appears below the scene.
- On narrow screens, all control panes are closed on initial load.
- On desktop screens, the current two-column layout remains intact.
- Platform calculations and movement clamping continue to behave exactly as before.

## Risks And Mitigations

- `Pane` API may expose collapse control differently than expected.
  - Mitigation: inspect existing `svelte-tweakpane-ui` usage and adapt to its supported props/events before wiring state.
- Responsive detection may cause hydration mismatch if handled only at render time.
  - Mitigation: initialize safely for SSR and update on mount.

## Implementation Notes

- Prefer minimal edits inside `src/components/calculator/stewart-platform/index.svelte`.
- Extract a tiny helper only if responsive pane state becomes noisy enough to justify a separate file.
