// Simple key-value preferences persisted to the app's document directory.
// Uses expo-file-system (already a project dependency) — no new packages needed.

import * as FileSystem from 'expo-file-system';

const PREFS_FILE = FileSystem.documentDirectory + 'hisab_prefs.json';

let _cache = null; // in-memory cache to avoid repeated disk reads

export const loadPrefs = async () => {
  if (_cache) return _cache;
  try {
    const str = await FileSystem.readAsStringAsync(PREFS_FILE);
    _cache = JSON.parse(str);
    return _cache;
  } catch {
    _cache = {};
    return _cache;
  }
};

export const savePrefs = async (updates) => {
  try {
    const existing = await loadPrefs();
    const merged   = { ...existing, ...updates };
    await FileSystem.writeAsStringAsync(PREFS_FILE, JSON.stringify(merged));
    _cache = merged;
  } catch (e) {
    console.warn('savePrefs failed:', e);
  }
};

export const getPref = async (key, defaultVal = null) => {
  const prefs = await loadPrefs();
  return prefs[key] !== undefined ? prefs[key] : defaultVal;
};
