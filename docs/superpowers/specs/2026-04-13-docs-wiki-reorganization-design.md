# Docs Wiki Reorganization Design

## Goal

Reorganize `src/content/docs/docs/` from two large overview articles into a broader, more maintainable wiki for sim
racing and flight simulation hardware, while improving factual accuracy, adding missing context, and making the content
useful for both buyers and DIY builders.

This pass focuses only on `src/content/docs/docs/`.

## Current Context

The current section is centered on two files:

- `src/content/docs/docs/sim-racing.md`
- `src/content/docs/docs/flight-simulation.md`

Both pages already contain useful seed content, but they currently act as long mixed-purpose catalogs. They combine:

- domain overviews
- hardware definitions
- buying guidance
- partial technical explanations
- niche immersion systems

This creates three problems:

1. The pages are too dense to scan well.
2. Shared concepts are likely to be duplicated as the wiki grows.
3. The current structure makes it awkward to deepen coverage without turning the overview pages into catch-all dumps.

There are also content issues to address during the split:

- `flight-simulation.md` includes pedals in body content but not in the top tier list.
- Several sections describe hardware in broad terms but do not explain meaningful trade-offs.
- Some concepts need tighter distinctions, such as direct drive vs belt drive, load cell vs hydraulic-style brake feel,
  and tactile feedback vs motion cueing.

## Constraints

- Limit this work to `src/content/docs/docs/`.
- Do not expand `src/content/docs/gear/` in this effort.
- Preserve `sim-racing.md` and `flight-simulation.md` as top-level landing pages rather than deleting them.
- Build for a hybrid audience: newcomer/buyer guidance plus DIY builder reference.
- Prioritize a broad hardware catalog, including core categories plus niche-but-relevant immersion systems.
- Follow the existing Starlight autogeneration model already configured in `astro.config.mjs`.

## Options Considered

### Option A - Domain-first split

Structure the wiki under separate `sim-racing/` and `flight-simulation/` trees, each with their own component pages.

Pros:

- Easy mental model for readers who only care about one domain
- Keeps domain context close to each component page

Cons:

- Duplicates shared topics like rigs, VR, motion, pedals, and tactile systems
- Makes shared DIY knowledge harder to centralize
- Increases maintenance burden as the catalog grows

### Option B - Recommended: Component-first shared wiki with domain landing pages

Keep `sim-racing.md` and `flight-simulation.md` as landing pages, then organize detailed content by shared hardware
families and supporting guides.

Pros:

- Reduces duplication across racing and flight sim
- Scales better to a broad catalog
- Supports both comparison-style reading and targeted lookup
- Lets overview pages stay concise and navigational

Cons:

- Requires stronger cross-linking so readers understand domain context
- Some pages need careful wording when a component behaves differently across domains

### Option C - Journey-first guide structure

Organize primarily around beginner, intermediate, advanced, and DIY pathways.

Pros:

- Strong onboarding experience
- Good for readers making immediate purchase decisions

Cons:

- Weak as a long-term reference wiki
- Hardware definitions and technical concepts become harder to find directly
- Niche components fit awkwardly into this structure

## Chosen Approach

Use Option B.

The wiki should become component-first, with shared reference pages that can be linked from shorter domain landing
pages. This gives the site a reusable structure for hardware categories that overlap across sim racing and flight
simulation, while still preserving domain-specific orientation and setup advice.

## Information Architecture

The content in `src/content/docs/docs/` will be divided into four roles:

- Domain landing pages: explain goals, typical setups, and reading paths for sim racing and flight simulation.
- Component reference pages: explain what each hardware family is, how it works, and how to evaluate it.
- Guides: help readers choose components, sequence upgrades, and decide when buying vs building makes sense.
- DIY reference pages: centralize technical concepts that repeat across many hardware categories.

Proposed first-pass structure:

```text
src/content/docs/docs/
  sim-racing.md
  flight-simulation.md

  components/
    index.md
    steering-wheels.md
    wheel-bases.md
    pedals.md
    shifters.md
    handbrakes.md
    joysticks.md
    yokes.md
    throttles.md
    rudder-pedals.md
    button-boxes-and-panels.md
    rigs-and-cockpits.md
    seats-and-ergonomics.md
    display-systems.md
    vr-and-head-tracking.md
    tactile-feedback.md
    wind-simulation.md
    belt-tensioners.md
    g-seats.md
    motion-platforms.md

  guides/
    index.md
    choosing-your-first-sim-racing-setup.md
    choosing-your-first-flight-sim-setup.md
    upgrade-paths.md
    buy-vs-build.md
    matching-hardware-to-goals.md

  diy/
    index.md
    sensors-and-input-detection.md
    force-feedback-and-actuation.md
    telemetry-and-software-integration.md
    mounting-rigidity-and-ergonomics.md
    power-safety-and-reliability.md
```

## Page Responsibilities

### Domain landing pages

`src/content/docs/docs/sim-racing.md` and `src/content/docs/docs/flight-simulation.md` should be rewritten as concise
entry pages.

They should include:

- what the domain demands from hardware
- typical setup tiers and upgrade paths
- a map of major component families
- domain-specific notes that are not worth duplicating everywhere
- links into deeper component, guide, and DIY pages

They should not remain long encyclopedic lists of every category.

### Component pages

Each component page should follow a stable structure so the wiki remains consistent as it grows.

Recommended section template:

1. What it is
2. Where it is used
3. Main variants
4. How it works
5. What matters when choosing
6. DIY/build considerations
7. Trade-offs and limitations
8. Related components

This template supports both buyer guidance and engineering-oriented context without turning pages into product lists.

### Guides

Guide pages should be decision-oriented and opinionated. They should answer questions such as:

- what should I start with?
- what should I upgrade next?
- when does building make sense?
- which hardware matters most for my goals?

Guide pages should avoid duplicating deep hardware definitions that belong in component pages.

### DIY reference pages

DIY pages should explain shared technical concepts once and then be referenced from multiple component pages.

These pages should cover:

- sensing methods and input detection
- force feedback, actuation, and motion concepts
- telemetry and software integration patterns
- mounting rigidity and ergonomics
- safety and reliability basics for higher-power systems

## Content Migration Strategy

The current overview pages should be treated as source material, not as final structures.

Migration rules:

- keep strong explanatory paragraphs that still read clearly
- move category-specific sections into their new component pages
- rewrite introductions so they orient readers rather than trying to explain everything inline
- tighten terminology and remove repeated phrasing
- replace vague category descriptions with trade-offs and practical criteria

Examples:

- the existing sim racing wheel, pedal, rig, VR, wind, tactile, and motion sections become component pages or feed them
- the existing flight sim stick, yoke, throttle, pedals, panel, cockpit, VR, and motion sections become component pages
  or feed them
- cross-cutting setup advice moves into `guides/`
- recurring engineering concepts move into `diy/`

## Research and Verification Scope

This effort includes content verification and targeted enrichment, not just file movement.

Research goals for the first pass:

- verify the factual accuracy of existing statements in the two current domain pages
- fill clear omissions in the hardware taxonomy
- add practical distinctions between major component variants
- make terminology more precise and less marketing-driven
- explain decision criteria that matter to both buyers and builders

Topics that especially need stronger coverage:

- gear-driven, belt-driven, and direct-drive steering systems
- potentiometers, Hall sensors, load cells, and hydraulic-style brake systems
- joystick, yoke, throttle quadrant, HOTAS throttle, and rudder pedal differences
- triples, ultrawides, projectors, VR, and head tracking trade-offs
- tactile transducers vs motion platforms vs G-cueing systems
- seat movers vs frame movers vs more advanced multi-DOF motion systems
- button boxes, switch panels, MFD-style controls, and touch alternatives

The content should remain category-level and educational. It should avoid turning into a brand-by-brand recommendation
database unless a later guide explicitly needs representative examples.

## First-Pass Priorities

The first implementation pass should prioritize:

1. Rewriting the two landing pages
2. Creating the highest-value shared component pages
3. Creating the decision-oriented guide pages
4. Creating the shared DIY reference pages

Suggested component priority order:

- pedals
- steering wheels and wheel bases
- joysticks, yokes, throttles, and rudder pedals
- rigs and cockpits
- VR and head tracking
- tactile feedback
- motion platforms

The more niche immersion pages such as belt tensioners, G-seats, and wind simulation should still exist in the
first-pass tree, but they can follow after the most fundamental categories are established.

## Quality Bar

Each new page should:

- be useful to both a buyer and a DIY builder
- explain at least one important trade-off
- use accurate terminology and avoid unsupported claims
- link to adjacent topics instead of duplicating their content

The rewritten landing pages should:

- be shorter and easier to scan than the current versions
- orient readers clearly by domain
- act as navigation hubs into the broader wiki

## Out of Scope

This design does not include:

- expanding `src/content/docs/gear/`
- building a product recommendation database
- adding calculators or interactive tooling
- changing global site navigation outside what is needed for the new docs tree
- writing exhaustive niche pages for every peripheral subtype in the first pass

## Risks and Mitigations

### Risk: Over-broad first rewrite

Trying to fully rewrite every possible page at once could reduce quality and make verification shallow.

Mitigation:

- implement in phases
- establish structure and highest-value pages first
- use consistent templates so later expansion stays coherent

### Risk: Domain context gets lost in shared pages

Some hardware has different importance or usage patterns in racing and flight sim.

Mitigation:

- keep domain landing pages strong
- include a "where it is used" section on component pages
- call out major domain-specific differences inline where needed

### Risk: Buyer guidance and DIY depth compete for space

Pages can become too long if every topic tries to do everything.

Mitigation:

- keep component pages category-focused
- move broad decision-making into `guides/`
- move repeated technical concepts into `diy/`

## Implementation Plan Boundary

The later implementation plan for this design should cover:

1. Exact file creation and rewrites under `src/content/docs/docs/`
2. Content migration from the two current overview pages
3. Research-backed enrichment of first-pass pages
4. Navigation consistency within the docs tree
5. Verification through `pnpm build`

The implementation plan should avoid bundling unrelated site work outside this docs scope.
