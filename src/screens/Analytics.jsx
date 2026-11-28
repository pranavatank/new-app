import React, { useCallback, useState } from 'react';
import { ScrollView, StatusBar, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Card, IconButton, Row, ScreenHeader, SectionHeader, SummaryRow } from '../components/common';
import { money } from '../components/ledger/LedgerEntryRow';
import { Layout, scaleTheme } from '../constants/theme';
import { translateCategoryName } from '../constants/defaultCategories';
import { getDailyTotals, getMonthlySummary, getMonthTotals } from '../db/queries';
import { useTheme } from '../store/ThemeContext';
import useAppStore from '../store/useAppStore';

const monthKey = date => date.getFullYear() * 12 + date.getMonth();
const dayNumber = date => Number(date.slice(-2));
const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);

export default function AnalyticsScreen({ navigation }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN';
  const today = new Date();
  const currentMonth = monthKey(today);
  const [month, setMonth] = useState(currentMonth);
  const [result, setResult] = useState(null);
  const setSelectedDate = useAppStore(state => state.setSelectedDate);
  const date = new Date(Math.floor(month / 12), month % 12, 1);
  const monthName = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const openDay = day => {
    setSelectedDate(day);
    navigation.navigate('DailyBook');
  };

  useFocusEffect(useCallback(() => {
    const year = Math.floor(month / 12);
    const number = month % 12 + 1;
    try {
      const days = getDailyTotals(year, number);
      const previous = new Date(year, number - 2, 1);
      const previousDays = getDailyTotals(previous.getFullYear(), previous.getMonth() + 1);
      const cutoff = month === currentMonth ? new Date().getDate() : 31;
      const comparedCash = sum(days.filter(day => dayNumber(day.date) <= cutoff), 'total');
      const comparison = comparedCash -
        sum(previousDays.filter(day => dayNumber(day.date) <= cutoff), 'total');
      setResult({ month, data: {
        days, comparedCash, comparison, categories: getMonthlySummary(year, number), totals: getMonthTotals(year, number),
      } });
    } catch {
      setResult({ month, error: true });
    }
  }, [month, currentMonth]));

  const data = result?.month === month ? result.data : null;
  const error = result?.month === month && result.error;
  const active = data?.days.filter(day => day.total > 0) || [];
  const topDays = [...active].sort((a, b) => b.total - a.total || a.date.localeCompare(b.date)).slice(0, 3);
  const cash = data?.totals.cash_spent || 0;
  const length = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const weekTotals = Array.from({ length: Math.ceil(length / 7) }, (_, index) => {
    const start = index * 7 + 1;
    const end = Math.min(start + 6, length);
    return { label: start + '–' + end, total: sum(active.filter(day => dayNumber(day.date) >= start && dayNumber(day.date) <= end), 'total') };
  });
  const peak = Math.max(...weekTotals.map(week => week.total));
  const amount = value => money(value, i18n.language);
  const hasActivity = !!(cash || data?.totals.online_spent || data?.totals.deposited || data?.totals.transfer_net);
  const muted = { color: C.textSecondary, fontSize: Typography.sizes.sm };
  const totalStyle = { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black };
  const panel = { borderWidth: 0 };
  const shareStyle = { height: 8, borderRadius: Radius.full, backgroundColor: C.bgElevated, overflow: 'hidden' };
  const dateLabel = day => new Date(day + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
      <ScreenHeader title={t('analytics.title')} />
      <ScrollView contentContainerStyle={{ width: '100%', maxWidth: Layout.contentWidth, alignSelf: 'center', padding: Spacing.md, gap: Spacing.md }}>
        <Card padding="sm" elevation="none" style={{ ...panel, flexDirection: 'row', alignItems: 'center', backgroundColor: C.primaryDim }}>
          <IconButton icon="chevron-back" label={t('ledger.previous_month')} onPress={() => setMonth(value => value - 1)} />
          <Text accessibilityRole="header" style={{ ...totalStyle, flex: 1, textAlign: 'center', color: C.textPrimary }}>{monthName}</Text>
          <IconButton icon="chevron-forward" label={t('ledger.next_month')} disabled={month >= currentMonth} onPress={() => setMonth(value => Math.min(value + 1, currentMonth))} />
        </Card>
        {error && <Text accessibilityRole="alert" style={{ ...muted, color: C.expense }}>{t('ledger.load_failed')}</Text>}
        {data && <>
          <Card gradient={C.gradients.balance} padding="base" elevation="none" style={{ ...panel, gap: Spacing.xs }}>
            <Text style={{ ...muted, color: C.gradientMuted }}>{t('analytics.cashSpent')}</Text>
            <Text style={{ color: C.textOnGradient, fontSize: Typography.sizes.hero, fontWeight: Typography.weights.black }}>{amount(cash)}</Text>
            {(data.comparedCash > 0 || data.comparison !== 0) && <View style={{ backgroundColor: C.gradientSubtle, borderRadius: Radius.md, padding: Spacing.sm, gap: Spacing.xs }}>
              <Text style={{ ...muted, color: C.textOnGradient, fontWeight: Typography.weights.bold }}>{t(data.comparison > 0 ? 'analytics.moreCash' : data.comparison < 0 ? 'analytics.lessCash' : 'analytics.sameCash', { amount: amount(Math.abs(data.comparison)) })}</Text>
              <Text style={{ ...muted, color: C.gradientMuted }}>{t(month === currentMonth ? 'analytics.sameDaysLastMonth' : 'analytics.previousMonth', { amount: amount(data.comparedCash) })}</Text>
            </View>}
          </Card>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {[
              [t('ledger.wallet_balance'), data.totals.wallet_balance, C.skyBg, C.primary],
              [t('ledger.locker_balance'), data.totals.locker_balance, C.onlineBg, C.online],
              [t('analytics.deposited'), data.totals.deposited, C.incomeBg, C.income],
              [t('ledger.online_notes'), data.totals.online_spent, C.sandBg, C.warning],
            ].map(([label, value, backgroundColor, color]) => (
              <Card key={label} padding="md" elevation="none" style={{ ...panel, backgroundColor, flexGrow: 1, flexBasis: '44%', gap: Spacing.xs }}>
                <Text style={muted}>{label}</Text>
                <Text style={{ ...totalStyle, color }}>{value == null ? t('ledger.unknown') : amount(value)}</Text>
              </Card>
            ))}
          </View>
          {!!data.totals.transfer_net && <Card padding="sm" elevation="none" style={{ ...panel, backgroundColor: C.skyBg }}>
            <SummaryRow label={t('analytics.cashMoved')} value={amount(data.totals.transfer_net)} color={C.primary} />
          </Card>}
          {!hasActivity && <Card padding="md" elevation="none" style={panel}>
            <Text style={muted}>{t('analytics.noSpending')}</Text>
          </Card>}
          {cash > 0 && <>
            <Card padding="md" elevation="none" style={panel}>
              <SectionHeader icon="wallet-outline" title={t('analytics.cashSources')} />
              <View style={[shareStyle, { flexDirection: 'row' }]}>
                <View style={{ flex: sum(active, 'wallet_total'), backgroundColor: C.primary }} />
                <View style={{ flex: sum(active, 'locker_total'), backgroundColor: C.online }} />
              </View>
              <SummaryRow label={t('ledger.wallet_spent')} value={amount(sum(active, 'wallet_total'))} color={C.primary} />
              <SummaryRow label={t('ledger.locker_spent')} value={amount(sum(active, 'locker_total'))} color={C.online} />
              {sum(active, 'recurring_total') > 0 && <SummaryRow label={t('analytics.recurringCash')} value={amount(sum(active, 'recurring_total'))} />}
              {sum(active, 'forgotten_total') > 0 && <SummaryRow label={t('ledger.add_forgotten')} value={amount(sum(active, 'forgotten_total'))} />}
            </Card>

            <Card padding="md" elevation="none" style={panel}>
              <SectionHeader icon="pulse-outline" title={t('analytics.weeklyTrend')} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.xs }}>
                {weekTotals.map(week => <View key={week.label} accessible accessibilityLabel={t('analytics.weekValue', { days: week.label, amount: amount(week.total) })}
                  style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: Spacing.xs }}>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={{ ...muted, color: C.primary }}>
                    {week.total > 0 ? amount(week.total) : '—'}
                  </Text>
                  <View style={{ height: 74, width: '80%', maxWidth: 58, justifyContent: 'flex-end' }}>
                    <View style={{ height: week.total > 0 ? Math.max(6, Math.round(74 * week.total / peak)) : 4,
                      borderRadius: Radius.sm, backgroundColor: week.total > 0 ? C.primary : C.bgElevated }} />
                  </View>
                  <Text style={muted}>{week.label}</Text>
                </View>)}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md }}>
                {[
                  [t('analytics.activeDays'), active.length],
                  [t('analytics.avgDay'), amount(cash / active.length)],
                  [t('analytics.cashEntries'), sum(active, 'cash_count')],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexGrow: 1, flexBasis: '44%', backgroundColor: C.skyBg, borderRadius: Radius.md, padding: Spacing.sm }}>
                    <Text style={muted}>{label}</Text>
                    <Text style={{ ...totalStyle, color: C.primary }}>{value}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card padding="md" elevation="none" style={panel}>
              <SectionHeader icon="pie-chart-outline" color={C.online} title={t('analytics.categoryBreakdown')} />
              {data.categories.map((category, index) => {
                const color = C.accents[index % C.accents.length];
                const share = Math.min(100, Math.max(0, category.total / cash * 100));
                return <View key={index} style={{ paddingVertical: Spacing.sm, gap: Spacing.xs }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm }}>
                    <Text style={{ ...muted, color: C.textPrimary, flexShrink: 1 }}>{translateCategoryName(category.name, t)}</Text>
                    <Text style={{ ...muted, color, fontWeight: Typography.weights.bold }}>{amount(category.total)} · {Math.round(share)}%</Text>
                  </View>
                  <View style={shareStyle}><View style={{ height: '100%', width: share + '%', backgroundColor: color }} /></View>
                </View>;
              })}
            </Card>

            <Card padding="md" elevation="none" style={panel}>
              <SectionHeader icon="calendar-outline" color={C.warning} title={t('analytics.topDays')} />
              {topDays.map(day => <Row key={day.date} label={dateLabel(day.date)} onPress={() => openDay(day.date)}
                subtitle={amount(day.total)} icon="calendar-clear-outline" iconColor={C.warning} />)}
            </Card>
          </>}
        </>}
      </ScrollView>
    </View>
  );
}
