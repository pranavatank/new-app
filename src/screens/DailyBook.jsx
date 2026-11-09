import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
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
import { Card, ActionTile, SummaryRow, Button, EmptyState } from '../components/common';

export default function DailyBook({ navigation }) {
  const { C, language, changeLanguage, scale } = useTheme();
  const { t, i18n } = useTranslation();
  const selectedDate = useAppStore(s => s.selectedDate);
  const [ledger, setLedger] = useState(null);
  const [form, setForm] = useState({ visible: false, mode: 'expense', entry: null });
  const [showBreakdown, setShowBreakdown] = useState(false);
  const fs = n => Math.round(n * scale);
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
  const cashClosing = day.closing_balance;
  return <View style={{ flex: 1, backgroundColor: C.bg }}>
    <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
    <DayNavigator />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36, gap: 12 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
        {['en', 'gu'].map(lang => <Button key={lang} size="sm" variant={language === lang ? 'primary' : 'secondary'} label={lang === 'en' ? 'English' : 'ગુજરાતી'} onPress={() => changeLanguage(lang)} style={{ minHeight: 44 }} />)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <ActionTile label={t('ledger.add_expense')} icon="cart-outline" color={C.iconExpense} onPress={() => add('expense')} />
        <ActionTile label={t('ledger.add_note')} icon="document-text-outline" color={C.iconNotes} onPress={() => add('note')} />
        <ActionTile label={t('ledger.add_receipt')} icon="wallet-outline" color={C.income} onPress={() => add('receipt')} />
        <ActionTile label={t('ledger.add_locker')} icon="lock-closed-outline" color={C.primary} onPress={() => add('locker')} />
      </View>
      <Button label={t('ledger.monthly_book')} icon="book-outline" variant="secondary" fullWidth onPress={() => navigation.navigate('MonthlyLedger')} style={{ minHeight: 52 }} />
      {!!ledger?.error && <Text accessibilityRole="alert" style={{ color: C.expense, fontSize: fs(16) }}>{t('ledger.load_failed')}</Text>}
      <Card padding="md">
        <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: fs(18), marginBottom: 4 }}>{t('ledger.day_summary')}</Text>
        <SummaryRow label={t('ledger.opening')} value={money(day.opening_balance, i18n.language)} />
        <SummaryRow label={t('ledger.receipts')} value={money(receiptTotal, i18n.language)} divider />
        <SummaryRow label={t('ledger.cash_spent')} value={money(day.cash_spent, i18n.language)} divider />
        <SummaryRow label={t('ledger.closing')} value={money(cashClosing, i18n.language)} emphasis divider />
        <SummaryRow label={t('ledger.locker_balance')} value={ledger?.locker_balance == null ? t('ledger.unknown') : money(ledger.locker_balance, i18n.language)} divider />
        <TouchableOpacity onPress={() => setShowBreakdown(value => !value)} style={{ minHeight: 48, justifyContent: 'center', borderTopWidth: 1, borderTopColor: C.divider }}><Text style={{ color: C.primary, fontWeight: '700', fontSize: fs(16) }}>{showBreakdown ? t('ledger.hide_breakdown') : t('ledger.show_breakdown')}</Text></TouchableOpacity>
        {showBreakdown && <>
          <SummaryRow label={t('ledger.cash_receipts')} value={money(day.deposit_today, i18n.language)} />
          <SummaryRow label={t('ledger.receipts')} value={money(day.receipt_total, i18n.language)} divider />
          <SummaryRow label={t('ledger.online_spent')} value={money(day.online_spent, i18n.language)} divider />
          {entries.filter(e => e.kind === 'transfer').map(e => <SummaryRow key={`transfer-${e.id}`} label={e.direction === 'out' ? t('ledger.locker_out') : t('ledger.locker_in')} value={`${e.direction === 'out' ? '−' : '+'}${money(e.amount, i18n.language)}`} divider />)}
        </>}
      </Card>
      <Card padding="md">
        <Text style={{ color: C.textPrimary, fontWeight: '900', fontSize: fs(19), marginBottom: 4 }}>{t('ledger.entries')}</Text>
        {entries.length ? entries.map(entry => <LedgerEntryRow key={`${entry.kind}:${entry.id}`} entry={entry} onEdit={edit} onDelete={askDelete} />) : <EmptyState icon="leaf-outline" title={t('ledger.empty_day')} />}
      </Card>
      <DayOverview date={selectedDate} navigation={navigation} refreshKey={ledger} />
      <Button label={t('ledger.more_tools')} icon="grid-outline" variant="ghost" fullWidth onPress={() => navigation.navigate('FamilyTools')} style={{ minHeight: 48 }} />
    </ScrollView>
    <LedgerEntryForm visible={form.visible} mode={form.mode} entry={form.entry} date={selectedDate} onClose={() => setForm(v => ({ ...v, visible: false }))} onSaved={load} />
  </View>;
}
