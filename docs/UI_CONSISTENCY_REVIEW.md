# Interface consistency review — 2026-11-26

Scope: source review and implemented fixes across home, amount entry, budget editors, transaction editor, receipt review, category pickers, currency settings and main settings. Visual browser/phone checks are unavailable under the existing session restriction; no claim of pixel-perfect or full accessibility approval.

| Root cause | Locations | Implemented result | Evidence |
|---|---|---|---|
| Gesture reset fired immediately | lib/home-scroll-return.ts, app/budget-home.tsx | Two seconds from release, smooth reset; new touch cancels; momentum does not extend deadline; dialog/input defer | Virtual-time regression tests; phone gesture unverified |
| Duplicate keypad and size rules | app/entry-form.tsx, app/amount-keypad.tsx, app/budget-amount.tsx | Shared keypad with fixed row/font dimensions and reserved disabled key slots; width adapts to device only | Source wiring and typecheck; rendered sizing unverified |
| OS keyboards for equivalent amount edits | transaction-editor, receipt-groups, currency-settings, settings-form | Shared amount-entry dialog; preserve negative credits and fractional receipt/rate values | Amount validation tests; tap flows unverified |
| Independently positioned budget icons | app/budget-home.tsx | One shared action row and identical 44px targets | Structure/CSS inspected; optical position unverified |
| Excess vertical budget spacing | current-layout.css budget editor/card rules | Compact planning with 44px controls retained; separate budget cards | Source-only review |
| Inconsistent menu outlines/selected states | ui.tsx, category-tiles.tsx, current-layout.css | Shared panel/option radius, inset edge, selected check glyph and focus treatment | Static selected/disabled/error states inspected; runtime contrast and zoom unverified |
| Conflicting settings grid positions | current-layout.css view-more rules | Six equal actions, palette and utility row; short screens scroll | Source narrow/short rules inspected; 320px/200% zoom unverified |

Design: Apple-inspired system typography and quiet layered surfaces, using current user palette. More visible group boundaries, restrained glow, consistent back/save/add roles. No new CDN, assets, dependencies, data migrations or storage resets. Existing custom palette/local unpublished work excluded from publication.

Verification coverage: accessibility names/focus/selected/disabled and reduced-motion static review; layout breakpoint source review; relevant errors/copy reviewed; system font and tabular numerals; palette-derived colors (rendered contrast unverified); common surfaces and reduced-motion transition rules.

Remaining: phone gestures, all menu visual states, light/custom palette contrast, zoom, screen reader and focus traversal require browser/device verification. Numeric search filters remain ordinary search fields; unused legacy ReceiptEditor module is not part of the active receipt path.
