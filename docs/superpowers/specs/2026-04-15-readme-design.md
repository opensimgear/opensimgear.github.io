# README Design

## Goal

Replace placeholder `README.md` with a simple, concise project README that helps both visitors and contributors
understand what this repository is and how to run it locally.

## Current Context

- `README.md` currently contains only `# OpenSimGear Website`
- This repository is Astro 6 + Starlight documentation site for OpenSimGear
- Package manager is `pnpm`
- Common commands already documented in `AGENTS.md`: `pnpm dev`, `pnpm build`, `pnpm preview`

## Audience

Primary audience:

- developers cloning repository for local work

Secondary audience:

- visitors who land on repo and need quick context about site

## Requirements

- Keep README short and skimmable
- Explain repository purpose in 1-2 sentences
- Include minimal setup steps for local development
- Include core commands only
- Avoid badges, long prose, and duplicate deep documentation

## Options Considered

### Option A - Recommended: Mini hybrid README

Structure:

- title
- one-line description
- short requirements/setup section
- small command list
- short tech stack note

Pros:

- useful for both visitors and contributors
- stays concise
- matches current repo needs without over-documenting

Cons:

- slightly longer than absolute minimum

### Option B - Ultra minimal README

Structure:

- title
- one-line description
- install and run commands only

Pros:

- fastest to scan
- very low maintenance

Cons:

- gives little project context
- weaker for first-time visitors

### Option C - Fuller project README

Structure:

- overview
- stack
- project structure
- commands
- contribution notes

Pros:

- more complete onboarding

Cons:

- longer than requested
- duplicates docs and repo conventions

## Chosen Approach

Use Option A.

README should be short, practical, and balanced. It should explain that this repository contains OpenSimGear
documentation website, mention main stack at high level, and provide only essential local development commands.

## Proposed README Shape

Sections:

1. `# OpenSimGear Website`
2. Short description of repository
3. `## Requirements`
4. `## Getting Started`
5. `## Commands`
6. `## Tech Stack`

Target length:

- about 20-35 lines

## Content Rules

- Use plain language
- Prefer bullets over paragraphs where possible
- Keep command examples copy-pasteable
- Mention `pnpm` explicitly
- Do not include speculative links or process details not already established in repo

## Error Handling

- If exact setup details are not needed, omit them instead of padding README
- If command list grows later, keep README limited to most common commands and leave deeper usage to docs

## Testing Strategy

No dedicated tests needed for README content.

Verification should be limited to checking rendered markdown for clarity and accuracy against current repository scripts
and conventions.
