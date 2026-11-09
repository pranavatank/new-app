# Daily book implementation notes

Working checkout: `main`. Date: 9 November 2026. No commit or publication is part of this task.

## Everyday use

- The app opens in the new daily book. Large, labelled actions start an expense or a note. Money received and locker movements have separate actions.
- Switch English/Gujarati directly on the daily page. New book and purchase screens use Latin/100-style numbers in both languages.
- An expense is a new independent record. Adding ₹100 and then ₹60 for vegetables keeps both entries. Editing a row changes that row.
- Item links remain part of an expense: Tomato and Brinjal can have separate amounts under Vegetables. Item batches use one transaction, so a validation or balance-recalculation failure cannot leave half a shopping entry saved.
- A note needs only its text. The original Notes screen remains available, now with a visible add button and optional type selection.
- The monthly book shows calendar days, carried cash, individual expenses, receipts, locker movements and notes. Tap a day to open its daily book.
- Dirty new entry forms ask before discarding. Failed saves keep the draft. Daily entries have explicit edit/remove actions and an immediate undo option.

## Existing features and compatibility

All original routes are retained in All tools. The old expense category grid remains separate. Its common amount editor changes only legacy/grid-origin rows; individual daily-book records and new recurring payments are protected. Tile totals still include all spending. Common amounts and category item amounts remain distinct.

The user correction restores the original day-wise module previews directly on Today, using a shared overview with the original Home. Pending tasks carry forward from their start date; completed tasks appear on their completion date. Places, notes and fuel records are filtered by the selected day. All-time mileage figures are labelled separately.

## Shared appearance

The new pages use the same central light/dark palettes as the original modules. Repeated controls and surfaces use the common component library. Theme tokens also cover gradient content; changing the central palette updates screens together. Source checks reject literal UI colors, unknown theme tokens, palette-key mismatches and duplicate JSX attributes. See [theme and component rules](THEME_AND_COMPONENTS.md) for future changes.

Old `days.deposit_today` values remain daily legacy receipts with unknown sources. New receipts are stored separately and are not copied into that field. Existing expense rows retain their category, item, payment and place relationships; new origin/time columns are added through repeat-safe migrations.

Cash balance includes carried cash + legacy receipts + new receipts + net locker-to-hand movements - cash expenses. Online spending does not reduce cash in hand. Internal locker movements are excluded from receipt/spending totals. Unknown locker opening cash remains unknown; a data API can set an opening amount, but a dedicated opening-balance setup screen is not included in this slice.

The analytics comparison is now called **Receipts less spending**. It subtracts both cash and online expenses, and is not presented as a complete household savings calculation. The native biometric policy is unchanged by this task; the earlier review's lock-settings limitation remains relevant.

## Product memories

Open All tools → Purchases. Add a product name, date, appliance/clothes/other category, optional amount, shop, details and photo. Tap a saved item for its details, photo, edit and removal controls.

On native platforms a selected image is copied into the app's document directory. On web it is stored as a serializable data URI. Photo selection has cancellation/error handling. Removing a record or replacing its photo does not delete the original image from the phone's library.

Saving a product memory never creates an expense. Record the payment separately in the daily book if needed. There is no automatic link between those records in this slice.

## Recovery and reports

- JSON is a versioned full replacement restore. It includes the ledger's supported tables and embeds referenced local image assets. Validation and relationship checks occur before commit, and balances are rebuilt. Settings explains replacement and creates a recovery copy first.
- Old JSON backups remain supported; tables that did not exist in those versions are cleared during a replacement restore rather than leaving orphaned current records behind.
- Excel is an additive import, not a full replacement restore, and does not embed local photo files. Use JSON for a portable full recovery copy.
- Monthly calculations avoid multiplying daily receipts by the number of expenses. PDF category totals are restricted to the chosen month.
- SQL.js browser persistence defers writing the serialized database until transaction completion.

JSON files and product photos still need an off-device copy to protect against losing the phone. Native file selection, sharing and physical image durability have not been tested on Mother's device here.

## Verification and handoff

The plan-then-build workflow uses one read-only Sol planning pass, two Luna builders with separate files, coordinator integration and an independent Sol final review. See [the implementation plan](IMPLEMENTATION_PLAN.md) for scope and checkpoints.

Checks are implemented as:

```text
npm run check:source
npm run test:ledger
```

The source check parses application JS/JSX, checks unresolved references and local imports, and verifies literal new-feature translation keys in both languages. The API check transforms the real schema/query/ledger/restore services and runs them against isolated in-memory SQL.js fixtures. It never opens the user's app database.

Final check results and independent-review disposition will be recorded below after the final repair pass.

Computer Use could not inspect the running app: the browser host was unavailable, and Windows app access stopped because its URL could not be verified confidently. No visual phone/browser pass is claimed. Before relying on the app daily, check Gujarati wrapping, large system text, the keyboard-open save button, photo selection, reopening the app, and a JSON restore on a disposable test installation.
