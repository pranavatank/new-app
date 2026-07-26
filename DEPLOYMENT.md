# Hisab - Deployment Guide

## ✅ Completed Features

### Phase 5: Excel Export/Import
- ✅ Multi-sheet Excel export (Days, Expenses, Tasks, Notes, Places, Categories)
- ✅ Excel import with duplicate detection
- ✅ File sharing via expo-sharing
- ✅ Document picker for import
- ✅ UI buttons in Settings screen

### Phase 6: Polish & Production
- ✅ expo-splash-screen integration (holds until DB ready)
- ✅ expo-status-bar with proper safe area handling
- ✅ Pull-to-refresh on Analytics screen
- ✅ Quick deposit FAB button on Home screen
- ✅ Task completion animation (scale effect)
- ✅ Long-press on expense category to clear
- ✅ app.json with app name and configuration
- ✅ eas.json for build configuration

## 🚀 Build Instructions

### Prerequisites
```bash
npm install -g eas-cli
eas login
```

### Development Build
```bash
npm start
# or
expo start
```

### APK Build (Preview)
```bash
eas build --platform android --profile preview
```

This will:
1. Build an APK (not AAB)
2. Can be installed directly on Android devices
3. No Google Play Store required
4. Download link provided after build completes

### Production Build
```bash
# Android AAB for Play Store
eas build --platform android --profile production

# iOS for App Store
eas build --platform ios --profile production
```

## 📱 App Configuration

### App Details
- **Name**: Hisab
- **Package**: com.hisab.app
- **Version**: 1.0.0
- **Bundle ID (iOS)**: com.hisab.app

### Required Assets
Place in `assets/` directory:
- `icon.png` (1024x1024) - App icon
- `splash.png` (1284x2778) - Splash screen
- `adaptive-icon.png` (1024x1024) - Android adaptive icon
- `favicon.png` (48x48) - Web favicon

**Quick Asset Generation:**
```bash
# Use any online tool or create simple images with:
# - Rupee symbol (₹) on #5B5FEF background
# - Or use placeholder images for testing
```

## 🎨 Features Overview

### Core Features
1. **Daily Cash Tracking**
   - Opening/closing balance
   - Cash deposits
   - Cash vs Online expenses
   - Category-wise breakdown

2. **Expense Management**
   - 10+ default categories (customizable)
   - Quick stepper (+/- buttons)
   - Tap for exact amount entry
   - Long-press to clear category
   - Cash/Online payment types

3. **Tasks**
   - Start date tracking
   - Completion animation
   - Visible until completed
   - History view

4. **Places**
   - Visited places per day
   - Favorites system
   - Quick selection

5. **Notes**
   - Daily memory entries
   - Mood tracking
   - Timeline view

6. **Analytics**
   - Monthly overview
   - Category breakdown
   - Daily spending trend chart
   - Top spending days
   - Savings calculation
   - Pull-to-refresh

7. **Data Management**
   - Excel export (all tables)
   - Excel import (with duplicate detection)
   - SQLite local storage
   - No internet required

8. **Security**
   - Biometric authentication (fingerprint)
   - Local data only
   - No cloud sync

9. **UI/UX**
   - Dark/Light theme toggle
   - Smooth animations
   - Pull-to-refresh
   - Quick deposit FAB
   - Safe area handling
   - Splash screen

## 📦 Dependencies

```json
{
  "expo": "~51.0.0",
  "expo-file-system": "~17.0.1",
  "expo-local-authentication": "~14.0.1",
  "expo-sharing": "~12.0.1",
  "expo-sqlite": "~14.0.3",
  "expo-status-bar": "~1.12.1",
  "expo-splash-screen": "latest",
  "expo-document-picker": "latest",
  "react-native": "0.74.5",
  "xlsx": "latest",
  "zustand": "^4.5.7"
}
```

## 🔧 Troubleshooting

### Build Issues
1. **Missing assets**: Add placeholder images to `assets/` folder
2. **EAS not configured**: Run `eas build:configure`
3. **Android permissions**: Already configured in app.json

### Runtime Issues
1. **DB errors**: Check schema.js initialization
2. **Biometric not working**: Test on real device (not emulator)
3. **Excel export fails**: Check file system permissions

## 📝 Testing Checklist

- [ ] Install APK on Android device
- [ ] Test biometric unlock
- [ ] Add deposit and expenses
- [ ] Create tasks and complete them
- [ ] Add places and notes
- [ ] View analytics for current month
- [ ] Export data to Excel
- [ ] Import data from Excel
- [ ] Toggle dark/light theme
- [ ] Test quick deposit FAB
- [ ] Long-press category to clear
- [ ] Pull-to-refresh analytics

## 🎯 Next Steps (Optional Enhancements)

1. **Cloud Backup**: Firebase/Supabase integration
2. **Multi-user**: Family member accounts
3. **Budgets**: Monthly budget limits per category
4. **Recurring**: Auto-recurring expenses
5. **Charts**: More visualization options
6. **Widgets**: Home screen widgets
7. **Reminders**: Daily expense reminders
8. **Reports**: PDF report generation

## 📄 License

Private project - All rights reserved

---

**Built with**: React Native + Expo + SQLite + SheetJS
**Target**: Android (iOS compatible)
**Storage**: Local SQLite database
**Backup**: Excel export/import
