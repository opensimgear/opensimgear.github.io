---
title: Belt Tensioners
description:
  Learn how belt-tensioning systems create braking and acceleration cues and what makes them difficult to implement
  well.
sidebar:
  order: 28
---

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
