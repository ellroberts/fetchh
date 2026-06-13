# Ways of Working — Elliot & Claude

## How we start a session

Before any code changes, run these commands and paste the output so I have full context:

```bash
# File tree overview
find . -type f -name '*.tsx' | grep -v node_modules | grep -v .next | sort

# Current git status
git status

# Any relevant component or page
cat 'app/(dashboard)/[relevant-page]/page.tsx'
```

If continuing a previous conversation, share the ThreadCub share URL so I can fetch the full history before we begin.

---

## How I send code back

**Always as a bash code block you can copy/paste directly into terminal.** Never as prose instructions.

- Python scripts for multi-line file edits (`python3 << 'PYEOF' ... PYEOF`)
- `cat >` for creating new files
- `sed` or direct `grep` for quick lookups
- After edits: always run `npx tsc --noEmit 2>&1 | grep [file] | head -10` to catch errors before you see them in the browser

You paste → save → see it update on local dev at `localhost:3000`. No manual file editing needed.

---

## What I need before making changes

| Task | What to run first |
|------|-------------------|
| Editing a page | `sed -n '[range]p' 'app/path/page.tsx'` |
| Wiring up a component | `grep -n 'ComponentName\|relevantProp' 'file.tsx' \| head -20` |
| Adding to action bar | `grep -n 'SelectionActionBar\|onAction' 'file.tsx'` |
| CSS / token change | `grep -n 'token-name' 'app/globals.css'` |
| New modal | `grep -n 'interface\|onConfirm\|onClose' 'components/ModalName.tsx'` |

---

## Rules I follow

- **One script per change** — I batch related edits into a single python3 or bash block, not multiple back-and-forth steps
- **No manual file editing** — everything is terminal-pasteable
- **TSC check after every edit** — I always append a TypeScript check so errors surface immediately
- **Ask before assuming** — if I need to see a file before writing code, I ask for a specific `grep` or `sed` command rather than guessing
- **Token names not hex** — when suggesting CSS changes I reference `--color-token-name` not raw hex values
- **No prose steps** — I don't say "then do X, then do Y" — I give you one block that does it all

---

## Project stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database**: Supabase
- **Styles**: CSS custom properties in `app/globals.css` (no Tailwind)
- **Component library**: custom — `components/` directory
- **Dev server**: `localhost:3000`
- **Deployment**: Vercel

---

## Colour tokens quick ref

| Token | Value | Used for |
|-------|-------|----------|
| `--color-warm-300` | `#E6E2DB` | Page background |
| `--color-warm-400` | `#D4CFC8` | Borders, dividers |
| `--color-warm-500` | `#B8B2AB` | Subtle borders |
| `--color-warm-600` | `#948E88` | Muted text |
| `--color-warm-700` | `#6B6560` | Secondary text |
| `--color-warm-800` | `#3D3830` | Body text |
| `--color-warm-900` | `#231F1A` | Near black |
| `--color-primary` | `#6C74FB` | CTAs, actions |
| `--color-border-card` | `#D4CFC8` | Card borders (updated) |
| `--color-accent-rose` | `#E8607A` | Projects |
| `--color-accent-blue` | `#5B8FF5` | Threads |
| `--color-accent-amber` | `#E8A030` | AI features |
| `--color-accent-teal` | `#4AADA8` | Documents |
| `--color-accent-green` | `#52A878` | Tags |

Full interactive reference: `localhost:3000/dev/components` → click **Tokens**

---

## Adding anything to the playground

**The playground lives at `localhost:3000/dev/components` — the file is `app/dev/components/page.tsx`.**

Before touching anything, I must run these two commands first — no exceptions:

```bash
# 1. Confirm where the playground actually lives
find . -path '*/dev*' -name '*.tsx' | grep -v node_modules | grep -v .next | sort

# 2. See how existing items are registered
grep -n 'const items\|panels\[' 'app/dev/components/page.tsx' | head -10
```

### The 3 things I must always do when adding a playground panel

1. **Add the name to the `items` array** (line ~97) — this is what populates the left nav
2. **Add `PanelName: <PanelNamePanel />` to the `panels` map** — this is what renders the content
3. **Add the `function PanelNamePanel()` component** at the bottom of the file

All three in a single python3 script. If any one of these is missing, the item won't appear.

### What I must NEVER do

- Create a new route/page for playground content (e.g. `app/(dashboard)/playground/tokens/page.tsx`) — wrong location
- Add a nav item to `config/navigation.ts` for playground content — it's a dev tool, not a main nav page
- Assume the nav component is `Navigation.tsx` or `Sidebar.tsx` — the real nav is driven by `config/navigation.ts` → `AppLayout` → `SideNav`

---

## Useful diagnostic commands

```bash
# TypeScript errors on a specific file
npx tsc --noEmit 2>&1 | grep 'filename' | head -10

# Find where a component is used
grep -rn 'ComponentName' app/ components/ --include='*.tsx' | grep -v node_modules

# Check what props a component accepts
grep -n 'interface\|type.*Props' 'components/ComponentName.tsx'

# See what's imported on a page
grep -n '^import' 'app/(dashboard)/page-name/page.tsx'
```