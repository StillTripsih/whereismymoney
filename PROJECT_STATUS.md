# Release status — WHERE IS MY MONEY

## Identity

- Public product name: **WHERE IS MY MONEY**
- Short name: **WIMM**
- GitHub repository: `StillTripsih/whereismymoney`
- Distribution: public GitHub Pages PWA; Android Google Play preparation
- Monetisation, first release: free
- Receipt AI: user-provided Google AI Studio key only
- Code license: all rights reserved

## Release boundaries

This working copy was created from `outputs/finance-copilot-audit-2026-11-07-v2/russian-app/` on 2026-11-09. The source project remains separate and was not modified.

The WIMM copy uses its own IndexedDB and localStorage names. It intentionally does not access data from the source application's storage.

## Before public release

- [ ] dependencies installed from lockfile
- [ ] tests, type check and public Pages build pass
- [ ] no secrets or user data detected in Git staging area
- [ ] GitHub repository created and GitHub Pages enabled
- [ ] published page checked in a clean browser profile
- [ ] Android toolchain installed, Capacitor wrapper generated, and Google Play Android App Bundle checked on a physical device

## 2026-11-19 — primary GitHub application update

- Based on remote main 6184cb633520f098ce2b2ea7ab7e7802cf9c9397; Sites and retired Thai applications untouched.
- Share preserves /whereismymoney/. Home shows today and dimmed yesterday only, pinned summary and separately scrolling input/history.
- A shared wide budget selector is used on home, analytics and wallet; analytics supports several budgets/all. Navigation rail lives outside page layout.
- Budget editor displays remaining funding and projected leftover, isolates spending by budget ID, retains each budget currency. Start-date selection begins today.
- Analytics has one period toolbar, rolling ranges ending today, a synchronized offset slider, category totals, complete expense list and local text/amount/time search.
- Confirm icons share white 34px/3px stroke; plus icons red 34px/1.7px stroke.
- Verified: 71 automated tests, TypeScript and production Pages build. User records and storage identifiers unchanged.
- Browser UI verification was blocked by automatic approval review citing the previous user restriction on browser testing. Mobile visual and interaction checks remain unverified.
- Publication status: see GitHub Actions for the commit containing this entry.

Publication verified 2026-11-19: commit 67cbd5e2be48f073f28069dbe6aae864c7c733f4; Actions run 44519771564 completed successfully. Public HTML and asset HTTP 200; index-C0iAl5DD.js SHA-256 matches the locally verified build. Browser/mobile UI remains unverified because browser access was denied by automatic approval review.

## 2026-11-19 — gesture-controlled expense chart

- Removed the standalone date-offset slider. Pointer drag pans the chart; two-pointer pinch zooms about the fingers. Keyboard arrows and +/- provide alternatives.
- Chart viewport changes update dates, category totals, selected-period spending and expense rows. A tap selects one day; clearing the selection restores the visible period. Chart gestures do not trigger page navigation.
- Category totals and expense category icons are white, flat and aligned in evenly spaced rows; chart category colours are retained.
- Verified: 75 automated tests including panning/zooming limits, date boundaries and matching expense totals; TypeScript; production build. Native phone gestures remain unverified under the existing browser-testing restriction.

Gesture update publication verified: afd55debd1775d789ffa95fb4893f9d5e0e796be; Actions 44521655954 succeeded. Public HTML/JS HTTP 200; index-CZs1djmT.js matches the checked build. Native phone gestures remain unverified.

## 2026-11-19 — category icon surfaces only

Removed backgrounds, borders, outlines, shadows and decorative pseudo-elements from the shared category-icon wrapper globally, including home transaction rows. Icon sizes, colours and application logic are unchanged. Production build checked; phone rendering remains unverified.

## 2026-11-19 — change an expense budget

The shared transaction editor now shows the selected budget and the common budget picker. Saving can move that single expense to another budget from both home and analytics. Unchanged amount keeps the original currency, rate snapshot, receipt group and timestamp. Invalid target budgets are rejected; cancel does not persist. Storage format unchanged.

Verification for expense-budget reassignment: 76 tests passed, TypeScript passed, production Pages build passed. Browser/phone interaction remains unverified under the existing restriction.

## 2026-11-20 — wide amount input, signed balances and budget wallet

- Home and budget amounts use the same AmountKeypad. Amount sheets render via a body portal, have viewport-wide mobile sizing, and fit the complete number without truncation. Daily caps remain positive; balances accept zero and debt.
- Budget validation accepts signed balances without changing storage schema. Budget editing starts the new plan today, displays the current remaining balance, and reconstructs funding so existing purchases today are not counted twice. Expired edited plans get an upcoming end date. Category cards show actual remaining money instead of a zero daily allowance.
- Wallet lists every budget with its native signed balance and optional display-currency conversion. All/one budget filters the expense ledger. Currency changes only alter display; rate refresh, converter and rate history live in the currency settings. Existing separate savings are retained and accessible separately, not silently mixed into budget totals.
- Verification: 81 automated tests, TypeScript and production build. Tests cover debt spending, replenishment, signed/zero backup roundtrips, reserve-plan rebasing, independent currency balances, missing FX and keypad expressions. Phone visual/interaction checks remain unverified under the existing browser-testing restriction.

Publication verified 2026-11-20: 592a5573ea374adc8528702f7d329f1df91185ee; Actions 44683912662 succeeded. Public HTML, JS and CSS HTTP 200; index-B52Whc_2.js and index-C3zBqRGn.css match the checked build. Native phone UI remains unverified.

## 2026-11-20 — categories belong to expenses; wallet has no expense list

Removed category selection and its required validation from budget creation/editing. New budgets store an empty category array; existing legacy arrays are retained, not erased. Expenses continue selecting categories independently and are counted by budget ID. Removed the duplicate expense list from Wallet; ledger records and analytics remain intact. Verified: 82 tests, TypeScript, production build; phone UI remains unverified.

Publication verified: 46f6ea50a3fae9c6955523a8d7c95c385001c373; Actions 44684921694 succeeded. Public JS/CSS matched the checked build.

## 2026-11-20 — fixed statistics overview and independent list scrolling

Grouped statistics controls and chart into a fixed-height top region centred across the full app width above the navigation rail. Category totals, search and transactions scroll in their own lower region with clearance for the existing rail. Chart pan/pinch behaviour and data logic are unchanged. TypeScript and production build checked; phone rendering remains unverified.


## 2026-11-26 — quiet interface grouping

- Kept the current composition, category sizes, icon sizes and keypad geometry. Added one subtle keypad outline/surface, a shared category capsule and low-contrast section/sheet boundaries. Individual digits remain flat. Category icon wrappers in lists remain flat.
- Navigation: inactive icons use the current red/accent at full opacity; the active icon is white on a quiet dark-accent surface, with a short left indicator. Added accessible button names and aria-current. Shared selection surfaces use the same quiet treatment while retaining existing checks/underlines.
- Budget settings and budget chooser now share the visual centres of the existing lower four-column grid. The header calculation preserves different positioning contexts, including the 36/24px top padding and warning state. No category or keypad sizing rules were changed.
- Independent read-only design review identified a wide-screen grid-width mismatch in the first formula; corrected to use the full existing lower-grid width.
- Verified against an isolated copy of published head b7a3947ebba0ec452fc1e0f484fa75ecf4f4333c: 82 tests, TypeScript without incremental cache, and production Pages build. Declared default-theme contrast pairs: inactive rail icon/group 4.42:1; selected white/dark-accent plate 15.15:1; keypad text/group 18.00:1. These are token calculations, not browser measurements.
- Browser, phone rendering, zoom and light/custom-palette visual checks remain unverified under the existing browser-testing restriction. Existing storage, records, API keys and deployment URL unchanged. Unrelated local palette/category/favicon edits were preserved and excluded from this release.
