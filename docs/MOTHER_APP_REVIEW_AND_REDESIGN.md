# Rojnishi: making the daily hisab easy for Mother

Review date: 9 November 2026. Scope: product fit, notebook workflow, supplied screenshots, current React Native source, data integrity, and a proposed redesign. This document describes findings and a build plan; it does not claim the redesign has been implemented.

## 1. Decision

Build the main experience around **her daily cash book**: write one entry, see it in today's list, recognise how much money is in hand, and correct a mistake safely. Give money received and locker withdrawals their own clear actions. Use Gujarati words with 100-style amounts, as the owner confirmed.

The current app has useful foundations: offline native storage, Gujarati localisation, carried cash balances, editable categories, and export functions. Its visible structure gives substantial attention to dashboards, tasks, places, category totals, and charts. The notebook requires an entry-by-entry account of what happened to money and where that money came from. A new colour scheme alone will not close that gap.

Adoption is a hypothesis to test with Mother. Her age does not establish any particular impairment, and attractive design cannot guarantee that she will prefer a phone to her book. The useful test is whether she can finish familiar entries and find them again without coaching.

## 2. Evidence and boundaries

### Material reviewed

- [Saved family and notebook interpretation](../PUBLIC_README.md): owner-confirmed meanings, number preference, provisional readings, uncertainty rules, and the original scan link.
- All six screenshots: [Home](../Screenshot/Home.jpg), [Expense](../Screenshot/Expence.jpg), [Analytics](../Screenshot/Analytics.jpg), [Tasks](../Screenshot/Tasks.jpg), [Places](../Screenshot/Places.jpg), [Settings](../Screenshot/Settings.jpg).
- [App.js](../App.js): navigation and biometric gate.
- [Home](../src/screens/Home.jsx), [Expense](../src/screens/Expense.jsx), [Analytics](../src/screens/Analytics.jsx), [Settings](../src/screens/Settings.jsx), and relevant Search flow.
- [Schema](../src/db/schema.js), [queries](../src/db/queries.js), [day store](../src/store/useAppStore.js), [date navigator](../src/components/DayNavigator.jsx), theme, localisation, shared input/sheet controls, JSON backup, Excel and PDF services.
- Official W3C and Android accessibility guidance, linked in section 16.

### How to read findings

**Observed** means visible in a supplied screenshot or explicit in source. **Reproduced** means a small isolated calculation or SQL example was executed against synthetic in-memory data. **Proposed** means a design recommendation. **Needs device/user validation** means it has not been tested with Mother or on her phone.

Screenshots are static English examples dated August 2026; they are not proof of today's complete runtime behaviour. Current source includes Search and Recurring routes that the screenshots do not show. No native app session, actual ledger database, font rendering on Mother's phone, device keyboard, or biometric behaviour was tested. No source code was changed as part of this review.

The scan interpretation is partial and provisional. The three user-confirmed facts are the identities Pranav/Pinku, the meaning of locker withdrawal, and the Gujarati-words/100-style-number preference. This review does not supply a verified historical ledger or opening balance.

## 3. Her workflow and what the app must preserve

| Notebook habit or requirement | Current support | Needed behaviour |
| --- | --- | --- |
| Dated daily entries with carried cash | Day navigation and cash balance chaining exist | Default to today, show a clear date, let her add yesterday's forgotten entry safely |
| Several purchases on the same day | Manual entry generally edits a category/day/payment aggregate | Save each purchase as its own row; totals are derived |
| Money received from people or for a purpose | One `deposit_today` number per day | Separate receipt records with source/person and optional short wording |
| “અંદરથી લીધા” | No locker account or transfer model | Transfer from locker to cash in hand; never count as income |
| “અંદર છે” notes | No dedicated locker balance | Show known remaining locker money, with a clear unknown state if opening balance is unconfirmed |
| Named people and explanatory wording | Expense `note` column and separate daily notes exist; no dedicated people model | Optional person attached to an entry; visible wording in the daily list |
| Crossed-out corrections | Amount replacement/deletion exists | Visible edit action, correction history and reversible deletion |
| Checking the day's arithmetic | Current cash equation is useful | A simple “cash at start + received + transfers in - spent - transfers out” explanation |
| Looking back through a book | Date navigator, Search, monthly views | A readable date-grouped ledger with yesterday and earlier days |
| Seeing the book still exists | Local DB and manual export exist | Durable saved feedback, recoverable backup, simple printable ledger |

Do not require item-level shopping detail, a place, a mood, an account category, or a person for an ordinary ₹100 vegetable entry. One amount and one familiar purpose should be enough.

Money given to a person may be spending, a gift, a loan, a refund, or money handed over for shopping. The name alone cannot decide. Start with a neutral person annotation and explicitly chosen movement purpose; add debts only if the family confirms that need.

## 4. Screen-by-screen findings

### Home

Observed in the screenshot: a date header, repeated cash-balance heading, a large indigo gradient balance card, three balance figures, expense chips, task and places cards, and six icons in a floating bottom bar. The main everyday action is a subtle “Tap to manage expenses” cue inside the balance card. The source now adds a search affordance above that card, further pushing the money workflow down.

The large balance number is helpful, but the card and unrelated previews consume the area where she needs to start writing. The wallet icon does not explain whether tapping it records spending, shows cash, or adds money. Six destinations require remembering symbols.

Proposed: put a short date, one compact cash-in-hand number, and three explicit money actions above today's entries. Move task, place, note and mileage modules into an optional family area. Show the locker amount as a secondary, clearly named value, not a competing colourful dashboard.

### Expense

Observed: another large balance card, a deposit card with Edit, and a three-column category grid. Each tile includes an icon, name, amount, active marker, border colour and a +/- control. Source adds a cash/online selector, sub-item grids, a common-item path, and category management.

There are several meanings of “amount” within this screen: total for a category, direct/common amount, sub-item amount, cash amount and online amount. A second purchase is easy to mistake for editing the first. Fixed ₹10 stepping is slow for arbitrary amounts and the item stepper has a correctness error (section 5).

Proposed: entry creation and entry editing must be separate operations. Use large labelled purpose choices followed by one amount field and one visible save button. The category totals can remain in a secondary family/report view.

### Analytics

Observed: four coloured summary cards, a trophy for savings, a percentage bar, and charts further down. The sample shows ₹4,500 deposited, ₹1,090 cash spent, ₹150 online spent and ₹3,410 saved. The bar labels show 23.4%, 3.2%, 73.3%, while the savings card shows 76%.

The current source normalises the bar against `cash + online + cash remainder`, so its percentages can sum to 100 while “of deposited” describes a different denominator. Cash remainder is also not economic savings when deposits include locker withdrawals. There is no recorded budget to justify “over budget” solely from spending more than that month's receipts.

Proposed: show a plain monthly list of actual spending, actual external receipts, and transfers separately. Show cash-in-hand and locker balances as balances. Hide advanced charts initially. Remove savings praise until the product has a defined, adequately tracked savings metric.

### Settings

Observed: S/M/L text choices, a theme toggle, language flags, export, and further settings. The source's large text option is only 1.1 times the base typography. The biometric switch is fixed on and disabled despite the older feature overview describing a toggle.

Proposed: family setup selects Gujarati, the right text size, useful purposes and opening cash amounts. Mother's settings need only clear choices such as `અક્ષર મોટા કરો` with a real sample, and optional privacy preferences. Keep data import/reset, category maintenance and technical export formats in an explicitly named family-management area. Do not call this “elderly mode” in her interface.

### Tasks and Places

Observed: both are full primary tabs. Tasks include pending/completed states and overdue emphasis. Places include visited status, favourites, a repeated visited list and a long-press edit instruction. These are additional concepts unrelated to the core money entry.

Proposed: retain them as optional family tools if useful; exclude them from Mother's primary navigation. Reintroduce a module only after she asks for it. For any retained feature, supply visible edit controls instead of relying on remembering a long press.

## 5. Correctness and trust issues to address before relying on the redesign

These are source-based findings, not results from the family's real database. Severity reflects risk to trustworthy bookkeeping.

| ID | Priority | Finding and evidence | Concrete consequence | Required change / check |
| --- | --- | --- | --- | --- |
| C1 | P0 | `getMonthTotals` in queries, PDF monthly totals, and Excel Monthly sum `days.deposit_today` after joining expense rows | One ₹1,000 deposit with two expenses is reported as ₹2,000 deposited | Aggregate deposits independently or pre-aggregate expenses to one row per day; never use `SUM(DISTINCT deposit_today)` because equal deposits on different days are legitimate |
| C2 | P0 | PDF category query constrains the joined day by month but sums all joined expense amounts | PDF category totals can include expenses from other months | Filter expense rows through the target dates before summing; align report sources |
| C3 | P0 | `AmountSheet.handleItemStep` adds `delta`; callers already pass `amt + 10` or `amt - 10` | At ₹100, one + tap gives ₹120 and one - tap gives ₹80 | Apply the delta once; test boundary at zero and one-step change |
| C4 | P0 | Manual `setExpenseAmount` upserts one row by day/category/item/payment and deletes matching rows for zero; recurring processing directly appends rows | Ordinary entry replaces totals, while recurring rows can create several matches; editing/deleting an aggregate becomes ambiguous | Introduce append-entry and edit-by-ID APIs. Do not use category/day aggregate keys as transaction identities |
| C5 | P0 | `cashFor` is the category sum, including items. The tile stepper writes that sum plus/minus ₹10 to the non-itemised row | Example: ₹100 only in an item, then category +10 writes ₹110 common amount: total becomes ₹210 | Remove category-total mutations from the simple path; if retained, explicitly edit only the intended row |
| C6 | P0 | JSON export omits `category_items`, `vehicle_records`, `recurring_expenses`; JSON/Excel expense import drops `item_id`; image assets and preferences are not a complete portable bundle | A backup is not a complete restorable copy; item detail or photos can be lost | Versioned full backup with all relationships/assets/preferences, verified restore and balance rebuilding |
| C7 | P0 | JSON and Excel imports recreate days/categories with new IDs but then look up expenses using original numeric IDs; expenses are appended on repeated import | Expenses can attach to a wrong date/category, be skipped, or duplicate | Stable IDs or explicit old-to-new maps, restore/merge modes, validation, transaction rollback and idempotency |
| C8 | P1 | Amount sheet loads cash values on open; changing the cash/online toggle only changes `pType` | Saving after a toggle can write a cash value into online records | Load each payment mode's values independently, preserve draft per mode, label what will be saved |
| C9 | P1 | Amount sheet parses invalid input as zero; zero routes to deletion; many save errors only log to console | Invalid input can erase an existing amount or a failed save may appear finished | Strict finite positive amount validation for new entries; explicit deletion; visible failure and persistent draft |
| C10 | P1 | Home FAB adds to today's deposit while Expense deposit editor replaces the daily total | Entering ₹500 from two places can have different effects | A single receipt-creation flow everywhere; edit an existing receipt by selecting that receipt |
| C11 | P1 | Analytics “savings” is `deposited - cash_spent`; excludes online spending and treats receipts as income | Label can mislead even after SQL totals are fixed | Name cash change accurately or calculate an explicitly defined external-income-minus-expense metric; exclude internal transfers |
| C12 | P1 | `getOrCreateDay` creates a day during read/navigation; no reconciliation workflow or edit audit | Visiting dates makes stored rows; unexplained balance mismatches are hard to investigate | Separate effective ledger entries from viewed dates; support counted cash and a recorded adjustment, with history |
| C13 | P1 | Long-press category clear calls `setExpenseAmount(..., itemId=null)` | It removes non-itemised amounts but leaves item rows; UI implies the whole category was cleared | Define scope precisely; prefer row-specific edit/remove with undo |
| C14 | P1 | `processRecurringExpenses` posts historical payments on cold start; advances due dates outside a transaction and even after a caught posting failure | Unseen payments can change cash; partial failure can skip an occurrence or a crash can cause duplicate catch-up | Default to a reminder requiring payment confirmation for this household; if auto-post retained, use unique rule/occurrence keys and one atomic transaction |
| C15 | P1 | Biometric settings switch is disabled/true; App always enters gate if biometric hardware is enrolled; check errors/no enrollment bypass it | Settings does not control privacy as presented, and failure behaviour is unclear | Define optional lock policy, honour saved setting, provide normal device fallback and test error states |
| C16 | P2 | `today()` in queries uses `toISOString()` for task completion; other day logic uses local dates | Before 05:30 IST the task completion date can be yesterday | Use the same local date helper for daily bookkeeping and tasks; this helper was not found to drive all expense dates |

### Reproduction evidence

Using the project's installed `sql.js`, an isolated in-memory database was created with an October ₹1,000 deposit, October expenses ₹100 + ₹200, and a September ₹700 expense in the same category. No app or user database was opened or changed.

- The monthly joined SUM query returned **₹2,000 deposited**, **₹300 spent**. Expected deposit: **₹1,000**.
- The PDF category query returned **₹1,000 category spending** for October. Expected October-only spending: **₹300**.
- Evaluating the item's current stepper arithmetic at ₹100 produced **₹120** for plus and **₹80** for minus.

The remaining findings are static source analysis with concrete scenarios; they still need regression checks when implemented. The main screen's category-by-month query has a different date filter from the PDF query; do not assume every report has the identical month-filter defect.

### Report naming and balance definitions

`External receipts` means money entering the tracked household from outside. `Spending` means money paid out for consumption or an explicitly classified external purpose. Internal locker transfers belong to neither total. A person's payment may be a loan/repayment rather than income; track that separately if needed.

`Cash balance` is money currently in one tracked location. `Net cash change` is the change over a period. `Savings` needs an agreed household definition and enough account coverage to support it. These labels should not be interchangeable.

## 6. Proposed everyday navigation

Use two visible, labelled bottom destinations: **આજનો હિસાબ** (today) and **જૂનો હિસાબ** (earlier entries). Put **ઘરના સભ્ય માટે** (for a family member) in a clearly labelled secondary menu for backup, reports, customisation and optional tools. Navigation icons may accompany words; words remain visible.

Keep the primary actions in a fixed order across sessions. Avoid dynamically reordering Mother's purposes by recent use; stable positions help recognition. Let a family member configure her four to six frequent purposes once.

### Home wireframe: proposed, using illustrative data only

```text
આજનો હિસાબ                 સોમવાર, 9 નવેમ્બર

હાથમાં રોકડ                         ₹3,100
અંદર રાખેલા રૂપિયા                  ₹9,000  [જુઓ]

[ ખર્ચ લખો                              ]
[ પૈસા આવ્યા                             ]
[ અંદરથી લીધા                            ]

આજની નોંધો
શાકભાજી                              −₹100
દૂધના પૈસા આવ્યા                    +₹2,000
અંદરથી લીધા                         +₹1,000

આજનો કુલ ખર્ચ                         ₹100

[ આજનો હિસાબ ]        [ જૂનો હિસાબ ]
```

These are illustrative amounts: opening hand cash ₹200 and locker ₹10,000, then a ₹1,000 withdrawal, ₹2,000 external milk receipt and ₹100 vegetable expense yield hand cash ₹3,100 and locker ₹9,000. A real screen must calculate every displayed balance from actual opening amounts and entries. The transfer row should visibly say `અંદરથી લીધા`, so its plus sign does not imply external income. The cash balance should not compete with a full dashboard of statistics.

“અંદર” means the owner's actual home locker here. Use the wording she naturally says. If she prefers “તિજોરી” after seeing it, change the display label without changing the account semantics.

### Expense entry

1. Tap **ખર્ચ લખો**.
2. See four to six large, labelled purposes, for example **શાકભાજી**, **કરિયાણું**, **દવા**, **ઘરખર્ચ**, **બીજું**. Choose the actual starting list with the family; these are proposed labels, not an extracted ranking from the scan.
3. Tap a purpose. One large amount field appears with a numeric keyboard, an obvious date and **ખર્ચ સાચવો**.
4. Enter `100`, tap save once. Save one entry, show it immediately in the daily list, and display **₹100 શાકભાજીનો ખર્ચ સાચવ્યો** with **પાછું લો**.

Target: three main taps plus digits after opening the app, without scrolling on Mother's actual device. Optional person, short note and online payment are behind **વધુ વિગત**. Default to cash only if that matches her actual use. If she uses UPI frequently, expose a simple labelled payment choice; do not hide a choice she needs.

Do not silently assume that “₹100” means today's entire vegetable total. Adding a second ₹60 vegetable purchase must leave two entries and a derived ₹160 total.

### Money received

1. Tap **પૈસા આવ્યા**.
2. Choose a familiar source such as **પ્રણવ પાસેથી**, **પીંકુ પાસેથી**, **દૂધના પૈસા**, **બીજું** after confirming name spellings and actual source use.
3. Enter amount and save. Optional wording can explain the receipt.

Keep the number of choices small. Money from a family member may be a household contribution or money already owned by the household moved from an untracked location. Family setup must establish the tracking boundary before calling it income. In Mother's UI, the neutral phrase “પૈસા આવ્યા” is usually enough.

### Locker withdrawal and return

1. Tap **અંદરથી લીધા**.
2. Enter amount. Show a plain sentence: **અંદરથી ₹1,000 લીધા**.
3. Save one transfer. Cash in hand rises by ₹1,000; locker falls by ₹1,000. Household total remains the same.

Put **અંદર મૂક્યા** inside the locker details for the reverse direction, rather than adding a fourth equally prominent home action immediately. If returning money is frequent, test promoting it. If locker opening cash is unknown, show **અંદરની બાકી રકમ હજી નક્કી નથી**; allow a withdrawal record but do not invent a zero opening or a precise remaining balance.

### History, correction and checking

- Earlier entries are grouped by date, with a clear **આજે પાછા આવો** action.
- Tap a row to see its amount, date, wording and person/source. Show visible **સુધારો** and **નોંધ કાઢો** controls.
- An edit updates that entry only; retain its old value in history and recalculate subsequent affected balances.
- Removing an entry uses a reversible action and clear feedback. Long press is optional, never the only route.
- Draft edits survive accidental dismissal or require a clear discard choice. Android Back must not silently destroy a half-written entry.
- Offer **રોકડ ગણીને સરખાવો** as a secondary action: show calculated amount, accept counted amount, show difference. Do not silently overwrite history to force a match.
- A mismatch should produce a calm explanation and an explicit correction entry only after review. Avoid blame or red “failure” language.

## 7. Gujarati content system

Use familiar full phrases instead of translated finance jargon. The wording below is proposed for testing with Mother; read it aloud to check it matches her speech.

| Current concept / wording | Proposed main wording | Reason |
| --- | --- | --- |
| Home / હોમ | આજનો હિસાબ | Names the actual task |
| Cash balance / રોકડ બેલેન્સ | હાથમાં રોકડ | Identifies where money is |
| Opening / ઓપનિંગ | શરૂઆતમાં હાથમાં | Avoids an English loan word; not limited to yesterday if days were skipped |
| Deposited / જમા | પૈસા આવ્યા | Clear action for new receipts; existing historical “જમા” still needs contextual interpretation |
| Add expense | ખર્ચ લખો | Matches writing a book |
| Locker withdrawal | અંદરથી લીધા | Owner-confirmed familiar phrase |
| Locker return | અંદર મૂક્યા | Mirrors the reverse movement |
| Analytics / આંકડા | મહિનાનો હિસાબ | More concrete purpose |
| Manage categories / કેટેગરી સંચાલન | ખર્ચના નામ બદલો | Family setup language; hide from daily entry |
| Text size / S M L | અક્ષરનું કદ, with a live sample | Show readable outcomes rather than letter codes |
| Save | ખર્ચ સાચવો / રકમ સાચવો | Make the action's object clear |
| Delete transaction | આ નોંધ કાઢો | Distinguish one entry from clearing all data |
| No entries | આજે હજી કંઈ લખ્યું નથી | Familiar empty state with a visible first action |
| Generic error | રકમ સાચવાઈ નથી. ફરી પ્રયાસ કરો. | Says what happened and preserves the draft |
| Export | હિસાબની નકલ રાખો | Friendly summary; explain format in family area |

Use `₹1,000`, `₹100`, `9 નવેમ્બર`, and names Mother recognises. Use the confirmed 100-style numbers in dates, version labels, percentages and helper copy too, rather than mixing numeral systems by accident. Keep full precision in storage; show paise when an entry actually has paise. Existing formatters round to whole rupees, so storage/display precision must be deliberately reconciled.

Localisation is already present; this is not a request to build it from scratch. Finish hardcoded English paths such as `TODAY`, `Select Date`, month names, `Jump to Today`, validation alerts, `More`, and `Features`. The main day name is translated today, but calendar/month text is not fully translated. The amount sheet heading currently uses the stored category name, while tiles translate seeded names: apply consistent category labels everywhere.

## 8. Visual direction: calm, familiar and adult

Recommended direction: a light **khata** feeling through warm paper, dark Gujarati text, clear separators and one steady green action colour. Use the familiarity of a book without recreating cramped handwriting, dense two-column arithmetic or decorative ruled lines behind text.

Avoid an infantilising appearance. Large controls and simple words can still look carefully designed. Keep a small family identity or app mark, but spend most space on legible entries and useful actions. Do not make every category, tab and amount a different semantic colour.

### Proposed starting tokens

| Role | Candidate value | Usage |
| --- | --- | --- |
| Page | `#FFFCF7` | Warm near-white background |
| Surface | `#FFFFFF` | Entry rows and input surfaces |
| Primary text | `#252A25` | Labels, amounts, long-form text |
| Secondary text | `#566052` | Helpful explanations |
| Main action | `#285943` with white text | Save and primary actions |
| Expense emphasis | `#973C30` on white | Expense amount with explicit wording/minus sign |
| Transfer | Neutral dark text plus a directional icon and label | Do not imply income using colour alone |
| Spacing | 16 dp page padding; 12-16 dp between actions | Check on narrow phones |
| Controls | At least 56 dp high for daily actions | Prefer full-width rows |
| Body and labels | Start around 20 sp | Adjust with Mother and OS scaling |
| Major amount | Around 32-36 sp | Strong but not a whole screen card |
| Row shape | 12-16 dp radius; quiet border | Avoid excessive pills and shadows |

These are design starting points, not universal senior-user requirements. Use an actual Gujarati-capable font and inspect matras, conjuncts, line height, number alignment and weight on Android. Start with the platform font if it renders well; bundle a properly licensed Gujarati font if needed. Do not use a handwriting font for reading amounts.

### Contrast measurements

Calculated using the WCAG relative-luminance formula on the source hex colours, without screenshot compression or alpha blending:

| Colour pair | Ratio | Interpretation |
| --- | --- | --- |
| Current muted `#93949E` on white | 3.01:1 | Below 4.5:1 for normal text; current small hints need attention |
| Current income `#0EA872` on `#E7FBF3` | 2.84:1 | Below normal-text target; verify where used as foreground |
| Current expense `#EF4444` on `#FEF1F1` | 3.42:1 | Below normal-text target, though large text has different criteria |
| Proposed primary text on page | 14.28:1 | Strong starting contrast |
| Proposed secondary text on page | 6.43:1 | Above normal-text target |
| White on proposed action green | 8.08:1 | Strong starting contrast |
| Proposed expense text on white | 6.99:1 | Above normal-text target |

Not every current component uses these exact pairs, so these measurements are not a complete accessibility audit. Test gradients at their lowest-contrast point, focus/disabled states, selected chips, icons and any text over tinted backgrounds. Text and signs must communicate meaning even without colour.

## 9. Interaction and accessibility requirements

Use Android's 48 dp minimum touch-area recommendation as a platform baseline, and aim for 56-64 dp daily actions on this product. WCAG 2.2's web minimum is 24 CSS px with exceptions; do not misstate it as a 48 dp rule. Native dp, font sp and CSS px are different units. [Android guidance](https://developer.android.com/guide/topics/ui/accessibility/apps), [WCAG target-size explanation](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

- Keep regular text at least 4.5:1 contrast and qualifying large text at least 3:1; aim higher for critical amounts. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- Support system text enlargement without clipped Gujarati, hidden save buttons or overlapping amounts; test a 200% text scenario as a useful target. Existing 1.1 app scale is not an adequate substitute for layout testing. [W3C resize guidance](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html).
- Give controls visible words and appropriate accessibility labels/roles. Existing navigation labels help screen readers but do not help a sighted person interpret an icon-only bar.
- Use logical TalkBack focus order and announce saved status once. Check modal focus and return focus to the invoking action.
- Avoid nested +/- buttons inside a tappable category card in the simple flow. Small hit areas expanded with `hitSlop` can collide; use physically separated controls.
- Keep Back and Cancel clear. Full-screen amount entry may be easier than a tall bottom sheet when the keyboard is open; validate on the target phone.
- An optional vibration can acknowledge a save, but visual confirmation must work with sound/vibration disabled.
- Provide non-expiring access to the last correction/undo rather than relying solely on a toast she might miss.
- Respect Android system safe areas, navigation modes and keyboard resizing. Current floating bar has Android bottom inset hardcoded to zero; test with gesture navigation rather than assuming fixed bottom padding solves every overlap.

W3C's cognitive guidance supports recognisable controls and familiar presentation. It informs these recommendations; it does not diagnose Mother or prove that this design will work for her. [Clear controls](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p05-clear-controls/).

## 10. Proposed ledger model

Keep the simple interface backed by explicit records. A proposed minimum model:

| Entity | Minimum useful information |
| --- | --- |
| Account | Stable ID, name, kind, opening amount in paise, opening local date, known/unknown opening status |
| Entry | Stable ID, kind, amount in paise, effective local date, created time, purpose/category, optional person, optional original wording, source/provenance |
| Movement | Entry ID, account ID, signed paise change; an internal transfer has two balanced legs in one DB transaction |
| Person | Stable ID, display name, optional family-approved aliases; start with only genuinely needed people |
| Change history | Entry ID, revision, old/new values, edit time, optional reason; deletion state and recovery |
| Reconciliation | Account, count date, calculated amount, counted amount, difference, explicit adjustment link if confirmed |

Suggested kinds: `expense`, `receipt`, `transfer`, `opening`, `adjustment`; add `loan_out`, `loan_repayment` only after confirming those use cases. `opening` establishes money already owned, not income. `adjustment` is explained and visible, not a way to conceal missing entries.

### Arithmetic rules

```text
cash in hand = opening hand cash
             + external cash receipts
             + transfers into hand cash
             - cash spending
             - transfers out of hand cash
             + explicit signed corrections

locker cash = opening locker cash
            + transfers into locker
            - transfers out of locker
            + explicit signed corrections

known household cash = hand cash + locker cash
```

Example with verified hypothetical openings: hand ₹200, locker ₹10,000. Take ₹1,000 from locker: hand ₹1,200, locker ₹9,000, household cash ₹10,200. Spend ₹100 vegetables: hand ₹1,100, locker ₹9,000, household cash ₹10,100, actual spending ₹100, external income ₹0. These are synthetic examples, not claims about the scanned notebook.

If online spending is supported without tracking a bank account, show it as recorded spending while clearly avoiding a claimed total household balance across all assets. If a tracked bank account is later added, handle bank-to-cash movements as transfers too.

Use integer paise to avoid floating-point rounding in money calculations, with strict decimal input parsing. Keep local dates (`YYYY-MM-DD`) for the effective day and timestamps for creation/editing. A transfer's two legs and its revisions must save atomically. Disable duplicate submissions and use stable operation IDs so a double tap/retry does not create another entry.

## 11. Migration and existing-data protection

1. Fix and verify backup/restore before changing the schema. Export an untouched copy before migration and retain a rollback path.
2. Give new ledger entries stable IDs and a schema version. Keep the migration transactional and repeat-safe.
3. Convert existing expense rows to entries without inventing separate shopping events. One old aggregate remains one migrated aggregate with its original provenance.
4. Convert a day's `deposit_today` to a **legacy receipt with unknown source/type**, not automatically to milk income or a locker withdrawal. Existing data lacks that distinction.
5. Ask a family member to classify legacy receipts only when evidence exists. Mark unresolved ones so income reports can exclude or clearly disclose them.
6. Set locker opening money from a family count/date, not from a provisional circled scan number. If unknown, keep it unknown. Establish hand cash separately.
7. Rebuild balance projections from the ledger and compare with legacy totals before activating the new path. Record discrepancies instead of overwriting them silently.
8. Preserve inactive categories and old wording so historic entries remain intelligible. Deleting a display category must not delete historical transactions.
9. Update JSON, Excel and PDF together. A readable report and a full restorable backup are different artifacts; label them accordingly.
10. Test restore into a fresh database and into a database with different IDs; test repeated import. Include category items, persons, accounts, movements, history, recurring rules, settings, and referenced custom photo assets where applicable.

Do not bulk import the scan interpretation in `PUBLIC_README.md`. Its examples are explicitly provisional.

## 12. Feature priorities

### Build first

| Priority | Work | Completion condition |
| --- | --- | --- |
| P0 | Correct monthly aggregation, PDF month filtering, backup/restore, item arithmetic and aggregate mutations | Synthetic cases in section 5 produce correct results; restore reconstructs relationships without duplicates |
| P0 | Agree household money boundaries and implement cash-in-hand/locker transfers | Internal transfer changes locations without changing external income or spending |
| P0 | One-entry creation/edit model | Two same-category purchases remain two entries and have the right total |
| P1 | Gujarati daily home with three labelled actions | Mother can identify the right starting action without explanation |
| P1 | One-purpose/one-amount entry screen and clear save feedback | She saves an ordinary expense and recognises the resulting row |
| P1 | History, correction, undo, drafts and visible save errors | An accidental amount can be repaired without losing unrelated data |
| P1 | Complete Gujarati wording, large type and accessible layouts | No English-only core paths; no clipping on her device at enlarged text |
| P1 | Family-assisted initial setup | Gujarati and useful purposes ready before Mother's first session |
| P2 | Cash count/reconciliation and a simple readable ledger export | Family can explain a difference and review earlier dates |
| P2 | Optional people/source filtering and simple monthly totals | Find money involving Pranav/Pinku without introducing debt assumptions |

### Keep away from the initial everyday path

Tasks, visited places, moods, mileage, custom photo selection, category/item maintenance, recurring rule builders, advanced charts, JSON/Excel format choices, and reset controls. Existing modules can stay available to family members; no need to delete working functionality to make Mother's path simple.

### Consider only after basic adoption

- **Voice entry:** potentially useful if typing is her barrier, but Gujarati recognition, number accuracy, privacy, device support and offline behaviour must be tested. Always show the recognised amount and wording for confirmation before saving. Provide manual fallback. Do not promise free offline voice support without evaluating an actual implementation.
- **Read-aloud confirmation:** optional and user-controlled; do not announce private money amounts by default.
- **Photo of notebook/receipt:** helpful as provenance, but never silently convert uncertain handwriting into committed transactions. Keep capture and storage optional.
- **Cloud/family sync:** useful only if the family needs another device or independent off-device backup; requires explicit product/privacy decisions. A backup file remaining only inside the same app/device is not adequate protection against losing that phone.
- **Reminders:** gentle, chosen timing and easy to turn off; no guilt messages or streak pressure.

## 13. Implementation map

| Area | Existing files | Intended work |
| --- | --- | --- |
| Navigation | `App.js` | Separate Mother's labelled daily/history path from family tools; preserve advanced routes |
| Daily page | `src/screens/Home.jsx` | Replace mixed dashboard emphasis with actions and chronological entries |
| Entry flow | `src/screens/Expense.jsx`, shared Input/Sheet/Button | New-entry vs edit-by-ID, purpose/amount flow, explicit validation and save states |
| Data model | `src/db/schema.js`, `src/db/queries.js` | Versioned migrations, accounts, entry identity, transfers, revisions and reconciliation |
| State and dates | `src/store/useAppStore.js`, `src/components/DayNavigator.jsx`, `src/utils/dateUtils.js` | Consistent local dates, explicit earlier-date banners, safe return to today |
| Language | `src/locales/gu.json`, `en.json`, `src/i18n.js`, default categories | Natural Gujarati, full core coverage, 100-style numbers, consistent source names |
| Visual system | `src/constants/theme.js`, common components | Quiet palette, readable type, large labelled controls, flexible layouts |
| Settings | `src/store/ThemeContext.js`, `src/screens/Settings.jsx`, prefs | Persist simple experience, actual lock choice, large text, family setup |
| History/Search | `src/screens/Search.jsx`, queries | Search/filter actual entries, receipts and transfers; date-grouped history |
| Reporting and recovery | `backupService.js`, `excelService.js`, `pdfService.js` | Correct aggregates, complete versioned backup, validated restore, simple ledger output |

Prefer incremental delivery: reliable ledger layer first, a small new daily flow using it second, then migration and reports behind a feature flag or family test build. Do not spend the first iteration replacing all eleven screens or adding another complex state system.

## 14. Validation with Mother

Run short, comfortable sessions on her own phone with realistic but clearly marked practice data. First show the screen without an onboarding presentation. Ask her to do the following in her own way; avoid pointing to the right button immediately.

| Task | What success looks like |
| --- | --- |
| Record ₹100 vegetables | Chooses expense, enters 100, saves, identifies the saved entry |
| Record another ₹60 vegetables | Two rows remain; total ₹160; first entry untouched |
| Receive ₹500 from Pranav | Selects the right source; sees a receipt rather than an expense |
| Take ₹1,000 from inside | Chooses the familiar locker action; understands hand/locker change |
| Put ₹200 back inside | Finds reverse transfer without recording an expense |
| Correct ₹100 to ₹120 | Finds the row, edits it, recognises changed value |
| Undo an accidental removal | Restores the entry without help or unrelated changes |
| Add yesterday's forgotten ₹50 | Understands selected date; returns to today afterwards |
| Find Pinku's earlier entry | Uses earlier ledger/person filter without needing a chart |
| Leave and reopen the app | Finds entries intact and recognises where to continue |

Record whether help was needed, wrong taps, hesitation, reading difficulty, and whether she trusts the resulting amount. A useful initial product target is three consecutive ordinary expenses completed without help, and the same task completed independently on the next day. A fast task target such as 15-20 seconds is a hypothesis, not a pass/fail judgement about her.

Let the notebook and app coexist during a brief trial. Compare the cash count with both, resolve discrepancies together, and move only the routine she is comfortable with. If she still prefers writing, investigate the actual barrier (typing, confidence, phone availability, vision, habit, concern about mistakes) rather than adding more animation.

### Engineering acceptance scenarios

- Transfers: hand +₹1,000 and locker -₹1,000; total household cash unchanged; no income/spend change.
- Multiple same-category entries: ₹100 + ₹60 yields two rows and ₹160 total; editing one does not replace the other.
- Dates: local midnight boundary, app left open overnight, yesterday entry and later-balance recalculation, skipped dates and month transitions.
- Amounts: blank, zero, negative, NaN/infinite, malformed decimal, paise, very large values and double taps; invalid data never becomes deletion.
- Failure: simulate DB write failure; draft stays visible and success is not announced. Atomic transfer cannot leave only one leg.
- Reports: equal receipt amounts on different days, multiple expense rows per day, no-expense days, cross-month category entries, transfer-only days, and unknown legacy receipts.
- Restore: full fresh restore, different-ID restore/merge, repeated import, missing asset, malformed file, interrupted restore and rollback.
- UI: 320/360 dp widths as well as her actual phone, large system text, Gujarati wrapping, keyboard-open save access, TalkBack, contrast and both Android navigation modes.
- Privacy: lock enabled/disabled, unenrolled hardware, failed recognition and normal device fallback behave as the saved policy says.

## 15. What was delivered and what remains

Delivered in this review: reusable notebook context in `PUBLIC_README.md`; direct inspection of six screenshots; source-backed gap analysis; isolated reproductions of key calculation defects; candidate contrast measurements; proposed screens, wording, ledger model, migration strategy and validation plan.

Not delivered: a complete verified scan transcription, reconciled historic balances, implemented UI, schema migrations, a rebuilt APK, a live-device accessibility verdict, or evidence that Mother has adopted the app. Those are distinct next implementation/validation steps.

The highest-value first working slice is: **Gujarati daily list + one new expense + one receipt + one locker transfer + safe edit/undo**, on a corrected ledger and recovery path. Test that slice with Mother before redesigning the rest of the app.

## 16. Primary references

These references inform accessibility targets. The specific screens, Gujarati labels, feature priorities and family workflows above are recommendations inferred from this project's source, screenshots and the owner's context.

- [W3C: Clearly identify controls and their use](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p05-clear-controls/) supports recognisable, clearly actionable controls and adequate separation.
- [W3C: Accessibility and older users](https://www.w3.org/WAI/older-users/developing/) discusses how existing accessibility guidance addresses common older-user needs; individual needs still require observation.
- [W3C: Target Size (Minimum), SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) explains the web minimum and its exceptions.
- [W3C: Contrast (Minimum), SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) explains 4.5:1 normal-text and 3:1 qualifying large-text thresholds.
- [W3C: Resize Text, SC 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) explains enlargement without loss of content/functionality.
- [Android Developers: Make apps more accessible](https://developer.android.com/guide/topics/ui/accessibility/apps) provides native touch-area, labelling and text-visibility guidance.
