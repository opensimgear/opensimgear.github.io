---
title: Power, Safety, and Reliability
description:
  Understand the practical safety concerns that appear as simulator hardware becomes stronger, faster, and more
  electrically complex.
sidebar:
  order: 9
---

## What matters most

- safe power distribution
- current and thermal limits
- emergency-stop strategy where appropriate
- wire management and strain relief
- maintenance access and inspection

## Why it matters

Higher-power sim hardware can hurt people or damage equipment when mechanical, electrical, or software failures are
handled badly.

The risk rises as projects add stronger motors, larger power supplies, enclosed electronics, or moving assemblies near
the body. A lot of reliability problems also start as convenience shortcuts: inaccessible fuses, loose connectors,
cables without strain relief, or no clear shutdown path when something behaves unexpectedly.

## Practical priorities

- keep power distribution understandable enough that you can trace a fault quickly
- size wiring, connectors, and protection devices for real load rather than ideal load
- make high-risk systems easy to power down without reaching through moving parts
- leave room for airflow, inspection, and future maintenance

## Reliability is a design choice

A system that works once on the bench is not automatically reliable in a rig that vibrates, moves, heats up, and gets
adjusted over time. Reliability comes from conservative margins, secure mounting, clean cable routing, and enough access
that inspection is realistic instead of something you keep postponing.

## Related pages

- [Force Feedback and Actuation](/docs/diy/force-feedback-and-actuation/)
- [Telemetry and Software Integration](/docs/diy/telemetry-and-software-integration/)
- [Mounting, Rigidity, and Ergonomics](/docs/diy/mounting-rigidity-and-ergonomics/)
