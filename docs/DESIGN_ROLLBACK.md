# Previous appearance

Before the supplied-HTML surface update: commit 8942cb70fbec55a13a2e0ceb401f5de5fdc3c38f.

Restore app/current-layout.css from that commit with a new forward commit to roll back appearance while retaining current fixes. To restore the previous scroll behavior as well, restore app/budget-home.tsx and its corresponding tests. Keep the production URL and browser storage unchanged. Never clear IndexedDB/localStorage or revert user records.

Local immutable reference: C:/Users/Evgen/Documents/WEB APPS/wimm-rollback-8942cb70/ROLLBACK.json.
