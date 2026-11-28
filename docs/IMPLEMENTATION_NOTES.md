# Daily book implementation notes

## Rojnishi 2.0 visual audit · 28 November 2026

The baseline captures came from the installed Android app and include app destinations, scrolled views, and editors with the keyboard open. The redesign uses four labeled tabs and a shared set of surfaces and controls. The light palette uses soft blue-gray surfaces and coastal blue accents. The dark palette uses muted navy and slate, with matching softer blue accents. [Material 3 color roles](https://m3.material.io/styles/color/the-color-system/)

| Area | Change from the phone audit |
| --- | --- |
| Today and Home | Two separate rows keep the quick actions clear of the forgotten-expense button. Add Expense and Write a Note come first. Today is the sole home destination. |
| Date and Month | The date header is shorter. The monthly summary keeps both balances visible and omits zero-value detail rows. |
| Notes and Purchases | Empty states take less space. Notes has one add action, and its editor keeps Save in the footer. |
| Tools and navigation | Duplicate Home and Notes shortcuts were removed. The tab bar uses a compact selected indicator and gives more height to content. |
| Expenses and categories | Category management and items open from above the grid. Narrow screens and larger text get fewer columns. The category list scrolls above a fixed Add and Arrange footer. Arrange uses side-by-side movement controls and commits order changes in one transaction. |
| Expense items and recurring bills | Add is in the header, leaving the list free of space reserved for a floating button. Recurring Save stays in the footer and monthly date buttons have larger touch targets. |
| Tasks and Places | Task edit and delete targets are larger. Places puts Add in the header and localizes the example field. Both editors keep their save actions in the footer. |
| Analytics and Search | The spending chart shows days with cash spending and category rows show a single cash total. Search cards name the payment source and have no fixed scroll tail. |
| Vehicle | Empty fuel history shows one empty state. The fuel form uses a decimal odometer field that accepts Gujarati digits. Its calendar and record labels follow the app language. |
| Settings | Removed a fixed blank scroll tail. Both version labels read the release version from Expo config. |

The shared sheet uses the Android dialog's keyboard resize behavior. The backdrop sits behind the panel as a separate touch target, and the body scrolls between the title and footer. [Android keyboard insets](https://developer.android.com/develop/ui/views/layout/sw-keyboard)

The source, entry-form, and SQLite checks passed, including a rollback test for a failed category reorder. Touch tests at 360×740 and 320×568 checked navigation, category scrolling and saved order, item editing, Gujarati cash entry, the dark theme, and Save at reduced viewport height. Android, iOS, and web exports succeeded. An isolated Android prebuild generated version 2.0.0 and `adjustResize`. The sampled text and background pairs exceeded 5:1 contrast in each palette. Native keyboard and scrolling checks on the phone still require a signed 2.0 build.

## Everyday use

- The app opens in the new daily book. Large, labelled actions start an expense or a note. Money received and locker movements have separate actions.
- The floating bar opens Today, Month, Notes, and Tools. Today puts closing cash in the gradient card, lets you expand the breakdown, and has a direct Search action.
- Gujarati is the default for a fresh installation. The language switch on Today keeps an existing language preference. Ledger and recurring amounts accept Gujarati digits, and amounts display in the familiar 100-style format.
- An expense is a new independent record. Adding ₹100 and then ₹60 for vegetables keeps both entries. Editing a row changes that row.
- Create Tomato and Brinjal from the same Vegetables draft and enter an amount for each. Today and Month book show both item names. The batch writes both rows and rebuilds balances in one transaction.
- A note needs only its text. The original Notes screen remains available, now with a visible add button and optional type selection.
- The monthly book shows calendar days, carried cash, individual expenses, receipts, locker movements and notes. Tap a day to open its daily book.
- Month book follows changes to the selected month. Its arrows let you browse independently. An expense search result opens the matching day's entries.
- Dirty new entry forms ask before discarding. Failed saves keep the draft. Daily entries have explicit edit/remove actions and an immediate undo option.

## Existing features and compatibility

Tools groups the original routes under Everyday, Money and reports, and App. The old expense category grid remains separate. Its common amount editor changes only legacy/grid-origin rows. Tile totals include all spending, and common amounts and category item amounts remain distinct.

Today contains the day-wise module previews. Pending tasks carry forward from their start date. Completed tasks appear on their completion date. Places, notes and fuel records are filtered by the selected day. Task and fuel shortcuts default to that date, and all-time mileage figures are labelled separately.

## Shared appearance

All 14 screens and React Navigation use the central light and dark palettes. The refresh uses shared cards, rows, headings, buttons, and ledger entries across Today, Month book, Tools, and Purchases. The source check verifies registered destinations, translated navigation labels, palette parity, and central color and typography usage. See [theme and component rules](THEME_AND_COMPONENTS.md).

## Wallet and home locker

1. **લોકરમાં રોકડ મૂકો** records outside cash from an ATM or another person. ₹8,000 adds ₹8,000 to the locker.
2. **અંદરથી રોકડ લો** moves cash into the wallet. Taking ₹2,000 leaves ₹6,000 in the locker and ₹2,000 in the wallet.
3. **ખર્ચ ઉમેરો** uses the wallet by default. Choose **લોકરમાંથી સીધી** for a bill paid directly from the locker. A monthly milk bill can use that source in **નિયમિત ખર્ચ**. When the app opens it records charges that are due. If the selected day is beyond the end of a month, it uses the last day of that month.
4. **ઑનલાઇન · ફક્ત નોંધ** keeps online payments separate. They leave both cash balances and all cash-spending totals unchanged.
5. **યાદ નથી** records the cash shortfall as a wallet expense. If the wallet should contain ₹500 and contains ₹450, enter ₹50.

**વિગતો જુઓ** stays at the top of Today while the list scrolls. It opens the breakdown, the option to return wallet cash to the locker, and the opening locker amount for cash that was already there before the first entry. If older transfers make the opening amount unknown, the setup action also appears on Today.

Old deposits and receipts still affect the wallet. The migration adds the movement account with a wallet default for existing rows. Existing cash, online and recurring records preserve their source. Prior transfers affect the two cash accounts in opposite directions. Reports subtract actual cash expenses from outside receipts, with online payments listed separately. JSON backup and Excel merge preserve movement sources and the locker opening balance. A backdated edit and a restore recalculate the carried wallet balance.

The category editor and item editor use one shared sheet scroll area and keep the save action in the sheet footer. Existing categories display with Gujarati names, and a saved custom name stays as entered.

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

The Gujarati cash-flow follow-up passed the source, ledger and entry-form checks. The SQL.js tests cover the ₹8,000 deposit, ₹2,000 transfer, direct locker spending, online notes, forgotten cash, recurring posting, backdated corrections, PDF cash totals and JSON/Excel round trips.

Edge with touch emulation at 360×740 and 320×568 verified the Gujarati entry flow, the fixed **વિગતો જુઓ** control, compact empty sections, all Tools destinations, and the category and item editors with Save in view. Expo exported Android, iOS and web bundles. Physical Android verification still includes the native keyboard, large system text, photo selection and persistence, biometrics, and file restore on a disposable installation.

## Android preview build

The [24 November 2026 EAS preview build](https://expo.dev/accounts/pranav.tank/projects/hisab/builds/a4a47348-d9b1-4e4d-8093-3eba275da3e6#run-gradlew) reached `:app:assembleRelease`. Gradle failed at `:expo-sqlite:downloadSQLite` with `java.net.SocketException: Network is unreachable`. The earlier hook copied the archive to a Gradle downloads directory. The current Android post-install hook verifies the archive and configures the SQLite extraction task to read it directly from `vendor/sqlite`.

The Android adaptive icon uses a solid white background with the existing transparent notebook artwork at the same scale.

The signed 2.0 APK is pending. See the [build instructions](../README.md#building) for the preview profile and Windows PowerShell commands.
