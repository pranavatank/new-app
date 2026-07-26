import React, { createContext, useContext, useState, useEffect } from 'react';
import { LightColors, DarkColors } from '../constants/theme';
import { setAppLanguage, initialLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { loadPrefs, savePrefs } from '../services/prefs';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [isDark,   setIsDark]   = useState(false);
  const [language, setLanguage] = useState(initialLanguage);
  const [scale,    setScale]    = useState(1);
  const [showMileage, setShowMileage] = useState(false);
  const [ready,    setReady]    = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const prefs = await loadPrefs();

        if (prefs.isDark !== undefined) {
          setIsDark(prefs.isDark);
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

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await savePrefs({ isDark: next });
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
    <ThemeContext.Provider value={{ C, isDark, toggleTheme, language, changeLanguage, scale, changeScale, showMileage, toggleMileage, ready }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
