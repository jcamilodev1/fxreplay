---
description: Guía de optimización de rendimiento para React (y Next.js) de Vercel Engineering. Úsalo al escribir, revisar o refactorizar componentes React, data fetching, bundle optimization o mejoras de performance.
---

# React Best Practices (Vercel)

Comprehensive performance optimization guide for React applications. Apply rules by priority (CRITICAL → HIGH → MEDIUM → LOW) for maximum impact.

## When to Apply
- Writing new React components
- Implementing data fetching (client or server-side)
- Reviewing code for performance issues
- Refactoring existing React code
- Optimizing bundle size or load times

---

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Eliminating Waterfalls | CRITICAL | `async-` |
| 2 | Bundle Size Optimization | CRITICAL | `bundle-` |
| 3 | Server-Side Performance | HIGH | `server-` |
| 4 | Client-Side Data Fetching | MEDIUM-HIGH | `client-` |
| 5 | Re-render Optimization | MEDIUM | `rerender-` |
| 6 | Rendering Performance | MEDIUM | `rendering-` |
| 7 | JavaScript Performance | LOW-MEDIUM | `js-` |
| 8 | Advanced Patterns | LOW | `advanced-` |

---

## 1. Eliminating Waterfalls (CRITICAL)
- `async-cheap-condition-before-await` — Check cheap sync conditions before awaiting flags or remote values
- `async-defer-await` — Move await into branches where actually used
- `async-parallel` — Use Promise.all() for independent operations
- `async-dependencies` — Use better-all for partial dependencies
- `async-api-routes` — Start promises early, await late in API routes
- `async-suspense-boundaries` — Use Suspense to stream content

## 2. Bundle Size Optimization (CRITICAL)
- `bundle-barrel-imports` — Import directly, avoid barrel files
- `bundle-analyzable-paths` — Prefer statically analyzable import paths
- `bundle-dynamic-imports` — Use dynamic imports for heavy components
- `bundle-defer-third-party` — Load analytics/logging after hydration
- `bundle-conditional` — Load modules only when feature is activated
- `bundle-preload` — Preload on hover/focus for perceived speed

## 3. Re-render Optimization (MEDIUM)
- `rerender-defer-reads` — Don't subscribe to state only used in callbacks
- `rerender-memo` — Extract expensive work into memoized components
- `rerender-memo-with-default-value` — Hoist default non-primitive props
- `rerender-dependencies` — Use primitive dependencies in effects
- `rerender-derived-state` — Subscribe to derived booleans, not raw values
- `rerender-derived-state-no-effect` — Derive state during render, not effects
- `rerender-functional-setstate` — Use functional setState for stable callbacks
- `rerender-lazy-state-init` — Pass function to useState for expensive values
- `rerender-simple-expression-in-memo` — Avoid memo for simple primitives
- `rerender-split-combined-hooks` — Split hooks with independent dependencies
- `rerender-move-effect-to-event` — Put interaction logic in event handlers
- `rerender-transitions` — Use startTransition for non-urgent updates
- `rerender-use-deferred-value` — Defer expensive renders to keep input responsive
- `rerender-use-ref-transient-values` — Use refs for transient frequent values
- `rerender-no-inline-components` — Don't define components inside components

## 4. Rendering Performance (MEDIUM)
- `rendering-animate-svg-wrapper` — Animate div wrapper, not SVG element
- `rendering-content-visibility` — Use content-visibility for long lists
- `rendering-hoist-jsx` — Extract static JSX outside components
- `rendering-hydration-no-flicker` — Use inline script for client-only data
- `rendering-conditional-render` — Use ternary, not && for conditionals
- `rendering-usetransition-loading` — Prefer useTransition for loading state
- `rendering-resource-hints` — Use React DOM resource hints for preloading
- `rendering-script-defer-async` — Use defer or async on script tags

## 5. JavaScript Performance (LOW-MEDIUM)
- `js-batch-dom-css` — Group CSS changes via classes or cssText
- `js-index-maps` — Build Map for repeated lookups
- `js-cache-property-access` — Cache object properties in loops
- `js-cache-function-results` — Cache function results in module-level Map
- `js-combine-iterations` — Combine multiple filter/map into one loop
- `js-length-check-first` — Check array length before expensive comparison
- `js-early-exit` — Return early from functions
- `js-hoist-regexp` — Hoist RegExp creation outside loops
- `js-set-map-lookups` — Use Set/Map for O(1) lookups
- `js-request-idle-callback` — Defer non-critical work to browser idle time

## 6. Advanced Patterns (LOW)
- `advanced-effect-event-deps` — Don't put `useEffectEvent` results in effect deps
- `advanced-event-handler-refs` — Store event handlers in refs
- `advanced-init-once` — Initialize app once per app load
- `advanced-use-latest` — useLatest for stable callback refs
