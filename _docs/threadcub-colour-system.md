# ThreadCub Colour System
*Design token reference — v2 final*

---

## The Principle

All scales share a **warm brown undertone**. This means R values are consistently higher than B values across every token. The result: every colour in the system feels like it belongs on the warm beige canvas, rather than fighting it.

---

## Scale 1 — Warm Neutrals (Surfaces)

Used for: page backgrounds, card surfaces, panels, elevated UI.

| Token | Value | Role |
|---|---|---|
| `--color-warm-white` | `#FFFFFF` | Pure white |
| `--color-warm-50` | `#FAF8F5` | Lightest surface — cards, panels |
| `--color-warm-100` | `#F7F3EE` | Light surface |
| `--color-warm-200` | `#EFECE6` | Sunken surface |
| `--color-warm-300` | `#E6E2DB` | Page background (canvas) |

**Rule:** Use warm tokens for anything that is a *surface*. Never use gray tokens for backgrounds.

---

## Scale 2 — Warm Greys (Text & UI)

Used for: text, borders, dividers, icons, placeholders.

Shares the same warm undertone as the surface scale. The handoff point is around `--color-gray-200` / `--color-warm-300` — warm scale owns everything lighter, grey scale owns everything darker.

| Token | Value | Role |
|---|---|---|
| `--color-gray-200` | `#D8D2CC` | Borders, dividers |
| `--color-gray-300` | `#BEB8B2` | Subtle borders |
| `--color-gray-400` | `#A8A29C` | Placeholder text |
| `--color-gray-500` | `#948E88` | Muted / secondary text |
| `--color-gray-600` | `#7D7770` | Secondary text |
| `--color-gray-700` | `#5C5650` | Body text |
| `--color-gray-800` | `#3D3830` | Headings |
| `--color-gray-900` | `#231F1A` | Near black |

> `gray-50` and `gray-100` exist as retired aliases — use `--color-warm-*` instead for light values.

**How the scales connect:** The warm surface scale fades from `#FAF8F5` to `#E6E2DB`. The grey scale picks up at `#D8D2CC` and continues to near-black. The undertone is consistent across both — your eye reads them as one continuous family.

---

## Scale 3 — Primary

Used for: CTA buttons, active states, links, selected nav items, focus rings.

| Token | Value | Role |
|---|---|---|
| `--color-primary` | `#7C6FF5` | Main brand colour — warm violet |
| `--color-primary-hover` | `#6B5EE4` | Hover state |
| `--color-primary-light` | `#9D93F7` | Focus rings, lighter tint |
| `--color-primary-dark` | `#5A4ED4` | Pressed / active state |
| `--color-primary-bg` | `#EAE7FD` | Tinted background for selected states |
| `--color-primary-text` | `#7C6FF5` | Purple text / selected icons |

**Why this violet:** Sits between blue and red — it bridges the cool/warm divide and works with both the warm surfaces and the blue-leaning accents. Shifted from the original `#6C74FB` (blue-purple) toward violet to feel more at home on the beige canvas.

---

## Scale 4 — Functional Accents

Five accents, each with a clear job. All have a warm bias — slightly more red/yellow in the mix than a pure version would have. Saturation is balanced so no single colour dominates.

Each accent has three tokens: default, hover (slightly darker), and bg (tinted background for chips, badges, selected states).

### Teal — Documents & Files
| Token | Value |
|---|---|
| `--color-accent-teal` | `#4AADA8` |
| `--color-accent-teal-hover` | `#3D9490` |
| `--color-accent-teal-bg` | `#E6F5F4` |

### Blue — Chat & Threads
| Token | Value |
|---|---|
| `--color-accent-blue` | `#5B8FF5` |
| `--color-accent-blue-hover` | `#4A7EE4` |
| `--color-accent-blue-bg` | `#EBF1FE` |

### Amber — AI Features & Highlights
| Token | Value |
|---|---|
| `--color-accent-amber` | `#E8A030` |
| `--color-accent-amber-hover` | `#D4902A` |
| `--color-accent-amber-bg` | `#FDF0DC` |

### Green — Tags & Collections
| Token | Value |
|---|---|
| `--color-accent-green` | `#52A878` |
| `--color-accent-green-hover` | `#429768` |
| `--color-accent-green-bg` | `#E8F5EE` |

### Rose — Projects
| Token | Value |
|---|---|
| `--color-accent-rose` | `#E8607A` |
| `--color-accent-rose-hover` | `#D4506A` |
| `--color-accent-rose-bg` | `#FDEEF1` |

---

## Complete At-a-Glance

```
Surfaces    #FFFFFF → #FAF8F5 → #F7F3EE → #EFECE6 → #E6E2DB
                                                          ↕ handoff
Greys                                         #D8D2CC → #BEB8B2 → #A8A29C → #948E88 → #7D7770 → #5C5650 → #3D3830 → #231F1A

Primary     #7C6FF5  (violet)
Accents     #4AADA8  teal    — documents
            #5B8FF5  blue    — chat
            #E8A030  amber   — AI / highlights
            #52A878  green   — tags
            #E8607A  rose    — projects
```

---

## Design Rules

1. **Backgrounds always use warm tokens** — never a gray token for a surface
2. **Text always uses gray tokens** — never a warm token for text
3. **Each accent has one job** — don't reuse teal for something unrelated to documents
4. **Tinted bg variants for non-destructive states** — use `-bg` tokens for badges, chips, and selected rows
5. **Primary for action, accents for category** — primary drives interaction, accents signal content type

---

## Dark Mode

All scales invert automatically via CSS custom property overrides in `globals.css`. The warm undertone is preserved in dark mode — dark surfaces use warm-dark tones rather than pure cool greys.

---

*Last updated: March 2026 — v2 final. All five accent colours confirmed.*