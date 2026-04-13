# Docs Wiki Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `src/content/docs/docs/` into a broader component-first wiki for sim racing and flight simulation,
while improving accuracy, navigation, and buyer/DIY usefulness.

**Architecture:** Keep `sim-racing.md` and `flight-simulation.md` as top-level landing pages, then add shared
`components/`, `guides/`, and `diy/` sections beneath `src/content/docs/docs/`. Migrate useful material out of the two
current overview pages into focused reference pages, and verify the result with the site build.

**Tech Stack:** Astro 6, Starlight content collections, Markdown/MDX content, pnpm

---

## File Structure

### Existing files to modify

- `src/content/docs/docs/sim-racing.md` - rewrite into a concise sim racing landing page
- `src/content/docs/docs/flight-simulation.md` - rewrite into a concise flight simulation landing page

### New directories to create

- `src/content/docs/docs/components/`
- `src/content/docs/docs/guides/`
- `src/content/docs/docs/diy/`

### New component pages to create

- `src/content/docs/docs/components/index.md`
- `src/content/docs/docs/components/steering-wheels.md`
- `src/content/docs/docs/components/wheel-bases.md`
- `src/content/docs/docs/components/pedals.md`
- `src/content/docs/docs/components/shifters.md`
- `src/content/docs/docs/components/handbrakes.md`
- `src/content/docs/docs/components/joysticks.md`
- `src/content/docs/docs/components/yokes.md`
- `src/content/docs/docs/components/throttles.md`
- `src/content/docs/docs/components/rudder-pedals.md`
- `src/content/docs/docs/components/button-boxes-and-panels.md`
- `src/content/docs/docs/components/rigs-and-cockpits.md`
- `src/content/docs/docs/components/seats-and-ergonomics.md`
- `src/content/docs/docs/components/display-systems.md`
- `src/content/docs/docs/components/vr-and-head-tracking.md`
- `src/content/docs/docs/components/tactile-feedback.md`
- `src/content/docs/docs/components/wind-simulation.md`
- `src/content/docs/docs/components/belt-tensioners.md`
- `src/content/docs/docs/components/g-seats.md`
- `src/content/docs/docs/components/motion-platforms.md`

### New guide pages to create

- `src/content/docs/docs/guides/index.md`
- `src/content/docs/docs/guides/choosing-your-first-sim-racing-setup.md`
- `src/content/docs/docs/guides/choosing-your-first-flight-sim-setup.md`
- `src/content/docs/docs/guides/upgrade-paths.md`
- `src/content/docs/docs/guides/buy-vs-build.md`
- `src/content/docs/docs/guides/matching-hardware-to-goals.md`

### New DIY pages to create

- `src/content/docs/docs/diy/index.md`
- `src/content/docs/docs/diy/sensors-and-input-detection.md`
- `src/content/docs/docs/diy/force-feedback-and-actuation.md`
- `src/content/docs/docs/diy/telemetry-and-software-integration.md`
- `src/content/docs/docs/diy/mounting-rigidity-and-ergonomics.md`
- `src/content/docs/docs/diy/power-safety-and-reliability.md`

## Task 1: Create the section skeleton and index pages

**Files:**

- Create: `src/content/docs/docs/components/index.md`
- Create: `src/content/docs/docs/guides/index.md`
- Create: `src/content/docs/docs/diy/index.md`
- Modify: `src/content/docs/docs/sim-racing.md`
- Modify: `src/content/docs/docs/flight-simulation.md`

- [ ] **Step 1: Create the new directories**

Run: `mkdir -p src/content/docs/docs/components src/content/docs/docs/guides src/content/docs/docs/diy` Expected:
command succeeds with no output

- [ ] **Step 2: Add the components index page**

```md
---
title: Components
description:
  Browse the main hardware categories used in sim racing and flight simulation, from controls and cockpits to displays,
  tactile systems, and motion.
---

# Components

This section explains the major hardware families used across sim racing and flight simulation.

Use these pages when you want to understand what a component does, how it works, what trade-offs matter, and what to
watch for if you plan to build your own.

## Core controls

- [Steering Wheels](/docs/components/steering-wheels/)
- [Wheel Bases](/docs/components/wheel-bases/)
- [Pedals](/docs/components/pedals/)
- [Shifters](/docs/components/shifters/)
- [Handbrakes](/docs/components/handbrakes/)
- [Joysticks](/docs/components/joysticks/)
- [Yokes](/docs/components/yokes/)
- [Throttles](/docs/components/throttles/)
- [Rudder Pedals](/docs/components/rudder-pedals/)
- [Button Boxes and Panels](/docs/components/button-boxes-and-panels/)

## Mounting and immersion

- [Rigs and Cockpits](/docs/components/rigs-and-cockpits/)
- [Seats and Ergonomics](/docs/components/seats-and-ergonomics/)
- [Display Systems](/docs/components/display-systems/)
- [VR and Head Tracking](/docs/components/vr-and-head-tracking/)
- [Tactile Feedback](/docs/components/tactile-feedback/)
- [Wind Simulation](/docs/components/wind-simulation/)
- [Belt Tensioners](/docs/components/belt-tensioners/)
- [G-Seats](/docs/components/g-seats/)
- [Motion Platforms](/docs/components/motion-platforms/)
```

- [ ] **Step 3: Add the guides index page**

```md
---
title: Guides
description:
  Practical guides for choosing hardware, sequencing upgrades, and deciding when building your own sim gear makes sense.
---

# Guides

These pages are for decision-making rather than pure reference.

- [Choosing Your First Sim Racing Setup](/docs/guides/choosing-your-first-sim-racing-setup/)
- [Choosing Your First Flight Sim Setup](/docs/guides/choosing-your-first-flight-sim-setup/)
- [Upgrade Paths](/docs/guides/upgrade-paths/)
- [Buy vs Build](/docs/guides/buy-vs-build/)
- [Matching Hardware to Goals](/docs/guides/matching-hardware-to-goals/)
```

- [ ] **Step 4: Add the DIY index page**

```md
---
title: DIY Reference
description:
  Shared technical concepts for builders, including sensors, actuation, telemetry, mounting, safety, and reliability.
---

# DIY Reference

This section collects the technical ideas that appear across many sim hardware projects.

- [Sensors and Input Detection](/docs/diy/sensors-and-input-detection/)
- [Force Feedback and Actuation](/docs/diy/force-feedback-and-actuation/)
- [Telemetry and Software Integration](/docs/diy/telemetry-and-software-integration/)
- [Mounting, Rigidity, and Ergonomics](/docs/diy/mounting-rigidity-and-ergonomics/)
- [Power, Safety, and Reliability](/docs/diy/power-safety-and-reliability/)
```

- [ ] **Step 5: Rewrite `src/content/docs/docs/sim-racing.md` as a landing page**

```md
---
title: Sim Racing Overview
description:
  Learn how sim racing hardware fits together, what matters most when choosing gear, and where to go deeper in the
  OpenSimGear wiki.
sidebar:
  order: 0
---

# Sim Racing Overview

Sim racing hardware ranges from simple desk-mounted wheel sets to rigid cockpits with load-cell pedals, tactile
feedback, triples, VR, and motion. The best setup depends less on chasing every upgrade and more on matching the
hardware to the type of driving, available space, budget, and willingness to tune and maintain the system.

## What matters most in sim racing hardware

- steering feel and force feedback quality
- brake control and consistency
- mounting rigidity
- display choice and field of view
- comfort for long sessions
- whether immersion add-ons support your goals or just add complexity

## Typical setup tiers

### Entry level

Usually includes a wheel-and-pedal bundle on a desk or wheel stand. The goal is low cost and easy setup, but rigidity,
pedal feel, and force feedback detail are limited.

### Enthusiast

Often adds a direct-drive wheel base, stronger pedals, and a dedicated rig. This is where braking precision, stiffness,
and ergonomics start to matter much more than raw feature count.

### Advanced immersion

May add tactile transducers, triples or VR, belt tensioners, wind simulation, or motion. These systems can improve
feedback and presence, but only when the core control hardware and rig are already solid.

## Start here

- [Pedals](/docs/components/pedals/)
- [Steering Wheels](/docs/components/steering-wheels/)
- [Wheel Bases](/docs/components/wheel-bases/)
- [Rigs and Cockpits](/docs/components/rigs-and-cockpits/)
- [Display Systems](/docs/components/display-systems/)
- [VR and Head Tracking](/docs/components/vr-and-head-tracking/)
- [Tactile Feedback](/docs/components/tactile-feedback/)
- [Motion Platforms](/docs/components/motion-platforms/)

## Related guides

- [Choosing Your First Sim Racing Setup](/docs/guides/choosing-your-first-sim-racing-setup/)
- [Upgrade Paths](/docs/guides/upgrade-paths/)
- [Buy vs Build](/docs/guides/buy-vs-build/)
```

- [ ] **Step 6: Rewrite `src/content/docs/docs/flight-simulation.md` as a landing page**

```md
---
title: Flight Simulation Overview
description:
  Learn how flight sim hardware fits together, which controls matter for different aircraft types, and where to go
  deeper in the OpenSimGear wiki.
sidebar:
  order: 1
---

# Flight Simulation Overview

Flight simulation setups vary far more by aircraft type than many sim racing setups do. A desktop joystick can work well
for casual flying, while a more specialized setup may need a yoke, throttle quadrant, rudder pedals, switch panels, head
tracking, or a dedicated cockpit. The right setup depends on whether you fly general aviation, airliners, helicopters,
combat aircraft, or a mix of all of them.

## What matters most in flight sim hardware

- matching controls to aircraft type
- axis precision and smoothness
- enough switches or buttons for common workflows
- head movement, visibility, and situational awareness
- comfort for long sessions
- whether extra immersion hardware helps training value or only adds complexity

## Common setup patterns

### General aviation and airliners

Often prioritize yokes, throttle quadrants, rudder pedals, and accessible switch inputs.

### Combat and space-oriented flying

Often prioritize joysticks, HOTAS throttles, hats, triggers, and head tracking or VR.

### Full-cockpit immersion

May add dedicated panels, larger display systems, VR, tactile cues, or motion, but these only pay off once the main
control scheme fits the aircraft you fly most.

## Start here

- [Joysticks](/docs/components/joysticks/)
- [Yokes](/docs/components/yokes/)
- [Throttles](/docs/components/throttles/)
- [Rudder Pedals](/docs/components/rudder-pedals/)
- [Button Boxes and Panels](/docs/components/button-boxes-and-panels/)
- [Display Systems](/docs/components/display-systems/)
- [VR and Head Tracking](/docs/components/vr-and-head-tracking/)
- [Motion Platforms](/docs/components/motion-platforms/)

## Related guides

- [Choosing Your First Flight Sim Setup](/docs/guides/choosing-your-first-flight-sim-setup/)
- [Matching Hardware to Goals](/docs/guides/matching-hardware-to-goals/)
- [Buy vs Build](/docs/guides/buy-vs-build/)
```

- [ ] **Step 7: Run the site build to validate the new skeleton**

Run: `pnpm build` Expected: build succeeds and Starlight includes the new pages in the generated docs tree

- [ ] **Step 8: Commit the skeleton**

```bash
git add src/content/docs/docs/sim-racing.md src/content/docs/docs/flight-simulation.md src/content/docs/docs/components src/content/docs/docs/guides src/content/docs/docs/diy
git commit -m "docs: add wiki structure for sim hardware"
```

## Task 2: Create the highest-priority shared component pages

**Files:**

- Create: `src/content/docs/docs/components/steering-wheels.md`
- Create: `src/content/docs/docs/components/wheel-bases.md`
- Create: `src/content/docs/docs/components/pedals.md`
- Create: `src/content/docs/docs/components/joysticks.md`
- Create: `src/content/docs/docs/components/yokes.md`
- Create: `src/content/docs/docs/components/throttles.md`
- Create: `src/content/docs/docs/components/rudder-pedals.md`

- [ ] **Step 1: Add `src/content/docs/docs/components/pedals.md`**

```md
---
title: Pedals
description:
  Understand sim racing and flight sim pedal systems, including sensing methods, brake feel, rudder use, and DIY
  trade-offs.
---

# Pedals

## What it is

Pedals are foot-operated controls used for throttle, braking, clutch operation, or rudder and toe-brake input.

## Where it is used

Pedal systems appear in both sim racing and flight simulation, but they serve different control schemes.

## Main variants

- sim racing two-pedal and three-pedal sets
- rudder pedals with or without toe brakes
- potentiometer, Hall-sensor, and load-cell designs
- systems with hydraulic-style dampers or elastomer stacks

## How it works

The key difference is not just pedal shape but sensing method and force model. Sim racing brake pedals often benefit
from force-based braking feel, while flight pedals prioritize smooth travel and controllable yaw input.

## What matters when choosing

- sensing consistency
- brake feel or rudder smoothness
- stiffness and adjustability
- mounting rigidity
- software calibration options

## DIY/build considerations

- sensor type affects repeatability and maintenance
- linkage geometry changes feel significantly
- rigid mounting matters as much as pedal hardware quality
- higher-force brake systems need stronger frames and safer mechanical stops

## Trade-offs and limitations

Load-cell and high-force brake systems can improve consistency, but they also increase mounting demands. Rudder pedals
need smooth travel and good centering, which is a different design problem from building a stiff racing brake.

## Related components

- [Rigs and Cockpits](/docs/components/rigs-and-cockpits/)
- [Seats and Ergonomics](/docs/components/seats-and-ergonomics/)
- [Sensors and Input Detection](/docs/diy/sensors-and-input-detection/)
```

- [ ] **Step 2: Add `src/content/docs/docs/components/steering-wheels.md`**

```md
---
title: Steering Wheels
description: Learn how steering wheels differ by shape, controls, compatibility, and use case in sim racing setups.
---

# Steering Wheels

## What it is

A steering wheel is the driver interface mounted to a wheel base. It defines grip shape, control access, diameter, and
driving ergonomics.

## Where it is used

Steering wheels are primarily used in sim racing.

## Main variants

- round wheels
- formula-style wheels
- GT and hybrid wheels
- rims with integrated buttons, encoders, and displays

## How it works

The wheel itself does not generate force feedback. It transmits input to the base and provides the shape, leverage, and
button layout that influence control feel.

## What matters when choosing

- diameter and leverage
- grip shape and hand position
- button access
- quick-release and mounting compatibility
- weight, which affects some bases more than others

## DIY/build considerations

- wheel weight affects inertia and base response
- button plates, magnetic shifters, and QR systems add complexity quickly
- electrical routing through slip rings or coiled cables needs reliability planning

## Trade-offs and limitations

A heavier or feature-rich wheel can improve usability, but it may also dull response on weaker bases or complicate DIY
assembly.

## Related components

- [Wheel Bases](/docs/components/wheel-bases/)
- [Shifters](/docs/components/shifters/)
- [Button Boxes and Panels](/docs/components/button-boxes-and-panels/)
```

- [ ] **Step 3: Add `src/content/docs/docs/components/wheel-bases.md`**

```md
---
title: Wheel Bases
description:
  Compare gear-driven, belt-driven, and direct-drive wheel bases and understand the trade-offs that matter in sim
  racing.
---

# Wheel Bases

## What it is

A wheel base is the force-feedback drive unit that reads steering input and generates torque at the wheel.

## Where it is used

Wheel bases are a core sim racing component.

## Main variants

- gear-driven bases
- belt-driven bases
- direct-drive bases

## How it works

The base combines motor control, steering position sensing, and force-feedback output. The drive mechanism determines
how directly torque reaches the wheel and how much backlash, friction, or compliance exists in the system.

## What matters when choosing

- torque range
- detail and smoothness
- latency and control quality
- thermal behavior
- software support
- mounting requirements

## DIY/build considerations

- direct-drive systems require strong mounts and careful power management
- motor control tuning affects feel as much as raw torque numbers
- emergency stop strategy matters for higher-torque systems

## Trade-offs and limitations

Direct drive usually offers the best torque fidelity, but it also raises cost, mounting demands, and safety
requirements. Lower-end systems can still be effective when matched to realistic expectations and solid pedals.

## Related components

- [Steering Wheels](/docs/components/steering-wheels/)
- [Rigs and Cockpits](/docs/components/rigs-and-cockpits/)
- [Force Feedback and Actuation](/docs/diy/force-feedback-and-actuation/)
```

- [ ] **Step 4: Add the flight-control component pages**

```md
---
title: Joysticks
description:
  Learn how joysticks differ by gimbal design, sensors, grip layout, and aircraft use case in flight simulation.
---

# Joysticks

## What it is

A joystick is a hand-operated flight control used for pitch and roll, often with additional buttons, hats, and triggers.

## Where it is used

Joysticks are common in combat flight sims, helicopter setups, and general-purpose desktop flying.

## Main variants

- desktop sticks
- center-mounted sticks
- side sticks
- grips with twist yaw or separate rudder control

## How it works

The grip moves through a gimbal or cam-based mechanism, with sensors reading axis position. The internal mechanism
matters more than appearance because centering feel and smoothness strongly affect precision.

## What matters when choosing

- centering feel
- axis smoothness
- grip ergonomics
- button and hat count
- extension compatibility

## DIY/build considerations

- gimbal geometry and cam profile dominate feel
- sensor placement affects calibration stability
- longer extensions change leverage and mounting needs

## Trade-offs and limitations

Sticks with many controls improve hands-on access, but size, weight, and mechanism complexity can make them harder to
mount well.

## Related components

- [Throttles](/docs/components/throttles/)
- [Rudder Pedals](/docs/components/rudder-pedals/)
- [Button Boxes and Panels](/docs/components/button-boxes-and-panels/)
```

```md
---
title: Yokes
description:
  Understand yoke-based flight controls, their strengths for GA and airliner setups, and the mechanical trade-offs
  involved.
---

# Yokes

## What it is

A yoke is a flight control interface that manages pitch and roll in many general aviation and transport aircraft
workflows.

## Where it is used

Yokes are most common in general aviation and airliner-oriented flight simulation.

## Main variants

- desktop yokes
- shaft-based yokes
- pendular yokes
- compact integrated yoke systems

## How it works

Yokes translate push-pull and rotational inputs into pitch and roll axes. The feel depends on travel range, friction,
centering method, and how well the mechanism avoids play.

## What matters when choosing

- pitch travel
- smoothness and play
- mounting stability
- switch placement
- integration with throttle and panel workflows

## DIY/build considerations

- pitch travel and rigidity are difficult to get right in compact builds
- bearing choice and shaft support strongly affect smoothness
- desktop clamping is often the weak point

## Trade-offs and limitations

Yokes can improve realism for specific aircraft, but they are less flexible than joysticks for combat or
helicopter-focused flying.

## Related components

- [Throttles](/docs/components/throttles/)
- [Rudder Pedals](/docs/components/rudder-pedals/)
- [Rigs and Cockpits](/docs/components/rigs-and-cockpits/)
```

```md
---
title: Throttles
description:
  Compare throttle quadrants, HOTAS throttles, and other engine-control devices used across flight simulation.
---

# Throttles

## What it is

A throttle device controls engine power and often provides access to additional switches, hats, detents, and aircraft
functions.

## Where it is used

Throttles are used across nearly all flight simulation setups.

## Main variants

- simple throttle quadrants
- HOTAS throttles
- airliner-style multi-engine quadrants
- collective-style controls for rotary-wing setups

## How it works

Throttle devices map lever travel to power or system functions. Their usefulness depends on travel quality, detent
design, axis stability, and how well the layout matches the aircraft type being flown.

## What matters when choosing

- axis count
- detents and travel feel
- switch density
- aircraft fit
- mounting options

## DIY/build considerations

- detent design needs both mechanical repeatability and software calibration
- lever friction adjustment matters for realism
- multi-axis builds quickly become wiring-heavy

## Trade-offs and limitations

General-purpose throttles are flexible, but dedicated layouts can be much better for specific aircraft families.

## Related components

- [Joysticks](/docs/components/joysticks/)
- [Yokes](/docs/components/yokes/)
- [Button Boxes and Panels](/docs/components/button-boxes-and-panels/)
```

```md
---
title: Rudder Pedals
description: Learn how rudder pedal systems work, what toe brakes add, and what matters in flight sim pedal design.
---

# Rudder Pedals

## What it is

Rudder pedals control yaw and often provide left and right toe-brake inputs.

## Where it is used

Rudder pedals are used in many flight simulation setups and are especially valuable for coordinated turns, taxiing, and
crosswind work.

## Main variants

- sliding designs
- rocking designs
- pedal sets with toe brakes
- compact desktop-oriented sets

## How it works

The main axis controls yaw, while toe brake axes provide independent braking. Smooth travel, consistent centering, and
low stiction matter more than raw force.

## What matters when choosing

- travel smoothness
- centering feel
- toe-brake quality
- foot spacing
- mounting stability

## DIY/build considerations

- linkage friction can ruin feel even with good sensors
- toe-brake geometry adds complexity quickly
- wide pedal spacing needs more rigid mounts

## Trade-offs and limitations

Compact pedals save space, but they often sacrifice travel, leverage, and realism.

## Related components

- [Joysticks](/docs/components/joysticks/)
- [Yokes](/docs/components/yokes/)
- [Sensors and Input Detection](/docs/diy/sensors-and-input-detection/)
```

- [ ] **Step 5: Run the site build after the priority component pages are added**

Run: `pnpm build` Expected: build succeeds and the new component pages appear in the docs sidebar under `Docs`

- [ ] **Step 6: Commit the priority component pages**

```bash
git add src/content/docs/docs/components/steering-wheels.md src/content/docs/docs/components/wheel-bases.md src/content/docs/docs/components/pedals.md src/content/docs/docs/components/joysticks.md src/content/docs/docs/components/yokes.md src/content/docs/docs/components/throttles.md src/content/docs/docs/components/rudder-pedals.md
git commit -m "docs: add core control hardware pages"
```

## Task 3: Add the remaining component catalog pages

**Files:**

- Create: `src/content/docs/docs/components/shifters.md`
- Create: `src/content/docs/docs/components/handbrakes.md`
- Create: `src/content/docs/docs/components/button-boxes-and-panels.md`
- Create: `src/content/docs/docs/components/rigs-and-cockpits.md`
- Create: `src/content/docs/docs/components/seats-and-ergonomics.md`
- Create: `src/content/docs/docs/components/display-systems.md`
- Create: `src/content/docs/docs/components/vr-and-head-tracking.md`
- Create: `src/content/docs/docs/components/tactile-feedback.md`
- Create: `src/content/docs/docs/components/wind-simulation.md`
- Create: `src/content/docs/docs/components/belt-tensioners.md`
- Create: `src/content/docs/docs/components/g-seats.md`
- Create: `src/content/docs/docs/components/motion-platforms.md`

- [ ] **Step 1: Add the driving-peripheral pages**

```md
---
title: Shifters
description: Understand H-pattern and sequential shifters, what they add to sim racing, and what matters in DIY builds.
---

# Shifters

## What it is

A shifter provides physical gear selection beyond wheel-mounted paddles.

## Where it is used

Shifters are mainly used in sim racing.

## Main variants

- H-pattern shifters
- sequential shifters
- hybrid designs with swappable modes

## How it works

Shifters detect gear gate position or up/down lever movement and translate it into digital or analog input events.

## What matters when choosing

- shift feel
- gate precision
- mounting strength
- noise level
- mode flexibility

## DIY/build considerations

- mechanism tolerance strongly affects gear recognition
- return springs and detents define feel
- enclosure rigidity matters more than expected

## Trade-offs and limitations

Physical shifters improve immersion for the right cars, but they are not equally useful across all racing disciplines.

## Related components

- [Steering Wheels](/docs/components/steering-wheels/)
- [Handbrakes](/docs/components/handbrakes/)
```

```md
---
title: Handbrakes
description: Learn how sim racing handbrakes work, when they matter, and what design choices affect feel and durability.
---

# Handbrakes

## What it is

A handbrake is a lever-operated input device used for rally, drifting, and other driving styles that benefit from rear
brake control.

## Where it is used

Handbrakes are primarily used in sim racing.

## Main variants

- analog handbrakes
- switch-based handbrakes
- horizontal and vertical layouts

## How it works

The lever travel is converted into either an on/off signal or a variable analog brake axis.

## What matters when choosing

- analog control quality
- lever geometry
- stiffness and return feel
- mount stability

## DIY/build considerations

- pivot quality affects smoothness and repeatability
- load path and stop design determine durability
- sensor mounting needs to resist side loads

## Trade-offs and limitations

Handbrakes are highly useful in specific disciplines, but they add little value in many circuit racing workflows.

## Related components

- [Shifters](/docs/components/shifters/)
- [Rigs and Cockpits](/docs/components/rigs-and-cockpits/)
```

- [ ] **Step 2: Add the cockpit and interface pages**

```md
---
title: Button Boxes and Panels
description:
  Compare button boxes, switch panels, MFD-style controls, and other physical interfaces used in racing and flight
  simulation.
---

# Button Boxes and Panels

## What it is

These are auxiliary control interfaces that move functions off the keyboard and onto dedicated physical inputs.

## Where it is used

They are used in both sim racing and flight simulation, but flight sim usually benefits more from larger control sets.

## Main variants

- simple button boxes
- toggle and rotary switch panels
- MFD-style frames
- dashboards and touch overlays

## How it works

Most devices present as USB input controllers, though some rely on simulator-specific integrations or external software
layers.

## What matters when choosing

- control density
- labeling and discoverability
- workflow fit
- mount placement
- software mapping friction

## DIY/build considerations

- input matrix design affects wiring complexity
- labeling and enclosure design matter for usability
- simulator integration may be harder than hardware assembly

## Trade-offs and limitations

More switches can improve immersion and efficiency, but poorly placed controls become clutter instead of help.

## Related components

- [Joysticks](/docs/components/joysticks/)
- [Yokes](/docs/components/yokes/)
- [Telemetry and Software Integration](/docs/diy/telemetry-and-software-integration/)
```

```md
---
title: Rigs and Cockpits
description: Learn how mounting rigidity, adjustability, and layout affect sim racing and flight simulation performance.
---

# Rigs and Cockpits

## What it is

A rig or cockpit is the structural platform that supports controls, displays, seat position, and body ergonomics.

## Where it is used

Rigid mounting matters in both sim racing and flight simulation, though the exact layout differs by use case.

## Main variants

- desk and clamp setups
- wheel stands
- aluminum profile rigs
- fixed flight cockpits
- hybrid rigs

## How it works

The rig does not only hold hardware in place. It controls flex, alignment, ergonomics, and how well the rest of the
system performs under load.

## What matters when choosing

- stiffness
- adjustability
- available space
- compatibility with future upgrades
- access and comfort

## DIY/build considerations

- control mounting geometry matters as much as raw material strength
- modular profile systems are easier to iterate than welded one-off frames
- heavy immersion hardware changes load paths and resonance behavior

## Trade-offs and limitations

Light and compact setups save space, but stronger wheels, pedals, and motion systems expose flex very quickly.

## Related components

- [Seats and Ergonomics](/docs/components/seats-and-ergonomics/)
- [Wheel Bases](/docs/components/wheel-bases/)
- [Mounting, Rigidity, and Ergonomics](/docs/diy/mounting-rigidity-and-ergonomics/)
```

```md
---
title: Seats and Ergonomics
description: Understand seating posture, reach, comfort, and body support in sim racing and flight simulation setups.
---

# Seats and Ergonomics

## What it is

Seat choice and body positioning determine comfort, consistency, and how well you can use the controls over long
sessions.

## Where it is used

This matters in both sim racing and flight simulation.

## Main variants

- office-style seating
- reclined racing seats
- upright flight seats
- custom DIY seating layouts

## How it works

Ergonomics is the relationship between the seat, controls, screen position, and body support. A technically good control
set can feel poor when the posture is wrong.

## What matters when choosing

- posture fit
- entry and exit convenience
- support under braking or rudder use
- heat and comfort over long sessions

## DIY/build considerations

- seat rails and brackets affect rigidity and adjustment range
- body support changes how motion, pedals, and tactile systems feel
- reused automotive seats may be strong but bulky

## Trade-offs and limitations

Aggressive seating positions can improve realism for one discipline while making another less comfortable or practical.

## Related components

- [Rigs and Cockpits](/docs/components/rigs-and-cockpits/)
- [Motion Platforms](/docs/components/motion-platforms/)
```

- [ ] **Step 3: Add the visual and immersion pages**

```md
---
title: Display Systems
description: Compare single monitors, ultrawides, triples, projectors, and other display approaches used in sim setups.
---

# Display Systems

## What it is

Display systems provide the visual scene and strongly influence field of view, situational awareness, and immersion.

## Where it is used

Display choice matters in both sim racing and flight simulation.

## Main variants

- single monitors
- ultrawides
- triple-monitor setups
- projector systems
- mixed desktop and panel layouts

## How it works

Display layout affects how much of the virtual environment is visible without camera controls. Field of view, viewing
distance, and alignment are often more important than panel size alone.

## What matters when choosing

- usable field of view
- GPU load
- bezel and alignment impact
- desk or rig space
- compatibility with the rest of the setup

## DIY/build considerations

- monitor arms and brackets need more stiffness than expected
- screen geometry and eye position matter for believable scale
- cable management becomes a real system design problem in larger layouts

## Trade-offs and limitations

Wider display coverage improves visibility, but it increases cost, complexity, and calibration effort.

## Related components

- [VR and Head Tracking](/docs/components/vr-and-head-tracking/)
- [Rigs and Cockpits](/docs/components/rigs-and-cockpits/)
```

```md
---
title: VR and Head Tracking
description:
  Understand the trade-offs between VR, head tracking, and traditional display setups in sim racing and flight
  simulation.
---

# VR and Head Tracking

## What it is

VR and head tracking change the way the simulator responds to your head position and viewing direction.

## Where it is used

Both are used in sim racing and flight simulation, but their strengths differ by game support, comfort tolerance, and
workflow.

## Main variants

- full VR headsets
- optical or marker-based head tracking
- inertial head tracking
- mixed monitor-plus-tracking setups

## How it works

VR replaces the display view entirely, while head tracking modifies the in-game camera based on head movement. Each
method changes visibility, depth cues, and cockpit interaction differently.

## What matters when choosing

- comfort
- clarity
- system performance cost
- ability to access real controls
- simulator support quality

## DIY/build considerations

- sensor placement and line of sight matter for tracking quality
- physical control reference becomes harder in VR
- cooling and cable routing affect long-session usability

## Trade-offs and limitations

VR can add unmatched presence, but it also adds performance demands, comfort limits, and workflow friction.

## Related components

- [Display Systems](/docs/components/display-systems/)
- [Button Boxes and Panels](/docs/components/button-boxes-and-panels/)
```

```md
---
title: Tactile Feedback
description: Learn how tactile transducers work, what they can and cannot simulate, and how to integrate them well.
---

# Tactile Feedback

## What it is

Tactile feedback systems use transducers to convert audio or telemetry-derived signals into vibration.

## Where it is used

They are common in advanced sim racing setups and can also support some flight simulation workflows.

## Main variants

- seat-mounted tactile transducers
- pedal-mounted tactile systems
- multi-zone shaker layouts
- audio-driven and telemetry-driven setups

## How it works

These systems do not reproduce full motion. They provide vibration cues that can suggest engine behavior, surface
texture, impacts, or other events when tuned well.

## What matters when choosing

- signal quality
- mounting surface
- isolation from the rest of the frame
- number of channels
- tuning effort

## DIY/build considerations

- resonance control matters as much as hardware selection
- amplifier sizing and impedance matching must be safe
- bad mounting can blur all cues into noise

## Trade-offs and limitations

Tactile systems can add useful information at lower cost than motion, but they cannot replace the body cues of a true
moving system.

## Related components

- [Motion Platforms](/docs/components/motion-platforms/)
- [Power, Safety, and Reliability](/docs/diy/power-safety-and-reliability/)
```

```md
---
title: Wind Simulation
description:
  Understand what wind simulation adds to a sim setup and why its value depends heavily on the rest of the system.
---

# Wind Simulation

## What it is

Wind simulation uses fans or blowers to create airflow cues tied to vehicle or aircraft behavior.

## Where it is used

It is more common in sim racing, though it can support some open-cockpit or immersion-focused flight setups.

## Main variants

- simple speed-linked fan systems
- multi-channel directional airflow systems
- DIY blower-based systems

## How it works

The system changes airflow based on telemetry or simulator data. This can enhance speed perception and comfort,
especially in enclosed or VR-heavy setups.

## What matters when choosing

- airflow range
- noise
- response speed
- control granularity
- mount placement

## DIY/build considerations

- fan noise and vibration can become distracting
- ducting and nozzle design change the result significantly
- power switching and fan control need to be safe and stable

## Trade-offs and limitations

Wind simulation can improve presence, but it is a finishing detail rather than a substitute for better core controls or
displays.

## Related components

- [VR and Head Tracking](/docs/components/vr-and-head-tracking/)
- [Motion Platforms](/docs/components/motion-platforms/)
```

```md
---
title: Belt Tensioners
description:
  Learn how belt-tensioning systems create braking and acceleration cues and what makes them difficult to implement
  well.
---

# Belt Tensioners

## What it is

A belt tensioner tightens harness straps to suggest body load during braking, acceleration, or other simulated events.

## Where it is used

It is mostly used in advanced sim racing and high-immersion motion setups.

## Main variants

- servo-driven systems
- motor-and-spool systems
- linear-actuated systems

## How it works

The system controls belt tension in response to telemetry, often focusing on braking cues. Good systems rely on timing,
smoothness, and safe force limits rather than raw pull strength.

## What matters when choosing

- response speed
- force control
- safety strategy
- harness integration
- software compatibility

## DIY/build considerations

- mechanical stops and fail-safe behavior are mandatory
- geometry affects both comfort and cue quality
- tuning is critical to avoid discomfort or unrealistic behavior

## Trade-offs and limitations

Belt tensioners can provide convincing longitudinal cues, but they only represent a narrow slice of full body feedback.

## Related components

- [Seats and Ergonomics](/docs/components/seats-and-ergonomics/)
- [Motion Platforms](/docs/components/motion-platforms/)
```

```md
---
title: G-Seats
description: Understand how G-seats create sustained body pressure cues and how they differ from motion platforms.
---

# G-Seats

## What it is

A G-seat changes body pressure around the torso and legs to simulate sustained loading cues.

## Where it is used

G-seats appear in higher-end sim racing and flight simulation setups.

## Main variants

- paddle-based systems
- bladder-based systems
- hybrid pressure systems

## How it works

Instead of moving the entire cockpit, a G-seat changes contact pressure at the body. This can represent sustained cues
that are difficult for short-throw motion systems to hold.

## What matters when choosing

- cue quality
- body coverage
- adjustment range
- comfort
- maintenance complexity

## DIY/build considerations

- body contact geometry is the whole product
- actuator synchronization matters more than peak movement
- poor adjustment can make the system uncomfortable quickly

## Trade-offs and limitations

G-seats can produce useful sustained cues, but they are mechanically complex and much harder to package well than
tactile systems.

## Related components

- [Belt Tensioners](/docs/components/belt-tensioners/)
- [Motion Platforms](/docs/components/motion-platforms/)
```

```md
---
title: Motion Platforms
description:
  Compare seat movers, frame movers, and more advanced motion systems used to add body cues in simulator setups.
---

# Motion Platforms

## What it is

A motion platform physically moves the seat, cockpit, or whole rig to create body cues that complement the visual
simulation.

## Where it is used

Motion systems are used in advanced sim racing and flight simulation setups.

## Main variants

- seat movers
- rear-traction-loss add-ons
- full-frame movers
- multi-actuator platforms

## How it works

Motion systems do not reproduce real sustained G-forces. They rely on motion cueing: short, timed movements that trick
the body into sensing acceleration, road texture, turbulence, or attitude change.

## What matters when choosing

- cue quality
- latency
- travel range
- payload capacity
- noise and maintenance
- rig compatibility

## DIY/build considerations

- actuator choice defines speed, load capacity, and service burden
- geometry and pivot placement change the cueing result dramatically
- safety, e-stop behavior, and pinch hazards must be designed in from the start

## Trade-offs and limitations

Motion can be highly immersive, but it is expensive, space-hungry, mechanically complex, and easy to tune badly.

## Related components

- [Tactile Feedback](/docs/components/tactile-feedback/)
- [G-Seats](/docs/components/g-seats/)
- [Force Feedback and Actuation](/docs/diy/force-feedback-and-actuation/)
```

- [ ] **Step 4: Run the site build after the full component catalog is added**

Run: `pnpm build` Expected: build succeeds and the component catalog appears without broken internal links

- [ ] **Step 5: Commit the remaining component pages**

```bash
git add src/content/docs/docs/components/shifters.md src/content/docs/docs/components/handbrakes.md src/content/docs/docs/components/button-boxes-and-panels.md src/content/docs/docs/components/rigs-and-cockpits.md src/content/docs/docs/components/seats-and-ergonomics.md src/content/docs/docs/components/display-systems.md src/content/docs/docs/components/vr-and-head-tracking.md src/content/docs/docs/components/tactile-feedback.md src/content/docs/docs/components/wind-simulation.md src/content/docs/docs/components/belt-tensioners.md src/content/docs/docs/components/g-seats.md src/content/docs/docs/components/motion-platforms.md
git commit -m "docs: add cockpit and immersion hardware pages"
```

## Task 4: Add the guide pages

**Files:**

- Create: `src/content/docs/docs/guides/choosing-your-first-sim-racing-setup.md`
- Create: `src/content/docs/docs/guides/choosing-your-first-flight-sim-setup.md`
- Create: `src/content/docs/docs/guides/upgrade-paths.md`
- Create: `src/content/docs/docs/guides/buy-vs-build.md`
- Create: `src/content/docs/docs/guides/matching-hardware-to-goals.md`

- [ ] **Step 1: Add `choosing-your-first-sim-racing-setup.md`**

```md
---
title: Choosing Your First Sim Racing Setup
description: A practical guide to building a first sim racing setup without wasting money on the wrong upgrades.
---

# Choosing Your First Sim Racing Setup

## Prioritize these first

1. a control scheme you will actually use often
2. stable pedal and wheel mounting
3. a brake you can control consistently
4. a display setup that fits your space and GPU budget

## Common mistakes

- buying a stronger wheel before solving pedal quality and mounting
- underestimating rig flex
- adding immersion hardware before the core setup feels right

## Good first-path logic

Start with a dependable wheel-and-pedal setup, then improve mounting and braking consistency before moving into
higher-end displays, tactile systems, or motion.

## Related pages

- [Pedals](/docs/components/pedals/)
- [Wheel Bases](/docs/components/wheel-bases/)
- [Rigs and Cockpits](/docs/components/rigs-and-cockpits/)
```

- [ ] **Step 2: Add `choosing-your-first-flight-sim-setup.md`**

```md
---
title: Choosing Your First Flight Sim Setup
description: A practical guide to choosing flight sim hardware based on the aircraft you actually plan to fly.
---

# Choosing Your First Flight Sim Setup

## Start with aircraft type

Your first purchase decisions should follow the aircraft you fly most often, not the broadest possible hardware bundle.

## Good first-path logic

- general aviation or airliners: prioritize yoke or suitable stick, throttle quadrant, and rudder pedals
- combat-focused flying: prioritize joystick, throttle, and head tracking or VR
- mixed flying: choose flexible controls first and specialize later

## Common mistakes

- buying many switch panels before solving the primary control scheme
- ignoring rudder input quality
- treating all throttle devices as interchangeable

## Related pages

- [Joysticks](/docs/components/joysticks/)
- [Yokes](/docs/components/yokes/)
- [Throttles](/docs/components/throttles/)
- [Rudder Pedals](/docs/components/rudder-pedals/)
```

- [ ] **Step 3: Add the remaining guide pages**

```md
---
title: Upgrade Paths
description:
  Learn which sim hardware upgrades usually deliver the biggest gains first and which ones are mostly finishing touches.
---

# Upgrade Paths

## Sim racing

For many users, the strongest early upgrades are pedals, mounting rigidity, and display or seating improvements before
premium immersion add-ons.

## Flight simulation

For many users, the strongest early upgrades are aircraft-matched controls, rudder quality, and visibility solutions
before cockpit ornamentation.

## Rule of thumb

Upgrade the bottleneck that most affects control, comfort, or awareness before adding complexity elsewhere.
```

```md
---
title: Buy vs Build
description:
  Compare the benefits and drawbacks of buying commercial hardware versus building your own simulator components.
---

# Buy vs Build

## Buying makes more sense when

- you want quick setup and vendor support
- safety and tuning overhead are not attractive
- the product category is hard to DIY well at your current skill level

## Building makes more sense when

- you need unusual geometry or integration
- you want to optimize value
- you enjoy iteration, tuning, and maintenance

## Categories differ

Some devices are easier to build well than others. A switch box is a very different DIY challenge from a safe
direct-drive wheel base or motion platform.
```

```md
---
title: Matching Hardware to Goals
description:
  Choose sim hardware based on realism goals, training value, immersion, space, and willingness to tune complex systems.
---

# Matching Hardware to Goals

## Questions to ask first

- do you want convenience, realism, or experimentation?
- do you value immersion, training transfer, or competitive consistency most?
- how much setup, tuning, and maintenance are you willing to accept?

## Useful patterns

- competitive sim racing often benefits more from pedals and consistency than from spectacle
- aircraft-specific flight sim setups benefit from control matching more than from generic hardware quantity
- high-immersion systems only pay off when the core controls and ergonomics already work well
```

- [ ] **Step 4: Run the site build after the guides are added**

Run: `pnpm build` Expected: build succeeds and the guide pages render under the docs tree without frontmatter or link
errors

- [ ] **Step 5: Commit the guide pages**

```bash
git add src/content/docs/docs/guides/choosing-your-first-sim-racing-setup.md src/content/docs/docs/guides/choosing-your-first-flight-sim-setup.md src/content/docs/docs/guides/upgrade-paths.md src/content/docs/docs/guides/buy-vs-build.md src/content/docs/docs/guides/matching-hardware-to-goals.md
git commit -m "docs: add sim hardware decision guides"
```

## Task 5: Add the shared DIY reference pages

**Files:**

- Create: `src/content/docs/docs/diy/sensors-and-input-detection.md`
- Create: `src/content/docs/docs/diy/force-feedback-and-actuation.md`
- Create: `src/content/docs/docs/diy/telemetry-and-software-integration.md`
- Create: `src/content/docs/docs/diy/mounting-rigidity-and-ergonomics.md`
- Create: `src/content/docs/docs/diy/power-safety-and-reliability.md`

- [ ] **Step 1: Add `sensors-and-input-detection.md`**

```md
---
title: Sensors and Input Detection
description:
  Understand potentiometers, Hall sensors, load cells, and other common sensing methods used in simulator controls.
---

# Sensors and Input Detection

## Common sensor types

- potentiometers
- Hall-effect sensors
- load cells
- pressure sensors
- encoders and switches

## What matters

The important differences are repeatability, durability, noise sensitivity, calibration drift, mechanical integration,
and whether the sensor is measuring position, force, or pressure.

## Why it matters

Sensor choice shapes the feel and maintenance profile of pedals, joysticks, throttles, shifters, and button interfaces.
```

- [ ] **Step 2: Add `force-feedback-and-actuation.md`**

```md
---
title: Force Feedback and Actuation
description:
  Learn the basics of motors, actuators, cueing strategies, and why raw power numbers do not tell the whole story.
---

# Force Feedback and Actuation

## Common actuator categories

- small motors for control feel
- direct-drive motors
- linear actuators
- rotary motion systems
- pressure and belt-driven cueing systems

## What matters

Speed, control quality, backlash, compliance, travel, noise, payload, and safety all shape the result. A stronger
actuator is not automatically a better one.

## Why it matters

These ideas appear in wheel bases, motion systems, belt tensioners, and G-seat designs.
```

- [ ] **Step 3: Add `telemetry-and-software-integration.md`**

```md
---
title: Telemetry and Software Integration
description: Understand how simulator data reaches tactile systems, motion platforms, and other advanced hardware.
---

# Telemetry and Software Integration

## What telemetry does

Telemetry provides simulator state that can drive external hardware such as tactile systems, fans, motion platforms, and
dashboards.

## What matters

- data quality
- update rate
- software compatibility
- signal mapping
- failure behavior when data stops or spikes

## Why it matters

Advanced hardware often succeeds or fails at the integration layer rather than the mechanical one.
```

- [ ] **Step 4: Add the remaining DIY pages**

```md
---
title: Mounting, Rigidity, and Ergonomics
description: Learn why structural stiffness, reach, posture, and hardware placement matter so much in simulator setups.
---

# Mounting, Rigidity, and Ergonomics

## Key idea

The same hardware can feel excellent or disappointing depending on how it is mounted and how the user fits the controls.

## What matters

- flex under load
- body position
- reach to controls
- repeatable alignment
- upgrade compatibility
```

```md
---
title: Power, Safety, and Reliability
description:
  Understand the practical safety concerns that appear as simulator hardware becomes stronger, faster, and more
  electrically complex.
---

# Power, Safety, and Reliability

## What matters most

- safe power distribution
- current and thermal limits
- emergency-stop strategy where appropriate
- wire management and strain relief
- maintenance access and inspection

## Why it matters

Higher-power sim hardware can hurt users or damage equipment when mechanical, electrical, or software failures are not
handled well.
```

- [ ] **Step 5: Run the site build after the DIY pages are added**

Run: `pnpm build` Expected: build succeeds and the new DIY pages resolve internal links cleanly

- [ ] **Step 6: Commit the DIY reference pages**

```bash
git add src/content/docs/docs/diy/sensors-and-input-detection.md src/content/docs/docs/diy/force-feedback-and-actuation.md src/content/docs/docs/diy/telemetry-and-software-integration.md src/content/docs/docs/diy/mounting-rigidity-and-ergonomics.md src/content/docs/docs/diy/power-safety-and-reliability.md
git commit -m "docs: add diy reference pages for sim hardware"
```

## Task 6: Enrich and verify the content migrated from the old overview pages

**Files:**

- Modify: `src/content/docs/docs/sim-racing.md`
- Modify: `src/content/docs/docs/flight-simulation.md`
- Modify: `src/content/docs/docs/components/pedals.md`
- Modify: `src/content/docs/docs/components/wheel-bases.md`
- Modify: `src/content/docs/docs/components/display-systems.md`
- Modify: `src/content/docs/docs/components/vr-and-head-tracking.md`
- Modify: `src/content/docs/docs/components/motion-platforms.md`
- Modify: `src/content/docs/docs/components/button-boxes-and-panels.md`

- [ ] **Step 1: Add the key terminology corrections called out in the spec**

```md
- distinguish gear-driven, belt-driven, and direct-drive wheel bases clearly
- distinguish tactile vibration cues from motion cueing and sustained body-pressure cueing
- distinguish potentiometer, Hall-sensor, load-cell, and hydraulic-style pedal discussions clearly
- make sure flight pages mention pedals consistently in both structure and body content
```

- [ ] **Step 2: Add practical decision criteria to the highest-value pages**

```md
- pedals: consistency, stiffness, mounting load, and sensing method
- wheel bases: torque fidelity, thermal behavior, mounting, and safety
- display systems: field of view, space, GPU cost, and alignment
- VR and head tracking: comfort, clarity, access to real controls, and performance cost
- motion platforms: cue quality, latency, maintenance, and tuning risk
```

- [ ] **Step 3: Re-run a full read-through of the two landing pages and trim any remaining catalog-dump writing**

```md
Remove repeated definitions that now belong in component pages.

Keep only:

- domain framing
- setup-tier context
- reading paths
- cross-links into the component, guide, and DIY sections
```

- [ ] **Step 4: Run the site build as final verification**

Run: `pnpm build` Expected: build succeeds with no content collection, link, or frontmatter errors

- [ ] **Step 5: Commit the verification and enrichment pass**

```bash
git add src/content/docs/docs/sim-racing.md src/content/docs/docs/flight-simulation.md src/content/docs/docs/components/pedals.md src/content/docs/docs/components/wheel-bases.md src/content/docs/docs/components/display-systems.md src/content/docs/docs/components/vr-and-head-tracking.md src/content/docs/docs/components/motion-platforms.md src/content/docs/docs/components/button-boxes-and-panels.md
git commit -m "docs: enrich sim hardware wiki content"
```

## Task 7: Final review and handoff

**Files:**

- Modify: `src/content/docs/docs/**/*.md`

- [ ] **Step 1: Check sidebar grouping and generated page order in local preview if needed**

Run: `pnpm dev` Expected: local docs site starts and the `Docs` section groups `components`, `guides`, and `diy` as
expected

- [ ] **Step 2: Fix any navigation, wording, or broken-link issues found during preview**

```md
Focus only on:

- broken links
- confusing page titles
- obvious repeated phrases
- awkward directory naming if Starlight output looks poor
```

- [ ] **Step 3: Run the final production build**

Run: `pnpm build` Expected: PASS with production build output and no blocking warnings or errors

- [ ] **Step 4: Commit the final polish**

```bash
git add src/content/docs/docs
git commit -m "docs: finalize component-first wiki structure"
```
