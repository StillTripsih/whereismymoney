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
- Verified: 74 automated tests including panning/zooming limits, date boundaries and matching expense totals; TypeScript; production build. Native phone gestures remain unverified under the existing browser-testing restriction.
