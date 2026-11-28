import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import Card from '../common/Card';
import IconBadge from '../common/IconBadge';
import { money } from './LedgerEntryRow';

export default function CashBalanceCard({ wallet, locker, spent, month = false, unavailable, style }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const { t, i18n } = useTranslation();
  const amount = value => unavailable ? '—' : value == null ? t('ledger.unknown') : money(value, i18n.language);

  return <Card gradient={C.gradients.balance} padding={month ? 'md' : 'base'} elevation="none" style={[{ borderWidth: 0, gap: Spacing.sm }, style]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.gradientMuted, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold }}>
          {t(month ? 'ledger.closing' : 'ledger.wallet_balance')}
        </Text>
        <Text style={{ color: C.textOnGradient, fontSize: month ? Typography.sizes.xxl : Typography.sizes.hero, fontWeight: Typography.weights.black }}>
          {amount(wallet)}
        </Text>
      </View>
      <IconBadge icon="wallet-outline" color={C.textOnGradient} size={42} style={{ backgroundColor: C.gradientSubtle }} />
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, backgroundColor: C.gradientSubtle,
      borderRadius: Radius.md, padding: Spacing.sm }}>
      {[
        ['locker_balance', locker, C.textOnGradient],
        [month ? 'month_cash_spent' : 'cash_spent', spent, C.expenseOnGradient],
      ].map(([key, value, color]) => <View key={key} style={{ flexGrow: 1, flexBasis: '43%', minWidth: 0, gap: Spacing.xs }}>
        <Text style={{ color: C.gradientMuted, fontSize: Typography.sizes.sm }}>{t('ledger.' + key)}</Text>
        <Text style={{ color, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }}>{amount(value)}</Text>
      </View>)}
    </View>
  </Card>;
}
