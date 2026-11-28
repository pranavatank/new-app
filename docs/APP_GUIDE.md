# Rojnishi app guide

Rojnishi is an offline household cash book in Gujarati and English. The app keeps the wallet and home locker separate. The four bottom tabs are Today, Expenses, Month, and Tools.

## Wallet and home locker

1. Open **Settings → Cash book** to set cash that was already in the locker before the first entry. Enter 0 if the locker started empty.
2. **લોકરમાં રોકડ મૂકો** records new cash received from an ATM or another person. The money goes into the locker.
3. **અંદરથી રોકડ લો** moves cash from the locker to the wallet. The maximum withdrawal also accounts for later withdrawals already recorded.
4. Choose wallet, locker, or online for a quick expense. Direct locker purchases work for milk bills and other larger amounts. Online payments stay as notes and leave both cash balances unchanged.
5. Open **યાદ નથી** from the floating expense button when you can’t account for missing wallet cash. Enter what you counted, review the suggested difference, and save to record it as a wallet expense.

For example, putting ₹8,000 in the locker and taking ₹2,000 leaves ₹6,000 in the locker and ₹2,000 in the wallet. A ₹200 wallet expense leaves ₹1,800 in the wallet. A ₹1,200 bill paid directly from the locker leaves ₹4,800 there. Older cash adjustments remain readable in the ledger.

## Daily and monthly use

- **Today** and **Expenses** share a wallet card with the locker balance and the selected day’s cash spending. Tap the date for the calendar or use the arrows. **વિગતો જુઓ** keeps the balance breakdown accessible while scrolling. Row actions support editing and deleting individual entries. Undo is available after deletion.
- The floating **+** starts a quick expense. Pick a category and payment source, then enter one total or item amounts. You can add an optional note. Amount suggestions use comparable past entries, and Gujarati digits work in amount fields.
- **Expenses** opens the category grid. The bulb explains grid controls. Manage categories and their items from the header. The grid’s common-amount editor changes its own records. Quick expenses remain separate individual entries, and category totals include both.
- **Month** shows the wallet, locker, and cash spending for the selected month in one glance. Expand details for cash movements and online notes. Tap a day to open it in Today.
- The shortcuts at the bottom of Today open the Add Task, Add Place, Add Purchase, and Add Note forms. Tools also opens their full lists.

## Tools

| Tool | What it does |
| --- | --- |
| Tasks | Create and complete dated tasks. Pending tasks carry forward on Today. |
| Places | Save and favorite places and mark them visited on a selected date. |
| Purchases | Keep a separate record with category, date, optional price, shop, details, and photo. It sits outside the wallet and locker ledger. |
| Expense items | Set up reusable items and icons within each category. |
| Recurring expenses | Set a schedule, select a payment source, and review posting history. |
| Vehicle | Log fuel and odometer readings. Settings can show mileage and fuel on Today. |
| Notes | Save and find daily notes. An expense can also carry its own optional note. |
| Search | Find entries and jump to the day they were recorded. |
| Analytics | Compare monthly cash spending, see wallet and locker shares, recurring and forgotten amounts, weekly totals, category shares, and highest-spending days. The current month compares the same elapsed dates last month. Online amounts stay separate. |
| Settings | Choose system, light, or dark appearance, change language and text size, set starting locker cash, and manage backups. |

## Appearance and backups

- The sun or moon beside Search on Today changes appearance with a circular transition when motion is enabled. Select **System** in Settings to follow the device again.
- The device stores the book locally. Export JSON for a complete backup with local images, Excel for a spreadsheet or supported merge, and PDF for monthly reports. Import saves a local recovery copy before changing the book.
- The ledger supports historical records and backdated balance corrections. Multi-item expense posting and related balance updates use one database transaction.

## Development reference

- Shared colors and layout are in `src/constants/theme.js`. Reusable controls live under `src/components/common`, and Gujarati and English text live in `src/locales`.
- `src/db/ledger.js` handles cash rules and entry editing. `src/db/queries.js` provides database queries and Analytics totals. Local appearance and language preferences are separate from transactions.
- Run `npm run check:source`, `npm run test:entry-form`, and `npm run test:ledger`. The [README](../README.md#building) covers builds. Android automatic appearance uses Expo SystemUI. [Expo color themes](https://docs.expo.dev/develop/user-interface/color-themes/)
- The [notebook interpretation](../PUBLIC_README.md) records the meaning of the original handwritten cash-book terms.
