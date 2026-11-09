import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import ScreenHeader from '../components/common/ScreenHeader';
import { getMonthLedger } from '../db/ledger';
import useLedgerTheme from '../components/ledger/useLedgerTheme';
import useAppStore from '../store/useAppStore';
import { money } from '../components/ledger/LedgerEntryRow';
import { translateCategoryName } from '../constants/defaultCategories';

const isImageUri = value => typeof value === 'string' && /^(file:|content:|data:|https?:)/i.test(value);

export default function MonthlyLedger({ navigation }) {
  const { C, scale } = useLedgerTheme();
  const { t, i18n } = useTranslation();
  const selectedDate = useAppStore(s => s.selectedDate);
  const setSelectedDate = useAppStore(s => s.setSelectedDate);
  const [month, setMonth] = useState(() => { const [y, m] = selectedDate.split('-').map(Number); return { year: y, month: m - 1 }; });
  const [data, setData] = useState(null);
  const load = useCallback(() => { try { setData(getMonthLedger(month.year, month.month + 1)); } catch (e) { setData({ error: e.message, days: [] }); } }, [month]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const move = n => setMonth(current => { const d = new Date(current.year, current.month + n, 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  const monthName = new Date(month.year, month.month, 1).toLocaleDateString(i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN', { month: 'long', year: 'numeric' });
  const totals = data?.totals || {};
  const legacyReceipts = (data?.days || []).reduce((sum, day) => sum + (day.entries || []).filter(entry => entry.kind === 'legacy_receipt').reduce((n, entry) => n + Number(entry.amount || 0), 0), 0);
  const displayedDays = (data?.days || []).filter(day => (day.entries || []).length > 0 || day.cash_spent > 0 || day.online_spent > 0 || day.receipts > 0 || day.transfer_in > 0 || day.transfer_out > 0);
  const fs = value => Math.max(value, Math.round(value * scale));
  const card = { backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 12 };
  const openDay = date => { setSelectedDate(date); navigation.navigate('DailyBook'); };
  return <View style={{ flex: 1, backgroundColor: C.bg }}>
    <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
    <ScreenHeader title={t('ledger.monthly_book')} onBack={() => navigation.goBack()} rightIcon="calendar-outline" onRightPress={() => navigation.navigate('DailyBook')} />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 34 }}>
      <View style={[card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <TouchableOpacity onPress={() => move(-1)} style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="chevron-back" size={24} color={C.primary} /></TouchableOpacity>
        <View style={{ alignItems: 'center' }}><Text style={{ color: C.textPrimary, fontWeight: '900', fontSize: fs(20) }}>{monthName}</Text><Text style={{ color: C.textMuted, marginTop: 3, fontSize: fs(15), textAlign: 'center' }}>{t('ledger.tap_day')}</Text></View>
        <TouchableOpacity onPress={() => move(1)} style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="chevron-forward" size={24} color={C.primary} /></TouchableOpacity>
      </View>
      {!!data?.error && <Text style={{ color: C.expense, padding: 12 }}>{t('ledger.load_failed')}</Text>}
      <View style={[card, { backgroundColor: C.primaryDim, borderColor: C.primary + '55' }]}>
        <Text style={{ color: C.textPrimary, fontSize: fs(17), fontWeight: '800', marginBottom: 8 }}>{t('ledger.month_summary')}</Text>
        {[[t('ledger.opening'), data?.opening_balance], [t('ledger.cash_receipts'), legacyReceipts], [t('ledger.receipts'), totals.receipts], [t('ledger.locker_in'), totals.transfer_in], [t('ledger.locker_out'), totals.transfer_out], [t('ledger.cash_spent'), totals.cash_spent], [t('ledger.online_spent'), totals.online_spent], [t('ledger.closing'), data?.closing_balance]].map(([label, value], i) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}><Text style={{ color: C.textSecondary, fontSize: fs(16) }}>{label}</Text><Text style={{ color: i === 7 ? C.primary : C.textPrimary, fontWeight: '800', fontSize: fs(16) }}>{money(value, i18n.language)}</Text></View>)}
      </View>
      {displayedDays.length === 0 && <View style={[card, { alignItems: 'center', padding: 28 }]}><Ionicons name="book-outline" size={32} color={C.textMuted} /><Text style={{ color: C.textSecondary, marginTop: 8, fontSize: fs(16) }}>{t('ledger.empty_month')}</Text></View>}
      {displayedDays.map(day => {
        const d = new Date(`${day.date}T00:00:00`);
        const label = d.toLocaleDateString(i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
        return <TouchableOpacity key={day.date} activeOpacity={0.8} onPress={() => openDay(day.date)} style={card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><Text style={{ color: C.textPrimary, fontSize: fs(18), fontWeight: '900' }}>{label}</Text><Ionicons name="chevron-forward" size={19} color={C.textMuted} /></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}><Text style={{ color: C.textMuted, fontSize: fs(15) }}>{t('ledger.opening')}</Text><Text style={{ color: C.textSecondary, fontSize: fs(15), fontWeight: '700' }}>{money(day.opening_balance, i18n.language)}</Text></View>
          {(day.entries || []).filter(e => e.kind === 'legacy_receipt' || (e.kind === 'receipt' && e.direction === 'in')).map(e => <View key={`receipt-${e.kind}-${e.id}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}><Text style={{ color: C.income, fontSize: fs(15), flex: 1 }}>{e.kind === 'legacy_receipt' ? t('ledger.cash_receipts') : t('ledger.receipts')}{e.note && e.kind !== 'legacy_receipt' ? ` · ${e.note}` : ''}</Text><Text style={{ color: C.income, fontWeight: '700', fontSize: fs(15) }}>+{money(e.amount, i18n.language)}</Text></View>)}
          {(day.entries || []).filter(e => e.kind === 'transfer').map(e => <View key={`transfer-${e.id}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}><Text style={{ color: C.textSecondary, fontSize: fs(15), flex: 1 }}>{e.direction === 'out' ? t('ledger.locker_out') : t('ledger.locker_in')}{e.note ? ` · ${e.note}` : ''}</Text><Text style={{ color: C.textPrimary, fontWeight: '700', fontSize: fs(15) }}>{e.direction === 'out' ? '−' : '+'}{money(e.amount, i18n.language)}</Text></View>)}
          {(day.cash_spent > 0 || day.online_spent > 0) && <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}><Text style={{ color: C.textSecondary, fontSize: fs(15) }}>{t('ledger.spent')}</Text><Text style={{ color: C.textPrimary, fontWeight: '700', fontSize: fs(15) }}>−{money((day.cash_spent || 0) + (day.online_spent || 0), i18n.language)}</Text></View>}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.divider, paddingTop: 8, marginTop: 3 }}><Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: fs(16) }}>{t('ledger.closing')}</Text><Text style={{ color: C.primary, fontWeight: '900', fontSize: fs(17) }}>{money(day.closing_balance, i18n.language)}</Text></View>
          {(day.entries || []).filter(e => ['expense','note'].includes(e.kind)).map(e => <View key={`detail-${e.kind}-${e.id}`} style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingTop: 9, marginTop: 8, borderTopWidth: 1, borderTopColor: C.divider }}>
            <View style={{ flex: 1 }}><Text style={{ color: e.kind === 'note' ? C.iconNotes : C.textPrimary, fontSize: fs(16), fontWeight: '700' }}>{e.kind === 'note' ? (e.text || e.note) : `${e.icon && e.icon_type !== 'image' && !isImageUri(e.icon) ? `${e.icon} ` : ''}${translateCategoryName(e.category_name, t) || t('ledger.expense')}`}</Text>{e.kind === 'expense' && !!e.note && <Text style={{ color: C.textSecondary, fontSize: fs(15), marginTop: 3 }}>{e.note}</Text>}{e.kind === 'expense' && <Text style={{ color: C.textMuted, fontSize: fs(14), marginTop: 3 }}>{e.payment_type === 'online' ? t('ledger.online') : t('ledger.cash')}</Text>}</View>
            {e.kind === 'expense' && <Text style={{ color: C.expense, fontSize: fs(16), fontWeight: '800' }}>−{money(e.amount, i18n.language)}</Text>}
          </View>)}
        </TouchableOpacity>;
      })}
    </ScrollView>
  </View>;
}
