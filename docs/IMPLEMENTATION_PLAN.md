# Daily book implementation

Started: 9 November 2026. Working directly in the existing `main` checkout, as requested. Preserve pre-existing staged screenshots and README changes; do not stage, commit or publish.

## Accepted scope

1. Preserve every existing feature and route, including the category-grid expense view as a separately labelled tool.
2. Add simple expense and note entry designed for mobile, in both Gujarati and English, with 100-style numbers.
3. Add a whole-month notebook view showing dated entries, notes, carried balances and understandable totals.
4. Keep spending canonical in `expenses`; new entries append rather than replace another purchase. Legacy grid edits operate only on their own rows.
5. Represent external receipts and locker movements separately; internal transfers do not become income or spending. Locker opening money is unknown until established.
6. At the end, add purchase memories with durable product photo, name, date and details. Saving a memory does not automatically record spending.

## Advisory plan and ownership

One read-only planning pass by `gpt-6.1-sol` (medium) completed. Two `gpt-6-luna` (medium) builders have exclusive scopes; no nested delegation.

| Owner | Files / work |
| --- | --- |
| Data builder | `src/db/*`, backup/Excel/PDF services, isolated ledger regression script |
| UI builder | New DailyBook, MonthlyLedger, FamilyTools screens; new ledger UI components; locale files; DayNavigator; purchases UI after core |
| Coordinator | Navigation integration in App.js; compatibility integration in existing Expense/Home; proportional checks and handoffs |
| Final independent reviewer | One `gpt-6.1-sol` medium review of final diff and observed evidence |

## Interface decisions

- Four labelled primary destinations: Today, Month book, Notes, All tools.
- Original Home/dashboard remains accessible from All tools. No feature deletion.
- New ledger API in `src/db/ledger.js` projects existing expenses, legacy daily deposit totals, separate money movements and existing notes.
- Existing `days.deposit_today` remains legacy/unclassified. New receipts are never mirrored into it.
- `getExpenseSummaryForDay` retains complete totals and exposes editable legacy common totals for the grid.
- Entry removal returns a snapshot for undo. Edits retain original item/place/origin metadata.
- Both languages remain supported; do not force Gujarati for all users.

## Acceptance checks

- ₹100 + ₹60 same-category purchases remain two records and total ₹160; old grid edits do not replace either.
- Backdated edits recalculate subsequent cash balances; online spending leaves hand cash unchanged.
- A locker transfer conserves tracked cash and does not increase receipts/spending.
- Monthly reports count each daily deposit once, and PDF month filtering excludes other months.
- Notes save to the existing notes table and appear in the monthly book.
- Purchase memory persists independently of spending, with a photo copied into durable app storage on native.
- Invalid input and failed saves do not become deletion or apparent success; duplicate submissions are blocked.
- JSON/Excel backup data and relationships survive repeated restore safely.
- Both locale dictionaries cover new strings; Expo bundle and isolated DB checks pass.
- Inspect the working UI if a local browser surface is available; Android keyboard/photo/biometric behaviour still needs a real device check.

## Checkpoint

### User correction checkpoint

The first implementation passed source/API checks and Android/iOS/web exports. The independent review's Excel deposit-only carry-forward defect was repaired and verified. The user then identified three gaps: a separate palette on new screens, missing item-level entry, and the original day-wise module previews missing from Today.

Continue the existing plan with these acceptance criteria:

- All new screens use the central light/dark theme and reusable shared components, with no screen-specific palette fork.
- Vegetables can contain separate Tomato and Brinjal amounts in one save; both remain item-linked expense rows in daily/monthly views and category totals. Batch writes are atomic.
- Today visibly includes selected-day tasks, places, notes and optional vehicle records with existing module actions. Original routes and grid remain available.

Current ownership: UI builder owns shared UI/theme, ledger form/rows and four new screens/locales; data builder owns item-aware ledger APIs and regression fixtures. Day-overview integration follows the API handoff with exclusive file ownership. Coordinator integrates navigation/docs and runs checks. Targeted independent review covers these corrections after integration.

Next command: `npm run check:source` after the item/theme and day-overview handoffs, followed by `npm run test:ledger` and a fresh Expo export.

Earlier implementation checkpoint: all four labelled navigation destinations and purchase memories were integrated. The original expense grid edits only its own common rows; original Notes refreshes on focus and has a visible add button with optional type selection. Home/Expense summaries explain additional receipts and locker movements. Source checks, in-memory API regression checks and all-platform Expo export passed before the user's corrections above. Those corrections require fresh verification.

Browser inspection was attempted through Computer Use. The browser access host was unavailable; Windows access then stopped because the helper could not confidently verify the current browser URL. No visual/runtime validation is claimed and no further browser input was sent.

The original independent review is complete. Reuse that reviewer for a targeted review of the user-correction diff after the builders finish.
