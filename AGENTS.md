# AGENTS.md

## **Important**

- Do not use the superpowers skill unless explicitly instructed
- Do not use worktrees unless explicitly instructed
- Do use the superpowers:subagent-driven-development skill to implement
- **use the caveman skill always!**
- tests can only test inputs, outputs and side effects of functions, never implementation details or constants
- always check if the application is running locally if you want to test in the browser
- use ~/ for import from src for all code, never relative imports
- ALWAYS use tailwind classes for styling, never custom CSS

## When working with Svelte

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and
paths. When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant
sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections. After calling the
list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use
the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions. You MUST use this tool whenever writing Svelte code before
sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code. After completing the code, ask the user if they want a
playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## SEO

- when verifying SEO use the seo-audit skill
- also read the google SEO article here <https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=en>
