# Daily book implementation notes

Working checkout `main`, last verified on 19 November 2026.

## Everyday use

- The app opens in the new daily book. Large, labelled actions start an expense or a note. Money received and locker movements have separate actions.
- The floating bar opens Today, Month, Notes, and Tools. Today puts closing cash in the gradient card, lets you expand the breakdown, and has a direct Search action.
- Switch English/Gujarati directly on the daily page. New book and purchase screens use Latin/100-style numbers in both languages.
- An expense is a new independent record. Adding ₹100 and then ₹60 for vegetables keeps both entries. Editing a row changes that row.
- Create Tomato and Brinjal from the same Vegetables draft and enter an amount for each. Today and Month book show both item names. The batch writes both rows and rebuilds balances in one transaction.
- A note needs only its text. The original Notes screen remains available, now with a visible add button and optional type selection.
- The monthly book shows calendar days, carried cash, individual expenses, receipts, locker movements and notes. Tap a day to open its daily book.
- Month book follows changes to the selected month. Its arrows let you browse independently. An expense search result opens the matching day's entries.
- Dirty new entry forms ask before discarding. Failed saves keep the draft. Daily entries have explicit edit/remove actions and an immediate undo option.

## Existing features and compatibility

Tools groups the original routes under Everyday, Money and reports, and App. The old expense category grid remains separate. Its common amount editor changes only legacy/grid-origin rows. Tile totals include all spending, and common amounts and category item amounts remain distinct.

Today and the original Home share day-wise module previews. Pending tasks carry forward from their start date. Completed tasks appear on their completion date. Places, notes and fuel records are filtered by the selected day. Task and fuel shortcuts default to that date, and all-time mileage figures are labelled separately.

## Shared appearance

All 15 screens and React Navigation use the central light and dark palettes. The refresh uses shared cards, rows, headings, buttons, and ledger entries across Today, Month book, Tools, and Purchases. The source check verifies registered destinations, translated navigation labels, palette parity, and central color and typography usage. See [theme and component rules](THEME_AND_COMPONENTS.md).

Old `days.deposit_today` values remain daily legacy receipts with unknown sources. New receipts are stored separately and are not copied into that field. Existing expense rows retain their category, item, payment and place relationships; new origin/time columns are added through repeat-safe migrations.

Cash balance includes carried cash + legacy receipts + new receipts + net locker-to-hand movements - cash expenses. Online spending does not reduce cash in hand. Internal locker movements are excluded from receipt/spending totals. Unknown locker opening cash remains unknown; a data API can set an opening amount, but a dedicated opening-balance setup screen is not included in this slice.

The analytics comparison is now called **Receipts less spending**. It subtracts both cash and online expenses, and is not presented as a complete household savings calculation. The native biometric policy is unchanged by this task; the earlier review's lock-settings limitation remains relevant.

## Product memories

Open Tools → Everyday → Purchases. Add a product name, date, appliance/clothes/other category, optional amount, shop, details and photo. Tap a saved item for its details, photo, edit and removal controls. Back from a purchase returns to the list.

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

The reconstructed plan-then-build skill uses GPT-6.2 Sol at medium for read-only planning and independent review, and prefers the latest available Luna at medium for builders. Both Sol passes ran for this continuation. The delegation tool did not expose GPT-6 Luna, so the coordinating agent made the changes directly. See the [implementation plan](IMPLEMENTATION_PLAN.md) for scope and prior checkpoints.

Checks are implemented as:

```text
npm run check:source
npm run test:ledger
npm run test:entry-form
```

All three checks passed after the theme and navigation updates. The source check scanned 53 files with zero errors and covered all 15 screen routes. The API fixture exercises the real schema, queries, ledger and restore services against in-memory SQL.js, including monthly item rows, selected-day filtering and adjacent odometer records. The form check exercises the real save callbacks, including creating two items in a fresh draft. The lockfile now includes the existing Expo haptics and gradient dependencies, and the `npm ci` dry run passed.

`expo export --platform all` completed for Android, iOS and web on the final changes.

The independent review confirmed shared theme usage, item labels, atomic writes and selected-day previews. The follow-up improved contrast on the shared gradient and Vehicle header and isolated the test harnesses from Expo's production Babel configuration. Task completion uses the date it was marked complete. Vehicle drafts opened from Tools use today's date, and the selected-day shortcut sets the preview date. Editing the fuel date updates the adjacent odometer readings used for validation.

The browser access host was unavailable and the native browser launch timed out. Browser interaction and physical Android verification remain pending, including Gujarati wrapping, large system text, keyboard-open Save, photo selection and persistence, biometrics, and JSON restore on a disposable installation.
