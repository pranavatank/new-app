import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, Alert, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../store/ThemeContext';
import useAppStore from '../store/useAppStore';
import DayNavigator from '../components/DayNavigator';
import DayOverview from '../components/DayOverview';
import LedgerEntryRow, { money } from '../components/ledger/LedgerEntryRow';
import LedgerEntryForm from '../components/ledger/LedgerEntryForm';
import { getDayLedger, removeLedgerEntry, restoreLedgerEntry } from '../db/ledger';
import { Card, ActionTile, SummaryRow, Button, IconBadge, SectionHeader } from '../components/common';
import { Layout, scaleTheme } from '../constants/theme';

export default function DailyBook({ navigation }) {
  const { C, language, changeLanguage, scale } = useTheme();
  const { t, i18n } = useTranslation();
  const selectedDate = useAppStore(s => s.selectedDate);
  const [ledger, setLedger] = useState(null);
  const [form, setForm] = useState({ visible: false, mode: 'expense', entry: null });
  const [showBreakdown, setShowBreakdown] = useState(false);
  const scrollView = useRef(null);
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
  const onlineNotes = entries.filter(entry => entry.payment_type === 'online');
  const cashEntries = entries.filter(entry => entry.payment_type !== 'online');
  const lockerBalance = ledger?.locker_balance;
  const nextLanguage = language === 'gu' ? 'en' : 'gu';
  const displayMoney = amount => ledger?.error ? '—' : money(amount, i18n.language);
  const toggleBreakdown = () => {
    if (!showBreakdown) scrollView.current?.scrollTo({ y: 0, animated: false });
    setShowBreakdown(!showBreakdown);
  };

  return <View style={{ flex: 1, backgroundColor: C.bg }}>
    <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
    <DayNavigator />
    <View style={{ backgroundColor: C.bgCard, borderBottomColor: C.border, borderBottomWidth: 1 }}>
      <Button label={showBreakdown ? t('ledger.hide_breakdown') : t('ledger.show_breakdown')}
        icon={showBreakdown ? 'chevron-up' : 'chevron-down'} size="sm" variant="ghost" fullWidth
        accessibilityState={{ expanded: showBreakdown }} onPress={toggleBreakdown} />
    </View>
    <ScrollView ref={scrollView} contentContainerStyle={{ width: '100%', maxWidth: Layout.contentWidth, alignSelf: 'center', padding: Spacing.base, paddingBottom: Spacing.xl, gap: Spacing.md }} keyboardShouldPersistTaps="handled">
      {showBreakdown && <Card padding="md" elevation="none">
        <SummaryRow label={t('ledger.opening')} value={displayMoney(day.opening_balance)} />
        {!!day.deposit_today && <SummaryRow label={t('ledger.cash_receipts')} value={displayMoney(day.deposit_today)} divider />}
        {!!day.wallet_receipts && <SummaryRow label={t('ledger.receipts')} value={displayMoney(day.wallet_receipts)} divider />}
        <SummaryRow label={t('ledger.outside_cash')} value={displayMoney(day.locker_receipts)} divider />
        <SummaryRow label={t('ledger.wallet_spent')} value={displayMoney(day.wallet_spent)} divider />
        <SummaryRow label={t('ledger.locker_spent')} value={displayMoney(day.locker_spent)} divider />
        {entries.filter(e => e.kind === 'transfer').map(e => <SummaryRow key={`transfer-${e.id}`} label={e.direction === 'out' ? t('ledger.locker_out') : t('ledger.locker_in')} value={`${e.direction === 'out' ? '−' : '+'}${money(e.amount, i18n.language)}`} divider />)}
        {ledger && !ledger.error && (
          <View style={{ gap: Spacing.xs, marginTop: Spacing.sm }}>
            <Button size="sm" variant="secondary" label={t('ledger.add_return_locker')} onPress={() => add('return_locker')} />
            {lockerBalance != null && <Button size="sm" variant="ghost" label={t('ledger.add_locker_opening')} onPress={() => add('locker_opening')} />}
          </View>
        )}
      </Card>}
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
            <Text style={{ color: C.gradientMuted, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold }}>{t('ledger.wallet_balance')}</Text>
            <Text style={{ color: C.textOnGradient, fontSize: Typography.sizes.hero, fontWeight: Typography.weights.black }}>{displayMoney(day.closing_balance)}</Text>
          </View>
          <IconBadge icon="wallet-outline" color={C.textOnGradient} size={48} style={{ backgroundColor: C.gradientSubtle }} />
        </View>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.gradientBorder, paddingTop: Spacing.md, gap: Spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.gradientMuted, fontSize: Typography.sizes.sm }}>{t('ledger.locker_balance')}</Text>
            <Text style={{ color: C.textOnGradient, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }}>
              {ledger?.error ? '—' : lockerBalance == null ? t('ledger.unknown') : displayMoney(lockerBalance)}
            </Text>
          </View>
        </View>
      </Card>
      {ledger && !ledger.error && lockerBalance == null &&
        <Button size="sm" variant="secondary" label={t('ledger.add_locker_opening')} onPress={() => add('locker_opening')} />}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        <ActionTile label={t('ledger.add_deposit_locker')} icon="lock-closed-outline" color={C.income} onPress={() => add('deposit_locker')} />
        <ActionTile label={t('ledger.add_take_locker')} icon="wallet-outline" color={C.primary} onPress={() => add('take_locker')} />
        <ActionTile label={t('ledger.add_expense')} icon="cart-outline" color={C.iconExpense} onPress={() => add('expense')} />
        <ActionTile label={t('ledger.add_note')} icon="document-text-outline" color={C.iconNotes} onPress={() => add('note')} />
      </View>
      <Button size="sm" variant="secondary" icon="help-circle-outline" label={t('ledger.add_forgotten')} onPress={() => add('forgotten')} />
      {ledger && !ledger.error && <Card padding="md">
        <SectionHeader icon="list" title={t('ledger.entries')} />
        {cashEntries.length ? cashEntries.map(entry => <LedgerEntryRow key={`${entry.kind}:${entry.id}`} entry={entry} onEdit={edit} onDelete={askDelete} />) :
          <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.base }}>{t('ledger.empty_day')}</Text>}
      </Card>}
      {onlineNotes.length > 0 && <Card padding="md">
        <SectionHeader icon="card-outline" title={t('ledger.online_notes')} />
        {onlineNotes.map(entry => <LedgerEntryRow key={entry.id} entry={entry} onEdit={edit} onDelete={askDelete} />)}
      </Card>}
      <DayOverview date={selectedDate} navigation={navigation} refreshKey={ledger} />
    </ScrollView>
    <LedgerEntryForm visible={form.visible} mode={form.mode} entry={form.entry} date={selectedDate} onClose={() => setForm(v => ({ ...v, visible: false }))} onSaved={load} />
  </View>;
}
