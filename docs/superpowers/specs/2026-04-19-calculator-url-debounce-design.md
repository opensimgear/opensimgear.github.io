## Goal

Debounce query-string state updates for both calculator components so URL writes happen after user input settles instead of on every reactive change.

## Current State

- `src/components/calculator/actuator-sizing/index.svelte` writes query state with `window.history.replaceState()` inside a reactive effect.
- `src/components/calculator/stewart-platform/index.svelte` does same for Stewart platform state.
- Both calculators already read initial state from URL immediately on mount.
- Current behavior can spam `replaceState()` during slider drags and rapid control changes.

## Scope

- Add shared debounce mechanism for calculator URL writes.
- Apply same trailing debounce delay to both calculators.
- Use `300ms` debounce window.
- Preserve current query payload structure and initial URL read behavior.

## Out of Scope

- No changes to query encoding format.
- No changes to calculator math, sorting, filtering, or visualization behavior.
- No changes to how initial URL state is decoded and applied.
- No throttling of non-URL state updates.

## Recommended Approach

Add a small shared browser utility under `src/components/calculator/shared/` that manages a single debounced `replaceState()` scheduler instance per calculator.

- Keep query encoding in `query-state.ts`.
- Keep calculator-specific state shape assembly in each component.
- Move delay/timer behavior into dedicated helper so both calculators share same semantics.

This keeps responsibilities clear: one module encodes state, one module debounces browser history updates, calculators decide what state to serialize.

## Design Details

### Shared Helper

- Export a helper that creates a debounced URL updater for one calculator instance.
- Accept debounce delay in milliseconds and use `300` in both calculators.
- Helper should:
  - schedule trailing write only
  - cancel previously scheduled write when new state arrives
  - write latest URL only after quiet period
  - expose cleanup function for unmount

### Calculator Integration

- In both calculator components, create helper instance in component script.
- Replace direct `window.history.replaceState()` calls inside reactive effect with debounced helper call.
- Keep current browser guards (`mounted`, `typeof window`) in place.
- Call helper cleanup during component teardown.

### Behavior Rules

- Initial URL read remains immediate on mount.
- URL writes happen only after last change in a burst plus `300ms`.
- If component unmounts before timer fires, pending URL write is canceled.
- Latest state always wins during rapid updates.

## Testing Strategy

- Add unit tests for shared debounce helper using fake timers.
- Verify:
  - helper delays write until debounce interval passes
  - second call before interval replaces pending write
  - cleanup prevents pending write from firing
- Run existing calculator tests to ensure no regression in unrelated helpers.

## Acceptance Criteria

- Both calculators stop calling `replaceState()` on every reactive change.
- Both calculators write latest state to URL after `300ms` idle period.
- Initial query-state hydration still happens immediately.
- Pending URL writes are canceled on component teardown.
- Query format in URL remains unchanged.

## Risks And Mitigations

- Timer lifecycle bugs could cause stale URL writes after unmount.
  - Mitigation: explicit cleanup API and test coverage for cleanup behavior.
- Shared helper could accidentally assume browser globals during SSR.
  - Mitigation: keep browser access inside scheduled write path and preserve component guards.

## Implementation Notes

- Prefer one focused helper file rather than expanding `query-state.ts` with side effects.
- Keep delay value local constant in calculators or shared exported constant if both use exact same value.
