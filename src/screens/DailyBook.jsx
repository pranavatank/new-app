import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, View, Text, ScrollView, Alert, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../store/ThemeContext';
import useAppStore from '../store/useAppStore';
import DayNavigator from '../components/DayNavigator';
import DayOverview from '../components/DayOverview';
import LedgerEntryRow, { money } from '../components/ledger/LedgerEntryRow';
import LedgerEntryForm from '../components/ledger/LedgerEntryForm';
import CashBalanceCard from '../components/ledger/CashBalanceCard';
import { getDayLedger, removeLedgerEntry, restoreLedgerEntry } from '../db/ledger';
import { Card, ActionTile, SummaryRow, Button, FAB, IconButton, SectionHeader } from '../components/common';
import { Layout, scaleTheme } from '../constants/theme';

export default function DailyBook({ navigation }) {
  const { C, isDark, toggleTheme, language, changeLanguage, scale } = useTheme();
  const { t, i18n } = useTranslation();
  const selectedDate = useAppStore(s => s.selectedDate);
  const [ledger, setLedger] = useState(null);
  const [form, setForm] = useState({ visible: false, mode: 'expense', entry: null });
  const [showBreakdown, setShowBreakdown] = useState(false);
  const scrollView = useRef(null);
  const themeButton = useRef(null);
  const previousDate = useRef(selectedDate);
  const transition = useRef(new Animated.Value(1)).current;
  const [direction, setDirection] = useState(1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const { Typography, Spacing } = scaleTheme(scale);
  const actionRow = { flexDirection: 'row', gap: Spacing.sm };
  const load = useCallback(() => {
    try { setLedger({ ...getDayLedger(selectedDate), date: selectedDate }); }
    catch { setLedger({ error: true, date: selectedDate }); }
  }, [selectedDate]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => { if (mounted) setReduceMotion(enabled); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; listener?.remove(); };
  }, []);
  useLayoutEffect(() => {
    if (ledger?.date !== selectedDate || previousDate.current === selectedDate) return;
    const nextDirection = selectedDate > previousDate.current ? 1 : -1;
    previousDate.current = selectedDate;
    scrollView.current?.scrollTo({ y: 0, animated: false });
    if (reduceMotion) return;
    setDirection(nextDirection);
    transition.setValue(0);
    const animation = Animated.timing(transition, { toValue: 1, duration: 230, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => { animation.stop(); transition.setValue(1); };
  }, [selectedDate, ledger?.date, reduceMotion, transition]);
  const add = mode => setForm({ visible: true, mode, entry: null });
  const edit = entry => {
    if (entry.kind === 'transfer' && entry.direction === 'out') return;
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
    <View style={{ backgroundColor: C.bgCard }}>
      <Button label={showBreakdown ? t('ledger.hide_breakdown') : t('ledger.show_breakdown')}
        icon={showBreakdown ? 'chevron-up' : 'chevron-down'} size="sm" variant="ghost" fullWidth
        accessibilityState={{ expanded: showBreakdown }} onPress={toggleBreakdown} />
    </View>
    <Animated.View style={{ flex: 1, opacity: transition.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
      transform: [{ translateX: transition.interpolate({ inputRange: [0, 1], outputRange: [direction * 28, 0] }) }] }}>
    <ScrollView ref={scrollView} contentContainerStyle={{ width: '100%', maxWidth: Layout.contentWidth, alignSelf: 'center', padding: Spacing.md, paddingBottom: 56 + Spacing.md, gap: Spacing.md }} keyboardShouldPersistTaps="handled">
      {showBreakdown && <Card padding="md" elevation="none">
        <SummaryRow label={t('ledger.opening')} value={displayMoney(day.opening_balance)} />
        {!!day.deposit_today && <SummaryRow label={t('ledger.cash_receipts')} value={displayMoney(day.deposit_today)} />}
        {!!day.wallet_receipts && <SummaryRow label={t('ledger.receipts')} value={displayMoney(day.wallet_receipts)} />}
        <SummaryRow label={t('ledger.outside_cash')} value={displayMoney(day.locker_receipts)} />
        <SummaryRow label={t('ledger.wallet_spent')} value={displayMoney(day.wallet_spent)} />
        <SummaryRow label={t('ledger.locker_spent')} value={displayMoney(day.locker_spent)} />
        {entries.filter(e => e.kind === 'transfer').map(e => <SummaryRow key={`transfer-${e.id}`} label={e.direction === 'out' ? t('ledger.historical_cash_adjustment') : t('ledger.locker_in')} value={`${e.direction === 'out' ? '−' : '+'}${money(e.amount, i18n.language)}`} />)}
      </Card>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.xs }}>
        <Text accessibilityRole="header" style={{ color: C.textPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.heavy }}>Rojnishi</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
          <IconButton icon="search-outline" label={t('search.title')} onPress={() => navigation.navigate('Search')} />
          <View ref={themeButton} collapsable={false}>
            <IconButton icon={isDark ? 'sunny-outline' : 'moon-outline'}
              label={t(isDark ? 'settings.useLight' : 'settings.useDark')}
              onPress={() => themeButton.current?.measureInWindow((x, y, width, height) => toggleTheme({ x: x + width / 2, y: y + height / 2 }))} />
          </View>
          <Button size="sm" variant="secondary" label={nextLanguage === 'en' ? 'English' : 'ગુજરાતી'} accessibilityLabel={t('ledger.change_language')} onPress={() => changeLanguage(nextLanguage)} />
        </View>
      </View>
      {!!ledger?.error && <Text accessibilityRole="alert" style={{ color: C.expense, fontSize: Typography.sizes.base }}>{t('ledger.load_failed')}</Text>}
      <CashBalanceCard wallet={day.closing_balance} locker={lockerBalance} spent={day.cash_spent} unavailable={!ledger || ledger.error} />
      <View style={actionRow}>
          <ActionTile vertical label={t('ledger.add_deposit_locker')} icon="lock-closed-outline" color={C.iconPlaces} background={C.skyBg} onPress={() => add('deposit_locker')} />
          <ActionTile vertical label={t('ledger.add_take_locker')} icon="wallet-outline" color={C.online} background={C.onlineBg} onPress={() => add('take_locker')} />
      </View>
      {ledger && !ledger.error && (cashEntries.length > 0 || onlineNotes.length === 0) && <Card padding="md" elevation="none" style={{ borderWidth: 0 }}>
        <SectionHeader icon="list" title={t('ledger.entries')} badge={cashEntries.length || undefined} style={{ marginBottom: Spacing.sm }} />
        {cashEntries.length ? cashEntries.map(entry => <LedgerEntryRow key={`${entry.kind}:${entry.id}`} entry={entry} onEdit={edit} onDelete={askDelete} />) :
          <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.base }}>{t('ledger.empty_day')}</Text>}
      </Card>}
      {onlineNotes.length > 0 && <Card padding="md" elevation="none" style={{ backgroundColor: C.onlineBg, borderWidth: 0 }}>
        <SectionHeader icon="card-outline" color={C.online} title={t('ledger.online_notes')} badge={onlineNotes.length} style={{ marginBottom: Spacing.xs }} />
        {onlineNotes.map(entry => <LedgerEntryRow key={entry.id} entry={entry} onEdit={edit} onDelete={askDelete} />)}
      </Card>}
      <DayOverview date={ledger?.date ?? selectedDate} navigation={navigation} refreshKey={ledger} />
    </ScrollView>
    </Animated.View>
    <View pointerEvents="box-none" style={{ position: 'absolute', bottom: Spacing.md, width: '100%', maxWidth: Layout.contentWidth,
      alignSelf: 'center', alignItems: 'flex-end', paddingHorizontal: Spacing.md }}>
      <FAB label={t('ledger.add_expense')} onPress={() => add('expense')} />
    </View>
    <LedgerEntryForm visible={form.visible} mode={form.mode} entry={form.entry} date={selectedDate} walletBalance={day.closing_balance}
      onForgotten={form.entry ? undefined : () => add('forgotten')} onClose={() => setForm(v => ({ ...v, visible: false }))} onSaved={load} />
  </View>;
}
