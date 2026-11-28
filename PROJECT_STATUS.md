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

Publication verified 2026-11-26: commit a60c811d04a39903dbd09c665e0868b9e4422792; GitHub Actions run 45783906331 succeeded. Public HTML/JS/CSS/service-worker HTTP200; index-_8xNkQYT.js, index-BqFzpD1n.css and sw.js exactly match the isolated checked build (offline cache d5c5b4934585). 82 automated tests, TypeScript and production build passed. Browser/phone visual checks remain unverified.

2026-11-26: personal Gemini key persists separately from backups; real generation verification and clipboard button. Home keypad idle reset (30s); scrollbar tracks hidden. See isolated release status for validation.

Release evidence: commit 8942cb70fbec55a13a2e0ceb401f5de5fdc3c38f; Actions 45784999244 attempt 2 succeeded (first attempt Pages metadata transient failure). 85 tests, typecheck/build passed. Seven public app files byte-match verified build; worker behavior/assets equivalent, cache f8f70e2e3ab6 verified using Linux order. Actual mobile UI/clipboard and personal API key unverified.

2026-11-26: reference HTML button/panel/glow skin; existing layout and sizes retained. Instant home return on finger release (no idle delay), blocked while touch/editor active. Rollback: commit 8942cb70; ../wimm-rollback-8942cb70/. See docs/DESIGN_ROLLBACK.md.

Release verification: commit 3c78aa6f495e8c08749c9bbf395b1816a338a4df; Actions 45787911048 attempt 2 succeeded after Pages artifact-metadata failure on attempt 1. 89 tests/typecheck/build passed. All seven app files HTTP 200 and byte-matched checked build; worker behavior and full cache 15cc5346fbbc verified. Rollback tag before-reference-skin-8942cb70 points to 8942cb70fbec55a13a2e0ceb401f5de5fdc3c38f. Browser/phone appearance and actual touch behavior unverified.

2026-11-26: Apple-inspired consistency in user palette; shared fixed-geometry keypad and amount dialogs, compact budgets, common home action row, explicit settings grid. Smooth home return 2000ms from release. 92 tests/typecheck passed; full source-review coverage/limits in docs/UI_CONSISTENCY_REVIEW.md. Existing palette edits preserved outside release.

Publication evidence: final commit de8b2f760e0653c6ef220d741c492d709dbafcbf; GitHub Actions 45790792459 succeeded. 93 tests, TypeScript and clean production build passed. Seven public app files matched the checked build byte-for-byte; service-worker behavior/assets and cache 6412cba86f11 verified. Prior UI rollback tag: before-apple-consistency-3c78aa6f (3c78aa6f495e8c08749c9bbf395b1816a338a4df). Mobile visual, gesture and accessibility runtime checks remain unverified under the session browser restriction.

2026-11-26: final home tweaks: explicit gallery/camera, centred fixed categories, 1s smooth reset and flat navigation rail. Gemini pending key now saved before checking, restored masked on reload; active key preserved during failed replacements. Model fallback, clear timeout and persistent state. 97 tests/typecheck/build passed; real device/API-key validation unavailable.

Release verification: commit c924a8c6d5ad64f04a00a1f5d3da647f080006dc; Actions 45793590665 succeeded on attempt 1. 97 tests, typecheck, production build passed. Seven public app files HTTP200 and byte-match verified build; worker behavior/assets/cache 153b2429ffa2 verified. Rollback tag before-final-tweaks-de8b2f76 preserves de8b2f760e0653c6ef220d741c492d709dbafcbf. No real user Gemini key, phone clipboard/camera/gallery or visual gesture check performed.

Budget funding release: wallet lists all budgets without chooser; add-budget icon next to edit, explicit top-up, creation/deposit history. Home labels selected budget and opens it via main amount; separate settings icon removed. Currency settings route and wallet rate refresh. 104 tests/typecheck passed; source and previous release retained. Browser/mobile UI and live rate provider unverified.

Release evidence: commit 8aa2c2b679f73fd04dc67c4eaf25211fbeb4c768; Actions 46131840490 succeeded. 104 automated tests, typecheck and production build passed. All seven public app files HTTP200 and byte-matched checked build; worker behavior/assets/cache 89bb357cbfcb verified. Previous source tag before-budget-funding-c924a8c6 retained. Future rollback should retain top-up-aware financial logic once new funding entries exist; do not clear or discard ledger data. Browser/phone flows and live currency-provider response remain unverified.

Wallet plus correction: row white plus deposits into its budget via one shared keypad and confirm; only wallet home creates budgets. Removed creation buttons from budget editors/settings list; wallet funding and legacy saved-funds sections remain expanded. Existing funding ledger logic unchanged. 104 tests/typecheck/build passed; phone UI unverified.

Release verification: commit d7a59ed8f15ae7133da76b2458b56defe3f6bd0c; Actions 46132601565 attempt 2 succeeded after Pages artifact-metadata failure. 104 tests passed; typecheck and clean build passed. Seven public app files HTTP200 and byte-matched checked build; worker/cache f1cb4e902e1c verified. Previous source retained at tag before-wallet-plus-8aa2c2b6. Browser/phone tap, visual and scroll checks unverified.


Budget editor layout correction: shared near-full-width budget sheets for home/wallet/settings and additional budgets, with a budget icon in the header. Shared balance row keeps amount, currency and white deposit plus on one grid; removed the separate labelled deposit button. Removed left red navigation marker while retaining active selection. Successful deposits close the stale editor to avoid saving its previous balance over the new ledger result. Financial schema and stored records unchanged. 104 automated tests, TypeScript and clean production build passed; browser/phone visual and native tap checks remain unverified.

Release verification: commit a5db3bb8291b031e88b54a797a93895e69e78ff5; GitHub Actions 46147187623 succeeded. 104 tests and TypeScript passed. Seven public app files HTTP200 and matched the checked clean build after canonical LF normalization of the copied favicon. Service-worker behavior/assets and cache ce06421875b4 verified. Rollback tag before-budget-layout-d7a59ed8 retained; original source backup in ../wimm-budget-layout-1795870321921/original-backup/. Browser/phone visual and tap checks unverified.


Budget picker / currency UI: shared budget choices now show live per-budget balances in each original currency, including credits and missing-rate dashes; all-budgets option shows converted total. Balance calculation memoized by state/day. Currency management entry remains only in wallet; removed duplicate general-settings entry and its empty grid row. Currency sheet uses compact selected tabs, native provider/date fields instead of nested modal pickers, header save action, and compact add/remove/change controls. Added restrained user-accent gradient lighting across pages and sheets. 104 tests, TypeScript and clean build passed; real browser/phone visual, native date and live rate API checks unverified. Records, funding ledger, keys and application origin unchanged.
