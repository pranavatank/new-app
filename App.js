import "react-native-gesture-handler";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as LocalAuthentication from "expo-local-authentication";
import * as SplashScreen from "expo-splash-screen";
import { Ionicons } from "@expo/vector-icons";
import AppTabBar from "./src/components/AppTabBar";

import { ThemeProvider, useTheme } from "./src/store/ThemeContext";
import { initializeDatabase } from "./src/db/schema";
import { processRecurringExpenses } from "./src/db/queries";
import useAppStore from "./src/store/useAppStore";
import { scaleTheme, makeShadow } from "./src/constants/theme";
import "./src/i18n"; // must import before any useTranslation usage

import ExpenseScreen from "./src/screens/Expense";
import ExpenseItemsScreen from "./src/screens/ExpenseItems";
import TasksScreen from "./src/screens/Tasks";
import PlacesScreen from "./src/screens/Places";
import NotesScreen from "./src/screens/Notes";
import SettingsScreen from "./src/screens/Settings";
import AnalyticsScreen from "./src/screens/Analytics";
import VehicleScreen from "./src/screens/Vehicle";
import SearchScreen from "./src/screens/Search";
import RecurringScreen from "./src/screens/Recurring";
import DailyBookScreen from "./src/screens/DailyBook";
import MonthlyLedgerScreen from "./src/screens/MonthlyLedger";
import FamilyToolsScreen from "./src/screens/FamilyTools";
import PurchasesScreen from "./src/screens/Purchases";

SplashScreen.preventAutoHideAsync();
const Tab = createBottomTabNavigator();

// Check if biometric is available (not on web)
const isBiometricAvailable = Platform.OS !== "web";

function BiometricGate({ onUnlocked }) {
  const { C, language, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);
  const ls = lsStyles(Typography, Spacing, Radius);
  const [checking, setChecking] = useState(true);
  const [failed, setFailed] = useState(false);

  // Language-aware labels without useTranslation hook dependency
  const L = {
    unlockPrompt: language === "gu" ? "રોજનીશી અનલૉક કરો" : "Unlock Rojnishi",
    familyLedger: language === "gu" ? "પારિવારિક હિસાબ" : "FAMILY LEDGER",
    authFailed: language === "gu" ? "ઓળખ નિષ્ફળ ગઈ" : "Authentication failed",
    touchFingerprint:
      language === "gu"
        ? "અનલૉક કરવા ફિંગરપ્રિન્ટ સ્પર્શ કરો"
        : "Touch fingerprint to unlock",
    tryAgain: language === "gu" ? "ફરી પ્રયાસ કરો" : "Try Again",
    unlock:
      language === "gu"
        ? "ફિંગરપ્રિન્ટથી અનલૉક કરો"
        : "Unlock with Fingerprint",
  };

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    // Skip biometric on web
    if (!isBiometricAvailable) {
      onUnlocked();
      setChecking(false);
      return;
    }

    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (compatible && enrolled) authenticate();
      else onUnlocked();
    } catch {
      onUnlocked();
    } finally {
      setChecking(false);
    }
  };

  const authenticate = async () => {
    setFailed(false);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: L.unlockPrompt,
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });
      if (result.success) onUnlocked();
      else setFailed(true);
    } catch {
      setFailed(true);
    }
  };

  if (checking) {
    return (
      <View style={[ls.root, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[ls.root, { backgroundColor: C.bg }]}>
      <StatusBar
        barStyle={C.isDark ? "light-content" : "dark-content"}
        backgroundColor={C.bg}
      />

      {/* Logo */}
      <View style={ls.top}>
        <Image
          source={require("./assets/logo.png")}
          style={ls.logoImage}
          resizeMode="contain"
        />
        <Text style={[ls.appName, { color: C.textPrimary }]}>Rojnishi</Text>
        <Text style={[ls.tagline, { color: C.textSecondary }]}>
          {L.familyLedger}
        </Text>
      </View>

      {/* Lock icon */}
      <View style={ls.mid}>
        <View
          style={[
            ls.lockRing,
            {
              borderColor: failed ? C.expense + "60" : C.primary + "50",
              shadowColor: failed ? C.expense : C.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 15,
              elevation: 8,
            },
          ]}
        >
          <View
            style={[
              ls.lockBox,
              {
                backgroundColor: failed ? C.expenseBg : C.bgElevated,
                borderColor: failed ? C.expense : C.primary,
              },
            ]}
          >
            <Ionicons
              name={failed ? "lock-closed" : "finger-print"}
              size={44}
              color={failed ? C.expense : C.primary}
            />
          </View>
        </View>
        <Text style={[ls.msg, { color: C.textSecondary }]}>
          {failed ? L.authFailed : L.touchFingerprint}
        </Text>
      </View>

      {/* Unlock button */}
      <TouchableOpacity
        style={[ls.btn, { backgroundColor: C.primary }, Shadow.primary]}
        onPress={authenticate}
        activeOpacity={0.85}
      >
        <Text style={[ls.btnTxt, { color: C.textOnPrimary }]}>{failed ? L.tryAgain : L.unlock}</Text>
      </TouchableOpacity>
    </View>
  );
}
const lsStyles = (Typography, Spacing, Radius) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: "center",
      justifyContent: "space-evenly",
      paddingHorizontal: Spacing.xxl,
      paddingVertical: 40,
    },
    top: { alignItems: "center", gap: Spacing.md },
    logoImage: { width: 160, height: 160 },
    appName: {
      fontSize: Typography.sizes.display,
      fontWeight: Typography.weights.black,
      letterSpacing: -2,
      marginTop: 4,
    },
    tagline: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.bold,
      letterSpacing: 5,
      opacity: 0.8,
    },
    mid: { alignItems: "center", gap: Spacing.xl },
    lockRing: {
      width: 130,
      height: 130,
      borderRadius: 65,
      borderWidth: 3,
      alignItems: "center",
      justifyContent: "center",
    },
    lockBox: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
    },
    msg: {
      fontSize: Typography.sizes.md,
      textAlign: "center",
      lineHeight: 24,
      maxWidth: 280,
      fontWeight: Typography.weights.medium,
    },
    btn: {
      width: "100%",
      paddingVertical: Spacing.xl,
      borderRadius: Radius.full,
      alignItems: "center",
    },
    btnTxt: {
      fontSize: Typography.sizes.lg,
      fontWeight: Typography.weights.black,
      letterSpacing: 0.8,
    },
  });

// ─── App Inner ────────────────────────────────────────────────────────────────
function AppInner() {
  const { C, ready: themeReady } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = C.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: C.primary,
        background: C.bg,
        card: C.bgCard,
        text: C.textPrimary,
        border: C.border,
        notification: C.expense,
      },
    };
  }, [C]);
  const [unlocked, setUnlocked] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const { setDbReady, refreshDayData } = useAppStore();

  useEffect(() => {
    (async () => {
      try {
        await initializeDatabase();
        setDbReady(true);
        try {
          processRecurringExpenses();
        } catch (e) {
          console.warn("Recurring processing failed:", e?.message || e);
        }
        refreshDayData();
      } catch (e) {
        console.error("DB init error:", e);
        Alert.alert("Startup Error", String(e?.message || e));
      } finally {
        setAppReady(true);
      }
    })();
  }, []);

  const onLayout = useCallback(async () => {
    if (appReady && themeReady) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady, themeReady]);

  if (!appReady || !themeReady) return null;

  if (!unlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }} onLayout={onLayout}>
        <BiometricGate onUnlocked={() => setUnlocked(true)} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} onLayout={onLayout}>
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          initialRouteName="DailyBook"
          backBehavior="history"
          tabBar={(props) => <AppTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="DailyBook" component={DailyBookScreen} />
          <Tab.Screen name="MonthlyLedger" component={MonthlyLedgerScreen} />
          <Tab.Screen name="FamilyTools" component={FamilyToolsScreen} />
          <Tab.Screen name="Purchases" component={PurchasesScreen} />
          <Tab.Screen name="Expense" component={ExpenseScreen} />
          <Tab.Screen name="Tasks" component={TasksScreen} />
          <Tab.Screen name="Places" component={PlacesScreen} />
          <Tab.Screen name="Analytics" component={AnalyticsScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
          <Tab.Screen name="Notes" component={NotesScreen} />
          <Tab.Screen name="ExpenseItems" component={ExpenseItemsScreen} />
          <Tab.Screen name="Vehicle" component={VehicleScreen} />
          <Tab.Screen name="Search" component={SearchScreen} />
          <Tab.Screen name="Recurring" component={RecurringScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
