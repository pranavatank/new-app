// ── Typography & Spacing (theme-independent) ─────────────────────────────────

const BASE_TYPOGRAPHY = {
  sizes: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   20,
    xl:   24,
    xxl:  30,
    hero: 38,
  },
  weights: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
    black:    '900',
  },
};

const BASE_SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
};

const BASE_RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 999,
};

// Scale helper
export const scaleTheme = (scale = 1) => ({
  Typography: {
    sizes: Object.fromEntries(
      Object.entries(BASE_TYPOGRAPHY.sizes).map(([k, v]) => [k, Math.round(v * scale)])
    ),
    weights: BASE_TYPOGRAPHY.weights,
  },
  Spacing: Object.fromEntries(
    Object.entries(BASE_SPACING).map(([k, v]) => [k, Math.round(v * scale)])
  ),
  Radius: Object.fromEntries(
    Object.entries(BASE_RADIUS).map(([k, v]) => [k, k === 'full' ? 999 : Math.round(v * scale)])
  ),
});

// Default exports (scale = 1) - for StyleSheet.create at module level
export const Typography = BASE_TYPOGRAPHY;
export const Spacing = BASE_SPACING;
export const Radius = BASE_RADIUS;

// ── Light Theme ───────────────────────────────────────────────────────────────
// Vibrant gradient canvas · Purple-blue primary · Vivid semantics

export const LightColors = {
  // Backgrounds - More colorful with subtle gradients
  bg:          '#F0F4FF',  // Soft blue-white
  bgCard:      '#FFFFFF',
  bgElevated:  '#E8EFFF',  // Light blue tint
  bgInput:     '#F5F8FF',

  // Brand - Vibrant purple-blue gradient
  primary:     '#6366F1',   // Vivid indigo
  primaryDim:  '#6366F120',
  primarySoft: '#818CF8',   // Lighter indigo
  primaryDark: '#4F46E5',   // Deep indigo

  // Semantic - More saturated colors
  income:       '#10B981',   // Emerald green
  incomeLight:  '#10B98120',
  incomeBg:     '#ECFDF5',   // Mint background
  expense:      '#EF4444',   // Bright red
  expenseLight: '#EF444420',
  expenseBg:    '#FEF2F2',
  online:       '#8B5CF6',   // Rich purple
  onlineLight:  '#8B5CF620',
  onlineBg:     '#F5F3FF',

  // Text - Higher contrast
  textPrimary:   '#1E1B4B',  // Deep indigo
  textSecondary: '#4C4B7F',  // Medium purple-gray
  textMuted:     '#94A3B8',  // Slate gray
  textOnPrimary: '#FFFFFF',

  // UI chrome - Colorful borders
  border:      '#E0E7FF',    // Light indigo
  divider:     '#EEF2FF',
  shadow:      '#6366F1',
  overlay:     'rgba(30,27,75,0.5)',

  // Status
  success: '#10B981',
  warning: '#F59E0B',  // Amber
  danger:  '#EF4444',

  // Section accents - Vibrant colors
  iconTask:    '#F97316',   // Bright orange
  iconBalance: '#6366F1',   // Indigo
  iconPlaces:  '#14B8A6',   // Teal
  iconNotes:   '#EC4899',   // Pink

  isDark: false,
};

// ── Dark Theme ────────────────────────────────────────────────────────────────
// Deep purple-black · Neon accents · Cyberpunk vibes

export const DarkColors = {
  // Backgrounds - Rich dark purples
  bg:          '#0F0A1F',   // Deep purple-black
  bgCard:      '#1A1333',   // Dark purple
  bgElevated:  '#251D3D',   // Medium purple
  bgInput:     '#2A2147',   // Purple-gray

  // Brand - Neon cyan-blue
  primary:     '#22D3EE',   // Bright cyan
  primaryDim:  '#22D3EE25',
  primarySoft: '#67E8F9',   // Light cyan
  primaryDark: '#06B6D4',   // Deep cyan

  // Semantic - Neon colors
  income:       '#34D399',   // Neon green
  incomeLight:  '#34D39920',
  incomeBg:     '#064E3B',   // Dark green
  expense:      '#FB7185',   // Neon pink-red
  expenseLight: '#FB718520',
  expenseBg:    '#3F1728',   // Dark red
  online:       '#A78BFA',   // Neon purple
  onlineLight:  '#A78BFA20',
  onlineBg:     '#2E1065',   // Dark purple

  // Text - High contrast neon
  textPrimary:   '#F0F9FF',  // Bright white-cyan
  textSecondary: '#94A3B8',  // Light gray
  textMuted:     '#475569',  // Medium gray
  textOnPrimary: '#0F0A1F',  // Dark background

  // UI chrome - Glowing borders
  border:      '#312E4F',    // Purple-gray
  divider:     '#251D3D',
  shadow:      '#000000',
  overlay:     'rgba(15,10,31,0.85)',

  // Status
  success: '#34D399',
  warning: '#FBBF24',  // Bright yellow
  danger:  '#FB7185',

  // Section accents - Neon rainbow
  iconTask:    '#FB923C',   // Neon orange
  iconBalance: '#22D3EE',   // Cyan
  iconPlaces:  '#34D399',   // Green
  iconNotes:   '#F472B6',   // Pink

  isDark: true,
};

// ── Shadow factory ────────────────────────────────────────────────────────────

export const makeShadow = (C) => ({
  sm: {
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: C.isDark ? 0.6 : 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: C.isDark ? 0.7 : 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  primary: {
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: C.isDark ? 0.5 : 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
});
