# Exam Lines — Style Reference

> **Ceramic & Signal Line Minimal** — Option 5
>
> A zero-border, single-column editorial interface built on unbleached
> ceramic surfaces and hairline structural rules. Saturated color is
> reserved exclusively for the six transit tracks and one vermilion
> signal accent; every other surface whispers. The atmosphere is a
> clean drafting table under warm natural light — restrained, spacious,
> and instantly legible at arm's length or on a TV.

## Visual Atmosphere

- **Density:** 4 — Daily-App Balanced with generous breathing room
- **Variance:** 5 — Offset Asymmetric (borderless strip header, full-bleed map, quiet footer)
- **Motion:** 4 — Fluid CSS (track-focus dimming, inline pill float, spring-feel hover)

---

## Tokens — Colors

### Light Mode (`:root`)

| Role          | Variable       | Value     | Where it's used                             |
|---------------|----------------|-----------|---------------------------------------------|
| Canvas        | `--paper`      | `#F5F4F0` | `<html>` / `<body>` background, backdrops   |
| Surface       | `--panel`      | `#FCFCFA` | Elevated cards, overlay panels, quiz stage   |
| Border        | `--rule`       | `#DDDAD2` | Hairline section rules, input borders        |
| Border-subtle | `--rule-2`     | `#ECEAE4` | Dividers between list items, hover overlays  |
| Ink (primary) | `--ink`        | `#18181B` | Headings, body text, primary actions         |
| Ink (secondary)| `--ink-2`     | `#3F3F46` | Supporting text, descriptions, metadata      |
| Ink (muted)   | `--ink-3`      | `#57575E` | Placeholders, hints, disabled labels         |
| Signal accent | `--accent`     | `#C83226` | Signal vermilion — primary CTA, active state |
| On accent     | `--on-accent`  | `#FFFFFF` | Text on accent-filled backgrounds            |
| Focus ring    | `--focus`      | `#C83226` | `:focus-visible` outline color               |
| On-line       | `--on-line`    | `#FFFFFF` | Text on saturated transit-line backgrounds   |
| Success       | `--ok`         | `#167C4D` | Correct answers, pass indicators             |
| Error         | `--bad`        | `#C83226` | Wrong answers, fail indicators               |
| Warning       | `--flag`       | `#A45F00` | Flagged questions, partial-credit cues       |

### Dark Mode (`:root[data-theme="dark"]` and `prefers-color-scheme: dark`)

| Role          | Variable       | Value     | Where it's used                             |
|---------------|----------------|-----------|---------------------------------------------|
| Canvas        | `--paper`      | `#141416` | `<html>` / `<body>` background, backdrops   |
| Surface       | `--panel`      | `#1C1C1F` | Elevated cards, overlay panels, quiz stage   |
| Border        | `--rule`       | `#303036` | Hairline section rules, input borders        |
| Border-subtle | `--rule-2`     | `#232328` | Dividers between list items, hover overlays  |
| Ink (primary) | `--ink`        | `#F0EFEA` | Headings, body text, primary actions         |
| Ink (secondary)| `--ink-2`     | `#C8C8CC` | Supporting text, descriptions, metadata      |
| Ink (muted)   | `--ink-3`      | `#9B9B9E` | Placeholders, hints, disabled labels         |
| Signal accent | `--accent`     | `#F26D5B` | Signal vermilion — primary CTA, active state |
| On accent     | `--on-accent`  | `#141416` | Text on accent-filled backgrounds            |
| Focus ring    | `--focus`      | `#F26D5B` | `:focus-visible` outline color               |
| On-line       | `--on-line`    | `#141416` | Text on saturated transit-line backgrounds   |
| Success       | `--ok`         | `#45C49E` | Correct answers, pass indicators             |
| Error         | `--bad`        | `#F26D5B` | Wrong answers, fail indicators               |
| Warning       | `--flag`       | `#F2B04C` | Flagged questions, partial-credit cues       |

### Transit-Line Colors (6 lines)

| Line | Variable | Light      | Dark       | Used for                       |
|------|----------|------------|------------|--------------------------------|
| L1   | `--l1`   | `#C83226`  | `#F26D5B`  | Section 1 / Domain 1           |
| L2   | `--l2`   | `#1B5EBF`  | `#5E9BFF`  | Section 2 / Domain 2           |
| L3   | `--l3`   | `#167C4D`  | `#45C49E`  | Section 3 / Domain 3           |
| L4   | `--l4`   | `#C47F17`  | `#F2B04C`  | Section 4 / Domain 4           |
| L5   | `--l5`   | `#6F42A6`  | `#BB9AF7`  | Section 5                      |
| L6   | `--l6`   | `#117A84`  | `#4FD6BE`  | Section 6                      |

> All line colors pass WCAG AA for normal text against their respective
> `--paper` canvas in both Light and Dark modes.

---

## Tokens — Typography

### Font Stack

| Role     | Family                | Weights    | Where it's used                            |
|----------|-----------------------|------------|--------------------------------------------|
| Display  | `Familjen Grotesk`    | 600, 700   | `.brand-title`, section headings, map labels|
| Body/UI  | `Onest`               | 400, 500, 600, 700 | Body text, buttons, nav links, labels  |
| Mono     | `Fragment Mono`       | 400        | Timer, scores, percentages, IDs, `.val`    |

### Google Fonts `<link>` (replaces current Overpass link)

```
https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@600;700&family=Onest:wght@400;500;600;700&family=Fragment+Mono:wght@400&display=swap
```

### Type Scale

| Level       | Size                                      | Weight | Tracking       | Family            |
|-------------|-------------------------------------------|--------|----------------|-------------------|
| Brand title | `20px`                                    | 700    | `-0.5px`       | Familjen Grotesk  |
| Heading 1   | `clamp(22px, 2vw + 10px, 32px)`          | 700    | `-0.3px`       | Familjen Grotesk  |
| Heading 2   | `clamp(16px, 1.2vw + 8px, 22px)`         | 600    | `-0.2px`       | Familjen Grotesk  |
| Body        | `clamp(16px, calc(13px + 0.35vw), 26px)` | 400    | normal         | Onest             |
| Body bold   | same                                      | 600    | normal         | Onest             |
| Label/small | `clamp(12px, 0.8vw + 6px, 14px)`         | 500    | `0.2px`        | Onest             |
| Mono/data   | `inherit` (from parent)                   | 400    | normal         | Fragment Mono     |

### Rules

- Use `font-variant-numeric: tabular-nums` on **all** numeric displays (scores, percentages, timers, table cells).
- Maximum line length: `65ch` for body text in reading contexts (quiz stem, feedback).
- Never use `Inter`, `Roboto`, `Arial`, or generic system UI as the primary font.

---

## Tokens — Spacing & Shapes

### Spacing Scale (4px base)

| Token   | Value  | Where it's used                      |
|---------|--------|--------------------------------------|
| `xs`    | `4px`  | Icon-to-label gap, compact inline    |
| `sm`    | `8px`  | List item inner padding, chip gap    |
| `md`    | `12px` | Group gaps, topbar item spacing      |
| `base`  | `16px` | Section padding, default gap         |
| `lg`    | `24px` | Between major sections               |
| `xl`    | `32px` | Page-level vertical rhythm           |
| `2xl`   | `48px` | Top/bottom page padding              |

### Shapes

| Element           | Radius     | Border                      | Shadow                           |
|-------------------|------------|-----------------------------|----------------------------------|
| Buttons           | `6px`      | `1px solid var(--rule)`     | none                             |
| Primary button    | `6px`      | none                        | none (filled `--ink`)            |
| Inputs            | `6px`      | `1px solid var(--rule)`     | none                             |
| Cards / panels    | `8px`      | none                        | none (tonal surface shift only)  |
| Overlay dialogs   | `12px`     | `1px solid var(--rule)`     | `0 8px 32px rgba(0,0,0,0.12)`   |
| Chips / badges    | `14px`     | `1px solid var(--rule)`     | none                             |
| Dot indicators    | `50%`      | none                        | none                             |

### Rules

- **No heavy borders.** Prefer tonal surface elevation (`--panel` over `--paper`) or `1px` hairline `var(--rule)` rules.
- **No card-inside-card nesting.** One elevation level per area.
- **No outer glow or box-shadow on buttons.** Use `-1px translateY` on `:active` for tactile feedback.
- Dark Mode: hairlines use `var(--rule)`, never bright outlines. Elevated surfaces use `--panel` tonal shift, not `border: 1px solid white`.

---

## Components

### Buttons

| Variant   | Fill              | Border                  | Text           | Hover                    | Active            |
|-----------|-------------------|-------------------------|----------------|--------------------------|-------------------|
| Default   | `--panel`         | `1px solid var(--rule)` | `--ink`        | `bg: var(--rule-2)`      | `translateY(1px)` |
| Primary   | `--ink`           | none                    | `--paper`      | `opacity: 0.88`          | `translateY(1px)` |
| Quiet     | `transparent`     | none                    | `--ink`        | `bg: var(--rule-2)`      | `translateY(1px)` |
| Accent    | `--accent`        | none                    | `--on-accent`  | `opacity: 0.88`          | `translateY(1px)` |
| Stop/danger| `transparent`    | `1px solid var(--bad)`  | `--bad`        | `bg: var(--bad), c: --on-accent` | `translateY(1px)` |
| Disabled  | any               | faded                   | faded          | `opacity: 0.4; cursor: not-allowed` |            |

### Network Switch (Exam Tabs)

- Render as plain **underline text tabs** — no bordered pill container.
- Active tab: `font-weight: 700; border-bottom: 2px solid var(--ink)`.
- Inactive tab: `color: var(--ink-3); border-bottom: 2px solid transparent`.
- On hover (inactive): `color: var(--ink-2)`.

### Theme Toggle

- Minimal text-only toggle: `Mode: Light` / `Mode: Dark` in `Fragment Mono`.
- No toggle track/knob. Clickable text label with sun/moon icon.
- `font-size: 12px; letter-spacing: 0.3px; color: var(--ink-3)`.

### Status Chips

- Pill with `1px solid var(--rule)` border and `--panel` fill.
- Dot indicator: `8px` circle (`--ok` live, `--l4` busy, hollow ring off).

### Quiz Options

- Render as hairline-ruled list items, not heavy-bordered cards.
- `border-bottom: 1px solid var(--rule-2)`.
- Selected: `background: var(--rule-2); font-weight: 600`.
- Correct feedback: `border-left: 3px solid var(--ok); background: transparent`.
- Wrong feedback: `border-left: 3px solid var(--bad); background: transparent`.

### Bars (Section Progress)

- Track: `height: 6px; background: var(--rule-2); border-radius: 3px`.
- Fill: `background: var(--line); border-radius: 3px`.
- Number label: `Fragment Mono` weight 400.

### Overlay Dialogs

- Centered modal with `--panel` background, `12px` radius.
- Backdrop: `rgba(0,0,0,0.45)` (Light) / `rgba(0,0,0,0.6)` (Dark).
- `max-width: 480px; padding: 24px 28px`.
- Focus-trap on open. `Escape` key closes.

### SVG System Map

- **Line tracks** carry the only saturated color in the UI.
- `.terminus` text (`.tname`, `.tsub`): use `fill: var(--ink)` — never `var(--paper)`.
- Track-focus dimming: on hover over a section track, dim all other tracks to `opacity: 0.32` with `220ms ease` transition.
- Stop dots: filled circles with `fill: var(--line)`, `r: 5`.

---

## Layout

### App Shell

| Zone          | Structure                                             |
|---------------|-------------------------------------------------------|
| Header        | Borderless strip — brand-title left, exam underline-tabs center, nav text-links + theme toggle right |
| Main (Home)   | Title line + inline Quick-Start strip → full-bleed panoramic SVG map band → quiet borderless two-column footer (section breakdown + disclaimer) |
| Main (Quiz)   | `.quiz-stage` grid — question stem + options column, with toolbar sticky bottom |
| Main (Results)| Arrival banner + review list (hairline-ruled items)    |
| Main (History)| Score chart + session table (hairline-ruled rows)      |

### Widths & Grid

- `.app`: `width: 100%; max-width: 100%`.
- Content max-width for reading text (quiz stem, feedback): `65ch`.
- No fixed `1180px` ceiling — edge-to-edge on TV/widescreen.
- Quiz stage on wide screens (`min-width: 900px`): CSS Grid `1fr auto` for stem+sidebar.

### Breakpoints

| Breakpoint                                   | Behavior                                    |
|----------------------------------------------|---------------------------------------------|
| Desktop (default)                            | Full layout with sticky header              |
| `(max-width: 759px), (max-height: 620px)`   | Static header, single-column collapse       |
| `(min-width: 900px)`                         | Quiz stage grid: stem + sidebar             |
| `(display-mode: fullscreen)` / `:root[data-fullscreen="true"]` | Upscaled font, safe-area insets |

### Rules

- Padding uses `clamp()` with safe-area-inset fallbacks. Never hardcoded pixel gutters.
- `min-height: 100dvh` on `.app` — never `h-screen`.
- Map section: full-bleed (zero side padding) for immersive transit panorama.

---

## Motion & Interaction

| Interaction               | Property                   | Duration/Curve         |
|---------------------------|----------------------------|------------------------|
| Button hover              | `background-color`         | `150ms ease`           |
| Button active             | `transform: translateY`    | `80ms ease`            |
| Track-focus dim           | `opacity` on non-hovered tracks | `220ms ease-out`  |
| Track-focus restore       | `opacity`                  | `180ms ease-in`        |
| Overlay enter             | `opacity`, `transform: scale` | `200ms ease-out`    |
| Overlay exit              | `opacity`                  | `150ms ease-in`        |
| Theme transition          | `background-color`, `color`| `250ms ease`           |
| Tab underline slide       | `border-bottom` position   | `180ms ease`           |

### Rules

- Animate only `transform`, `opacity`, `background-color`, `color`, and `border-color`. Never animate `width`, `height`, `top`, `left`.
- No spring physics needed at this motion level — CSS `ease` / `ease-out` suffices.
- No perpetual animations except the existing `.dot.busy` pulse and loading shimmer.

---

## Do's and Don'ts

### Do

- Use `--paper` / `--panel` / `--ink` / `--accent` tokens for **every** color reference. Zero hardcoded hex in component CSS.
- Use `var(--rule)` for 1px structural hairlines — never `2px solid var(--ink)` borders.
- Use `Fragment Mono` for all numeric data: scores, percentages, timers, question counts.
- Use `tabular-nums` on every element displaying numbers.
- Test every new screen in **both** Light and Dark mode before committing.
- Keep the `.tname`/`.tsub` SVG text using `fill: var(--ink)` — visible on both themes.
- Use `--on-accent` for text rendered on `--accent` backgrounds.
- Use `--on-line` for text rendered on transit-line (`--l1`–`--l6`) backgrounds.

### Don't

- Don't use `Inter`, `Roboto`, `Arial`, or any generic system font.
- Don't use `#000000` (pure black) or `#FFFFFF` (pure white) as theme colors. Use `--ink` and `--paper`.
- Don't nest cards inside cards.
- Don't add colored `border-left` accent stripes (except in quiz feedback, which uses a thin 3px indicator).
- Don't use ALL-CAPS eyebrow badges above headings.
- Don't use emoji icons.
- Don't invent fake metrics, data, or percentages.
- Don't add `box-shadow` to buttons.
- Don't use neon glow gradients or purple/indigo/cyan accent palettes.
- Don't hardcode `#FFFFFF` on colored backgrounds — use `--on-line` or `--on-accent`.
- Don't use `border: 2px solid var(--ink)` for decorative boxing — only 1px `var(--rule)` hairlines.

---

## Agent Prompt Guide

When touching any UI in Exam Lines, read this file first. Every color,
font, radius, and spacing value you use must come from the tokens above.
If you need a value not listed here, ask before inventing one.

The design language is **Ceramic & Signal Line** — warm neutral surfaces,
hairline structural rules, and saturated color only on the six transit
tracks and the single vermilion accent. Everything else stays quiet.

Key files:
- `src/styles.css` — all CSS custom properties and component styles
- `src/shell.html` — Google Fonts `<link>`, viewport meta, `#app` root
- `src/ui/chrome.js` — header, theme toggle, fullscreen toggle, bar list
- `src/ui/map.js` — SVG transit system map
- Theme storage key: `'pmle.theme.v1'` — do not change
- Theme attribute: `data-theme` on `<html>` — do not change

Build constraints:
- `MODULE_ORDER.length === 35` in `build.mjs` / `test/build.test.js:45`
- Single-file HTML output, no `<!DOCTYPE>`, exactly one `<script>`
- No `innerHTML`, `outerHTML =`, `insertAdjacentHTML`, `document.write`, `alert(`, `confirm(`, `prompt(`

---

## Open Questions

1. **`.terminus` text contrast bug (P0):** Currently `.tname` and `.tsub` use `fill: var(--paper)` which is invisible (1:1 contrast) when rendered outside the `.terminus` background rect. Plan fixes this to `fill: var(--ink)`.
2. **`isDark` detection bug:** `chrome.js:20` only checks `getAttribute('data-theme') === 'dark'`, ignoring `prefers-color-scheme: dark` when no explicit preference is stored. Plan includes a fix.
3. **Hardcoded `#FFFFFF` on dark pastels:** Several `:hover` and feedback states use `color: #FFFFFF` on muted line-color backgrounds, failing WCAG in Dark mode (e.g., white on `--ok` green = 1.99:1). Plan replaces these with `var(--on-line)`.
4. **11 orphaned CSS classes** found during audit need cleanup or re-attachment.
