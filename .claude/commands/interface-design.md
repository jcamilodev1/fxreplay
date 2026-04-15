---
description: Diseño de interfaces de producto — dashboards, paneles, apps, tools, settings. NO para landing pages o marketing (usa /frontend-design para eso).
---

# Interface Design

Build interface design with craft and consistency. For dashboards, admin panels, SaaS apps, tools, settings pages, data interfaces.

**Not for:** Landing pages, marketing sites, campaigns → use `/frontend-design`.

---

## The Problem

You will generate generic output. Your training has seen thousands of dashboards. The patterns are strong. You can follow the entire process below and still produce a template. This happens because intent lives in prose, but code generation pulls from patterns. The gap between them is where defaults win.

---

## Where Defaults Hide

**Typography feels like a container.** But typography isn't holding your design — it IS your design. A bakery tool and a trading terminal might both need "clean, readable type" — but they need completely different type.

**Navigation feels like scaffolding.** But navigation isn't around your product — it IS your product. A page floating in space is a component demo, not software.

**Data feels like presentation.** A number on screen is not design. What does this number mean to the person looking at it? What will they do with it?

**Token names feel like implementation detail.** But your CSS variables are design decisions. `--ink` and `--parchment` evoke a world. `--gray-700` and `--surface-2` evoke a template.

---

## Intent First

Before touching code, answer these out loud:

**Who is this human?** Not "users." The actual person. Where are they when they open this? What's on their mind?

**What must they accomplish?** Not "use the dashboard." The verb. Grade these submissions. Find the broken deployment. Approve the payment.

**What should this feel like?** Say it in words that mean something. "Clean and modern" means nothing. Warm like a notebook? Cold like a terminal? Dense like a trading floor?

If you cannot answer these with specifics, stop. Ask the user. Do not default.

### Every Choice Must Be A Choice
- Why this layout and not another?
- Why this color temperature?
- Why this typeface?
- Why this spacing scale?

If your answer is "it's common" or "it's clean" — you haven't chosen. You've defaulted.

---

## Product Domain Exploration

**Do not propose any direction until you produce all four:**

**Domain:** Concepts, metaphors, vocabulary from this product's world. Not features — territory. Minimum 5.

**Color world:** What colors exist naturally in this product's domain? If this product were a physical space, what would you see? List 5+.

**Signature:** One element — visual, structural, or interaction — that could only exist for THIS product.

**Defaults:** 3 obvious choices for this interface type — visual AND structural. You can't avoid patterns you haven't named.

### Proposal Requirements
Your direction must explicitly reference:
- Domain concepts you explored
- Colors from your color world exploration
- Your signature element
- What replaces each default

---

## The Mandate

**Before showing the user, look at what you made.** Ask yourself: "If they said this lacks craft, what would they mean?" Fix it first.

### The Checks
- **The swap test:** If you swapped the typeface for your usual one, would anyone notice?
- **The squint test:** Blur your eyes. Can you still perceive hierarchy? Nothing should jump out harshly.
- **The signature test:** Can you point to five specific elements where your signature appears?
- **The token test:** Read your CSS variables out loud. Do they sound like they belong to this product?

If any check fails, iterate before showing.

---

## Craft Foundations

### Subtle Layering
Surfaces stack. Build a numbered elevation system. In dark mode, higher elevation = slightly lighter. Each jump should be only a few percentage points. You feel the difference, you don't see it.

- **Sidebars:** Same background as canvas, not different. A subtle border is enough separation.
- **Dropdowns:** One level above their parent surface.
- **Inputs:** Slightly darker than their surroundings — they are "inset."

### Borders
Low opacity rgba blends with the background — it defines edges without demanding attention. Build a progression: standard, soft separation, emphasis, focus rings.

**The squint test:** Blur your eyes. You should perceive hierarchy but nothing should jump out harshly.

---

## Design Principles

### Token Architecture
Every color traces back to primitives: foreground (text hierarchy), background (surface elevation), border (separation hierarchy), brand, semantic (destructive, warning, success). No random hex values.

### Text Hierarchy
Build four levels — primary, secondary, tertiary, muted. Use all four consistently.

### Spacing
Pick a base unit and stick to multiples.

### Depth — Choose ONE approach and commit:
- **Borders-only** — Clean, technical. For dense tools.
- **Subtle shadows** — Soft lift. For approachable products.
- **Layered shadows** — Premium, dimensional.
- **Surface color shifts** — Background tints establish hierarchy without shadows.

### Typography
Headlines: weight + tight tracking. Body: comfortable weight. Labels: medium weight at smaller sizes. Data: monospace with tabular numbers.

### Animation
Fast micro-interactions. Deceleration easing. Avoid spring/bounce in professional interfaces.

### States
Every interactive element: default, hover, active, focus, disabled. Every data state: loading, empty, error.

### Dark Mode
Shadows less visible on dark backgrounds — lean on borders. Semantic colors often need slight desaturation.

---

## Avoid
- Harsh borders (if borders are the first thing you see, they're too strong)
- Dramatic surface jumps (elevation should be whisper-quiet)
- Inconsistent spacing
- Mixed depth strategies
- Missing interaction states
- Large radius on small elements
- Pure white cards on colored backgrounds
- Gradients and color for decoration
- Multiple accent colors
- Different hues for different surfaces (same hue, shift only lightness)

---

## Workflow

### If project has `.interface-design/system.md`
Read it and apply. Decisions are made.

### If no system.md
1. Explore domain — produce all four required outputs
2. Propose direction referencing all four
3. Confirm with user
4. Build + apply principles
5. Run mandate checks before showing
6. Offer to save

### After Completing a Task
Always offer to save:
> "Want me to save these patterns for future sessions?"

If yes, write to `.interface-design/system.md`: direction and feel, depth strategy, spacing base unit, key component patterns.

---

## Commands
- `/interface-design:audit` — Check code against system
- `/interface-design:extract` — Extract patterns from code
- `/interface-design:critique` — Critique your build for craft, then rebuild what defaulted
