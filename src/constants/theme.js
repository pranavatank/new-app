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
  bg:          '#F1F4FF',  // Soft blue-white
  bgCard:      '#FFFFFF',
  bgElevated:  '#E9EEFF',  // Light blue tint
  bgInput:     '#F5F7FF',

  // Brand - Vibrant purple-blue gradient
  primary:     '#5B5EF0',   // Vivid indigo
  primaryDim:  '#5B5EF01F',
  primarySoft: '#8B8EF7',   // Lighter indigo
  primaryDark: '#4338CA',   // Deep indigo

  // Semantic - More saturated colors
  income:       '#0EA872',   // Emerald green
  incomeSoft:   '#34D399',
  incomeLight:  '#0EA87220',
  incomeBg:     '#E7FBF3',   // Mint background
  expense:      '#EF4444',   // Bright red
  expenseSoft:  '#F87171',
  expenseLight: '#EF444420',
  expenseBg:    '#FEF1F1',
  online:       '#8B5CF6',   // Rich purple
  onlineSoft:   '#A78BFA',
  onlineLight:  '#8B5CF620',
  onlineBg:     '#F5F2FF',

  // Text - Higher contrast
  textPrimary:   '#1B1836',  // Deep indigo
  textSecondary: '#5B5A82',  // Medium purple-gray
  textMuted:     '#93949E',  // Slate gray
  textOnPrimary: '#FFFFFF',
  textOnGradient: '#FFFFFF',
  incomeOnGradient: '#A7F3D0',
  expenseOnGradient: '#FCA5A5',
  onlineOnGradient: '#C4B5FD',
  gradientMuted: '#E9EEFF',
  gradientSubtle: '#FFFFFF26',
  gradientBorder: '#FFFFFF4D',
  subtle: '#E9EEFF',

  // UI chrome - Colorful borders
  border:      '#E2E6FB',    // Light indigo
  divider:     '#EEF1FE',
  shadow:      '#5B5EF0',
  overlay:     'rgba(27,24,54,0.5)',

  // Status
  success: '#0EA872',
  warning: '#F59E0B',  // Amber
  danger:  '#EF4444',

  // Section accents - Vibrant colors, one per tab/section
  iconHome:    '#5B5EF0',   // Indigo
  iconExpense: '#F97316',   // Orange
  iconTask:    '#F97316',   // Bright orange
  iconBalance: '#5B5EF0',   // Indigo
  iconPlaces:  '#0D9488',   // Teal
  iconNotes:   '#DB2777',   // Pink
  iconStats:   '#7C3AED',   // Violet
  iconSettings:'#475569',   // Slate

  // Extra category-chip accent set (cycled for chips/analytics bars)
  accents: ['#5B5EF0', '#0D9488', '#DB2777', '#F97316', '#7C3AED', '#0EA872', '#EA580C', '#0891B2'],

  gradients: {
    primary: ['#4338CA', '#6366F1'],
    income:  ['#0EA872', '#34D399'],
    expense: ['#DC2626', '#F87171'],
    online:  ['#7C3AED', '#A78BFA'],
    card:    ['#FFFFFF', '#F1F4FF'],
    header:  ['#4F46E5', '#6366F1', '#818CF8'],
  },

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
  incomeSoft:   '#6EE7B7',
  incomeLight:  '#34D39920',
  incomeBg:     '#0B3B2C',   // Dark green
  expense:      '#FB7185',   // Neon pink-red
  expenseSoft:  '#FDA4AF',
  expenseLight: '#FB718520',
  expenseBg:    '#3F1728',   // Dark red
  online:       '#A78BFA',   // Neon purple
  onlineSoft:   '#C4B5FD',
  onlineLight:  '#A78BFA20',
  onlineBg:     '#2E1065',   // Dark purple

  // Text - High contrast neon
  textPrimary:   '#F3F8FF',  // Bright white-cyan
  textSecondary: '#A3ACC2',  // Light gray
  textMuted:     '#5B6479',  // Medium gray
  textOnPrimary: '#0F0A1F',  // Dark background
  textOnGradient: '#0F0A1F',
  incomeOnGradient: '#0F0A1F',
  expenseOnGradient: '#0F0A1F',
  onlineOnGradient: '#0F0A1F',
  gradientMuted: '#251D3D',
  gradientSubtle: '#0F0A1F26',
  gradientBorder: '#0F0A1F4D',
  subtle: '#251D3D',

  // UI chrome - Glowing borders
  border:      '#332C56',    // Purple-gray
  divider:     '#251D3D',
  shadow:      '#000000',
  overlay:     'rgba(15,10,31,0.85)',

  // Status
  success: '#34D399',
  warning: '#FBBF24',  // Bright yellow
  danger:  '#FB7185',

  // Section accents - Neon rainbow
  iconHome:    '#22D3EE',
  iconExpense: '#FB923C',
  iconTask:    '#FB923C',   // Neon orange
  iconBalance: '#22D3EE',   // Cyan
  iconPlaces:  '#2DD4BF',   // Green
  iconNotes:   '#F472B6',   // Pink
  iconStats:   '#C084FC',   // Violet
  iconSettings:'#94A3B8',   // Slate

  accents: ['#22D3EE', '#2DD4BF', '#F472B6', '#FB923C', '#C084FC', '#34D399', '#FBBF24', '#818CF8'],

  gradients: {
    primary: ['#06B6D4', '#22D3EE'],
    income:  ['#059669', '#34D399'],
    expense: ['#E11D48', '#FB7185'],
    online:  ['#7C3AED', '#A78BFA'],
    card:    ['#1A1333', '#251D3D'],
    header:  ['#1A1333', '#2A2147', '#332C56'],
  },

  isDark: true,
};

// ── Shadow factory ────────────────────────────────────────────────────────────

export const makeShadow = (C) => ({
  sm: {
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: C.isDark ? 0.6 : 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: C.isDark ? 0.7 : 0.13,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: C.isDark ? 0.75 : 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
  primary: {
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: C.isDark ? 0.5 : 0.32,
    shadowRadius: 14,
    elevation: 8,
  },
});
