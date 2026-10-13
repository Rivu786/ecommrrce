---
name: anioam
description: >-
  Midnight Ledger motion for OmniCommerce admin and POS. Use when adding Framer
  Motion, page enter, table row stagger, status badges, POS cart, or admin UI
  animation. 150–250ms easing, gold accent only, respect prefers-reduced-motion.
---

# Anioam (admin / POS motion)

Apply only in `apps/admin` (and POS routes). Do not add sci-fi chrome or rainbow glows.

## Timing

- Hover / badge: **150ms**
- Enter / drawer / cart line: **200–250ms**
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (or `easeOut`)
- Stagger table rows max **40ms** apart, max 8 rows

## Allowed

- Fade + 4–8px Y translate on page enter
- Opacity on status badges (gold / midnight)
- POS cart line items: height/opacity
- Focus rings remain visible (do not animate focus away)

## Forbidden

- Rainbow, neon, particle, 3D tilt
- Infinite loops except a single subtle pulse on “awaiting payment”
- Motion that blocks clicks > 250ms

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

If using `motion/react` or `framer-motion`, wrap with `useReducedMotion()` and skip variants when true.

## Tokens

Use CSS variables from `apps/admin/app/globals.css`: `--midnight`, `--gold`. No extra palettes.
