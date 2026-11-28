// ── Typography & Spacing (theme-independent) ─────────────────────────────────

const BASE_TYPOGRAPHY = {
  sizes: {
    micro: 9,
    caption: 10,
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   20,
    xl:   24,
    xxl:  30,
    hero: 38,
    display: 48,
  },
  weights: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
    heavy:    '800',
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
export const Layout = { contentWidth: 760, navigationWidth: 500, touchTarget: 44 };

// Neutral surfaces keep the ledger readable. Muted accents distinguish actions and cash sources.
export const LightColors = {
  bg: '#F4F7FA',
  bgCard: '#FFFFFF',
  bgElevated: '#E9EFF5',
  bgInput: '#F0F5F9',

  primary: '#315F86',
  primaryDim: '#DFEBF6',
  primarySoft: '#A9C4DA',
  primaryDark: '#284D6C',
  skyBg: '#E5F0F8',
  sandBg: '#F6EDDF',
  income: '#32664F',
  incomeSoft: '#5B8870',
  incomeLight: '#32664F20',
  incomeBg: '#E8F2EB',
  expense: '#9C454D',
  expenseSoft: '#BD6A70',
  expenseLight: '#9C454D1C',
  expenseBg: '#F8EBEB',
  online: '#64557D',
  onlineSoft: '#8E7CA5',
  onlineLight: '#64557D1C',
  onlineBg: '#F0ECF5',

  textPrimary: '#202C39',
  textSecondary: '#435769',
  textMuted: '#52677B',
  textOnPrimary: '#FFFFFF',
  textOnGradient: '#FFFFFF',
  incomeOnGradient: '#D5F0DB',
  expenseOnGradient: '#F9DBDC',
  onlineOnGradient: '#F0E2F6',
  gradientMuted: '#DCEAF4',
  gradientSubtle: '#FFFFFF22',
  gradientBorder: '#FFFFFF44',
  headerForeground: '#FFFFFF',
  headerMuted: '#DCEAF4',
  headerSubtle: '#FFFFFF24',
  navAccentEnd: '#284D6C',
  subtle: '#E9EFF5',

  border: '#D9E3EC',
  divider: '#E8EFF5',
  shadow: '#243C52',
  overlay: 'rgba(20,31,44,0.46)',
  transparent: 'transparent',

  success: '#32664F',
  warning: '#895D34',
  danger: '#9C454D',
  iconHome: '#315F86',
  iconExpense: '#895D34',
  iconTask: '#625D83',
  iconBalance: '#315F86',
  iconPlaces: '#456D87',
  iconNotes: '#875667',
  iconStats: '#625D83',
  iconSettings: '#526779',

  brandLinkedIn: '#0A66C2',
  brandGmail: '#EA4335',
  rankColors: ['#9F772E', '#616C73', '#885840'],
  accents: ['#315F86', '#456D87', '#875667', '#895D34', '#625D83', '#32664F', '#925849', '#52708A'],
  gradients: {
    primary: ['#315F86', '#2A5274'],
    balance: ['#224A72', '#2D6482'],
    income: ['#32664F', '#3F775C'],
    expense: ['#87404A', '#9C454D'],
    online: ['#59496F', '#64557D'],
    card: ['#FFFFFF', '#EDF3F8'],
    header: ['#25465F', '#345B77'],
  },
  isDark: false,
};

export const DarkColors = {
  bg: '#151D27',
  bgCard: '#1F2B38',
  bgElevated: '#283645',
  bgInput: '#304052',

  primary: '#90ADCA',
  primaryDim: '#283C50',
  primarySoft: '#A8C1D8',
  primaryDark: '#7899B7',
  skyBg: '#23384A',
  sandBg: '#3D352B',
  income: '#ABD0B1',
  incomeSoft: '#C1DDC4',
  incomeLight: '#ABD0B121',
  incomeBg: '#303F34',
  expense: '#DCADB0',
  expenseSoft: '#E8BCBE',
  expenseLight: '#DCADB021',
  expenseBg: '#423233',
  online: '#C4B8D5',
  onlineSoft: '#D2C7E0',
  onlineLight: '#C4B8D521',
  onlineBg: '#3B3643',

  textPrimary: '#EEF4FA',
  textSecondary: '#C1CFDD',
  textMuted: '#A6B9CC',
  textOnPrimary: '#111D29',
  textOnGradient: '#F2F7FC',
  incomeOnGradient: '#D6EDDB',
  expenseOnGradient: '#F2D2D4',
  onlineOnGradient: '#E8DBF0',
  gradientMuted: '#D8E7F3',
  gradientSubtle: '#FFFFFF1A',
  gradientBorder: '#FFFFFF42',
  headerForeground: '#F2F7FC',
  headerMuted: '#D8E7F3',
  headerSubtle: '#FFFFFF1A',
  navAccentEnd: '#AFCBE1',
  subtle: '#283645',

  border: '#3C4E60',
  divider: '#304051',
  shadow: '#0D1520',
  overlay: 'rgba(12,20,31,0.68)',
  transparent: 'transparent',

  success: '#ABD0B1',
  warning: '#D0B292',
  danger: '#DCADB0',
  iconHome: '#AFCBE1',
  iconExpense: '#CEB093',
  iconTask: '#C0B9D2',
  iconBalance: '#AFCBE1',
  iconPlaces: '#ADC5DA',
  iconNotes: '#D0ABB8',
  iconStats: '#C0B9D2',
  iconSettings: '#AFBECE',

  brandLinkedIn: '#0A66C2',
  brandGmail: '#EA4335',
  rankColors: ['#C9AB74', '#B1BDC4', '#C59983'],
  accents: ['#AFCBE1', '#ADC5DA', '#D0ABB8', '#CEB093', '#C0B9D2', '#ABD0B1', '#D3A89C', '#A6C1DA'],
  gradients: {
    primary: ['#90ADCA', '#7F9DBC'],
    balance: ['#203850', '#2C4D67'],
    income: ['#ABCDB2', '#9EBCA3'],
    expense: ['#DEADB0', '#D0A0A5'],
    online: ['#C4B8D5', '#B8ACC9'],
    card: ['#1F2B38', '#253344'],
    header: ['#293D50', '#344D64'],
  },
  isDark: true,
};

export const makeShadow = C => ({
  sm: {
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },
  primary: {
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 3,
  },
});
