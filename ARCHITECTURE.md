# Export/Import System Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     HISAB APP                                │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   Home     │  │  Expense   │  │  Analytics │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              SETTINGS SCREEN                          │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │           DATA SECTION                        │   │  │
│  │  │                                               │   │  │
│  │  │  💾 JSON Backup      ──────────┐            │   │  │
│  │  │  📥 Import JSON      ──────────┤            │   │  │
│  │  │  📊 Export to Excel  ──────────┼────────┐   │   │  │
│  │  │  📤 Import Excel     ──────────┤        │   │   │  │
│  │  │  📄 Export PDF       ──────────┘        │   │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │      SERVICE LAYER                   │
        │                                      │
        │  ┌────────────────┐                 │
        │  │ backupService  │ ◄─── JSON       │
        │  └────────────────┘                 │
        │                                      │
        │  ┌────────────────┐                 │
        │  │ excelService   │ ◄─── Excel      │
        │  └────────────────┘                 │
        │                                      │
        │  ┌────────────────┐                 │
        │  │ pdfService     │ ◄─── PDF        │
        │  └────────────────┘                 │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │      DATABASE (SQLite)               │
        │                                      │
        │  ┌──────┐  ┌──────────┐  ┌───────┐ │
        │  │ Days │  │ Expenses │  │ Tasks │ │
        │  └──────┘  └──────────┘  └───────┘ │
        │                                      │
        │  ┌───────┐  ┌────────┐  ┌──────────┐│
        │  │ Notes │  │ Places │  │Categories││
        │  └───────┘  └────────┘  └──────────┘│
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │      FILE SYSTEM                     │
        │                                      │
        │  📄 hisab_backup_2024-01-15.json    │
        │  📊 hisab_export_2024-01-15.xlsx    │
        │  📄 hisab_analytics_2024-01.pdf     │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │      SHARE / STORAGE                 │
        │                                      │
        │  ☁️  Cloud Storage (Drive/iCloud)   │
        │  📧 Email                            │
        │  💬 Messaging Apps                   │
        │  📱 Other Apps                       │
        └─────────────────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### Export Flow

```
┌──────────┐
│   USER   │
└────┬─────┘
     │ Taps Export
     ▼
┌──────────────────┐
│  Settings Screen │
└────┬─────────────┘
     │ Calls Service
     ▼
┌──────────────────┐      ┌──────────────┐
│  Export Service  │─────►│   Database   │
│  (JSON/Excel/PDF)│      │   (SQLite)   │
└────┬─────────────┘      └──────────────┘
     │ Queries Data
     │
     │ Formats Data
     ▼
┌──────────────────┐
│   File System    │
│  Creates File    │
└────┬─────────────┘
     │ File Created
     ▼
┌──────────────────┐
│   Share Sheet    │
│  (iOS/Android)   │
└────┬─────────────┘
     │ User Shares
     ▼
┌──────────────────┐
│  Destination     │
│ (Cloud/Email/etc)│
└──────────────────┘
```

### Import Flow

```
┌──────────┐
│   USER   │
└────┬─────┘
     │ Taps Import
     ▼
┌──────────────────┐
│  Settings Screen │
└────┬─────────────┘
     │ Shows Picker
     ▼
┌──────────────────┐
│ Document Picker  │
│  (iOS/Android)   │
└────┬─────────────┘
     │ User Selects File
     ▼
┌──────────────────┐
│  Import Service  │
│  (JSON/Excel)    │
└────┬─────────────┘
     │ Reads File
     │
     │ Validates Data
     │
     │ Checks Duplicates
     ▼
┌──────────────────┐
│   Database       │
│  Inserts Data    │
└────┬─────────────┘
     │ Success
     ▼
┌──────────────────┐
│  Success Alert   │
│  Shows Stats     │
└──────────────────┘
```

---

## 🗂️ File Structure

```
hisab/
├── src/
│   ├── services/
│   │   ├── backupService.js      ✨ NEW - JSON export/import
│   │   ├── excelService.js       🔄 ENHANCED - Excel with analytics
│   │   ├── pdfService.js         ✨ NEW - PDF reports
│   │   └── prefs.js              (existing)
│   │
│   ├── screens/
│   │   ├── Settings.jsx          🔄 UPDATED - Export/import UI
│   │   └── ...
│   │
│   ├── locales/
│   │   ├── en.json               🔄 UPDATED - New translations
│   │   └── gu.json               🔄 UPDATED - New translations
│   │
│   └── db/
│       ├── schema.js             (existing)
│       └── queries.js            (existing)
│
├── package.json                  🔄 UPDATED - Added expo-print
│
├── EXPORT_IMPORT_GUIDE.md        ✨ NEW - Detailed documentation
├── EXPORT_IMPORT_QUICK_GUIDE.md  ✨ NEW - Quick reference
├── EXPORT_IMPORT_IMPLEMENTATION.md ✨ NEW - Implementation details
└── INSTALLATION.md               ✨ NEW - Setup instructions
```

---

## 🔄 Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  backupService.js                                   │    │
│  │  ─────────────────                                  │    │
│  │                                                      │    │
│  │  exportToJSON()                                     │    │
│  │  ├─ Query all tables                                │    │
│  │  ├─ Build JSON structure                            │    │
│  │  ├─ Add metadata                                    │    │
│  │  ├─ Write to file                                   │    │
│  │  └─ Share file                                      │    │
│  │                                                      │    │
│  │  importFromJSON()                                   │    │
│  │  ├─ Pick file                                       │    │
│  │  ├─ Parse JSON                                      │    │
│  │  ├─ Validate structure                              │    │
│  │  ├─ Check duplicates                                │    │
│  │  ├─ Validate relationships                          │    │
│  │  └─ Insert data                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  excelService.js                                    │    │
│  │  ────────────────                                   │    │
│  │                                                      │    │
│  │  exportToExcel()                                    │    │
│  │  ├─ Create workbook                                 │    │
│  │  ├─ Add Summary sheet                               │    │
│  │  ├─ Add Expenses sheet                              │    │
│  │  ├─ Add Monthly sheet                               │    │
│  │  ├─ Add Categories sheet                            │    │
│  │  ├─ Add Tasks sheet                                 │    │
│  │  ├─ Add Notes sheet                                 │    │
│  │  ├─ Add Places sheet                                │    │
│  │  ├─ Add Raw data sheets                             │    │
│  │  ├─ Write to file                                   │    │
│  │  └─ Share file                                      │    │
│  │                                                      │    │
│  │  importFromExcel()                                  │    │
│  │  ├─ Pick file                                       │    │
│  │  ├─ Parse workbook                                  │    │
│  │  ├─ Read sheets                                     │    │
│  │  ├─ Validate data                                   │    │
│  │  ├─ Check duplicates                                │    │
│  │  └─ Insert data                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  pdfService.js                                      │    │
│  │  ──────────────                                     │    │
│  │                                                      │    │
│  │  exportToPDF(year, month)                           │    │
│  │  ├─ Query monthly data                              │    │
│  │  ├─ Calculate totals                                │    │
│  │  ├─ Get category breakdown                          │    │
│  │  ├─ Get top spending days                           │    │
│  │  ├─ Build HTML template                             │    │
│  │  ├─ Add CSS styling                                 │    │
│  │  ├─ Generate PDF                                    │    │
│  │  └─ Share file                                      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Database Schema

```
┌──────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                        │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐                                         │
│  │    days     │                                         │
│  ├─────────────┤                                         │
│  │ id          │◄────────┐                               │
│  │ date        │         │                               │
│  │ deposit     │         │                               │
│  │ balance     │         │                               │
│  └─────────────┘         │                               │
│         ▲                │                               │
│         │                │                               │
│         │                │                               │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌─────────────┐    │
│  │  expenses   │  │    notes    │  │ day_places  │    │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤    │
│  │ id          │  │ id          │  │ id          │    │
│  │ day_id      │  │ day_id      │  │ day_id      │    │
│  │ category_id │  │ text        │  │ place_id    │    │
│  │ amount      │  │ mood        │  └─────────────┘    │
│  │ payment_type│  │ created_at  │         │           │
│  │ place_id    │  └─────────────┘         │           │
│  │ note        │                           │           │
│  └─────────────┘                           │           │
│         │                                  │           │
│         │                                  │           │
│         ▼                                  ▼           │
│  ┌─────────────┐                    ┌─────────────┐   │
│  │ categories  │                    │   places    │   │
│  ├─────────────┤                    ├─────────────┤   │
│  │ id          │                    │ id          │   │
│  │ name        │                    │ name        │   │
│  │ icon        │                    │ icon        │   │
│  │ sort_order  │                    │ is_favorite │   │
│  │ is_active   │                    └─────────────┘   │
│  └─────────────┘                                      │
│                                                        │
│  ┌─────────────┐                                      │
│  │    tasks    │                                      │
│  ├─────────────┤                                      │
│  │ id          │                                      │
│  │ title       │                                      │
│  │ start_date  │                                      │
│  │ completed   │                                      │
│  │ status      │                                      │
│  └─────────────┘                                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 📊 Excel Workbook Structure

```
┌─────────────────────────────────────────────────────────┐
│              EXCEL WORKBOOK (.xlsx)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Sheet 1: Summary                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │ Date │ Deposited │ CashSpent │ OnlineSpent │...│    │
│  ├──────┼───────────┼───────────┼─────────────┼───┤    │
│  │ 2024 │   5000    │   3000    │    1000     │...│    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Sheet 2: Expenses                                       │
│  ┌────────────────────────────────────────────────┐    │
│  │ Date │ Category │ Amount │ PaymentType │ Place │    │
│  ├──────┼──────────┼────────┼─────────────┼───────┤    │
│  │ 2024 │ Food 🍽️  │  500   │    cash     │ Shop  │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Sheet 3: Monthly                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │ Month  │ TotalDeposited │ TotalCashSpent │... │    │
│  ├────────┼────────────────┼────────────────┼────┤    │
│  │ 2024-01│    150000      │     100000     │... │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Sheet 4: Categories                                     │
│  Sheet 5: Tasks                                          │
│  Sheet 6: Notes                                          │
│  Sheet 7: Places                                         │
│  Sheet 8: _RawDays (backup)                             │
│  Sheet 9: _RawExpenses (backup)                         │
│  Sheet 10: _RawCategories (backup)                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📄 PDF Report Layout

```
┌─────────────────────────────────────────────────────────┐
│                    PDF ANALYTICS REPORT                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         📒 Hisab — Family Ledger                │    │
│  │    Monthly Analytics Report: January 2024      │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ 💰 Deposited │  │ 💸 Spent     │                    │
│  │   ₹150,000   │  │   ₹120,000   │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ 💵 Cash      │  │ 🌐 Online    │                    │
│  │   ₹100,000   │  │   ₹20,000    │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ ✅ Savings: ₹30,000 (20%)                      │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  📊 Category Breakdown (Highest to Lowest)              │
│  ┌────────────────────────────────────────────────┐    │
│  │ 1️⃣ 🍽️ Food         ████████████ 40% ₹48,000  │    │
│  │ 2️⃣ 🚗 Fuel         ████████ 25% ₹30,000       │    │
│  │ 3️⃣ 🛒 Groceries    ██████ 20% ₹24,000         │    │
│  │ 4️⃣ 💊 Medicine     ███ 10% ₹12,000            │    │
│  │ 5️⃣ 📚 Education    ██ 5% ₹6,000               │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  🔥 Top 5 Spending Days                                 │
│  ┌────────────────────────────────────────────────┐    │
│  │ Rank │ Date        │ Total Spent               │    │
│  ├──────┼─────────────┼──────────────────────────┤    │
│  │  1️⃣  │ Jan 15, Mon │ ₹8,500                   │    │
│  │  2️⃣  │ Jan 22, Mon │ ₹7,200                   │    │
│  │  3️⃣  │ Jan 8, Mon  │ ₹6,800                   │    │
│  │  4️⃣  │ Jan 29, Mon │ ₹6,500                   │    │
│  │  5️⃣  │ Jan 1, Mon  │ ₹6,000                   │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  📅 Daily Spending Details (Top 10 Days)                │
│  ┌────────────────────────────────────────────────┐    │
│  │ Date │ Deposited │ Cash │ Online │ Total       │    │
│  ├──────┼───────────┼──────┼────────┼────────────┤    │
│  │ ...  │    ...    │ ...  │  ...   │    ...     │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ─────────────────────────────────────────────────     │
│  Generated on January 31, 2024 • Hisab Family Ledger   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Feature Matrix

```
┌─────────────────────────────────────────────────────────┐
│                    FEATURE MATRIX                        │
├─────────────┬──────────┬──────────┬──────────┬─────────┤
│   Feature   │   JSON   │  Excel   │   PDF    │ Status  │
├─────────────┼──────────┼──────────┼──────────┼─────────┤
│ Export      │    ✅    │    ✅    │    ✅    │  Done   │
│ Import      │    ✅    │    ✅    │    ❌    │  Done   │
│ Backup      │    ✅    │    ✅    │    ❌    │  Done   │
│ Analytics   │    ❌    │    ✅    │    ✅    │  Done   │
│ Readable    │    ❌    │    ✅    │    ✅    │  Done   │
│ Shareable   │    ✅    │    ✅    │    ✅    │  Done   │
│ Printable   │    ❌    │    ✅    │    ✅    │  Done   │
│ Mergeable   │    ⚠️    │    ✅    │    ❌    │  Done   │
│ Compressed  │    ✅    │    ⚠️    │    ⚠️    │  Done   │
│ Structured  │    ✅    │    ✅    │    ✅    │  Done   │
└─────────────┴──────────┴──────────┴──────────┴─────────┘

Legend:
✅ Fully Supported
⚠️ Partially Supported
❌ Not Applicable
```

---

## 🚀 Deployment Checklist

```
┌─────────────────────────────────────────────────────────┐
│                 DEPLOYMENT CHECKLIST                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Prerequisites                                           │
│  ☐ Node.js installed                                    │
│  ☐ Expo CLI installed                                   │
│  ☐ Dependencies installed                               │
│  ☐ expo-print package added                             │
│                                                          │
│  Development                                             │
│  ☐ All services created                                 │
│  ☐ Settings screen updated                              │
│  ☐ Locales updated                                      │
│  ☐ Package.json updated                                 │
│                                                          │
│  Testing                                                 │
│  ☐ JSON export works                                    │
│  ☐ JSON import works                                    │
│  ☐ Excel export works                                   │
│  ☐ Excel import works                                   │
│  ☐ PDF export works                                     │
│  ☐ All sheets correct                                   │
│  ☐ PDF displays correctly                               │
│  ☐ Loading states work                                  │
│  ☐ Error handling works                                 │
│  ☐ Success messages work                                │
│                                                          │
│  Platform Testing                                        │
│  ☐ iOS tested                                           │
│  ☐ Android tested                                       │
│  ☐ Permissions granted                                  │
│  ☐ File sharing works                                   │
│  ☐ File picking works                                   │
│                                                          │
│  Documentation                                           │
│  ☐ README updated                                       │
│  ☐ Guides created                                       │
│  ☐ Installation docs created                            │
│  ☐ API docs created                                     │
│                                                          │
│  Production                                              │
│  ☐ Build successful                                     │
│  ☐ No console errors                                    │
│  ☐ Performance acceptable                               │
│  ☐ Memory usage acceptable                              │
│  ☐ File sizes acceptable                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

**Status**: ✅ Complete and Production Ready  
**Version**: 1.0.0  
**Architecture**: Modular, Scalable, Maintainable
