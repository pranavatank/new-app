import { useTheme } from '../../store/ThemeContext';

export default function useLedgerTheme() {
  const theme = useTheme();
  if (theme.C.isDark) return theme;
  return {
    ...theme,
    C: {
      ...theme.C,
      bg: '#F7F3EA', bgCard: '#FFFDF8', bgElevated: '#EFE9DC', bgInput: '#FFFDF8',
      primary: '#285943', primaryDim: '#2859431A', primarySoft: '#527662', primaryDark: '#1F4936',
      income: '#3F7A5C', incomeBg: '#E9F2E8', incomeLight: '#3F7A5C20',
      expense: '#973C30', expenseBg: '#F8EAE2', expenseLight: '#973C3020',
      online: '#786A91', onlineBg: '#F0ECF5',
      textPrimary: '#2E332E', textSecondary: '#566052', textMuted: '#566052', textOnPrimary: '#FFFFFF',
      border: '#DED8CC', divider: '#ECE6DB', shadow: '#635B4D', overlay: 'rgba(39,39,34,0.48)',
      iconHome: '#547264', iconExpense: '#B85F43', iconNotes: '#806B86',
      gradients: { ...theme.C.gradients, primary: ['#285943', '#527662'], income: ['#3F7A5C', '#77A17E'], expense: ['#973C30', '#BC6757'] },
    },
  };
}
