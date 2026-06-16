# ThreadCub — Codex Rules

## Session Start
Before any code changes:
- Run file tree scan of relevant directories
- Run git status
- Read relevant file contents before editing

## Code Quality
- Run TSC check after every edit
- Fix any TypeScript errors before committing

## Components
Always use existing components. Never use raw HTML elements when a 
component exists:
- Text inputs → Input component (check variants before implementing)
- Icon buttons → IconButton component (check variants before implementing)
- Buttons → Button component (check variants before implementing)
- Never use raw <input>, <button>, <textarea> elements

Before building any UI element, check components/ for an existing 
component first. If something new is needed, ask before building it.

When a component is updated or a new component is created, also update 
dev/playground so all available components and variations are visible 
there (items array, panels map, component function — all three required).

## Styling
- Never use inline style={{}} props for static styles
- All static styles go in CSS classes in app/globals.css using tokens
- Inline styles are only permitted for dynamic runtime values 
  (e.g. calculated positions)
- Never hardcode colours, spacing, font sizes or radii — always use 
  var(--token-name) from globals.css
- Never create new tokens — if something is missing, flag it

## Tokens
All design tokens are in app/globals.css. Use them for everything.
When in doubt, grep globals.css for the token before hardcoding.

## Stack
Next.js App Router, TypeScript, Supabase, CSS custom properties in 
globals.css (no Tailwind), custom component library.
