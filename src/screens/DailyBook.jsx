import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Alert, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../store/ThemeContext';
import useAppStore from '../store/useAppStore';
import DayNavigator from '../components/DayNavigator';
import DayOverview from '../components/DayOverview';
import LedgerEntryRow, { money } from '../components/ledger/LedgerEntryRow';
import LedgerEntryForm from '../components/ledger/LedgerEntryForm';
import { getDayLedger, removeLedgerEntry, restoreLedgerEntry } from '../db/ledger';
import { Card, ActionTile, SummaryRow, Button, EmptyState, IconBadge, SectionHeader } from '../components/common';
import { Layout, scaleTheme } from '../constants/theme';

export default function DailyBook({ navigation }) {
  const { C, language, changeLanguage, scale } = useTheme();
  const { t, i18n } = useTranslation();
  const selectedDate = useAppStore(s => s.selectedDate);
  const [ledger, setLedger] = useState(null);
  const [form, setForm] = useState({ visible: false, mode: 'expense', entry: null });
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { Typography, Spacing } = scaleTheme(scale);
  const load = useCallback(() => { try { setLedger(getDayLedger(selectedDate)); } catch { setLedger({ error: true, entries: [] }); } }, [selectedDate]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const add = mode => setForm({ visible: true, mode, entry: null });
  const edit = entry => {
    if (entry.kind === 'legacy_receipt') { navigation.navigate('Expense'); return; }
    setForm({ visible: true, mode: null, entry });
  };
  const askDelete = entry => Alert.alert(t('ledger.remove_title'), t('ledger.remove_prompt'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.delete'), style: 'destructive', onPress: () => {
      try {
        const snapshot = removeLedgerEntry({ kind: entry.kind, id: entry.id, date: entry.date || selectedDate });
        load();
        Alert.alert(t('ledger.removed'), '', [{ text: t('ledger.undo'), onPress: () => { try { restoreLedgerEntry(snapshot || entry); load(); } catch { Alert.alert(t('ledger.error'), t('ledger.remove_failed')); } } }, { text: t('common.ok') }]);
      } catch { Alert.alert(t('ledger.error'), t('ledger.remove_failed')); }
    } },
  ]);
  const day = ledger?.day || {};
  const entries = ledger?.entries || [];
  const receiptTotal = Number(day.deposit_today || 0) + Number(day.receipt_total || 0);
  const nextLanguage = language === 'gu' ? 'en' : 'gu';
  const displayMoney = amount => ledger?.error ? '—' : money(amount, i18n.language);
  return <View style={{ flex: 1, backgroundColor: C.bg }}>
    <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
    <DayNavigator />
    <ScrollView contentContainerStyle={{ width: '100%', maxWidth: Layout.contentWidth, alignSelf: 'center', padding: Spacing.base, paddingBottom: Spacing.xl, gap: Spacing.md }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm }}>
        <Text accessibilityRole="header" style={{ color: C.textPrimary, fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.black }}>Rojnishi</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
          <Button size="sm" variant="ghost" icon="search-outline" label={t('search.title')} onPress={() => navigation.navigate('Search')} />
          <Button size="sm" variant="secondary" label={nextLanguage === 'en' ? 'English' : 'ગુજરાતી'} accessibilityLabel={t('ledger.change_language')} onPress={() => changeLanguage(nextLanguage)} />
        </View>
      </View>
      {!!ledger?.error && <Text accessibilityRole="alert" style={{ color: C.expense, fontSize: Typography.sizes.base }}>{t('ledger.load_failed')}</Text>}
      <Card gradient={C.gradients.primary} padding="lg" elevation="primary" style={{ borderWidth: 0, gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.gradientMuted, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold }}>{t('ledger.closing')}</Text>
            <Text style={{ color: C.textOnGradient, fontSize: Typography.sizes.hero, fontWeight: Typography.weights.black }}>{displayMoney(day.closing_balance)}</Text>
          </View>
          <IconBadge icon="wallet-outline" color={C.textOnGradient} size={48} style={{ backgroundColor: C.gradientSubtle }} />
        </View>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.gradientBorder, paddingTop: Spacing.md, gap: Spacing.md }}>
          {[[t('ledger.receipts'), receiptTotal, C.incomeOnGradient], [t('ledger.cash_spent'), day.cash_spent, C.expenseOnGradient]].map(([label, amount, color]) =>
            <View key={label} style={{ flex: 1 }}>
              <Text style={{ color: C.gradientMuted, fontSize: Typography.sizes.sm }}>{label}</Text>
              <Text style={{ color, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }}>{displayMoney(amount)}</Text>
            </View>
          )}
        </View>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        <ActionTile label={t('ledger.add_expense')} icon="cart-outline" color={C.iconExpense} onPress={() => add('expense')} />
        <ActionTile label={t('ledger.add_note')} icon="document-text-outline" color={C.iconNotes} onPress={() => add('note')} />
        <ActionTile label={t('ledger.add_receipt')} icon="wallet-outline" color={C.income} onPress={() => add('receipt')} />
        <ActionTile label={t('ledger.add_locker')} icon="lock-closed-outline" color={C.primary} onPress={() => add('locker')} />
      </View>
      <Card padding="md" elevation="none">
        <Button label={showBreakdown ? t('ledger.hide_breakdown') : t('ledger.show_breakdown')} icon={showBreakdown ? 'chevron-up' : 'chevron-down'} size="sm" variant="ghost"
          accessibilityState={{ expanded: showBreakdown }} onPress={() => setShowBreakdown(value => !value)} />
        {showBreakdown && <>
          <SummaryRow label={t('ledger.opening')} value={displayMoney(day.opening_balance)} divider />
          <SummaryRow label={t('ledger.cash_receipts')} value={displayMoney(day.deposit_today)} divider />
          <SummaryRow label={t('ledger.receipts')} value={displayMoney(day.receipt_total)} divider />
          <SummaryRow label={t('ledger.online_spent')} value={displayMoney(day.online_spent)} divider />
          <SummaryRow label={t('ledger.locker_balance')} value={ledger?.locker_balance == null ? t('ledger.unknown') : displayMoney(ledger.locker_balance)} divider />
          {entries.filter(e => e.kind === 'transfer').map(e => <SummaryRow key={`transfer-${e.id}`} label={e.direction === 'out' ? t('ledger.locker_out') : t('ledger.locker_in')} value={`${e.direction === 'out' ? '−' : '+'}${money(e.amount, i18n.language)}`} divider />)}
        </>}
      </Card>
      <Card padding="md">
        <SectionHeader icon="list" title={t('ledger.entries')} />
        {entries.length ? entries.map(entry => <LedgerEntryRow key={`${entry.kind}:${entry.id}`} entry={entry} onEdit={edit} onDelete={askDelete} />) : <EmptyState icon="leaf-outline" title={t('ledger.empty_day')} />}
      </Card>
      <DayOverview date={selectedDate} navigation={navigation} refreshKey={ledger} />
    </ScrollView>
    <LedgerEntryForm visible={form.visible} mode={form.mode} entry={form.entry} date={selectedDate} onClose={() => setForm(v => ({ ...v, visible: false }))} onSaved={load} />
  </View>;
}
