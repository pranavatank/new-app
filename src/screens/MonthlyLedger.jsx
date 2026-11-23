import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StatusBar, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState, IconButton, Row, ScreenHeader, SectionHeader, SummaryRow } from '../components/common';
import LedgerEntryRow, { money } from '../components/ledger/LedgerEntryRow';
import { Layout, scaleTheme } from '../constants/theme';
import { getMonthLedger } from '../db/ledger';
import { useTheme } from '../store/ThemeContext';
import useAppStore from '../store/useAppStore';

export default function MonthlyLedger({ navigation }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN';
  const selectedMonth = useAppStore(state => state.selectedDate.slice(0, 7));
  const setSelectedDate = useAppStore(state => state.setSelectedDate);
  const [month, setMonth] = useState(selectedMonth);
  const [result, setResult] = useState(null);

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
      <ScrollView contentContainerStyle={{ width: '100%', maxWidth: Layout.contentWidth, alignSelf: 'center', padding: Spacing.base, gap: Spacing.md }}>
        <Card gradient padding="sm" style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <IconButton icon="chevron-back" label={t('ledger.previous_month')} onPress={() => move(-1)} />
          <Text style={{ flex: 1, textAlign: 'center', color: C.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black }} accessibilityRole="header">
            {monthName}
          </Text>
          <IconButton icon="chevron-forward" label={t('ledger.next_month')} onPress={() => move(1)} />
        </Card>
        {error && <Text accessibilityRole="alert" style={{ color: C.expense, fontSize: Typography.sizes.base }}>{t('ledger.load_failed')}</Text>}
        {!!data && (
          <Card padding="md">
            <SectionHeader icon="analytics-outline" title={t('ledger.month_summary')} color={C.iconStats} />
            {[
              ['closing', data.closing_balance],
              ['locker_balance', data.locker_balance],
              ['opening', data.opening_balance],
              ...(legacyReceipts ? [['cash_receipts', legacyReceipts]] : []),
              ...(data.totals.wallet_receipts ? [['receipts', data.totals.wallet_receipts]] : []),
              ['outside_cash', data.totals.locker_receipts],
              ['locker_in', data.totals.transfer_in],
              ['locker_out', data.totals.transfer_out],
              ['wallet_spent', data.totals.wallet_spent],
              ['locker_spent', data.totals.locker_spent],
            ].map(([name, value], index) =>
              <SummaryRow key={name} label={t('ledger.' + name)} value={value == null ? t('ledger.unknown') : amount(value)} divider={index > 0} emphasis={name === 'closing'} />
            )}
          </Card>
        )}
        {!!data && days.length === 0 && (
          <Card><EmptyState icon="book-outline" title={t('ledger.empty_month')} /></Card>
        )}
        {days.length > 0 && <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.base }}>{t('ledger.tap_day')}</Text>}
        {days.map(day => {
          const date = new Date(day.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
          const onlineNotes = day.entries.filter(entry => entry.payment_type === 'online');
          return (
            <Card key={day.date} padding="md">
              <Row icon="calendar-outline" label={date} onPress={() => openDay(day.date)} style={{ paddingTop: 0 }} />
              <SummaryRow label={t('ledger.opening')} value={amount(day.opening_balance)} divider />
              {day.entries.filter(entry => entry.payment_type !== 'online').map(entry => <LedgerEntryRow key={entry.kind + ':' + entry.id} entry={entry} />)}
              {day.cash_spent > 0 && (
                <SummaryRow label={t('ledger.cash_spent')} value={'−' + amount(day.cash_spent)} />
              )}
              <SummaryRow label={t('ledger.closing')} value={amount(day.closing_balance)} emphasis />
              {onlineNotes.length > 0 && <>
                <SectionHeader icon="card-outline" title={t('ledger.online_notes')} />
                {onlineNotes.map(entry => <LedgerEntryRow key={entry.id} entry={entry} />)}
              </>}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}
