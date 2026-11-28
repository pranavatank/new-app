import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, View, useColorScheme, useWindowDimensions } from 'react-native';
import { LightColors, DarkColors } from '../constants/theme';
import { setAppLanguage, initialLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { loadPrefs, savePrefs } from '../services/prefs';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system');
  const isDark = themeMode === 'system' ? systemTheme === 'dark' : themeMode === 'dark';
  const { width, height } = useWindowDimensions();
  const [wipe, setWipe] = useState(null);
  const expansion = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const switching = useRef(false);
  const [language, setLanguage] = useState(initialLanguage);
  const [scale,    setScale]    = useState(1);
  const [showMileage, setShowMileage] = useState(false);
  const [ready,    setReady]    = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const prefs = await loadPrefs();

        if (['system', 'light', 'dark'].includes(prefs.themeMode)) {
          setThemeMode(prefs.themeMode);
        } else if (typeof prefs.isDark === 'boolean') {
          setThemeMode(prefs.isDark ? 'dark' : 'light');
        }

        if (prefs.language && SUPPORTED_LANGUAGES[prefs.language]) {
          setLanguage(prefs.language);
          setAppLanguage(prefs.language);
        }

        if (prefs.scale !== undefined) {
          setScale(prefs.scale);
        }

        if (prefs.showMileage !== undefined) {
          setShowMileage(prefs.showMileage);
        }
      } catch { /* use defaults */ }
      finally {
        setReady(true);
      }
    })();
  }, []);

  const changeThemeMode = async mode => {
    setThemeMode(mode);
    await savePrefs({ themeMode: mode });
  };

  const toggleTheme = async origin => {
    if (switching.current) return;
    switching.current = true;
    const next = isDark ? 'light' : 'dark';
    const reduced = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    if (!origin || reduced) {
      switching.current = false;
      await changeThemeMode(next);
      return;
    }
    const diameter = 2 * Math.hypot(width, height);
    const useNativeDriver = Platform.OS !== 'web';
    expansion.setValue(0);
    fade.setValue(1);
    setWipe({ ...origin, diameter, color: next === 'dark' ? DarkColors.bg : LightColors.bg });
    Animated.timing(expansion, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver }).start(({ finished }) => {
      if (!finished) { setWipe(null); switching.current = false; return; }
      changeThemeMode(next);
      globalThis.requestAnimationFrame(() => Animated.timing(fade, { toValue: 0, duration: 170, useNativeDriver }).start(() => {
        setWipe(null);
        switching.current = false;
      }));
    });
  };

  const changeLanguage = async (langCode) => {
    if (!SUPPORTED_LANGUAGES[langCode]) return;
    setLanguage(langCode);
    setAppLanguage(langCode);
    await savePrefs({ language: langCode });
  };

  const changeScale = async (newScale) => {
    setScale(newScale);
    await savePrefs({ scale: newScale });
  };

  const toggleMileage = async () => {
    const next = !showMileage;
    setShowMileage(next);
    await savePrefs({ showMileage: next });
  };

  const C = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ C, isDark, themeMode, changeThemeMode, toggleTheme, language, changeLanguage, scale, changeScale, showMileage, toggleMileage, ready }}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {children}
        {wipe && <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ position: 'absolute', zIndex: 10, left: wipe.x - wipe.diameter / 2, top: wipe.y - wipe.diameter / 2,
            width: wipe.diameter, height: wipe.diameter, borderRadius: wipe.diameter / 2, backgroundColor: wipe.color,
            opacity: fade, transform: [{ scale: expansion }] }} />}
      </View>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
