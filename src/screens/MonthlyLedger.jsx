import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StatusBar, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Button, Card, IconButton, Row, ScreenHeader, SectionHeader, SummaryRow } from '../components/common';
import LedgerEntryRow, { money } from '../components/ledger/LedgerEntryRow';
import CashBalanceCard from '../components/ledger/CashBalanceCard';
import { Layout, scaleTheme } from '../constants/theme';
import { getMonthLedger } from '../db/ledger';
import { useTheme } from '../store/ThemeContext';
import useAppStore from '../store/useAppStore';

export default function MonthlyLedger({ navigation }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN';
  const selectedMonth = useAppStore(state => state.selectedDate.slice(0, 7));
  const setSelectedDate = useAppStore(state => state.setSelectedDate);
  const [month, setMonth] = useState(selectedMonth);
  const [result, setResult] = useState(null);
  const [expandedMonth, setExpandedMonth] = useState(null);

  useEffect(() => setMonth(selectedMonth), [selectedMonth]);
  useFocusEffect(useCallback(() => {
    const [year, monthNumber] = month.split('-').map(Number);
    try {
      setResult({ month, data: getMonthLedger(year, monthNumber) });
    } catch {
      setResult({ month, error: true });
    }
  }, [month]));

  const move = offset => setMonth(value => {
    const [year, monthNumber] = value.split('-').map(Number);
    const date = new Date(year, monthNumber - 1 + offset, 1);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  });
  const openDay = date => {
    setSelectedDate(date);
    navigation.navigate('DailyBook');
  };
  const amount = value => money(value, i18n.language);
  const showDetails = expandedMonth === month;
  const monthName = new Date(month + '-01T00:00:00').toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const data = result?.month === month ? result.data : null;
  const error = result?.month === month && result.error;
  const days = data?.days.filter(day => day.entries.length > 0) || [];
  const legacyReceipts = days.reduce((total, day) => total + day.entries.reduce(
    (subtotal, entry) => entry.kind === 'legacy_receipt' ? subtotal + Number(entry.amount) : subtotal,
    0
  ), 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
      <ScreenHeader title={t('ledger.monthly_book')} />
      <ScrollView contentContainerStyle={{ width: '100%', maxWidth: Layout.contentWidth, alignSelf: 'center', padding: Spacing.md, gap: Spacing.md }}>
        <Card padding="sm" elevation="none" style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: C.primaryDim, borderWidth: 0 }}>
          <IconButton icon="chevron-back" label={t('ledger.previous_month')} onPress={() => move(-1)} />
          <Text style={{ flex: 1, textAlign: 'center', color: C.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black }} accessibilityRole="header">
            {monthName}
          </Text>
          <IconButton icon="chevron-forward" label={t('ledger.next_month')} onPress={() => move(1)} />
        </Card>
        {error && <Text accessibilityRole="alert" style={{ color: C.expense, fontSize: Typography.sizes.base }}>{t('ledger.load_failed')}</Text>}
        {!!data && (
          <View>
            <CashBalanceCard month wallet={data.closing_balance} locker={data.locker_balance} spent={data.totals.cash_spent} />
            {(days.length > 0 || !!data.opening_balance) && <Button
              label={t(showDetails ? 'ledger.hide_breakdown' : 'ledger.show_breakdown')}
              icon={showDetails ? 'chevron-up' : 'chevron-down'} size="sm" variant="ghost"
              accessibilityState={{ expanded: showDetails }} onPress={() => setExpandedMonth(showDetails ? null : month)} />}
            {showDetails && <Card padding="sm" elevation="none" style={{ borderWidth: 0 }}>{[
              ['opening', data.opening_balance],
              ...(legacyReceipts ? [['cash_receipts', legacyReceipts]] : []),
              ...(data.totals.wallet_receipts ? [['receipts', data.totals.wallet_receipts]] : []),
              ['outside_cash', data.totals.locker_receipts],
              ['locker_in', data.totals.transfer_in],
              ['historical_cash_adjustment', data.totals.transfer_out ? -data.totals.transfer_out : 0],
              ['wallet_spent', data.totals.wallet_spent],
              ['locker_spent', data.totals.locker_spent],
              ['online_spent', data.totals.online_spent],
            ].filter(([name, value]) => name === 'opening' || value !== 0).map(([name, value]) =>
              <SummaryRow key={name} label={t('ledger.' + name)} value={value == null ? t('ledger.unknown') : amount(value)} />
            )}</Card>}
          </View>
        )}
        {!!data && days.length === 0 && (
          <Card padding="md" elevation="none" style={{ borderWidth: 0 }}>
            <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.base }}>{t('ledger.empty_month')}</Text>
          </Card>
        )}
        {days.map(day => {
          const date = new Date(day.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
          const onlineNotes = day.entries.filter(entry => entry.payment_type === 'online');
          const cashEntries = day.entries.filter(entry => entry.payment_type !== 'online');
          return (
            <Card key={day.date} padding="md" elevation="none" style={{ borderWidth: 0 }}>
              <Row icon="calendar-outline" label={date} onPress={() => openDay(day.date)} style={{ paddingVertical: Spacing.xs }} />
              {cashEntries.map(entry => <LedgerEntryRow key={entry.kind + ':' + entry.id} entry={entry} />)}
              {onlineNotes.length > 0 && <View style={{ backgroundColor: C.onlineBg, borderRadius: Radius.lg, padding: Spacing.sm, marginTop: Spacing.sm }}>
                <SectionHeader icon="card-outline" color={C.online} title={t('ledger.online_notes')} style={{ marginBottom: Spacing.xs }} />
                {onlineNotes.map(entry => <LedgerEntryRow key={entry.id} entry={entry} />)}
              </View>}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
                backgroundColor: C.skyBg, borderRadius: Radius.lg, padding: Spacing.sm, marginTop: Spacing.sm }}>
                {[
                  ['day_opening', amount(day.opening_balance), C.textSecondary],
                  ...(day.cash_spent > 0 ? [['cash_spent', '−' + amount(day.cash_spent), C.expense]] : []),
                  ['day_closing', amount(day.closing_balance), C.primary],
                ].map(([name, value, color]) => <View key={name} style={{ flexGrow: 1, flexBasis: '28%', gap: Spacing.xs }}>
                  <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.sm }}>{t('ledger.' + name)}</Text>
                  <Text style={{ color, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold }}>{value}</Text>
                </View>)}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}
