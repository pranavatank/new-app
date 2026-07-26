# Hisab — Family Cash & Expense Ledger

A React Native (Expo) app for tracking daily cash/online expenses, deposits, tasks, visited places, notes, and bike fuel mileage — fully offline, backed by a local SQLite database.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 51, React Native 0.74 |
| Navigation | React Navigation (bottom tabs, custom floating tab bar) |
| Database | `expo-sqlite` (native), `sql.js` fallback on web |
| State | Zustand (`useAppStore`) for the selected day/date; React Context (`ThemeContext`) for theme/language/text-scale/settings |
| i18n | `react-i18next`, English + Gujarati (`src/locales/`) |
| Icons | `@expo/vector-icons` (`Ionicons` primary, `MaterialCommunityIcons` fallback) |
| Styling | Plain `StyleSheet.create`, no CSS-in-JS library |
| Export/Import | `xlsx` (Excel), `expo-print` (PDF), `expo-file-system` (JSON backup) |
| Auth | `expo-local-authentication` (biometric app-lock) |

## Getting started

```bash
npm install
npx expo start          # or: npm run android / npm run ios / npm run web
```

No backend, no API keys, no accounts — the app is 100% local. All data lives in a SQLite file on-device; there is no cloud sync.

## Project structure

```
App.js                      — navigation root, floating tab bar, biometric lock screen
src/
  screens/                  — one file per tab/route (see Screens below)
  components/
    DayNavigator.jsx        — shared prev/next-day header used on most screens
    common/                 — shared UI kit: Card, Button, IconBadge, Sheet, Input,
                               Chip, Badge, EmptyState, Row, SectionHeader,
                               ScreenHeader, FAB (see Shared component library)
  constants/
    theme.js                — design tokens: colors (light/dark), typography,
                               spacing, radius, gradients, `scaleTheme(scale)`
    defaultCategories.js     — seed data for the default expense categories
  store/
    ThemeContext.js          — theme/language/text-scale/settings provider
    useAppStore.js            — zustand store for the currently selected date/day
  db/
    schema.js                — SQLite table definitions + safe migrations
    queries.js                — every DB read/write the app performs
  services/
    backupService.js          — JSON export/import
    excelService.js           — Excel (.xlsx) export/import
    pdfService.js              — PDF analytics report
    prefs.js                   — tiny JSON-file key/value store for settings
  i18n.js, locales/en.json, locales/gu.json
```

## Screens

| Screen | Purpose |
|---|---|
| **Home** | Dashboard: gradient balance card, top expense categories, tasks/places/notes previews, optional bike-mileage card, quick-deposit FAB |
| **Expense** | Category grid for entering cash/online spend (tap for exact amount, +/- stepper for quick adjustments, long-press to clear), deposit entry, category management |
| **ExpenseItems** | Per-category sub-items (e.g. "Rice" under "Grains") with custom emoji-or-photo icons |
| **Tasks** | Pending/completed task list with overdue tracking |
| **Places** | Saved places, mark visited for the day, favorites, custom emoji-or-photo icons |
| **Notes** | Daily journal entries with a mood tag |
| **Analytics** | Monthly summary — category breakdown, daily trend chart, top spending days, deposit/spend/savings donut |
| **Vehicle** | Bike fuel-up log and mileage tracking (only shown if enabled in Settings) |
| **Settings** | Theme, language, text size, biometric toggle, bike-mileage toggle, JSON/Excel/PDF export & import, clear data |

Nine tabs total: 6 are visible in the floating bottom nav (Home, Expense, Tasks, Places, Analytics, Settings); Notes, ExpenseItems, and Vehicle are reached via in-app navigation from other screens.

## Shared component library (`src/components/common/`)

Every screen is built from the same small kit rather than hand-rolling its own cards/modals:

- **Card** — surface container, optional gradient fill
- **Button** — primary (gradient) / secondary / ghost / danger variants
- **IconBadge** — circular icon container that renders **emoji**, a **custom photo** (`icon_type: 'image'`), or a vector icon — this is the one place the emoji-vs-photo pattern is handled, reused by categories, category items, and places
- **Sheet** — bottom-sheet modal (replaces what used to be duplicated per-screen)
- **Input**, **Chip**, **Badge**, **Row**, **SectionHeader**, **ScreenHeader**, **EmptyState**, **FAB**

All of them read `useTheme()` internally and call `scaleTheme(scale)` themselves, so screens don't need to thread theme tokens through props by hand.

## Theming & text size

`src/constants/theme.js` exports:
- `LightColors` / `DarkColors` — full palettes (background, brand, semantic income/expense/online colors, text, borders, per-section accents, an `accents` array used to cycle colors across categories/charts, and `gradients`)
- `scaleTheme(scale)` — returns `Typography` / `Spacing` / `Radius` scaled by the user's text-size preference (`0.9` small / `1.0` medium / `1.1` large, set in Settings)
- `makeShadow(C)` — theme-aware shadow presets (`sm`, `md`, `lg`, `primary`)

**Rule of thumb when touching UI code:** always get `Typography`/`Spacing`/`Radius` via `scaleTheme(scale)` inside a component (or a small factory function called with the scaled values), never via a static top-level import — a static import can't react to the user changing the text-size setting.

## Database

SQLite tables (see `src/db/schema.js` for exact DDL and migrations):

- `days` — one row per date; stores `deposit_today` and a persisted `closing_balance`
- `categories` / `category_items` — user-editable expense categories and their optional sub-items; both carry `icon` + `icon_type` (`'emoji' | 'image'`)
- `expenses` — the core transaction table (`day_id`, `category_id`, optional `item_id`, `amount`, `payment_type`, optional `note`)
- `places` / `day_places` — saved places and which ones were visited on which day; places carry `icon` + `icon_type` just like categories
- `notes` — daily journal entries with a `mood`
- `tasks` — pending/completed tasks with a `start_date`
- `vehicle_records` — bike fuel-up log (`date`, odometer `reading`, `liters`, `price_per_liter`, `amount`, `payment_type`)

### Balance calculation

A day's `closing_balance = opening_balance + deposit_today − cash_spent` (online spend doesn't touch the cash balance). `opening_balance` is always the previous day's stored `closing_balance` (`getPreviousClosingBalance`). Because `closing_balance` is persisted rather than computed live, editing a **past** day's deposit or expenses recalculates that day and then cascades forward (`cascadeBalanceForward` in `queries.js`), re-chaining every later day that already exists in the `days` table — otherwise those later balances would silently go stale.

### Vehicle mileage calculation

Mileage is attributed to **legs between fill-ups**, not to the fill-up itself:

> The distance ridden between fill-up *N−1* and fill-up *N* was powered by the fuel put in **at fill-up N−1** — the fuel added at fill-up *N* hasn't been ridden on yet; it pays for the *next* leg.

So for consecutive fill-ups (oldest → newest), `mileage = (readingN − readingN−1) / litersN−1`, and the same rule applies to the running "Overall Avg" and "Last 10 Fills Avg" stats (`getVehicleStats` in `queries.js`) and to the live estimate shown while adding a new fill-up record (`Vehicle.jsx`). The very latest fill-up's liters are always excluded from the completed-legs total, since no leg after it exists yet.

## Known intentional design choices (not bugs)

- A category can have **both** a non-itemized "common" amount and itemized sub-amounts at once (via the "Common Item" toggle in the amount sheet) — both legitimately add up to the category's total.
- The floating bottom tab bar is drawn as an absolutely-positioned overlay; every screen's scrollable content carries extra bottom padding (~100) so the last item/FAB isn't hidden behind it.

## Localization

`src/locales/en.json` and `gu.json` mirror each other key-for-key. When adding user-facing text, add the key to both files rather than hardcoding a literal string in a screen.

## Building

```bash
eas build --platform android --profile preview     # installable APK, no store needed
eas build --platform android --profile production   # Play Store AAB
```

See `eas.json` for build profiles and `app.json` for app identifiers/permissions.
